from opensocial.core.media import inspect_media, parse_mp4, validate_for
from tests.factories import make_jpeg, make_mp4, make_png


def test_mp4_parsing(tmp_path):
    path = make_mp4(tmp_path / "v.mp4", width=1080, height=1920, seconds=42.5)
    info = inspect_media(path)
    assert (info.kind, info.container) == ("video", "mp4")
    assert (info.width, info.height) == (1080, 1920)
    assert abs(info.duration_seconds - 42.5) < 0.01
    assert info.to_dict()["path"] == "v.mp4"


def test_parse_mp4_garbage_is_safe():
    assert parse_mp4(b"\x00\x00\x00\x01junk") == {}


def test_short_vs_video_requirements(tmp_path):
    vertical = inspect_media(make_mp4(tmp_path / "s.mp4", seconds=60))
    landscape = inspect_media(make_mp4(tmp_path / "l.mp4", width=1920, height=1080, seconds=60))
    long = inspect_media(make_mp4(tmp_path / "long.mp4", seconds=200))
    assert validate_for(vertical, "youtube:short")["valid"]
    assert not validate_for(landscape, "youtube:short")["valid"]
    assert not validate_for(long, "youtube:short")["valid"]
    assert validate_for(landscape, "youtube:video")["valid"]


def test_instagram_rules(tmp_path):
    reel_short = inspect_media(make_mp4(tmp_path / "r.mp4", seconds=2))
    assert not validate_for(reel_short, "instagram:reel")["valid"]
    png = inspect_media(make_png(tmp_path / "p.png"))
    assert not validate_for(png, "instagram:image")["valid"]  # JPEG only
    wide = inspect_media(make_jpeg(tmp_path / "w.jpg", width=1440, height=500))
    assert not validate_for(wide, "instagram:image")["valid"]
    ok = inspect_media(make_jpeg(tmp_path / "ok.jpg", width=1080, height=1350))
    assert validate_for(ok, "instagram:image")["valid"]


def test_one_file_not_assumed_valid_everywhere(tmp_path):
    info = inspect_media(make_mp4(tmp_path / "x.mp4", width=1920, height=1080, seconds=200))
    results = {k: validate_for(info, k)["valid"] for k in ("youtube:video", "youtube:short", "instagram:reel")}
    assert results == {"youtube:video": True, "youtube:short": False, "instagram:reel": True}


def test_tiktok_duration_override(tmp_path):
    info = inspect_media(make_mp4(tmp_path / "t.mp4", seconds=700))
    assert validate_for(info, "tiktok:video")["valid"]
    assert not validate_for(info, "tiktok:video", max_duration_override=600)["valid"]
