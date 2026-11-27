# Deployment

## Docker Compose (API + dashboard, scheduler, PostgreSQL)

```bash
cp .env.example .env
# set OPENSOCIAL_ENCRYPTION_KEYS (opensocial generate-key or: python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"),
# POSTGRES_PASSWORD, OPENSOCIAL_PUBLIC_BASE_URL=https://your.host, OPENSOCIAL_DEMO_MODE=false and app credentials
docker compose up -d --build
docker compose exec api opensocial create-user --email you@example.org --admin
```

The API listens on `127.0.0.1:8080`. Put a TLS-terminating reverse proxy in front of it, for example Caddy:

```
your.host {
    reverse_proxy 127.0.0.1:8080
}
```

Containers run as a non-root user with read-only root filesystems and `no-new-privileges`.

## Production checklist

* HTTPS only; `OPENSOCIAL_PUBLIC_BASE_URL` set to the https origin (this also enables HSTS).
* `OPENSOCIAL_ENVIRONMENT=production`, `OPENSOCIAL_DEMO_MODE=false`.
* Secrets from a secret manager, not baked into images.
* PostgreSQL backups. Back up the encryption key **separately**: without it, stored tokens cannot be decrypted (accounts would need reconnecting).
* One API instance (rate limits are per process), or a shared rate limiter at the gateway.
* Monitor `GET /api/health` (`scripts/health_check.py https://your.host`).

## Remote MCP servers

Run each platform server with `--http` on its own internal port and expose it through the same proxy, for example `/youtube/mcp` → `127.0.0.1:8101`. See [claude_setup.md](claude_setup.md#remote-servers-streamable-http).

## Database migrations

v1.0 creates tables on start. There are no schema migrations yet (Alembic is on the roadmap). Before upgrading, back up the database and read the CHANGELOG.

## Status of this guide

The Dockerfile and compose file were written and reviewed, but **not built in the development environment** (Docker was unavailable there). The CI workflow builds the image and smoke-tests `/api/health` on every push.
