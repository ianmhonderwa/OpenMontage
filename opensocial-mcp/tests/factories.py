"""Builders for synthetic test media (no real user content is used in tests)."""

from __future__ import annotations

import io
import struct
import zipfile
from pathlib import Path

from PIL import Image


def _box(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload) + 8) + kind + payload


def make_mp4(path: Path, *, width: int = 1080, height: int = 1920, seconds: float = 30.0, padding: int = 2048) -> Path:
    """Minimal ISO-BMFF file with ftyp, moov/mvhd (duration) and trak/tkhd (dimensions)."""
    timescale = 1000
    mvhd = bytes(4) + bytes(8) + struct.pack(">II", timescale, int(seconds * timescale)) + bytes(80)
    tkhd = bytes(4) + bytes(72) + struct.pack(">II", width << 16, height << 16)
    moov = _box(b"moov", _box(b"mvhd", mvhd) + _box(b"trak", _box(b"tkhd", tkhd)))
    data = _box(b"ftyp", b"isom\x00\x00\x02\x00isomiso2mp41") + moov + _box(b"mdat", b"\x00" * padding)
    path.write_bytes(data)
    return path


def make_jpeg(path: Path, width: int = 1080, height: int = 1350, dpi: int = 300, mode: str = "RGB") -> Path:
    Image.new(mode, (width, height), (200, 120, 40) if mode == "RGB" else 128).save(path, "JPEG", dpi=(dpi, dpi))
    return path


def make_png(path: Path, width: int = 800, height: int = 800) -> Path:
    Image.new("RGB", (width, height), (10, 20, 30)).save(path, "PNG")
    return path


W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'


def make_docx(path: Path, *, chapters: int = 3, headings: bool = True, blank_runs: int = 0, toc: bool = True) -> Path:
    paras = []
    if toc:
        paras.append('<w:p><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" </w:instrText></w:r></w:p>')
    for i in range(1, chapters + 1):
        style = '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' if headings else ""
        paras.append(f"<w:p>{style}<w:r><w:t>Chapter {i}</w:t></w:r></w:p>")
        paras.append("<w:p><w:r><w:t>" + "Lorem ipsum dolor sit amet. " * 20 + "</w:t></w:r></w:p>")
        paras.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    for _ in range(blank_runs):
        paras.extend(["<w:p/>"] * 3 + ["<w:p><w:r><w:t>x</w:t></w:r></w:p>"])
    doc = f'<?xml version="1.0"?><w:document {W}><w:body>{"".join(paras)}</w:body></w:document>'
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("word/document.xml", doc)
    return path


def make_epub(path: Path, *, valid: bool = True) -> Path:
    with zipfile.ZipFile(path, "w") as z:
        if valid:
            z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", "<container/>")
        z.writestr("OEBPS/content.opf", "<package/>")
        z.writestr("OEBPS/nav.xhtml", "<html><body><nav>toc</nav></body></html>")
        z.writestr("OEBPS/ch1.xhtml", "<html><body><h1>One</h1><p>" + "word " * 300 + "</p></body></html>")
        if not valid:
            z.writestr("mimetype", "application/epub+zip")
    return path


def zip_bomb(path: Path) -> Path:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("word/document.xml", b"0" * (50 * 1024 * 1024))
    return path


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10)).save(buf, "PNG")
    return buf.getvalue()
