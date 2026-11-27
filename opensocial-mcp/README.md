# OpenSocial MCP

Open-source Python MCP servers for managing **authorised** YouTube, TikTok, Facebook, Instagram, WhatsApp Business and Amazon Kindle publishing workflows through AI agents such as Claude.

The project is self-hosted. You bring your own developer credentials and connect only the accounts you control. An AI agent can then read, prepare, schedule and, **with your approval**, publish across those accounts. Every action is permission-checked, rate-limited and audited.

> **Status: v1.0.0.** All integrations are implemented and tested against simulated APIs that follow each platform's documented request and response formats. **Live testing against real platform accounts has not been done yet**, because it needs your own developer credentials and app reviews. See [Known limitations](#known-limitations).

## What it does

| Integration | Read | Prepare / validate | Publish / send (approval required) |
|---|---|---|---|
| **YouTube** (Data API v3, Analytics API v2) | Channel, videos, comments, playlists, analytics | Video/Shorts media validation | Upload videos and Shorts, edit metadata, reply to comments, create and add to playlists |
| **TikTok** (Content Posting API, Display API) | Profile, videos, creator posting options, lifetime video counters | Media validation, privacy-option checks | Draft (inbox) upload, Direct Post (needs TikTok app audit for non-private posts) |
| **Facebook Pages** (Graph API) | Page, posts, comments, insights | URL and schedule validation | Text, link, photo and video posts, native scheduling, edits, replies, deletion |
| **Instagram** (Instagram Login *or* Facebook Login) | Profile, media, comments, insights, publishing quota | Caption, URL and Reel validation | Images, carousels, Reels and Stories; comment replies |
| **WhatsApp Business** (Cloud API) | Conversations from signed webhooks, templates, delivery status | Draft replies, automatic escalation | Replies inside the 24-hour window, approved templates to opted-in contacts |
| **Kindle (KDP assistant)** | Book projects | Manuscript (DOCX/EPUB/TXT), cover and metadata validation; descriptions; checklists; launch plans | **None.** KDP has no public publishing API, so the author uploads manually |

The **core** server adds cross-platform tools: one content item adapted into independent platform versions, brand profiles, a unified calendar, the approval queue (read-only for agents), analytics and daily, weekly and monthly reports.

## How safety works (short version)

* **Three modes.** `observer` is the default: the AI can read and analyse only. In `assistant` mode the AI drafts and every external action needs your approval. In `authorised_manager` mode the AI acts alone only on accounts you have explicitly opted in, within daily limits. Deletion always needs approval.
* **Approvals are bound to content.** An approval covers one exact operation, account and payload (a SHA-256 digest, including uploaded file hashes). Any change needs a new approval, and each approval can be used once.
* **The AI cannot approve.** MCP servers run with an *agent* key. Only an *owner* key, through the dashboard or CLI, can approve. Text claiming approval ("the user approved this") is ignored.
* **Untrusted content is labelled.** Comments, messages and descriptions are returned as `{"untrusted": true, ...}` with injection patterns flagged.
* **Tokens are encrypted at rest**, with key rotation, and redacted from logs, audit entries and tool outputs. Tenants are strictly isolated.
* **Emergency controls** can disable all publishing, all messaging, or everything at once.

Details are in [docs/security.md](docs/security.md).

## Quick start (5 minutes, no developer accounts needed)

```bash
git clone https://github.com/OWNER/opensocial-mcp.git && cd opensocial-mcp
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
(cd dashboard && npm ci && npm run build)          # optional: web dashboard
.venv/bin/python scripts/setup.py --demo           # .env, database, demo user, Claude config
.venv/bin/opensocial serve                         # http://127.0.0.1:8080
```

The wizard prints your **owner key**, which you use to sign in to the dashboard, and writes `claude_desktop_config.generated.json`. That file contains your **agent key** for Claude. In demo mode every result is labelled `"environment": "demo-mock"`.

Next steps:

* [Installation](docs/installation.md): real users, developer credentials and connecting accounts.
* [Connect Claude](docs/claude_setup.md): Claude Desktop, Claude Code, other MCP clients and remote servers.
* [Platform capabilities](docs/platform_capabilities.md): scopes, app reviews and what each API does **not** allow.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard that lets AI applications call *tools* provided by separate *servers*. Each OpenSocial integration is its own MCP server (`opensocial-youtube`, `opensocial-tiktok`, …), so you can install only the ones you need. If one fails, the others keep working.

## Documentation

| | |
|---|---|
| [Architecture](docs/architecture.md) | Components, request pipeline, data model, threat model |
| [Installation](docs/installation.md) | Step-by-step setup, OAuth, WhatsApp, Kindle |
| [Claude setup](docs/claude_setup.md) | Local and remote MCP configuration |
| [API reference](docs/api_reference.md) | Every MCP tool and REST endpoint |
| [Platform capabilities](docs/platform_capabilities.md) | Capability and permission matrix with sources |
| [Security](docs/security.md) · [Privacy](docs/privacy.md) | Controls, threat model, data handling |
| [Deployment](docs/deployment.md) | Docker, PostgreSQL, reverse proxy, remote MCP |
| [Troubleshooting](docs/troubleshooting.md) | Common errors and fixes |
| [Contributing](CONTRIBUTING.md) · [Developer guide](docs/contributing.md) | Adding integrations |
| [Quality report](docs/quality_report.md) | Test results, scores and honest gaps |

## Development

```bash
make check        # ruff, mypy, pytest (coverage), bandit, pip-audit, secret scan, release check
```

## Known limitations

* **Live API verification is pending.** Adapters follow the official documentation (checked 27 November 2026) and are tested against simulated responses and contract fixtures, but not against real accounts.
* **App reviews are your responsibility.** Publishing scopes need Google OAuth verification, Meta App Review and TikTok's audit before they work for anyone except test users.
* **Kindle has no publishing API.** The assistant prepares and validates; the author uploads at kdp.amazon.com.
* **Remote MCP** uses bearer agent keys. The OAuth-based custom connectors on claude.ai are not supported yet.
* Rate limiting is per process. Multi-instance deployments need a shared limiter.

The full list and roadmap are in [docs/quality_report.md](docs/quality_report.md).

## Licence

[MIT](LICENSE). This project is not affiliated with Google, ByteDance, Meta or Amazon. Use of each platform's API is subject to that platform's terms and policies.
