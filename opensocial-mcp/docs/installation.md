# Installation

These instructions assume no previous MCP experience.

## 1. Requirements

* Python **3.11, 3.12 or 3.13** (`python3 --version`)
* Git
* Node.js 20+ (only to build the dashboard)
* Optional: Docker (see [deployment.md](deployment.md))

## 2. Install

```bash
git clone https://github.com/OWNER/opensocial-mcp.git
cd opensocial-mcp
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"        # add ,postgres for PostgreSQL support
(cd dashboard && npm ci && npm run build)  # optional web dashboard
```

On Windows, use `.venv\Scripts\` in place of `.venv/bin/`.

## 3. Run the setup wizard

**Try it safely first.** Demo mode uses simulated platform APIs and touches no real account:

```bash
.venv/bin/python scripts/setup.py --demo
```

**For real use:**

```bash
.venv/bin/python scripts/setup.py --email you@example.org
```

The wizard does four things:

1. Creates `.env` (permissions 600) with a fresh encryption key.
2. Creates the database.
3. Creates your user and prints two keys:
   * **Owner key** (`osowner_…`) is for you only: the dashboard and the CLI. It can approve actions.
   * **Agent key** (`osagent_…`) is for Claude or other MCP clients. It can request actions but never approve them.
4. Writes `claude_desktop_config.generated.json`.

Keys are shown once. Store the owner key in a password manager.

## 4. Start the management server

```bash
.venv/bin/opensocial serve          # http://127.0.0.1:8080  (dashboard + API + OAuth callbacks + webhooks)
.venv/bin/opensocial scheduler      # optional, in another terminal: runs approved, scheduled posts
```

Open <http://127.0.0.1:8080> and sign in with your owner key. Your user starts in **observer** mode. To let the AI prepare drafts and request approvals, switch to **assistant** on the Security page, or run `opensocial mode set assistant`.

## 5. Get platform developer credentials

You need your own developer app for each platform you connect. Use `http://127.0.0.1:8080/api/oauth/<provider>/callback` for local testing, or your HTTPS URL in production, as the redirect URI. Put the values in `.env`.

| Platform | Where | `.env` keys | Redirect provider key |
|---|---|---|---|
| YouTube | Google Cloud Console → enable *YouTube Data API v3* and *YouTube Analytics API* → OAuth consent screen → Credentials → OAuth client ID (Web) | `OPENSOCIAL_GOOGLE_CLIENT_ID`, `OPENSOCIAL_GOOGLE_CLIENT_SECRET` | `youtube` |
| TikTok | developers.tiktok.com → Manage apps → add *Login Kit* and *Content Posting API* | `OPENSOCIAL_TIKTOK_CLIENT_KEY`, `OPENSOCIAL_TIKTOK_CLIENT_SECRET` | `tiktok` |
| Facebook Pages | developers.facebook.com → Create app (Business) → add *Facebook Login for Business* | `OPENSOCIAL_META_APP_ID`, `OPENSOCIAL_META_APP_SECRET` | `facebook` |
| Instagram (Instagram Login) | Same Meta app → add *Instagram* → *API setup with Instagram login* | `OPENSOCIAL_INSTAGRAM_APP_ID`, `OPENSOCIAL_INSTAGRAM_APP_SECRET` | `instagram` |
| Instagram (Facebook Login) | Same as Facebook, with Instagram permissions | `OPENSOCIAL_META_APP_ID`, `OPENSOCIAL_META_APP_SECRET` | `instagram-facebook` |
| WhatsApp | Meta app → add *WhatsApp* → create a system user in Business Settings with a token | `OPENSOCIAL_WHATSAPP_APP_SECRET` (the Meta app secret, used to verify webhooks), `OPENSOCIAL_WHATSAPP_VERIFY_TOKEN` (any random string you choose) | — |

While apps are in development or testing mode, only test users you add can connect. Publishing scopes need each platform's review before the public can use them. See [platform_capabilities.md](platform_capabilities.md).

Set `OPENSOCIAL_DEMO_MODE=false` in `.env` when you use real credentials.

## 6. Connect accounts

**Dashboard:** go to *Platforms*, tick the permissions you want (start with `read`), then click **Connect account**. You can connect several accounts per platform, for example two YouTube channels. Each becomes a separate account with its own ID.

**CLI:**

```bash
.venv/bin/opensocial connect youtube --tiers read,upload
# open the printed URL in your browser within 10 minutes
```

**WhatsApp Business number** (system-user token, sent once over HTTPS and stored encrypted):

```bash
curl -X POST http://127.0.0.1:8080/api/accounts/whatsapp \
  -H "X-API-Key: $OWNER_KEY" -H "Content-Type: application/json" \
  -d '{"phone_number_id":"<id>","waba_id":"<waba id>","access_token":"<system user token>"}'
```

Then, in the Meta app's WhatsApp configuration, set the webhook URL to `https://<your host>/webhooks/whatsapp`, set the verify token to `OPENSOCIAL_WHATSAPP_VERIFY_TOKEN`, and subscribe to `messages`.

**Kindle** needs no connection. Its tools work on local book projects. Put manuscripts and covers inside `OPENSOCIAL_MEDIA_ROOTS` (default `./media`).

## 7. Connect Claude

See [claude_setup.md](claude_setup.md).

## 8. Run the tests

```bash
make check          # or: .venv/bin/pytest
```

## Disconnecting

Dashboard → *Platforms* → **Disconnect** (deletes the stored tokens) or **Revoke** (also revokes them at the provider where possible). From the CLI: `opensocial disconnect <account_id>`.
