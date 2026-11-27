# Contributing

Thank you for helping. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## Ground rules

1. **Official APIs only.** Every endpoint, scope and limit must come from the platform's official documentation. Cite the source in a comment or in `docs/platform_capabilities.md`. No scraping, browser automation or reverse-engineered APIs.
2. **Every external action goes through `Runtime.execute`**, which gives you approval, audit, scopes, rate limits and tenant isolation. Never call a platform client directly from a tool.
3. **No real credentials or account data** in code, tests, fixtures, issues or pull requests. Use the simulated transport (`opensocial.integrations.mock`) and `respx`.
4. **Do not label unsupported functionality as supported.** If a platform cannot do something, document the limitation and offer a compliant alternative.
5. **Tests are required** for every new tool: success path, permission denial and validation failure.

## Workflow

```bash
make install
make check            # must pass before you open a pull request
```

Use Conventional Commit style messages (`feat:`, `fix:`, `docs:`, `security:`) and update `CHANGELOG.md`.

The developer guide in [docs/contributing.md](docs/contributing.md) explains how to add a new platform integration, for example LinkedIn, Pinterest or X.
