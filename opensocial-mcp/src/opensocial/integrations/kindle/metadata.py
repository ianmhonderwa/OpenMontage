"""KDP metadata, description and cover validation, checklist and launch-plan generation."""

from __future__ import annotations

import html
import re
from datetime import date, timedelta
from html.parser import HTMLParser
from typing import Any

from opensocial.core.media import MediaInfo
from opensocial.integrations.kindle import rules


class _TagCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: set[str] = set()
        self.attrs_found = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.add(tag.lower())
        if attrs:
            self.attrs_found = True


def _terms(text: str) -> list[str]:
    lowered = text.lower()
    return [t for t in rules.DISALLOWED_TERMS if re.search(rf"(?<!\w){re.escape(t)}(?!\w)", lowered)]


def validate_description(description: str) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    collector = _TagCollector()
    collector.feed(description)
    bad_tags = sorted(collector.tags - rules.ALLOWED_DESCRIPTION_TAGS)
    if bad_tags:
        errors.append(f"Unsupported HTML tags for KDP descriptions: {bad_tags}.")
    if collector.attrs_found:
        warnings.append("HTML attributes (style, class, links) are stripped by KDP.")
    plain = re.sub(r"<[^>]+>", "", description)
    if len(description) > rules.DESCRIPTION_MAX:
        errors.append(
            f"Description is {len(description)} characters (including HTML); limit is {rules.DESCRIPTION_MAX}."
        )
    if len(plain.split()) < 50:
        warnings.append("Description is very short; most successful listings use 150–300 words.")
    if re.search(r"https?://|www\.", plain, re.IGNORECASE):
        errors.append("Descriptions must not contain URLs.")
    if terms := _terms(plain):
        warnings.append(f"Time-sensitive or promotional terms found: {terms}.")
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "characters": len(description),
        "source": rules.SOURCES["description_html"],
    }


def validate_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    title = (meta.get("title") or "").strip()
    subtitle = (meta.get("subtitle") or "").strip()
    if not title:
        errors.append("Title is required.")
    if len(title) + len(subtitle) > rules.TITLE_SUBTITLE_MAX:
        errors.append(
            f"Title plus subtitle is {len(title) + len(subtitle)} characters; KDP's limit is "
            f"{rules.TITLE_SUBTITLE_MAX}."
        )
    if terms := _terms(f"{title} {subtitle}"):
        errors.append(f"Title/subtitle contain disallowed or promotional terms: {terms}.")
    authors = meta.get("authors") or []
    if not authors or not all(isinstance(a, dict) and a.get("name") for a in authors):
        errors.append("At least one author with a name is required.")
    keywords = [k.strip() for k in meta.get("keywords") or [] if k.strip()]
    if len(keywords) > rules.KEYWORD_SLOTS:
        errors.append(f"KDP allows {rules.KEYWORD_SLOTS} keyword slots; {len(keywords)} given.")
    for kw in keywords:
        if len(kw) > rules.KEYWORD_MAX:
            errors.append(f"Keyword '{kw[:30]}…' exceeds {rules.KEYWORD_MAX} characters.")
        if terms := _terms(kw):
            warnings.append(f"Keyword '{kw}' contains discouraged terms: {terms}.")
        if title and kw.lower() in title.lower():
            warnings.append(f"Keyword '{kw}' repeats words already in the title.")
    if len(keywords) < rules.KEYWORD_SLOTS:
        warnings.append(f"Only {len(keywords)} of {rules.KEYWORD_SLOTS} keyword slots used.")
    categories = meta.get("categories") or []
    if not categories:
        errors.append("At least one category is required.")
    if len(categories) > rules.CATEGORY_MAX:
        errors.append(f"KDP lets you choose up to {rules.CATEGORY_MAX} categories; {len(categories)} given.")
    if not meta.get("language"):
        errors.append("Language is required.")
    if meta.get("publishing_rights") not in {"own_copyright", "public_domain"}:
        errors.append("publishing_rights must be 'own_copyright' or 'public_domain'.")
    if meta.get("publishing_rights") == "public_domain":
        warnings.append("Public-domain works need differentiation (e.g. translation, annotations) to be eligible.")
    if "adult_content" not in meta:
        errors.append("adult_content (true/false) must be declared.")
    if meta.get("ai_generated_content") is None:
        errors.append("Declare whether text, images or translations are AI-generated (KDP asks this).")
    desc = meta.get("description")
    description_check = validate_description(desc) if desc else None
    if description_check is None:
        errors.append("A book description is required.")
    elif not description_check["valid"]:
        errors.extend(description_check["errors"])
    if description_check:
        warnings.extend(description_check["warnings"])
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "keyword_slots_used": len(keywords),
        "sources": rules.SOURCES,
    }


def check_cover(info: MediaInfo) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    if info.container not in {"jpeg", "tiff"}:
        errors.append(f"Cover must be JPEG or TIFF (found {info.container}).")
    if info.size_bytes > 50 * 1024 * 1024:
        errors.append("Cover file must be under 50 MB.")
    width, height = info.width or 0, info.height or 0
    if max(width, height) < rules.COVER_MIN_LONGEST_SIDE:
        errors.append(f"Longest side must be at least {rules.COVER_MIN_LONGEST_SIDE}px.")
    if max(width, height) > rules.COVER_MAX_SIDE:
        errors.append(f"No side may exceed {rules.COVER_MAX_SIDE}px.")
    ideal_w, ideal_h = rules.COVER_IDEAL
    if width and height:
        ratio = height / width
        if abs(ratio - rules.COVER_IDEAL_RATIO) > 0.05:
            warnings.append(f"Height:width ratio is {ratio:.2f}:1; KDP's ideal is {rules.COVER_IDEAL_RATIO}:1.")
        if height < ideal_h or width < ideal_w:
            warnings.append(
                f"Smaller than the recommended {ideal_w}×{ideal_h}px; KDP shows a warning at upload "
                "and the cover may look soft on high-resolution screens. Do not upscale a small image."
            )
        if height < width:
            errors.append("eBook covers must be portrait (taller than wide).")
    if info.dpi and min(info.dpi) < rules.COVER_MIN_DPI:
        warnings.append(f"Embedded resolution is {min(info.dpi):.0f} DPI; {rules.COVER_MIN_DPI} DPI is recommended.")
    if info.colour_mode and info.colour_mode not in {"RGB", "L"}:
        warnings.append(f"Colour mode is {info.colour_mode}; use RGB for eBook covers.")
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "media": info.to_dict(),
        "recommended": {"width": ideal_w, "height": ideal_h, "format": "JPEG", "colour": "RGB", "dpi": 300},
        "source": rules.SOURCES["cover"],
    }


def compose_description(
    *,
    hook: str,
    synopsis: str,
    key_points: list[str],
    audience: str | None,
    author_bio: str | None,
    closing: str | None,
) -> dict[str, Any]:
    """Assemble a KDP-safe HTML description from parts the author or AI wrote."""
    parts = [f"<p><b>{html.escape(hook.strip())}</b></p>"] if hook.strip() else []
    for para in [p for p in synopsis.split("\n\n") if p.strip()]:
        parts.append(f"<p>{html.escape(para.strip())}</p>")
    if key_points:
        parts.append("<ul>" + "".join(f"<li>{html.escape(k.strip())}</li>" for k in key_points if k.strip()) + "</ul>")
    if audience:
        parts.append(f"<p><i>{html.escape(audience.strip())}</i></p>")
    if author_bio:
        parts.append(f"<h4>About the author</h4><p>{html.escape(author_bio.strip())}</p>")
    if closing:
        parts.append(f"<p><b>{html.escape(closing.strip())}</b></p>")
    description = "".join(parts)
    return {
        "description_html": description,
        "plain_text": re.sub(r"<[^>]+>", "\n", description).strip(),
        "validation": validate_description(description),
    }


def build_checklist(project: dict[str, Any]) -> list[dict[str, Any]]:
    checks = project.get("checks", {})
    meta = project.get("metadata", {})

    def ok(key: str) -> str:
        item = checks.get(key)
        return "done" if item and item.get("valid") else ("failed" if item else "pending")

    return [
        {"step": "Manuscript validated (DOCX/EPUB/KPF)", "status": ok("manuscript"), "owner": "assistant"},
        {
            "step": "Preview the converted book in Kindle Previewer on phone, tablet and e-reader",
            "status": "manual",
            "owner": "author",
        },
        {"step": "Metadata complete and within KDP limits", "status": ok("metadata"), "owner": "assistant"},
        {"step": "Cover meets KDP eBook cover guidelines", "status": ok("cover"), "owner": "assistant"},
        {
            "step": "Publishing rights confirmed",
            "status": "done" if meta.get("publishing_rights") else "pending",
            "owner": "author",
        },
        {
            "step": "AI-generated content declared",
            "status": "done" if meta.get("ai_generated_content") is not None else "pending",
            "owner": "author",
        },
        {"step": "Decide KDP Select enrolment (90-day exclusivity) and DRM", "status": "manual", "owner": "author"},
        {"step": "Choose royalty plan (35%/70%) and list price per marketplace", "status": "manual", "owner": "author"},
        {
            "step": "Sign in at kdp.amazon.com → Bookshelf → Create eBook (human action)",
            "status": "manual",
            "owner": "author",
        },
        {
            "step": "Enter details, upload manuscript and cover, review preview, then Publish (human action)",
            "status": "manual",
            "owner": "author",
        },
        {
            "step": "Record submission in OpenSocial (status SUBMITTED_MANUALLY) and watch for review e-mail",
            "status": "manual",
            "owner": "author",
        },
    ]


def launch_plan(launch: date, *, channels: list[str], title: str) -> list[dict[str, Any]]:
    def at(days: int) -> str:
        return (launch + timedelta(days=days)).isoformat()

    plan = [
        {"date": at(-42), "task": "Finalise manuscript, cover and metadata; validate with OpenSocial."},
        {"date": at(-35), "task": "Recruit advance readers (ARC team) who agree to honest reviews; no paid reviews."},
        {"date": at(-28), "task": "Set up the pre-order in KDP (optional) — human action in KDP."},
        {"date": at(-21), "task": "Prepare platform content: cover reveal, excerpt, behind-the-scenes."},
        {"date": at(-14), "task": f"Cover reveal for '{title}' on: {', '.join(channels) or 'chosen channels'}."},
        {"date": at(-7), "task": "Share an excerpt and the pre-order link; e-mail your mailing list."},
        {"date": at(0), "task": "Launch day: announcement posts (each requires approval in OpenSocial)."},
        {"date": at(3), "task": "Thank early readers; share first impressions with permission."},
        {"date": at(7), "task": "Review KDP Reports (sales, KENP) manually; compare with channel analytics."},
        {"date": at(14), "task": "Consider Amazon Ads or a price promotion; evaluate results before scaling."},
        {"date": at(30), "task": "Retrospective: what worked, what to change for the next book."},
    ]
    return plan
