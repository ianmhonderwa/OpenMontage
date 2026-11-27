"""WhatsApp Cloud API client. Reference:
https://developers.facebook.com/docs/whatsapp/cloud-api
"""

from __future__ import annotations

from typing import Any

from opensocial.integrations.facebook.client import MetaGraphClient


class WhatsAppClient(MetaGraphClient):
    platform = "whatsapp"

    async def phone_number(self, phone_number_id: str) -> dict[str, Any]:
        return await self.get(
            phone_number_id,
            fields=(
                "id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier"
            ),
        )

    async def templates(self, waba_id: str, limit: int = 50) -> dict[str, Any]:
        return await self.get(
            f"{waba_id}/message_templates", fields="name,status,language,category,components", limit=limit
        )

    async def send(self, phone_number_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.json(
            "POST",
            self.url(f"{phone_number_id}/messages"),
            json={"messaging_product": "whatsapp", "recipient_type": "individual", **payload},
        )
