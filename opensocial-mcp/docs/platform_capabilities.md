# Platform capability and permission matrix

Facts below were checked against official documentation on **27 November 2026**. Platforms change scopes, limits and review requirements often, so re-check the linked pages before going live. "Verify" marks values that the documentation stated inconsistently or that could not be confirmed.

Legend: ✅ implemented and tested against simulated API · 🔒 needs app review/audit before it works beyond test users · ❌ not offered by the official API (not implemented)

## YouTube: Data API v3 and Analytics API v2

| Capability | Tool | Scope (tier) | Status |
|---|---|---|---|
| Channel info | `youtube_get_channel` | `youtube.readonly` (read) | ✅ |
| Videos, comments, playlists | `youtube_list_videos`, `youtube_get_video`, `youtube_list_comments`, `youtube_list_playlists` | `youtube.readonly` (read) | ✅ |
| Upload video / Short | `youtube_upload_video` | `youtube.upload` (upload) | ✅ 🔒 |
| Edit title, description, tags, privacy | `youtube_update_video` | `youtube` (manage) | ✅ 🔒 |
| Reply to comments | `youtube_reply_comment` | `youtube.force-ssl` (comments) | ✅ 🔒 |
| Create/add to playlists | `youtube_create_playlist`, `youtube_add_to_playlist` | `youtube` (manage) | ✅ 🔒 |
| Analytics | `youtube_get_analytics` | `yt-analytics.readonly` (read) | ✅ |

* **Shorts** have no separate API. Square or vertical videos of 3 minutes or less uploaded through `videos.insert` are classified as Shorts by YouTube. The tool validates those constraints locally.
* **Quota:** projects get 10,000 units a day by default. Costs in `core/rate_limits.py` follow Google's quota table (upload 1,600; write 50; list 1). Verify them with the quota calculator.
* **Verification:** unverified API projects that upload are restricted to **private** videos until the project passes Google's API compliance audit. Sensitive scopes also need OAuth app verification.
* Sources: <https://developers.google.com/youtube/v3/docs>, <https://developers.google.com/youtube/v3/determine_quota_cost>, <https://developers.google.com/youtube/analytics/reference/reports/query>

## TikTok: Login Kit, Display API, Content Posting API

| Capability | Tool | Scope | Status |
|---|---|---|---|
| Profile | `tiktok_get_profile` | `user.info.basic` (+ `user.info.profile`, `user.info.stats`) | ✅ |
| List videos, counters | `tiktok_list_videos`, `tiktok_get_analytics` | `video.list` | ✅ |
| Creator posting options | `tiktok_get_creator_info` | `video.publish` | ✅ |
| Draft upload to inbox | `tiktok_upload_video` | `video.upload` | ✅ 🔒 |
| Direct Post | `tiktok_publish_video` | `video.publish` | ✅ 🔒 |
| Publish status | `tiktok_get_video_status` | `video.publish` or `video.upload` | ✅ |
| Period analytics (reach, watch time, follower growth) | — | — | ❌ not in the Display API (the Research API is for academic use) |

* `creator_info/query` must run before **every** Direct Post. `privacy_level` must be one of the returned `privacy_level_options`, otherwise TikTok returns `privacy_level_option_mismatch`. The tool enforces this.
* **Unaudited apps** can only post `SELF_ONLY` (private) content. Public posting needs TikTok's content-sharing audit.
* There is a per-creator daily posting cap, shared across all API clients.
* Commercial content must be disclosed (`brand_content_toggle` / `brand_organic_toggle`), and AI-generated content flagged (`is_aigc`).
* Sources: <https://developers.tiktok.com/doc/content-posting-api-get-started>, <https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info>, <https://developers.tiktok.com/doc/content-sharing-guidelines>, <https://developers.tiktok.com/doc/tiktok-api-scopes>

## Facebook Pages: Meta Graph API (default `v26.0`, configurable)

| Capability | Tool | Permission | Status |
|---|---|---|---|
| Page info, posts | `facebook_get_page`, `facebook_list_posts` | `pages_show_list`, `pages_read_engagement` | ✅ |
| Create text/link/photo/video posts, native scheduling | `facebook_create_post` | `pages_manage_posts` | ✅ 🔒 |
| Edit / delete posts | `facebook_update_post`, `facebook_delete_post` | `pages_manage_posts` | ✅ 🔒 |
| Comments / replies | `facebook_get_comments`, `facebook_reply_comment` | `pages_read_user_content`, `pages_manage_engagement` | ✅ 🔒 |
| Insights | `facebook_get_insights` | `read_insights` | ✅ 🔒 |
| Personal profiles | — | — | ❌ not available to third-party apps |

* Each Page is a separate account with its own Page access token, derived from a long-lived user token.
* Meta retired several Page impression metrics during 2025–26 in favour of "media views". Pass metric names that are valid for your Graph version; missing metrics are omitted, never estimated.
* Graph versions are retired roughly two years after release. v26.0 was released on 29 July 2026; Meta lists v27.0 as newer (verify).
* Sources: <https://developers.facebook.com/docs/pages-api>, <https://developers.facebook.com/docs/graph-api/changelog/versions/>

## Instagram: professional accounts only

Two connection flows are implemented:

| Flow | Provider key | Host | Permissions |
|---|---|---|---|
| **Instagram API with Instagram Login** (no Facebook Page needed) | `instagram` | `graph.instagram.com` | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights` |
| **Instagram API with Facebook Login** (account linked to a Page) | `instagram-facebook` | `graph.facebook.com` | `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement` |

| Capability | Tool | Status |
|---|---|---|
| Profile, media, quota | `instagram_get_profile`, `instagram_list_media`, `instagram_get_publishing_limit` | ✅ |
| Prepare image/carousel/story/Reel (local validation) | `instagram_create_media`, `instagram_create_reel` | ✅ |
| Publish (container → poll → `media_publish`) | `instagram_publish_media` | ✅ 🔒 |
| Comments / replies | `instagram_get_comments`, `instagram_reply_comment` | ✅ 🔒 |
| Insights | `instagram_get_insights` | ✅ 🔒 |
| Personal (non-professional) accounts | — | ❌ |

* Media must be reachable at a **public HTTPS URL**, because Instagram fetches it. Images must be JPEG.
* Caption: 2,200 characters at most, 30 hashtags, 20 @mentions. Carousels: 2–10 items. Reels: 3 seconds to 15 minutes, 300 MB or less (verify).
* Publishing quota: Meta's pages disagree (100 vs 50 posts per 24 hours). Check `instagram_get_publishing_limit` for the real value.
* Sources: <https://developers.facebook.com/docs/instagram-platform/content-publishing/>, <https://developers.facebook.com/docs/instagram-platform/overview>

## WhatsApp Business Platform: Cloud API

| Capability | Tool | Permission | Status |
|---|---|---|---|
| Phone number info, templates | `whatsapp_get_phone_number`, `whatsapp_list_templates` | `whatsapp_business_management` | ✅ |
| Receive messages and statuses | `POST /webhooks/whatsapp` (signed) | App secret | ✅ |
| Conversations, drafts, escalation | `whatsapp_list_conversations`, `whatsapp_get_conversation`, `whatsapp_prepare_reply`, `whatsapp_escalate_conversation` | — | ✅ |
| Free-form reply (within 24 h of the customer's last message) | `whatsapp_send_message` | `whatsapp_business_messaging` | ✅ |
| Approved template to an opted-in contact | `whatsapp_send_template` | `whatsapp_business_messaging` | ✅ |
| Bulk/broadcast messaging, cold outreach | — | — | ❌ deliberately not provided |
| Personal WhatsApp accounts | — | — | ❌ |

* Numbers are registered with a **system-user access token** (`POST /api/accounts/whatsapp`), not a browser OAuth flow.
* Webhooks are verified with `X-Hub-Signature-256` (HMAC-SHA256 of the raw body, using the app secret), de-duplicated, and routed only when exactly one connected account owns the phone number ID.
* Sources: <https://developers.facebook.com/docs/whatsapp/cloud-api>, <https://developers.facebook.com/docs/whatsapp/pricing#customer-service-windows>, <https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads>

## Amazon Kindle Direct Publishing

**There is no public KDP publishing API.** OpenSocial never contacts KDP, never stores KDP credentials, and does not scrape or automate the KDP website.

| Capability | Tool | Status |
|---|---|---|
| Book projects, versions, status (prep statuses by the agent, KDP statuses by the author only) | `kindle_create_book_project`, `kindle_add_version`, `kindle_update_status`, `kindle_list_projects` | ✅ |
| Manuscript validation (DOCX, EPUB in depth; TXT/MD; other formats by type) | `kindle_validate_manuscript` | ✅ |
| Metadata validation | `kindle_prepare_metadata` | ✅ |
| Cover check | `kindle_check_cover` | ✅ |
| Description assembly | `kindle_generate_description` | ✅ |
| Checklist and launch plan | `kindle_create_publishing_checklist`, `kindle_generate_launch_plan` | ✅ |
| Upload / publish / pricing in KDP | — | ❌ manual, by the author |

Rules encoded (see `integrations/kindle/rules.py`): title plus subtitle of 200 characters at most; 7 keyword slots of 50 characters or fewer; up to 3 categories; description of 4,000 characters or fewer, using KDP's limited HTML subset; cover ideally 1,600 × 2,560 px (1.6:1), JPEG or TIFF, under 50 MB, 300 DPI recommended. KDP's own pages give conflicting minimum cover sizes, so the tool treats the strict limits as errors and the recommendations as warnings. Sources: <https://kdp.amazon.com/en_US/help/topic/G6GTK3T3NUHKLEFX>, <https://kdp.amazon.com/en_US/help/topic/G201097560>, <https://kdp.amazon.com/en_US/help/topic/G201298500>
