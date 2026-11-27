# Connecting Claude and other MCP clients

Each integration is an independent MCP server. Install only the ones you need:

| Server command | Tools for |
|---|---|
| `opensocial-youtube` | YouTube channels |
| `opensocial-tiktok` | TikTok creator accounts |
| `opensocial-facebook` | Facebook Pages |
| `opensocial-instagram` | Instagram professional accounts |
| `opensocial-whatsapp` | WhatsApp Business numbers |
| `opensocial-kindle` | Kindle publishing assistant |
| `opensocial-core` | Content adaptation, brands, calendar, approvals (read-only), analytics, reports |

All servers need two environment variables:

* `OPENSOCIAL_API_KEY`: your **agent** key (`osagent_…`). Never your owner key; servers reject owner keys.
* `OPENSOCIAL_ENV_FILE`: the absolute path to your `.env`, because clients start servers from an unpredictable working directory.

## Claude Desktop (local, stdio)

1. Run `python scripts/setup.py` (it writes `claude_desktop_config.generated.json`), or copy [`examples/claude_desktop_config.json`](../examples/claude_desktop_config.json) and replace the paths and key.
2. Open Claude Desktop → *Settings* → *Developer* → *Edit Config*. Merge the `mcpServers` entries into `claude_desktop_config.json`.
3. Restart Claude Desktop. The tools appear in the tools menu.

Treat that config file as private: it contains your agent key.

## Claude Code (local, stdio)

```bash
claude mcp add opensocial-youtube \
  -e OPENSOCIAL_ENV_FILE=/abs/path/opensocial-mcp/.env \
  -e OPENSOCIAL_API_KEY=osagent_xxx \
  -- /abs/path/opensocial-mcp/.venv/bin/opensocial-youtube
```

Repeat for each server you want. **Caution:** Claude Code can also run shell commands. Keep the OpenSocial `.env`, database and owner key out of directories the agent works in, or run OpenSocial under a different OS user. See [security.md](security.md#residual-risks).

## Remote servers (Streamable HTTP)

Run a server over HTTP on a host you control, behind TLS:

```bash
OPENSOCIAL_ENV_FILE=/srv/opensocial/.env opensocial-youtube --http --host 127.0.0.1 --port 8101
# put a reverse proxy with HTTPS in front, exposing e.g. https://mcp.example.org/youtube/mcp
```

Every request must send `Authorization: Bearer osagent_…`. Each request is authenticated with its own key, and the server's own key is ignored, so several users can share one deployment with their own agent keys.

Clients that support remote MCP servers with custom headers (for example Claude Code: `claude mcp add --transport http opensocial-youtube https://mcp.example.org/youtube/mcp --header "Authorization: Bearer osagent_xxx"`) work directly.

**Not yet supported:** the custom connectors on claude.ai and Claude Desktop that expect the server to act as an OAuth 2.1 authorisation server. Claude products differ in how they configure remote connectors, so check the current Anthropic documentation for your product. OAuth-based MCP authorisation is on the roadmap.

## Other MCP clients

Any client that can launch a stdio server with environment variables, or call a Streamable HTTP endpoint with a bearer header, can use OpenSocial. The command and environment variables are the same as above.

## Tool permissions in the client

Many clients let you require confirmation per tool. A sensible setup is to auto-allow read tools (annotated `readOnlyHint`) and to require confirmation for publish and delete tools. This is an extra layer: OpenSocial's own approval queue is enforced on the server whatever the client does.

## Example conversation

> **You:** Turn my note about flotation particle size into a YouTube Short, a TikTok and an Instagram Reel using the Ore Academy brand, and queue them for my approval.
>
> **Claude** calls `opensocial_create_content`, then `opensocial_adapt_content`, edits the variants and calls `opensocial_submit_variant` for each. It reports three `approval_required` results.
>
> **You** review and approve them in the dashboard's *Approvals* page.

## Disconnecting

To remove a server, delete its entry from the client config. To cut off the AI immediately, revoke the agent key (dashboard → *Security*) or set mode to `observer`.
