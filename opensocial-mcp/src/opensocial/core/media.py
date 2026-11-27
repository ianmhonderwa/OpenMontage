"""Media inspection and per-platform media validation.

Each platform has its own requirements; one file is never assumed to be valid for every
platform. Requirement values cite their official source and the date they were checked.
Values marked ``advisory`` could not be confirmed as hard limits and produce warnings,
not errors. Re-verify before relying on them: platforms change these without notice.
"""

from __future__ import annotations

import struct
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from opensocial.core.exceptions import ValidationFailed

VERIFIED_ON = "2026-11-27"


@dataclass
class MediaInfo:
    path: str
    kind: str  # image | video | document | unknown
    container: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    dpi: tuple[float, float] | None = None
    colour_mode: str | None = None

    @property
    def aspect_ratio(self) -> float | None:
        if self.width and self.height:
            return self.width / self.height
        return None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["aspect_ratio"] = round(self.aspect_ratio, 4) if self.aspect_ratio else None
        data["path"] = Path(self.path).name  # never leak full local paths to clients
        return data


def _sniff(header: bytes) -> tuple[str, str]:
    if header.startswith(b"\xff\xd8\xff"):
        return "image", "jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "png"
    if header[:6] in (b"GIF87a", b"GIF89a"):
        return "image", "gif"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image", "webp"
    if header[:4] in (b"II*\x00", b"MM\x00*"):
        return "image", "tiff"
    if header[4:8] == b"ftyp":
        brand = header[8:12]
        return "video", "mov" if brand == b"qt  " else "mp4"
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return "video", "webm"
    if header.startswith(b"%PDF"):
        return "document", "pdf"
    if header.startswith(b"PK\x03\x04"):
        return "document", "zip"
    return "unknown", "unknown"


def _iter_boxes(data: bytes, start: int, end: int):
    pos = start
    while pos + 8 <= end:
        size, box_type = struct.unpack(">I4s", data[pos : pos + 8])
        header = 8
        if size == 1:
            if pos + 16 > end:
                return
            size = struct.unpack(">Q", data[pos + 8 : pos + 16])[0]
            header = 16
        elif size == 0:
            size = end - pos
        if size < header:
            return
        yield box_type, pos + header, pos + size
        pos += size


def parse_mp4(data: bytes) -> dict[str, float | int]:
    """Read duration (mvhd) and the first video track's dimensions (tkhd) from ISO-BMFF."""
    result: dict[str, float | int] = {}
    for box_type, body, end in _iter_boxes(data, 0, len(data)):
        if box_type != b"moov":
            continue
        for sub_type, sub_body, sub_end in _iter_boxes(data, body, end):
            if sub_type == b"mvhd":
                version = data[sub_body]
                if version == 1:
                    timescale, duration = struct.unpack(">IQ", data[sub_body + 20 : sub_body + 32])
                else:
                    timescale, duration = struct.unpack(">II", data[sub_body + 12 : sub_body + 20])
                if timescale:
                    result["duration_seconds"] = duration / timescale
            elif sub_type == b"trak" and "width" not in result:
                for t_type, t_body, t_end in _iter_boxes(data, sub_body, sub_end):
                    if t_type == b"tkhd" and t_end - t_body >= 84:
                        width, height = struct.unpack(">II", data[t_end - 8 : t_end])
                        w, h = width >> 16, height >> 16
                        if w and h:
                            result["width"], result["height"] = w, h
    return result


def inspect_media(path: Path, *, max_scan_bytes: int = 64 * 1024 * 1024) -> MediaInfo:
    size = path.stat().st_size
    with path.open("rb") as handle:
        header = handle.read(32)
    kind, container = _sniff(header)
    info = MediaInfo(path=str(path), kind=kind, container=container, size_bytes=size)
    if kind == "image":
        try:
            with Image.open(path) as img:
                info.width, info.height = img.size
                info.colour_mode = img.mode
                dpi = img.info.get("dpi")
                if dpi:
                    info.dpi = (float(dpi[0]), float(dpi[1]))
        except (UnidentifiedImageError, OSError) as exc:
            raise ValidationFailed(f"Image could not be decoded: {path.name}") from exc
    elif kind == "video" and container in {"mp4", "mov"}:
        with path.open("rb") as handle:
            data = handle.read(min(size, max_scan_bytes))
        meta = parse_mp4(data)
        info.duration_seconds = float(meta["duration_seconds"]) if "duration_seconds" in meta else None
        info.width = int(meta["width"]) if "width" in meta else None
        info.height = int(meta["height"]) if "height" in meta else None
    return info


@dataclass
class Requirement:
    platform: str
    media_format: str
    kinds: tuple[str, ...]
    containers: tuple[str, ...]
    max_bytes: int | None = None
    min_duration: float | None = None
    max_duration: float | None = None
    min_aspect: float | None = None
    max_aspect: float | None = None
    min_width: int | None = None
    max_width: int | None = None
    advisory: bool = False
    source: str = ""
    notes: list[str] = field(default_factory=list)


GB = 1024**3
MB = 1024**2

REQUIREMENTS: dict[str, Requirement] = {
    "youtube:video": Requirement(
        "youtube",
        "video",
        ("video",),
        ("mp4", "mov", "webm"),
        max_bytes=256 * GB,
        max_duration=12 * 3600,
        source="https://support.google.com/youtube/answer/71673",
        notes=["Videos over 15 minutes require a verified channel."],
    ),
    "youtube:short": Requirement(
        "youtube",
        "short",
        ("video",),
        ("mp4", "mov", "webm"),
        max_bytes=256 * GB,
        max_duration=180,
        max_aspect=1.0,
        source="https://support.google.com/youtube/answer/15424877",
        notes=[
            "Shorts are uploaded with the normal videos.insert API; YouTube classifies "
            "square or vertical videos up to 3 minutes as Shorts."
        ],
    ),
    "tiktok:video": Requirement(
        "tiktok",
        "video",
        ("video",),
        ("mp4", "mov", "webm"),
        max_bytes=4 * GB,
        source="https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide",
        notes=["Maximum duration comes from creator_info.max_video_post_duration_sec."],
    ),
    "instagram:image": Requirement(
        "instagram",
        "image",
        ("image",),
        ("jpeg",),
        max_bytes=8 * MB,
        min_aspect=0.8,
        max_aspect=1.91,
        min_width=320,
        max_width=1440,
        source="https://developers.facebook.com/docs/instagram-platform/content-publishing/",
        notes=["Only JPEG is supported. The file must be reachable at a public HTTPS URL."],
    ),
    "instagram:reel": Requirement(
        "instagram",
        "reel",
        ("video",),
        ("mp4", "mov"),
        max_bytes=300 * MB,
        min_duration=3,
        max_duration=15 * 60,
        min_aspect=0.01,
        max_aspect=10.0,
        source="https://developers.facebook.com/docs/instagram-platform/content-publishing/",
        notes=["9:16 is recommended. The file must be reachable at a public HTTPS URL."],
    ),
    "facebook:photo": Requirement(
        "facebook",
        "photo",
        ("image",),
        ("jpeg", "png", "gif", "tiff", "webp"),
        max_bytes=10 * MB,
        advisory=True,
        source="https://developers.facebook.com/docs/graph-api/reference/page/photos/",
    ),
    "facebook:video": Requirement(
        "facebook",
        "video",
        ("video",),
        ("mp4", "mov"),
        max_bytes=10 * GB,
        max_duration=240 * 60,
        advisory=True,
        source="https://developers.facebook.com/docs/video-api/",
    ),
    "kindle:ebook_cover": Requirement(
        "kindle",
        "ebook_cover",
        ("image",),
        ("jpeg", "tiff"),
        max_bytes=50 * MB,
        source="https://kdp.amazon.com/en_US/help/topic/G6GTK3T3NUHKLEFX",
    ),
}


def validate_for(
    info: MediaInfo, requirement_key: str, *, max_duration_override: float | None = None
) -> dict[str, Any]:
    if requirement_key not in REQUIREMENTS:
        raise ValidationFailed(f"Unknown media requirement '{requirement_key}'.")
    req = REQUIREMENTS[requirement_key]
    errors: list[str] = []
    warnings: list[str] = []
    problems = warnings if req.advisory else errors

    if info.kind not in req.kinds:
        errors.append(f"Expected {'/'.join(req.kinds)}, found {info.kind}.")
    if info.container not in req.containers:
        errors.append(f"Format '{info.container}' is not accepted (accepted: {', '.join(req.containers)}).")
    if req.max_bytes and info.size_bytes > req.max_bytes:
        problems.append(f"File is {info.size_bytes} bytes; limit is {req.max_bytes} bytes.")
    max_duration = max_duration_override or req.max_duration
    if info.kind == "video":
        if info.duration_seconds is None:
            warnings.append("Duration could not be read; the platform will validate it on upload.")
        else:
            if req.min_duration and info.duration_seconds < req.min_duration:
                problems.append(f"Duration {info.duration_seconds:.1f}s is below {req.min_duration}s.")
            if max_duration and info.duration_seconds > max_duration:
                problems.append(f"Duration {info.duration_seconds:.1f}s exceeds {max_duration}s.")
    ratio = info.aspect_ratio
    if ratio is None and (req.min_aspect or req.max_aspect):
        warnings.append("Dimensions could not be read; aspect ratio not checked.")
    elif ratio is not None:
        if req.min_aspect and ratio < req.min_aspect - 1e-6:
            problems.append(f"Aspect ratio {ratio:.3f} is below {req.min_aspect}.")
        if req.max_aspect and ratio > req.max_aspect + 1e-6:
            problems.append(f"Aspect ratio {ratio:.3f} exceeds {req.max_aspect}.")
    if info.width is not None:
        if req.min_width and info.width < req.min_width:
            problems.append(f"Width {info.width}px is below {req.min_width}px.")
        if req.max_width and info.width > req.max_width:
            warnings.append(f"Width {info.width}px exceeds {req.max_width}px; the platform will downscale it.")
    return {
        "requirement": requirement_key,
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "advisory": req.advisory,
        "source": req.source,
        "verified_on": VERIFIED_ON,
        "notes": req.notes,
        "media": info.to_dict(),
    }
