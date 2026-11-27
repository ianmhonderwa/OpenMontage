"""WhatsApp Cloud API webhooks: verification handshake and signed event delivery."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse

from opensocial.api.deps import runtime
from opensocial.core.database import WebhookReceipt
from opensocial.core.logging import get_logger
from opensocial.core.runtime import Runtime
from opensocial.core.security import constant_time_equals, verify_hmac_sha256
from opensocial.integrations.whatsapp.webhooks import process_payload

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
log = get_logger(__name__)
MAX_WEBHOOK_BYTES = 1024 * 1024


@router.get("/whatsapp", response_class=PlainTextResponse)
def verify(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    rt: Runtime = Depends(runtime),
) -> PlainTextResponse:
    expected = rt.settings.whatsapp_verify_token.get_secret_value() if rt.settings.whatsapp_verify_token else None
    if hub_mode == "subscribe" and expected and hub_verify_token and constant_time_equals(hub_verify_token, expected):
        return PlainTextResponse(hub_challenge or "")
    return PlainTextResponse("forbidden", status_code=403)


@router.post("/whatsapp")
async def receive(request: Request, rt: Runtime = Depends(runtime)) -> JSONResponse:
    secret = rt.settings.whatsapp_app_secret.get_secret_value() if rt.settings.whatsapp_app_secret else None
    if not secret:
        return JSONResponse({"error": "webhook_not_configured"}, status_code=503)
    body = await request.body()
    if len(body) > MAX_WEBHOOK_BYTES:
        return JSONResponse({"error": "payload_too_large"}, status_code=413)
    if not verify_hmac_sha256(secret, body, request.headers.get("x-hub-signature-256")):
        log.warning("rejected whatsapp webhook with invalid signature")
        return JSONResponse({"error": "invalid_signature"}, status_code=401)
    try:
        payload: dict[str, Any] = json.loads(body)
    except ValueError:
        return JSONResponse({"error": "invalid_json"}, status_code=400)
    digest = hashlib.sha256(body).hexdigest()
    with rt.db.session() as session:
        if session.get(WebhookReceipt, digest) is not None:
            return JSONResponse({"status": "duplicate"})
        session.add(WebhookReceipt(digest=digest))
        counts = process_payload(session, payload)
    return JSONResponse({"status": "ok", **counts})
