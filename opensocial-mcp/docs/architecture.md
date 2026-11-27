# Architecture

```
 Claude / other MCP client                Owner (browser / terminal)
        │ stdio or HTTP + agent key                │ owner key
        ▼                                          ▼
 ┌────────────────────────────┐          ┌───────────────────────────┐
 │ MCP servers (one per       │          │ FastAPI management API    │
 │ platform + core)           │          │  dashboard · OAuth ·      │
 │  thin tool adapters        │          │  approvals · webhooks     │
 └─────────────┬──────────────┘          └─────────────┬─────────────┘
               │            Runtime.execute()           │
               └──────────────────┬─────────────────────┘
                                  ▼
  authenticate → tenant check → emergency controls → mode & scopes → rate limit
  → approval (create | verify digest, single use) → executor → redact → audit
                                  │
          ┌───────────────────────┼─────────────────────────┐
          ▼                       ▼                         ▼
  integrations/<platform>   services/ (content, brand,   core/ (database, security,
  async HTTPX clients        calendar, analytics,        approvals, audit, media,
  official endpoints         reports, publishing)        scheduler, config)
          │
          ▼  (demo mode: httpx.MockTransport — no network)
  YouTube · TikTok · Meta Graph · WhatsApp Cloud API
```

## Key ideas

1. **One guarded pipeline.** Every MCP tool, every API route that touches platform data, and every scheduled job calls `Runtime.execute(principal, operation, params, ...)`. Policy lives in one place (`core/permissions.py`, `core/approvals.py`, `core/runtime.py`), so the dashboard and the MCP servers cannot drift apart, and bypassing the dashboard bypasses nothing.
2. **Operations are declared, not hand-wired.** Each integration registers operations with `@operation(name, platform, kind, scopes=...)`. The *kind* (read, analyse, prepare, edit, publish, message, delete) drives the mode policy, approval needs, rate limits and tool annotations.
3. **Independent integrations.** `integrations/registry.py` imports each platform separately and records failures without stopping the others. Each platform also has its own MCP server process.
4. **Approvals bind content.** The digest covers the operation, account and canonical parameters, including file SHA-256 for uploads. An approval is single-use and expires (72 hours by default).
5. **Two key roles.** *Agent* keys (MCP) can request; *owner* keys (dashboard/CLI) can approve, connect, disconnect and change modes. MCP servers refuse to start a tool call with an owner key.

## Data model (SQLAlchemy 2)

`User` · `ApiKey` (hashed, role) · `Account` (platform, external id, status, scopes, expiry, autonomy) · `Credential` (Fernet-encrypted tokens) · `OAuthState` (hashed state, encrypted PKCE verifier, single use) · `ApprovalRequest` · `AuditLog` · `SystemControl` · `BrandProfile` · `ContentItem` / `ContentVariant` · `MetricSnapshot` · `Conversation` / `Message` · `WebhookReceipt` · `BookProject`.

SQLite is used for development and tests, PostgreSQL (`psycopg`) for production. Tables are created on start. Migrations (Alembic) are on the roadmap.

## Module map

| Path | Responsibility |
|---|---|
| `core/config.py` | Settings from `OPENSOCIAL_*` env vars / `.env` (`OPENSOCIAL_ENV_FILE`) |
| `core/security.py` | Encryption, redaction, HMAC, SSRF guard, media path confinement, untrusted-text wrapping |
| `core/authentication.py` | Users, API keys, OAuth state + PKCE |
| `core/permissions.py` | Modes, kinds, tenant lookup, policy |
| `core/approvals.py` · `core/audit.py` · `core/rate_limits.py` | Approval queue, audit trail, limits and quota |
| `core/runtime.py` | The guarded pipeline and operation registry |
| `core/media.py` | Media inspection (MP4 parser, Pillow) and per-platform requirements |
| `core/scheduler.py` | APScheduler job that runs due, approved operations |
| `integrations/*` | Platform clients and operations; `oauth.py`, `registry.py`, `mock.py` |
| `services/*` | Content, brand, publishing, calendar, analytics, reporting, core operations |
| `servers/*` | MCP servers (`MCPServer` from the MCP Python SDK 2.x) |
| `api/*` | FastAPI app, routes, webhooks, security middleware |
| `cli/main.py` | `opensocial` command |
| `dashboard/` | React + TypeScript (Vite) single-page app |

## Threat model (summary)

| Threat | Mitigation |
|---|---|
| AI publishes without consent | Modes; approval queue; agent keys cannot approve; content digest; single use; expiry |
| Prompt injection via comments/messages | Untrusted wrapping and flags; server instructions; injected text cannot create or approve anything without a tool call that still needs owner approval |
| Cross-tenant access | Every lookup filters by owner; foreign IDs return "not found" |
| Token theft from the database | Fernet encryption at rest, keys outside the database, rotation |
| Token leakage in logs/outputs | Redaction of keys and token patterns in logs, audit, errors and tool results |
| OAuth CSRF / replay | Random state stored hashed, bound to user and flow, 10-minute expiry, single use; PKCE where supported |
| Webhook forgery / replay | HMAC-SHA256 verification, constant-time compare, body-digest de-duplication, routing only to a single matching account |
| SSRF via media URLs | HTTPS only, no credentials, standard ports, DNS resolution with private/loopback/link-local/metadata rejection |
| Local file exfiltration | Tools read files only inside `OPENSOCIAL_MEDIA_ROOTS`; symlinks resolved |
| Malicious documents | Zip-bomb limits, path checks, `defusedxml` |
| Runaway agent | Per-kind rate limits, YouTube quota budget, daily autonomy caps, emergency switches |

Residual risks are listed in [security.md](security.md#residual-risks).
