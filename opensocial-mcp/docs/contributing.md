# Developer guide: adding an integration

This example adds a hypothetical **LinkedIn** integration. The same steps apply to Pinterest, X or any other platform with an official API.

1. **Research and document** the official endpoints, scopes, limits and review requirements. Add a section to `docs/platform_capabilities.md` with links.
2. **Platform enum:** add `LINKEDIN = "linkedin"` to `Platform` in `core/database.py`.
3. **Client:** create `integrations/linkedin/client.py` subclassing `PlatformClient`. Override `_raise_for_body` if the API reports errors inside 200 responses.
4. **Operations:** create `integrations/linkedin/operations.py`:

   ```python
   @operation("linkedin_create_post", Platform.LINKEDIN, Kind.PUBLISH,
              summary=lambda p: f"Publish LinkedIn post: {p['text'][:80]}", scopes=("w_member_social",))
   async def create_post(ctx: OperationContext, params: dict) -> dict:
       body = await ctx.client(LinkedInClient).create_post(ctx.account.external_id, params["text"])
       return {"published": True, "post_id": body.get("id")}
   ```

   Wrap third-party text with `untrusted(...)`. Validate inputs in a `build_*_params` helper so the approval binds validated values.
5. **OAuth:** register an `OAuthProvider` in `integrations/registry.py` with `read` and opt-in tiers, and add the module to `INTEGRATION_MODULES`.
6. **Simulated API:** add routes to `integrations/mock.py` that return documented response shapes.
7. **MCP server:** create `servers/linkedin.py` using `new_server(...)`, `describe(...)`, `tool_annotations(...)` and `run(...)`, and add a `[project.scripts]` entry.
8. **Tests:** integration tests (reads, approval flow, validation), a contract test for each response shape you rely on, and a cross-tenant test.
9. **Docs:** run `python scripts/gen_api_reference.py`, then update the README table and CHANGELOG.

Never call a client from outside an operation executor. The runtime is what enforces approvals, scopes, tenancy, rate limits and audit.
