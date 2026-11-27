"""OpenSocial Kindle publishing assistant MCP server.

Amazon KDP has no public publishing API. This server prepares and validates everything
locally and guides the author through the human-operated upload at kdp.amazon.com.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field

from opensocial.integrations.kindle import operations as _ops  # noqa: F401  (registers operations)
from opensocial.servers.common import describe, main_for, new_server, run, tool_annotations

server = new_server(
    "opensocial-kindle",
    "OpenSocial Kindle Publishing Assistant",
    "Prepare Kindle eBooks for KDP: organise book projects and versions, validate manuscripts "
    "and covers, prepare metadata and descriptions, and generate publishing checklists and "
    "launch plans. KDP has no public publishing API, so uploading is done by the author.",
    None,
)


def _t(op: str, text: str) -> dict[str, Any]:
    return {"name": op, "description": describe(op, text), "annotations": tool_annotations(op)}


@server.tool(**_t("kindle_create_book_project", "Create a book project to organise files, metadata and status."))
async def kindle_create_book_project(title: Annotated[str, Field(min_length=1, max_length=200)]) -> dict[str, Any]:
    return await run("kindle_create_book_project", {"title": title})


@server.tool(**_t("kindle_list_projects", "List book projects with status, checks and versions."))
async def kindle_list_projects() -> dict[str, Any]:
    return await run("kindle_list_projects", {})


@server.tool(
    **_t(
        "kindle_validate_manuscript",
        "Validate a manuscript (DOCX, EPUB, TXT/MD; other KDP formats by "
        "type) for KDP acceptance and common formatting problems.",
    )
)
async def kindle_validate_manuscript(file_path: str, project_id: str | None = None) -> dict[str, Any]:
    return await run("kindle_validate_manuscript", {"file_path": file_path, "project_id": project_id})


@server.tool(
    **_t(
        "kindle_prepare_metadata",
        "Set and validate KDP metadata (title+subtitle ≤200 chars, ≤7 "
        "keywords of ≤50 chars, ≤3 categories, description ≤4,000 chars, rights, AI declaration).",
    )
)
async def kindle_prepare_metadata(
    project_id: str,
    title: str | None = None,
    subtitle: str | None = None,
    series: str | None = None,
    edition: str | None = None,
    authors: Annotated[list[dict[str, str]] | None, Field(description="[{name, role}] e.g. role author/editor")] = None,
    description: str | None = None,
    keywords: list[str] | None = None,
    categories: list[str] | None = None,
    language: str | None = None,
    publishing_rights: Literal["own_copyright", "public_domain"] | None = None,
    adult_content: bool | None = None,
    ai_generated_content: Annotated[
        dict[str, str] | None, Field(description="{text, images, translation}: none | ai_assisted | ai_generated")
    ] = None,
    primary_marketplace: str | None = None,
) -> dict[str, Any]:
    params = {
        "project_id": project_id,
        "title": title,
        "subtitle": subtitle,
        "series": series,
        "edition": edition,
        "authors": authors,
        "description": description,
        "keywords": keywords,
        "categories": categories,
        "language": language,
        "publishing_rights": publishing_rights,
        "adult_content": adult_content,
        "ai_generated_content": ai_generated_content,
        "primary_marketplace": primary_marketplace,
    }
    return await run("kindle_prepare_metadata", params)


@server.tool(
    **_t(
        "kindle_check_cover",
        "Check an eBook cover image against KDP guidelines (JPEG/TIFF, ideal "
        "1600×2560 px, 1.6:1, RGB, 300 DPI, <50 MB).",
    )
)
async def kindle_check_cover(file_path: str, project_id: str | None = None) -> dict[str, Any]:
    return await run("kindle_check_cover", {"file_path": file_path, "project_id": project_id})


@server.tool(
    **_t(
        "kindle_generate_description",
        "Assemble a KDP-safe HTML description from a hook, synopsis, "
        "key points, audience, author bio and closing line you provide, and validate it.",
    )
)
async def kindle_generate_description(
    synopsis: str,
    hook: str = "",
    key_points: list[str] | None = None,
    audience: str | None = None,
    author_bio: str | None = None,
    closing: str | None = None,
) -> dict[str, Any]:
    return await run(
        "kindle_generate_description",
        {
            "synopsis": synopsis,
            "hook": hook,
            "key_points": key_points,
            "audience": audience,
            "author_bio": author_bio,
            "closing": closing,
        },
    )


@server.tool(
    **_t(
        "kindle_create_publishing_checklist",
        "Checklist from the project's checks, including the manual KDP steps the author must do.",
    )
)
async def kindle_create_publishing_checklist(project_id: str) -> dict[str, Any]:
    return await run("kindle_create_publishing_checklist", {"project_id": project_id})


@server.tool(
    **_t(
        "kindle_update_status",
        "Move the project through preparation statuses. Statuses describing "
        "KDP actions (SUBMITTED_MANUALLY, IN_REVIEW, LIVE, UNPUBLISHED) can only be recorded by the "
        "author via the dashboard/CLI.",
    )
)
async def kindle_update_status(project_id: str, status: str, note: str = "") -> dict[str, Any]:
    return await run("kindle_update_status", {"project_id": project_id, "status": status, "note": note})


@server.tool(**_t("kindle_add_version", "Record a manuscript version (file hash, size, label, notes)."))
async def kindle_add_version(project_id: str, file_path: str, label: str = "", notes: str = "") -> dict[str, Any]:
    return await run(
        "kindle_add_version", {"project_id": project_id, "file_path": file_path, "label": label, "notes": notes}
    )


@server.tool(**_t("kindle_generate_launch_plan", "Dated launch and marketing plan around a launch date."))
async def kindle_generate_launch_plan(
    launch_date: str, project_id: str | None = None, channels: list[str] | None = None
) -> dict[str, Any]:
    return await run(
        "kindle_generate_launch_plan", {"launch_date": launch_date, "project_id": project_id, "channels": channels}
    )


def main() -> None:
    main_for(server)


if __name__ == "__main__":
    main()
