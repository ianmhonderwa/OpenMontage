# Security

Security is part of the design, not an add-on. This page describes what is implemented and what you must do as an operator. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

## Credentials

* **OAuth 2.0** for YouTube, TikTok, Facebook and Instagram, with **PKCE** for Google. Least privilege is the default: only the `read` tier is requested unless you add tiers (`--tiers read,upload`).
* Access and refresh tokens are **encrypted at rest** with Fernet (AES-128-CBC + HMAC-SHA256). `OPENSOCIAL_ENCRYPTION_KEYS` accepts several comma-separated keys: the first encrypts, all decrypt. To rotate, put the new key first, re-save tokens (reconnect or refresh), then remove the old key.
* Tokens are refreshed automatically shortly before they expire where the provider issues refresh tokens. Rotated refresh tokens replace the old ones.
* `disconnect` deletes the stored tokens. `revoke` also asks the provider to revoke them where it offers an endpoint (Google, TikTok). For Meta, remove the app under *Settings → Business integrations* as well.
* API keys are random 256-bit values, stored as SHA-256 hashes, and shown once.
* In production, inject secrets from a secret manager (Docker/Kubernetes secrets, Vault, cloud secret stores) as environment variables. Never commit `.env`.

## Permissions and approvals

| Mode | Read/analyse | Local drafts | Publish / edit / message | Delete |
|---|---|---|---|---|
| `observer` (default) | ✅ | ❌ | ❌ | ❌ |
| `assistant` | ✅ | ✅ | owner approval | owner approval |
| `authorised_manager` | ✅ | ✅ | autonomous only where the account has autonomy enabled, for the listed kinds, under its daily limit; otherwise approval | owner approval |

Switching to `observer` takes effect immediately, including for requests that were already approved. Approvals record the operation, platform, account, exact content, schedule, requester and approver.

## Application security

* **Input validation**: Pydantic schemas on every tool and route, plus platform limits (caption lengths, hashtags, file types and sizes).
* **SQL injection**: ORM and bound parameters only.
* **SSRF**: `validate_public_url` on every URL that is sent to a platform or fetched.
* **CSRF**: the API authenticates with headers, not cookies, so browsers cannot attach credentials cross-site. The OAuth callback is protected by the single-use state value. CORS is restricted to `OPENSOCIAL_ALLOWED_ORIGINS`.
* **Headers**: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS when served over HTTPS, and `Cache-Control: no-store` on the API.
* **Rate limits**: per API client (HTTP) and per account and kind (operations), plus a YouTube quota budget.
* **Webhooks**: HMAC signature verification, a 1 MB size limit, de-duplication, and safe routing.
* **Remote MCP**: every HTTP request must carry `Authorization: Bearer osagent_…`. The server's own key is ignored in HTTP mode.
* **Prompt injection**: third-party text is wrapped with `untrusted: true` and suspicious patterns are flagged. Servers instruct clients to treat it as data.
* **Dependency scanning**: `pip-audit`, `npm audit`, Bandit and Dependabot, all run in CI.

## Audit

Each tool call, decision and administrative action is recorded with user, actor (agent, owner or system), account, platform, tool, operation, kind, approval ID and status, outcome and failure reason. Entries are redacted before storage. Content is not copied into the audit log; the approval record holds it.

## Emergency controls

| Control | API | CLI |
|---|---|---|
| Disconnect / revoke one account | `POST /api/accounts/{id}/disconnect` / `revoke` | `opensocial disconnect ID` |
| Revoke an API key | `POST /api/me/keys/{id}/revoke` | — |
| Disable all publishing / messaging | `POST /api/controls` (admin) | `opensocial controls --disable-publishing` / `--disable-messaging` |
| Suspend a user | `POST /api/users/{id}/suspend` (admin) | — |
| Emergency shutdown | `POST /api/controls {"shutdown": true}` | `opensocial controls --shutdown` |
| Revoke AI autonomy | `PUT /api/me/mode {"mode": "observer"}` | `opensocial mode set observer` |

## Operator checklist

- [ ] Serve the API over HTTPS behind a reverse proxy; set `OPENSOCIAL_PUBLIC_BASE_URL` to the https URL.
- [ ] Keep the owner key out of every AI tool's environment, shell and prompt.
- [ ] Store `OPENSOCIAL_ENCRYPTION_KEYS` and app secrets in a secret manager; back up the key separately from the database.
- [ ] Use PostgreSQL with TLS and least-privilege database credentials in production.
- [ ] Restrict `OPENSOCIAL_MEDIA_ROOTS` to a dedicated directory.
- [ ] Register exact OAuth redirect URIs (`…/api/oauth/<provider>/callback`) with each provider.
- [ ] Review the audit log and pending approvals regularly.

## Residual risks

* **An AI agent with shell access** (for example Claude Code) can read anything that shell can, including `.env`. Run the API and database under a separate user or host, and do not give agents your owner key. An agent holding the owner key could approve its own requests.
* **Rate limits are per process.** Run one API instance, or put a shared limiter at the gateway.
* **Injection detection is heuristic.** Flags help; the hard guarantee is that external actions still need approval.
* **Demo-mode fixtures** are not a substitute for live testing with real platform test accounts.
