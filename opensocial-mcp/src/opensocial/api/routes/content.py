"""Content studio, brand profiles, calendar, analytics and reports.

All mutations run through the same guarded runtime as MCP tools.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from opensocial.api.deps import owner, principal, runtime
from opensocial.core.permissions import Principal
from opensocial.core.runtime import Runtime
from opensocial.services import publishing_manager

router = APIRouter(prefix="/api", tags=["content"])


async def _op(
    rt: Runtime, p: Principal, op: str, params: dict[str, Any], account_id: str | None = None
) -> dict[str, Any]:
    return await rt.execute(p, op, params, account_id=account_id, tool=f"api:{op}", actor=p.role)


class ContentIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    body: str = Field("", max_length=20000)
    content_type: str = "text"
    media: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    brand_id: str | None = None
    notes: str = ""


@router.get("/content")
async def list_content(
    status: str | None = None, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_list_content", {"status": status})


@router.post("/content")
async def create_content(
    body: ContentIn, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_create_content", body.model_dump())


@router.get("/content/{item_id}")
async def get_content(
    item_id: str, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_get_content", {"item_id": item_id})


class AdaptIn(BaseModel):
    platforms: list[str]
    accounts: dict[str, str] | None = None
    duration_seconds: float | None = None
    vertical: bool | None = None


@router.post("/content/{item_id}/adapt")
async def adapt(
    item_id: str, body: AdaptIn, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_adapt_content", {"item_id": item_id, **body.model_dump()})


class VariantPatch(BaseModel):
    title: str | None = None
    caption: str | None = None
    hashtags: list[str] | None = None
    media: list[dict[str, Any]] | None = None
    account_id: str | None = None
    format: str | None = None
    scheduled_for: str | None = None
    instructions: str | None = None


@router.patch("/variants/{variant_id}")
async def patch_variant(
    variant_id: str, body: VariantPatch, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_update_variant", {"variant_id": variant_id, **body.model_dump()})


class SubmitIn(BaseModel):
    scheduled_for: datetime | None = None


@router.post("/variants/{variant_id}/submit")
async def submit(
    variant_id: str, body: SubmitIn, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await publishing_manager.submit_variant(rt, p, variant_id, body.scheduled_for)


@router.get("/brands")
async def brands(p: Principal = Depends(principal), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_list_brands", {})


@router.post("/brands")
async def save_brand(
    brand: dict[str, Any], brand_id: str | None = None, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_save_brand", {"brand": brand, "brand_id": brand_id})


@router.get("/calendar")
async def calendar(
    start: str | None = None, end: str | None = None, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_get_calendar", {"start": start, "end": end})


@router.get("/analytics/summary")
async def analytics(
    since: str | None = None, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_analytics_summary", {"since": since})


@router.get("/reports/{period}")
async def report(period: str, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    return await _op(rt, p, "opensocial_get_report", {"period": period})


@router.post("/operations/{op}")
async def run_operation(
    op: str,
    params: dict[str, Any],
    account_id: str | None = None,
    p: Principal = Depends(owner),
    rt: Runtime = Depends(runtime),
) -> dict[str, Any]:
    """Owner-initiated platform operation (e.g. a read for the dashboard, or a manual post).
    External writes still create an approval request that the owner confirms."""
    return await _op(rt, p, op, params, account_id)
