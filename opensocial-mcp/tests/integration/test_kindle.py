from opensocial.core.database import Mode
from opensocial.servers import kindle
from tests.conftest import call_tool
from tests.factories import make_docx, make_epub, make_jpeg, make_png, zip_bomb

GOOD_META = {
    "title": "Practical Mineral Processing",
    "subtitle": "A Field Guide",
    "authors": [{"name": "T. Moyo", "role": "author"}],
    "description": "<p><b>Learn the essentials.</b></p><p>"
    + "Clear guidance on comminution and flotation. " * 20
    + "</p>",
    "keywords": [
        "mineral processing",
        "flotation",
        "comminution",
        "metallurgy",
        "mining engineering",
        "ore beneficiation",
        "process plant",
    ],
    "categories": ["Engineering / Mining", "Science / Earth Sciences"],
    "language": "English",
    "publishing_rights": "own_copyright",
    "adult_content": False,
    "ai_generated_content": {"text": "none", "images": "none", "translation": "none"},
}


async def test_manuscript_formats(world, media_root):
    make_docx(media_root / "book.docx")
    make_docx(media_root / "messy.docx", headings=False, blank_runs=2, toc=False)
    make_epub(media_root / "book.epub")
    make_epub(media_root / "bad.epub", valid=False)
    (media_root / "book.md").write_text("# Chapter 1\n\nText here.\n")
    (media_root / "old.mobi").write_bytes(b"BOOKMOBI")
    good = (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "book.docx"}))["validation"]
    assert good["valid"] and good["statistics"]["headings"] == 3 and good["statistics"]["has_toc"]
    messy = (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "messy.docx"}))["validation"]
    assert any("Heading styles" in w for w in messy["warnings"])
    assert any("empty paragraphs" in w for w in messy["warnings"])
    assert (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "book.epub"}))["validation"][
        "valid"
    ]
    bad = (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "bad.epub"}))["validation"]
    assert not bad["valid"]
    md = (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "book.md"}))["validation"]
    assert not md["valid"]  # Markdown must be converted before upload
    mobi = (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "old.mobi"}))["validation"]
    assert not mobi["valid"]


async def test_zip_bomb_rejected(world, media_root):
    zip_bomb(media_root / "bomb.docx")
    result = await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "bomb.docx"})
    assert result["tool_error"]["error"] == "validation_failed"


async def test_metadata_rules(world):
    project = (await call_tool(kindle.server, "kindle_create_book_project", {"title": "Draft"}))["project"]
    ok = await call_tool(kindle.server, "kindle_prepare_metadata", {"project_id": project["project_id"], **GOOD_META})
    assert ok["validation"]["valid"], ok["validation"]
    bad = await call_tool(
        kindle.server,
        "kindle_prepare_metadata",
        {
            "project_id": project["project_id"],
            "title": "FREE Bestseller " + "x" * 200,
            "keywords": ["k"] * 8,
            "categories": ["a", "b", "c", "d"],
            "description": "<script>alert(1)</script> visit https://x.com",
        },
    )
    errors = " ".join(bad["validation"]["errors"])
    for fragment in ("200", "keyword slots", "up to 3", "Unsupported HTML", "URLs", "disallowed"):
        assert fragment in errors, fragment


async def test_cover_checks(world, media_root):
    make_jpeg(media_root / "ideal.jpg", width=1600, height=2560)
    make_jpeg(media_root / "small.jpg", width=625, height=1000, dpi=72)
    make_png(media_root / "cover.png", 1600, 2560)
    make_jpeg(media_root / "land.jpg", width=2560, height=1600)
    ideal = (await call_tool(kindle.server, "kindle_check_cover", {"file_path": "ideal.jpg"}))["cover_check"]
    assert ideal["valid"] and not ideal["warnings"]
    small = (await call_tool(kindle.server, "kindle_check_cover", {"file_path": "small.jpg"}))["cover_check"]
    assert small["valid"] and len(small["warnings"]) >= 2
    assert not (await call_tool(kindle.server, "kindle_check_cover", {"file_path": "cover.png"}))["cover_check"][
        "valid"
    ]
    assert not (await call_tool(kindle.server, "kindle_check_cover", {"file_path": "land.jpg"}))["cover_check"]["valid"]


async def test_description_versions_launch_and_status_rules(world, media_root):
    desc = await call_tool(
        kindle.server,
        "kindle_generate_description",
        {
            "hook": "Stop guessing <b>recoveries</b>",
            "synopsis": "Para one.\n\nPara two.",
            "key_points": ["A", "B"],
            "author_bio": "Engineer.",
            "closing": "Start today.",
        },
    )
    assert "&lt;b&gt;" in desc["description_html"] and "<ul>" in desc["description_html"]
    project = (await call_tool(kindle.server, "kindle_create_book_project", {"title": "Book"}))["project"]
    pid = project["project_id"]
    make_docx(media_root / "v1.docx")
    version = await call_tool(
        kindle.server, "kindle_add_version", {"project_id": pid, "file_path": "v1.docx", "label": "first draft"}
    )
    assert version["version"]["version"] == 1 and len(version["version"]["sha256"]) == 64
    early = await call_tool(
        kindle.server, "kindle_update_status", {"project_id": pid, "status": "READY_FOR_MANUAL_UPLOAD"}
    )
    assert early["tool_error"]["error"] == "validation_failed"
    live = await call_tool(kindle.server, "kindle_update_status", {"project_id": pid, "status": "LIVE"})
    assert live["tool_error"]["error"] == "permission_denied"
    plan = await call_tool(
        kindle.server,
        "kindle_generate_launch_plan",
        {"launch_date": "2027-03-01", "project_id": pid, "channels": ["YouTube"]},
    )
    assert plan["plan"][0]["date"] == "2027-01-18" and "reviews" in plan["integrity"]
    listed = await call_tool(kindle.server, "kindle_list_projects", {})
    assert len(listed["projects"]) == 1


async def test_observer_can_validate_but_not_create(world, media_root):
    world.set_mode("alice", Mode.OBSERVER)
    make_docx(media_root / "b.docx")
    assert (await call_tool(kindle.server, "kindle_validate_manuscript", {"file_path": "b.docx"}))["validation"][
        "valid"
    ]
    denied = await call_tool(kindle.server, "kindle_create_book_project", {"title": "x"})
    assert denied["tool_error"]["error"] == "permission_denied"
