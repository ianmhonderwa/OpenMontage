from pathlib import Path

from opensocial.core.config import Settings


def test_csv_environment_lists(monkeypatch):
    monkeypatch.setenv("OPENSOCIAL_MEDIA_ROOTS", "/a,/b")
    monkeypatch.setenv("OPENSOCIAL_ALLOWED_ORIGINS", "https://x.example, https://y.example")
    s = Settings(_env_file=None)
    assert s.media_roots == [Path("/a"), Path("/b")]
    assert s.allowed_origins == ["https://x.example", "https://y.example"]
    assert s.oauth_redirect_uri("youtube").endswith("/api/oauth/youtube/callback")
    assert not s.is_production


def test_env_file_override(tmp_path, monkeypatch):
    from opensocial.core.config import get_settings, reset_settings_cache

    env = tmp_path / "custom.env"
    env.write_text("OPENSOCIAL_DEMO_MODE=true\nOPENSOCIAL_META_GRAPH_VERSION=v99.0\n")
    monkeypatch.setenv("OPENSOCIAL_ENV_FILE", str(env))
    reset_settings_cache()
    try:
        assert get_settings().meta_graph_version == "v99.0"
    finally:
        reset_settings_cache()
