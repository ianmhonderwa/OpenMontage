"""Brand profiles. Each organisation's identity is stored separately and only applied to
content that explicitly references it, so brands are never mixed."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import BrandProfile, utcnow
from opensocial.core.exceptions import NotFound

HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


class PlatformPreferences(BaseModel):
    call_to_action: str | None = Field(None, max_length=300)
    max_hashtags: int | None = Field(None, ge=0, le=30)
    notes: str | None = Field(None, max_length=1000)


class BrandData(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=2000)
    target_audience: str = Field("", max_length=1000)
    tone_of_voice: str = Field("", max_length=500)
    writing_preferences: list[str] = Field(default_factory=list, max_length=50)
    logo_files: list[str] = Field(default_factory=list, max_length=20)
    colours: list[str] = Field(default_factory=list, max_length=20)
    approved_terms: list[str] = Field(default_factory=list, max_length=200)
    restricted_terms: list[str] = Field(default_factory=list, max_length=200)
    content_categories: list[str] = Field(default_factory=list, max_length=50)
    hashtags: list[str] = Field(default_factory=list, max_length=50)
    publishing_frequency: dict[str, str] = Field(default_factory=dict)
    platforms: dict[str, PlatformPreferences] = Field(default_factory=dict)
    language: str = Field("en-GB", max_length=20)

    @field_validator("colours")
    @classmethod
    def _hex(cls, values: list[str]) -> list[str]:
        for v in values:
            if not HEX.match(v):
                raise ValueError(f"Colour '{v}' must be a hex value like #1A2B3C.")
        return values

    @field_validator("hashtags")
    @classmethod
    def _tags(cls, values: list[str]) -> list[str]:
        cleaned = []
        for v in values:
            tag = v.strip().lstrip("#")
            if not re.fullmatch(r"\w{1,100}", tag):
                raise ValueError(f"Hashtag '{v}' may only contain letters, digits and underscores.")
            cleaned.append(tag)
        return cleaned


def save(session: Session, owner_id: str, data: dict[str, Any], brand_id: str | None = None) -> BrandProfile:
    validated = BrandData.model_validate(data)
    if brand_id:
        brand = get(session, owner_id, brand_id)
        brand.name, brand.data, brand.updated_at = validated.name, validated.model_dump(), utcnow()
    else:
        brand = BrandProfile(owner_id=owner_id, name=validated.name, data=validated.model_dump())
        session.add(brand)
    session.flush()
    return brand


def get(session: Session, owner_id: str, brand_id: str) -> BrandProfile:
    brand = session.scalar(select(BrandProfile).where(BrandProfile.id == brand_id, BrandProfile.owner_id == owner_id))
    if brand is None:
        raise NotFound("Brand profile not found.")
    return brand


def list_for(session: Session, owner_id: str) -> list[BrandProfile]:
    return list(session.scalars(select(BrandProfile).where(BrandProfile.owner_id == owner_id)))


def to_dict(brand: BrandProfile) -> dict[str, Any]:
    return {"brand_id": brand.id, **brand.data}


def check_terms(text: str, brand: dict[str, Any] | None) -> dict[str, list[str]]:
    if not brand:
        return {"restricted_found": [], "approved_used": []}
    lowered = text.lower()

    def found(terms: list[str]) -> list[str]:
        return [t for t in terms if t and re.search(rf"(?<!\w){re.escape(t.lower())}(?!\w)", lowered)]

    return {
        "restricted_found": found(brand.get("restricted_terms", [])),
        "approved_used": found(brand.get("approved_terms", [])),
    }
