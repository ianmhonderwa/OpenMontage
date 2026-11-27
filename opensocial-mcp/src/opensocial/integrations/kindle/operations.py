"""Kindle publishing assistant operations (local only; KDP has no public publishing API)."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import select

from opensocial.core.database import BookProject, Platform, utcnow
from opensocial.core.exceptions import NotFound, PermissionDenied, ValidationFailed
from opensocial.core.media import inspect_media
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.core.security import resolve_media_path
from opensocial.integrations.common import check_text, file_sha256
from opensocial.integrations.kindle import metadata as md
from opensocial.integrations.kindle import rules
from opensocial.integrations.kindle.manuscript import validate_manuscript

P = Platform.KINDLE
NO_API_NOTE = (
    "Amazon KDP has no public publishing API. Uploading and publishing are done by the author at "
    "https://kdp.amazon.com; OpenSocial prepares and validates everything beforehand."
)


def _project(ctx: OperationContext, project_id: str | None) -> BookProject | None:
    if not project_id:
        return None
    project = ctx.session.scalar(
        select(BookProject).where(BookProject.id == project_id, BookProject.owner_id == ctx.principal.user_id)
    )
    if project is None:
        raise NotFound("Book project not found.")
    return project


def _store_check(project: BookProject | None, key: str, result: dict[str, Any]) -> None:
    if project is None:
        return
    project.checks = {
        **(project.checks or {}),
        key: {"valid": result["valid"], "at": utcnow().isoformat(), "errors": result["errors"][:20]},
    }
    project.updated_at = utcnow()


def project_dict(p: BookProject) -> dict[str, Any]:
    return {
        "project_id": p.id,
        "title": p.title,
        "status": p.status,
        "metadata": p.metadata_json,
        "versions": p.versions,
        "checks": p.checks,
        "history": p.history[-20:],
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@operation("kindle_create_book_project", P, Kind.PREPARE, summary="Create book project", needs_account=False)
def create_project(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    title = check_text(params["title"], field="title", max_length=200, required=True)
    project = BookProject(
        owner_id=ctx.principal.user_id,
        title=title,
        history=[{"at": utcnow().isoformat(), "status": "DRAFT", "by": ctx.principal.role}],
    )
    ctx.session.add(project)
    ctx.session.flush()
    return {"project": project_dict(project), "note": NO_API_NOTE}


@operation("kindle_list_projects", P, Kind.READ, summary="List book projects", needs_account=False)
def list_projects(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    rows = ctx.session.scalars(
        select(BookProject).where(BookProject.owner_id == ctx.principal.user_id).order_by(BookProject.updated_at.desc())
    )
    return {"projects": [project_dict(p) for p in rows]}


@operation("kindle_validate_manuscript", P, Kind.ANALYSE, summary="Validate manuscript", needs_account=False)
def validate(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    path = resolve_media_path(params["file_path"], ctx.settings.media_roots)
    result = validate_manuscript(path)
    _store_check(_project(ctx, params.get("project_id")), "manuscript", result)
    return {"validation": result}


@operation("kindle_prepare_metadata", P, Kind.PREPARE, summary="Prepare book metadata", needs_account=False)
def prepare_metadata(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    project = _project(ctx, params["project_id"])
    assert project is not None
    meta = {k: v for k, v in params.items() if k != "project_id" and v is not None}
    merged = {**(project.metadata_json or {}), **meta}
    result = md.validate_metadata(merged)
    project.metadata_json = merged
    if meta.get("title"):
        project.title = meta["title"]
    _store_check(project, "metadata", result)
    return {"project_id": project.id, "metadata": merged, "validation": result}


@operation("kindle_check_cover", P, Kind.ANALYSE, summary="Check cover", needs_account=False)
def check_cover(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    path = resolve_media_path(params["file_path"], ctx.settings.media_roots)
    info = inspect_media(path)
    if info.kind != "image":
        raise ValidationFailed("Cover must be an image file (JPEG or TIFF).")
    result = md.check_cover(info)
    _store_check(_project(ctx, params.get("project_id")), "cover", result)
    return {"cover_check": result}


@operation("kindle_generate_description", P, Kind.ANALYSE, summary="Compose description", needs_account=False)
def generate_description(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    result = md.compose_description(
        hook=params.get("hook", ""),
        synopsis=params["synopsis"],
        key_points=params.get("key_points") or [],
        audience=params.get("audience"),
        author_bio=params.get("author_bio"),
        closing=params.get("closing"),
    )
    result["note"] = "Review the wording yourself; the description must accurately represent the book."
    return result


@operation("kindle_create_publishing_checklist", P, Kind.ANALYSE, summary="Publishing checklist", needs_account=False)
def checklist(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    project = _project(ctx, params["project_id"])
    assert project is not None
    items = md.build_checklist({"checks": project.checks, "metadata": project.metadata_json})
    blocking = [i for i in items if i["status"] in {"pending", "failed"}]
    return {
        "project_id": project.id,
        "status": project.status,
        "checklist": items,
        "ready_for_manual_upload": not blocking,
        "note": NO_API_NOTE,
    }


@operation("kindle_update_status", P, Kind.PREPARE, summary="Update book status", needs_account=False)
def update_status(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    project = _project(ctx, params["project_id"])
    assert project is not None
    status = params["status"]
    if status not in rules.STATUSES:
        raise ValidationFailed(f"status must be one of {rules.STATUSES}.")
    if status in rules.HUMAN_ONLY_STATUSES and not ctx.principal.is_owner:
        raise PermissionDenied(
            f"Only the author can record '{status}', because it reflects an action taken in KDP by a human."
        )
    if status == "READY_FOR_MANUAL_UPLOAD":
        missing = [k for k in ("manuscript", "metadata", "cover") if not (project.checks or {}).get(k, {}).get("valid")]
        if missing:
            raise ValidationFailed(f"Cannot mark ready: these checks have not passed: {missing}.")
    project.status = status
    project.history = [
        *project.history,
        {
            "at": utcnow().isoformat(),
            "status": status,
            "by": ctx.principal.role,
            "note": str(params.get("note", ""))[:500],
        },
    ]
    project.updated_at = utcnow()
    return {"project": project_dict(project)}


@operation("kindle_add_version", P, Kind.PREPARE, summary="Record manuscript version", needs_account=False)
def add_version(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    project = _project(ctx, params["project_id"])
    assert project is not None
    path = resolve_media_path(params["file_path"], ctx.settings.media_roots)
    version = {
        "version": len(project.versions) + 1,
        "label": check_text(params.get("label", ""), field="label", max_length=100),
        "file_name": path.name,
        "sha256": file_sha256(path),
        "size_bytes": path.stat().st_size,
        "notes": str(params.get("notes", ""))[:1000],
        "at": utcnow().isoformat(),
    }
    project.versions = [*project.versions, version]
    project.updated_at = utcnow()
    return {"project_id": project.id, "version": version}


@operation("kindle_generate_launch_plan", P, Kind.ANALYSE, summary="Generate launch plan", needs_account=False)
def generate_launch_plan(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    try:
        launch = date.fromisoformat(params["launch_date"])
    except ValueError as exc:
        raise ValidationFailed("launch_date must be YYYY-MM-DD.") from exc
    project = _project(ctx, params.get("project_id"))
    title = project.title if project else params.get("title", "your book")
    return {
        "launch_date": launch.isoformat(),
        "plan": md.launch_plan(launch, channels=params.get("channels") or [], title=title),
        "integrity": "Never buy reviews or ask for 5-star reviews; Amazon's policies prohibit review manipulation.",
    }
