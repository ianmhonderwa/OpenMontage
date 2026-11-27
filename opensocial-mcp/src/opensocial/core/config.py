"""Runtime configuration loaded from environment variables (prefix ``OPENSOCIAL_``).

Secrets are only ever read from the environment or a mounted secret file. Nothing secret
has a default value.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OPENSOCIAL_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        secrets_dir=None,
    )

    environment: str = Field("development", description="development | test | production")
    database_url: str = "sqlite:///./opensocial.db"
    encryption_keys: SecretStr | None = Field(
        None,
        description="Comma-separated Fernet keys. The first key encrypts; all keys decrypt (rotation).",
    )
    demo_mode: bool = Field(False, description="Use simulated platform APIs. Every response is labelled 'demo-mock'.")
    api_key: SecretStr | None = Field(
        None, description="Agent API key used by MCP servers to identify the acting user."
    )
    public_base_url: str = "http://127.0.0.1:8080"
    allowed_origins: list[str] = ["http://127.0.0.1:8080", "http://localhost:5173"]
    media_roots: list[Path] = Field(
        default_factory=lambda: [Path("./media")],
        description="Only files inside these directories may be read by MCP tools.",
    )
    approval_ttl_hours: int = 72
    oauth_state_ttl_minutes: int = 10
    api_rate_limit_per_minute: int = 120
    http_timeout_seconds: float = 30.0

    # Platform API versions (verify against official changelogs before upgrading).
    meta_graph_version: str = "v26.0"

    # Platform application credentials (your own developer apps). Never commit these.
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None
    tiktok_client_key: str | None = None
    tiktok_client_secret: SecretStr | None = None
    meta_app_id: str | None = None
    meta_app_secret: SecretStr | None = None
    instagram_app_id: str | None = None
    instagram_app_secret: SecretStr | None = None
    whatsapp_app_secret: SecretStr | None = None
    whatsapp_verify_token: SecretStr | None = None

    @field_validator("allowed_origins", "media_roots", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    def oauth_redirect_uri(self, platform: str) -> str:
        return f"{self.public_base_url.rstrip('/')}/api/oauth/{platform}/callback"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
