# Quality and security assessment: v1.0.0

Assessed on 27 November 2026 by the AI coding agent that built the project. This is an **internal** assessment, not independent certification. The scoring rubric is the one in the project brief and was not altered.

## Verified results

| Check | Result |
|---|---|
| Automated tests (`pytest`) | **148 passed, 0 failed** on Python 3.13 and on Python 3.11 |
| Branch-aware line coverage | **88 %** (4,662 statements) |
| Lint / format (`ruff`) | Clean |
| Static types (`mypy`, 72 files) | Clean |
| Static security (`bandit -ll`) | No medium or high findings (one medium XML finding was fixed by switching to `defusedxml`) |
| Python dependencies (`pip-audit`) | No known vulnerabilities |
| Dashboard dependencies (`npm audit --omit=dev`) | 0 vulnerabilities |
| Secret scan (`scripts/security_check.py`) | No findings |
| Dashboard `tsc` + production build | Passes |
| Real MCP stdio round trip (SDK client → `opensocial-youtube`, `-facebook`, `-core`) | Works; publish request became a pending approval |
| Generated Claude config launched from `/` | Works |
| Browser check of dashboard (Playwright, Chromium) | All six pages render, agent key refused, approve-and-run works, no console errors, no horizontal overflow at 390 px |

Test suites: unit (security primitives, media parsing, permissions, approvals, services, config, CLI, API), integration (every platform server through the MCP tool layer, OAuth flows for all five providers, HTTP error mapping with `respx`, token refresh, integration isolation), contract (documented response shapes), security (25+ attack tests), and the six required end-to-end workflows.

## Required workflows

| # | Workflow | Test | Result |
|---|---|---|---|
| 1 | YouTube: connect, read channel, prepare upload, request approval, blocked until approved | `tests/e2e/test_workflows.py::test_workflow_1…` | ✅ |
| 2 | Instagram: eligible account, prepare Reel, validate media, submit for approval | `…test_workflow_2…` | ✅ |
| 3 | One video → four independent TikTok/YouTube/Instagram/Facebook versions | `…test_workflow_3…` | ✅ |
| 4 | WhatsApp: signed webhook, forged one rejected, reply prepared, authorisation required | `…test_workflow_4…` | ✅ |
| 5 | Kindle: manuscript validated, metadata generated, checklist produced | `…test_workflow_5…` | ✅ |
| 6 | Cross-user access rejected on every platform and surface | `…test_workflow_6…` | ✅ |

All against **simulated** APIs (clearly labelled `demo-mock`).

## Security tests (selection)

Unauthenticated and revoked keys · owner key refused by MCP servers · cross-tenant accounts, approvals, content and book projects · agent key cannot approve · fabricated, swapped-content and wrong-operation approval IDs · "approved" claims in content text · prompt-injection comments flagged and inert · observer mode, mode downgrade after approval · emergency controls (publishing, messaging, shutdown) · suspended user · disconnect/revoke · tokens absent from outputs, logs, audit and database plaintext · SQL-injection payloads · SSRF (metadata IP, loopback, private ranges, DNS rebinding, credentials in URL, odd ports) · path traversal and symlink escape · zip bomb and XML entity expansion · operation and API rate limits, YouTube quota · CORS, security headers, payload size · OAuth state forgery, replay, expiry, cross-flow reuse, provider error · webhook forgery and replay · remote-HTTP bearer middleware.

## Score

| Area | Max | Score | Reason for deductions |
|---|---|---|---|
| Functional completeness | 20 | **17** | Not verified against live APIs; no schema migrations; Instagram long-lived token refresh is not automated; TikTok analytics limited to what the Display API offers |
| Security | 20 | **18** | Rate limits are per process; injection detection is heuristic; an agent with shell access on the same host can read `.env` (documented) |
| Test coverage and reliability | 20 | **17** | 88 % coverage, no live or sandbox tests; dashboard browser check run manually, not in CI |
| Architecture and maintainability | 15 | **14** | Synchronous SQLAlchemy inside async tools is fine at this scale but limits concurrency |
| Documentation | 10 | **9** | Complete, but platform values need periodic re-verification |
| User experience and accessibility | 10 | **8** | Semantic, keyboard-accessible, responsive and dark-mode aware; no automated accessibility audit; no UI component library used (plain React + CSS, deliberately dependency-light) |
| Deployment and CI/CD | 5 | **3** | Docker image and CI workflow written but **not executed**: Docker was unavailable here, and the public repository has not been created yet |
| **Total** | **100** | **86** | Below the 99 target |

## What it takes to reach the target

Highest-value items, in order:

1. **Create the public repository and run CI** (+2 deployment). Docker build and smoke test happen in CI. *Needs the owner: repository creation.*
2. **Live sandbox testing** with each platform's test users (+3 functional, +2 tests). *Needs the owner: developer apps and test accounts.*
3. Automated dashboard tests (Playwright plus axe accessibility checks) in CI (+1 tests, +1 UX).
4. Alembic migrations and automated Instagram token refresh (+1 functional).
5. A shared (Redis) rate limiter and an OAuth 2.1 authorisation server for remote MCP (+1 security, +1 functional).

Items 3–5 can be done without the owner's involvement in a follow-up session.

## Roadmap

* LinkedIn, Pinterest, X and Threads integrations through the plugin pattern in [contributing.md](contributing.md).
* OAuth 2.1 for remote MCP (claude.ai custom connectors).
* Data-retention policies and per-conversation deletion for WhatsApp.
* Resumable uploads for very large TikTok/YouTube files, with progress reporting.
* Per-user notification of pending approvals (e-mail or push).
