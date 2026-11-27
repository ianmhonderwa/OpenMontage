"""KDP rules encoded for validation, each with its official help-page source.

Checked on 2026-11-27. KDP changes these pages; re-verify before relying on them.
"""

from __future__ import annotations

SOURCES = {
    "metadata": "https://kdp.amazon.com/en_US/help/topic/G201097560",
    "keywords": "https://kdp.amazon.com/en_US/help/topic/G201298500",
    "categories": "https://kdp.amazon.com/en_US/help/topic/G200652170",
    "description_html": "https://kdp.amazon.com/en_US/help/topic/G201189630",
    "formats": "https://kdp.amazon.com/en_US/help/topic/G200634390",
    "cover": "https://kdp.amazon.com/en_US/help/topic/G6GTK3T3NUHKLEFX",
    "title_rules": "https://kdp.amazon.com/en_US/help/topic/G201097560",
}

TITLE_SUBTITLE_MAX = 200
DESCRIPTION_MAX = 4000
KEYWORD_SLOTS = 7
KEYWORD_MAX = 50
CATEGORY_MAX = 3
ALLOWED_DESCRIPTION_TAGS = {"b", "i", "u", "br", "p", "h4", "h5", "h6", "ol", "ul", "li", "em", "strong"}

# eBook manuscript formats accepted by KDP (verify: KDP lists DOCX/EPUB/KPF as preferred).
MANUSCRIPT_FORMATS = {
    ".docx": "accepted (recommended)",
    ".doc": "accepted",
    ".epub": "accepted (recommended)",
    ".kpf": "accepted (Kindle Create output)",
    ".txt": "accepted (plain text; limited formatting)",
    ".rtf": "accepted",
    ".html": "accepted",
    ".pdf": "accepted but not recommended for reflowable eBooks",
    ".md": "not accepted by KDP; convert to DOCX or EPUB before upload",
    ".mobi": "no longer accepted for reflowable eBooks",
}

# Terms KDP's metadata guidelines disallow or discourage in titles/keywords.
DISALLOWED_TERMS = [
    "free",
    "bestseller",
    "best seller",
    "bestselling",
    "#1",
    "kindle unlimited",
    "kdp select",
    "on sale",
    "new release",
    "amazon",
    "kindle edition",
    "limited time",
]

COVER_IDEAL = (1600, 2560)  # width x height in pixels
COVER_IDEAL_RATIO = 1.6  # height / width
COVER_MIN_LONGEST_SIDE = 500
COVER_MAX_SIDE = 10000
COVER_MIN_DPI = 300

STATUSES = [
    "DRAFT",
    "MANUSCRIPT_READY",
    "METADATA_READY",
    "COVER_READY",
    "READY_FOR_MANUAL_UPLOAD",
    "SUBMITTED_MANUALLY",
    "IN_REVIEW",
    "LIVE",
    "UNPUBLISHED",
]
HUMAN_ONLY_STATUSES = {"SUBMITTED_MANUALLY", "IN_REVIEW", "LIVE", "UNPUBLISHED"}
