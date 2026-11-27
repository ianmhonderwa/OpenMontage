"""Local manuscript validation for KDP eBooks (DOCX, EPUB, TXT/Markdown, others by type)."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path
from typing import Any

from defusedxml import ElementTree as SafeET
from defusedxml.common import DefusedXmlException

from opensocial.core.exceptions import ValidationFailed
from opensocial.integrations.kindle.rules import MANUSCRIPT_FORMATS, SOURCES

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MAX_UNCOMPRESSED = 500 * 1024 * 1024
MAX_RATIO = 200
CHAPTER = re.compile(r"^\s*(#{1,2}\s+\S|chapter\s+\w+|part\s+\w+|prologue|epilogue)", re.IGNORECASE)


def _safe_zip(path: Path) -> zipfile.ZipFile:
    try:
        archive = zipfile.ZipFile(path)
    except zipfile.BadZipFile as exc:
        raise ValidationFailed("File is not a valid ZIP-based document.") from exc
    total = sum(i.file_size for i in archive.infolist())
    compressed = sum(i.compress_size for i in archive.infolist()) or 1
    if total > MAX_UNCOMPRESSED or total / compressed > MAX_RATIO:
        archive.close()
        raise ValidationFailed("Archive expands to an unsafe size (possible zip bomb).")
    for info in archive.infolist():
        if info.filename.startswith("/") or ".." in Path(info.filename).parts:
            archive.close()
            raise ValidationFailed("Archive contains unsafe paths.")
    return archive


def _docx(path: Path) -> tuple[dict[str, Any], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    with _safe_zip(path) as archive:
        if "word/document.xml" not in archive.namelist():
            raise ValidationFailed("DOCX is missing word/document.xml.")
        try:
            root = SafeET.fromstring(archive.read("word/document.xml"))
        except (DefusedXmlException, SafeET.ParseError) as exc:
            raise ValidationFailed("word/document.xml is malformed or contains forbidden XML constructs.") from exc
        images = [n for n in archive.namelist() if n.startswith("word/media/")]
    paragraphs = root.iter(f"{W}p")
    stats: dict[str, Any] = {
        "paragraphs": 0,
        "words": 0,
        "headings": 0,
        "page_breaks": 0,
        "empty_paragraph_runs": 0,
        "tab_indents": 0,
        "tables": sum(1 for _ in root.iter(f"{W}tbl")),
        "images": len(images),
        "has_toc": False,
        "heading_titles": [],
    }
    empty_streak = 0
    for p in paragraphs:
        stats["paragraphs"] += 1
        style = p.find(f"{W}pPr/{W}pStyle")
        style_name = style.get(f"{W}val", "") if style is not None else ""
        text = "".join(t.text or "" for t in p.iter(f"{W}t"))
        if any((i.text or "").strip().upper().startswith("TOC") for i in p.iter(f"{W}instrText")):
            stats["has_toc"] = True
        stats["page_breaks"] += sum(1 for b in p.iter(f"{W}br") if b.get(f"{W}type") == "page")
        if style_name.lower().startswith(("heading", "title")):
            stats["headings"] += 1
            if len(stats["heading_titles"]) < 50:
                stats["heading_titles"].append(text[:80])
        runs = list(p.iter(f"{W}r"))
        if runs and runs[0].find(f"{W}tab") is not None:
            stats["tab_indents"] += 1
        if not text.strip() and p.find(f".//{W}drawing") is None:
            empty_streak += 1
            if empty_streak == 3:
                stats["empty_paragraph_runs"] += 1
        else:
            empty_streak = 0
        stats["words"] += len(text.split())
    if stats["words"] == 0:
        errors.append("The manuscript contains no text.")
    if stats["headings"] == 0:
        warnings.append(
            "No paragraphs use Heading styles. Use Heading 1 for chapter titles so KDP can "
            "build navigation and a table of contents."
        )
    if not stats["has_toc"] and stats["headings"] > 2:
        warnings.append("No table of contents field found. KDP recommends a TOC built from heading styles.")
    if stats["empty_paragraph_runs"]:
        warnings.append(
            f"{stats['empty_paragraph_runs']} run(s) of 3+ empty paragraphs: use page breaks or "
            "paragraph spacing instead of blank lines."
        )
    if stats["tab_indents"] > 5:
        warnings.append(
            f"{stats['tab_indents']} paragraphs are indented with tabs; use first-line indent "
            "paragraph formatting instead (tabs are ignored in reflowable eBooks)."
        )
    if stats["tables"]:
        warnings.append("Tables found: check they display acceptably on small screens in Kindle Previewer.")
    return stats, errors, warnings


def _epub(path: Path) -> tuple[dict[str, Any], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    with _safe_zip(path) as archive:
        infos = archive.infolist()
        names = archive.namelist()
        if not infos or infos[0].filename != "mimetype":
            errors.append("EPUB 'mimetype' must be the first entry in the archive.")
        elif archive.read("mimetype").strip() != b"application/epub+zip":
            errors.append("EPUB 'mimetype' must contain 'application/epub+zip'.")
        elif infos[0].compress_type != zipfile.ZIP_STORED:
            errors.append("EPUB 'mimetype' must be stored uncompressed.")
        if "META-INF/container.xml" not in names:
            errors.append("EPUB is missing META-INF/container.xml.")
        opf = [n for n in names if n.endswith(".opf")]
        if not opf:
            errors.append("EPUB has no package (.opf) document.")
        has_nav = any(n.endswith((".ncx", "nav.xhtml", "toc.xhtml")) for n in names)
        if not has_nav:
            warnings.append("No navigation document (nav.xhtml or toc.ncx) found.")
        content = [n for n in names if n.endswith((".xhtml", ".html", ".htm"))]
        words = 0
        for name in content[:500]:
            raw = archive.read(name)[:5_000_000].decode("utf-8", errors="replace")
            words += len(re.sub(r"<[^>]+>", " ", raw).split())
    stats = {
        "content_documents": len(content),
        "words": words,
        "has_navigation": has_nav,
        "package_documents": len(opf),
    }
    if words == 0:
        errors.append("The EPUB contains no readable text.")
    return stats, errors, warnings


def _text(path: Path) -> tuple[dict[str, Any], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        errors.append("Text file is not valid UTF-8.")
        text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines()
    chapters = [line.strip()[:80] for line in lines if CHAPTER.match(line)]
    stats = {
        "words": len(text.split()),
        "lines": len(lines),
        "chapters_detected": len(chapters),
        "chapter_titles": chapters[:50],
    }
    if not stats["words"]:
        errors.append("The manuscript contains no text.")
    if not chapters:
        warnings.append("No chapter headings detected (e.g. 'Chapter 1' or '# Title').")
    if "\t" in text:
        warnings.append("Tabs found; eBook readers ignore tab indentation.")
    return stats, errors, warnings


def validate_manuscript(path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    acceptance = MANUSCRIPT_FORMATS.get(suffix, "unknown format: not accepted by KDP")
    errors: list[str] = []
    warnings: list[str] = []
    stats: dict[str, Any] = {}
    if suffix == ".docx":
        stats, errors, warnings = _docx(path)
    elif suffix == ".epub":
        stats, errors, warnings = _epub(path)
    elif suffix in {".txt", ".md"}:
        stats, errors, warnings = _text(path)
    elif suffix in MANUSCRIPT_FORMATS:
        warnings.append(f"Detailed checks are not implemented for {suffix}; preview it in Kindle Previewer.")
    if "not accepted" in acceptance or "no longer" in acceptance or acceptance.startswith("unknown"):
        errors.append(f"{suffix or 'This file'}: {acceptance}.")
    elif "not recommended" in acceptance:
        warnings.append(f"{suffix}: {acceptance}.")
    if path.stat().st_size > 650 * 1024 * 1024:
        errors.append("File exceeds 650 MB.")
    return {
        "file": path.name,
        "format": suffix,
        "kdp_acceptance": acceptance,
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "statistics": stats,
        "recommendation": "Always preview the converted book in Kindle Previewer before publishing.",
        "source": SOURCES["formats"],
    }
