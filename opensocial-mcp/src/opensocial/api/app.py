"""FastAPI application: management API, OAuth callbacks, webhooks and the dashboard."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from opensocial import __version__
from opensocial.api.routes import accounts, admin, approvals, content
from opensocial.api.security import SecurityMiddleware
from opensocial.api.webhooks import whatsapp
from opensocial.core.config import get_settings
from opensocial.core.exceptions import OpenSocialError
from opensocial.core.runtime import Runtime

DASHBOARD_DIST = Path(__file__).resolve().parents[3] / "dashboard" / "dist"


def create_app(runtime: Runtime | None = None, dashboard_dir: Path | None = None) -> FastAPI:
    from opensocial.integrations.registry import load_integrations
    from opensocial.services import core_operations  # noqa: F401  (registers core operations)

    load_integrations()
    rt = runtime or Runtime(get_settings())
    rt.db.create_all()
    app = FastAPI(
        title="OpenSocial MCP management API",
        version=__version__,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.state.runtime = rt
    app.add_middleware(
        SecurityMiddleware,
        per_minute=rt.settings.api_rate_limit_per_minute,
        hsts=rt.settings.public_base_url.startswith("https://"),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=rt.settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["X-API-Key", "Authorization", "Content-Type"],
    )

    @app.exception_handler(OpenSocialError)
    async def _handle(_request: Request, exc: OpenSocialError) -> JSONResponse:
        return JSONResponse(exc.to_dict(), status_code=exc.http_status)

    for router in (admin.router, accounts.router, approvals.router, content.router, whatsapp.router):
        app.include_router(router)

    dist = dashboard_dir or DASHBOARD_DIST
    if (dist / "index.html").is_file():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str) -> FileResponse:
            return FileResponse(dist / "index.html")

    return app


def app_factory() -> FastAPI:  # uvicorn --factory opensocial.api.app:app_factory
    return create_app()
