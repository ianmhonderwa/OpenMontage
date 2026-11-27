# Privacy

OpenSocial MCP is self-hosted software. The maintainers receive no data from installations; there is no telemetry.

## What an installation stores

| Data | Where | Notes |
|---|---|---|
| User e-mail, display name, mode | `users` | Needed for identification |
| API key hashes | `api_keys` | Plaintext keys are never stored |
| Platform account IDs, names, granted scopes, token expiry | `accounts` | Needed for tenancy and permission checks |
| Access/refresh tokens | `credentials` | Encrypted; deleted on disconnect/revoke |
| Approval requests (proposed content) | `approvals` | Shown to the owner for review |
| Audit log | `audit_log` | Redacted; no tokens; no message bodies |
| Content drafts, brand profiles, book projects | respective tables | User-created |
| WhatsApp conversations (customer numbers, names, message text) | `conversations`, `messages` | Personal data of the business's customers |
| Collected metrics | `metric_snapshots` | Aggregates returned by the platforms |

## Operator responsibilities

* You are the data controller for your customers' data, including WhatsApp conversations. Publish a privacy notice, respect deletion requests, and define a retention period. Database rows can be deleted with standard SQL; automated retention is on the roadmap.
* Data sent to an AI client (tool results) is processed under that client's terms. Choose tools and modes accordingly: for example, keep WhatsApp in `observer` or `assistant` mode.
* Platform data must be used in line with each platform's developer policies, including deletion obligations when a user disconnects.
* Tests and demo mode use fictional data only. Never put real personal data into fixtures or issues.
