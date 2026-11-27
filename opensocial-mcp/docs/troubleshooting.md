# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `authentication_failed: An API key is required` | `OPENSOCIAL_API_KEY` is not set in the MCP client's server `env` block. |
| `MCP servers must be configured with an agent key` | You used an owner key in the MCP config. Use the `osagent_…` key. |
| `permission_denied: OBSERVER mode does not allow…` | Expected default. Switch with `opensocial mode set assistant` or on the dashboard's *Security* page. |
| `status: approval_required` | Working as designed. Approve in the dashboard (*Approvals*) or with `opensocial approvals approve <id>`, then ask the AI to retry with the `approval_id`. |
| `The approved content does not match this request` | Something changed after approval (text, account, file). Each change needs a new approval. |
| `missing_scopes` in the error details | Reconnect the account with the needed tier, e.g. `opensocial connect youtube --tiers read,upload`. |
| `Account is expired` / `token_expired` | Reconnect the account. Instagram long-lived tokens last about 60 days. |
| `File is outside the configured media roots` | Put the file under `OPENSOCIAL_MEDIA_ROOTS` (absolute paths are recommended). |
| `URL resolves to a private… address` | Instagram and Facebook fetch media from public HTTPS URLs; host the file publicly. |
| TikTok `privacy_level … is not available` | Unaudited TikTok apps can only post `SELF_ONLY`. Use the draft upload or complete TikTok's audit. |
| `Emergency shutdown is active` | An administrator enabled a kill switch: `opensocial controls --resume` / `--enable-publishing`. |
| `rate_limited` | Wait for `retry_after_seconds`. Limits are in `core/rate_limits.py`. |
| WhatsApp webhook returns 401 | `OPENSOCIAL_WHATSAPP_APP_SECRET` does not match the Meta app secret. |
| WhatsApp webhook returns 503 | No app secret configured. |
| `Stored credential could not be decrypted` | The encryption key changed. Restore the old key (keep it after the new one in `OPENSOCIAL_ENCRYPTION_KEYS`) or reconnect the accounts. |
| `SettingsError … media_roots` | Fixed in 1.0.0: comma-separated lists are accepted. Upgrade. |
| Claude Desktop shows no tools | Use absolute paths for `command` and `OPENSOCIAL_ENV_FILE`; check Claude's MCP logs; run the command in a terminal to see errors (logs go to stderr). |

Run `opensocial health` for a configuration summary. Errors never include tokens; if you see something token-shaped in a log, please report it via [SECURITY.md](../SECURITY.md).
