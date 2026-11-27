"""Helpers shared by platform integrations."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from opensocial.core.config import Settings
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.media import inspect_media, validate_for
from opensocial.core.security import resolve_media_path, wrap_untrusted


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_local_media(
    settings: Settings, file_path: str, requirement: str, *, max_duration: float | None = None
) -> tuple[Path, dict[str, Any], str]:
    """Resolve a file inside the media roots, validate it for a platform and hash it.

    The hash is added to approval parameters so an approval covers exactly this file.
    """
    path = resolve_media_path(file_path, settings.media_roots)
    validation = validate_for(inspect_media(path), requirement, max_duration_override=max_duration)
    if not validation["valid"]:
        raise ValidationFailed(
            f"Media is not valid for {requirement}: " + "; ".join(validation["errors"]),
            details={"validation": validation},
        )
    return path, validation, file_sha256(path)


def check_text(value: str | None, *, field: str, max_length: int, required: bool = False) -> str:
    value = (value or "").strip()
    if required and not value:
        raise ValidationFailed(f"'{field}' is required.")
    if len(value) > max_length:
        raise ValidationFailed(f"'{field}' is {len(value)} characters; the limit is {max_length}.")
    if any(ch in value for ch in "<>") and field in {"title", "tags"}:
        raise ValidationFailed(f"'{field}' must not contain '<' or '>'.")
    return value


def untrusted(text: str | None, source: str) -> dict[str, Any]:
    return wrap_untrusted(text, source=source)
