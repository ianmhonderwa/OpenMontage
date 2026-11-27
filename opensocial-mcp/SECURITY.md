# Security policy

## Reporting a vulnerability

**Please do not open a public issue.** Report vulnerabilities privately using GitHub's **Report a vulnerability** button, which opens a private security advisory in this repository.

Please include:
- a description and the potential impact;
- steps to reproduce, or a proof of concept;
- the affected version (`opensocial version`) and configuration (without secrets).

We aim to acknowledge reports within 3 working days and to agree a disclosure timeline with you. Please give us reasonable time to release a fix before any public disclosure. We will credit you unless you prefer otherwise.

**Never include real tokens, API keys, customer data or personal data in a report.** If a credential has been exposed, revoke it first, at the platform and with `opensocial disconnect` or by revoking the API key.

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |

## Scope

In scope: authentication and authorisation bypasses, approval bypasses, cross-tenant data access, credential leakage, injection (SQL, SSRF, path traversal, XML), webhook forgery, and prompt-injection paths that lead to unauthorised actions.

Out of scope: vulnerabilities in the platforms' own APIs, and attacks that require the attacker to already hold the victim's *owner* key or server access.

See [docs/security.md](docs/security.md) for the security architecture and threat model.
