# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en-GB/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-27

### Added
- Seven MCP servers (YouTube, TikTok, Facebook Pages, Instagram, WhatsApp Business, Kindle assistant, core) on the official MCP Python SDK 2.x, with stdio and authenticated Streamable HTTP transports.
- Guarded runtime: tenant isolation, observer/assistant/authorised-manager modes, scope checks, emergency controls, rate limits and YouTube quota budget, content-bound single-use approvals, redacted audit log.
- OAuth 2.0 connection flows (PKCE where supported) for Google, TikTok, Facebook and Instagram (both login types); WhatsApp system-user token registration; encrypted token storage with key rotation and token refresh.
- Unified content engine with per-platform adaptation, brand profiles, calendar, scheduler, analytics and reports.
- WhatsApp webhook verification (HMAC-SHA256), replay protection, 24-hour window, opt-in and escalation safeguards.
- Kindle manuscript (DOCX/EPUB/TXT), cover and metadata validation, checklists, versions and launch plans.
- FastAPI management API, React + TypeScript dashboard, CLI and setup wizard.
- Simulated platform APIs (demo mode) and 150+ automated tests (unit, integration, contract, security, end-to-end).
- Docker image, docker-compose with PostgreSQL, GitHub Actions CI, release workflow and Dependabot.

### Known limitations
- Live integration tests against real platform accounts are pending (developer credentials and app reviews required).
