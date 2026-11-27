"""Contract tests: the response shapes our adapters rely on, checked against recorded
fixtures that follow each platform's documented schema. If a platform changes its
response format, update both the fixture (from the official docs) and the adapter."""

from __future__ import annotations

import httpx
import pytest
from pydantic import BaseModel, ConfigDict

from opensocial.integrations.mock import mock_handler


class Strict(BaseModel):
    model_config = ConfigDict(extra="allow")


class YTChannelSnippet(Strict):
    title: str


class YTRelated(Strict):
    uploads: str


class YTContentDetails(Strict):
    relatedPlaylists: YTRelated  # noqa: N815


class YTChannel(Strict):
    id: str
    snippet: YTChannelSnippet
    statistics: dict[str, object]
    contentDetails: YTContentDetails  # noqa: N815


class YTChannelList(Strict):
    items: list[YTChannel]


class TikTokError(Strict):
    code: str
    message: str


class TikTokCreatorData(Strict):
    privacy_level_options: list[str]
    max_video_post_duration_sec: int
    comment_disabled: bool


class TikTokCreatorInfo(Strict):
    data: TikTokCreatorData
    error: TikTokError


class TikTokInitData(Strict):
    publish_id: str
    upload_url: str


class TikTokInit(Strict):
    data: TikTokInitData
    error: TikTokError


class GraphId(Strict):
    id: str


class IGContainerStatus(Strict):
    id: str
    status_code: str


class WAContact(Strict):
    wa_id: str


class WASend(Strict):
    messaging_product: str
    contacts: list[WAContact]
    messages: list[GraphId]


class InsightValue(Strict):
    value: object


class InsightMetric(Strict):
    name: str
    period: str
    values: list[InsightValue]


class Insights(Strict):
    data: list[InsightMetric]


class AnalyticsHeader(Strict):
    name: str
    columnType: str  # noqa: N815


class AnalyticsReport(Strict):
    columnHeaders: list[AnalyticsHeader]  # noqa: N815
    rows: list[list[object]]


def fetch(method: str, url: str, **kw) -> dict:
    return mock_handler(httpx.Request(method, url, **kw)).json()


CASES = [
    (YTChannelList, "GET", "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {}),
    (AnalyticsReport, "GET", "https://youtubeanalytics.googleapis.com/v2/reports?metrics=views&dimensions=day", {}),
    (TikTokCreatorInfo, "POST", "https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {"json": {}}),
    (TikTokInit, "POST", "https://open.tiktokapis.com/v2/post/publish/video/init/", {"json": {}}),
    (GraphId, "POST", "https://graph.facebook.com/v26.0/123/media", {"data": {"image_url": "x"}}),
    (IGContainerStatus, "GET", "https://graph.instagram.com/v26.0/c1?fields=status_code", {}),
    (WASend, "POST", "https://graph.facebook.com/v26.0/100/messages", {"json": {}}),
    (Insights, "GET", "https://graph.facebook.com/v26.0/p/insights?metric=page_post_engagements", {}),
]


@pytest.mark.parametrize("model,method,url,kw", CASES, ids=[c[0].__name__ for c in CASES])
def test_fixture_matches_documented_schema(model, method, url, kw):
    model.model_validate(fetch(method, url, **kw))


def test_unknown_host_is_refused():
    assert mock_handler(httpx.Request("GET", "https://example.com/")).status_code == 599


def test_webhook_contract_fields_used():
    """The fields our WhatsApp webhook processor reads, per the Cloud API webhook reference."""
    from opensocial.integrations.whatsapp.webhooks import _message_text

    assert _message_text({"type": "text", "text": {"body": "hi"}}) == "hi"
    assert _message_text({"type": "button", "button": {"text": "Yes"}}) == "Yes"
    assert _message_text({"type": "interactive", "interactive": {"button_reply": {"title": "Ok"}}}) == "Ok"
    assert _message_text({"type": "image"}) == "[image message]"
