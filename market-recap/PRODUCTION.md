# Weekly Market Recap – production protocol

Five vertical (1080×1920) videos per week, about **1:30** each, one per exchange:
**ZSE** (Zimbabwe Stock Exchange), **VFEX** (Victoria Falls Stock Exchange), **JSE** (Johannesburg),
**LSE** (London, FTSE 100) and **NYSE** (New York, NYSE Composite). Branding: @reian.creative.finance
(logo in the header, follow card at the end). Style: dark kinetic typography (chapter labels, big
numbers, bars, cards), our own design – never copy another creator's branding or layout assets.

## Rules (non-negotiable)
1. **Every number on screen or in the narration comes from a named source** captured that week.
   No estimates, no invented figures, no "about" unless rounding a sourced number.
2. Save the raw figures and their source URLs in `data/<EXCH>/<YYYY-MM-DD>.json` (the Friday date)
   before writing the episode. Next week's week-on-week moves are computed from these snapshots.
3. If a figure cannot be sourced (e.g. a week-on-week change with no prior-week baseline), **leave it
   out** and say what is shown instead (e.g. "Friday's session" or "year to date"). Never fill gaps.
4. Each episode lists its sources (`sources` + per-segment `source`) and ends with
   "Not financial advice." No buy/sell recommendations, no price targets of our own.
5. Units: ZSE in ZWG (AfricanFinancials quotes ZWG cents – divide by 100), VFEX in US$ (US cents
   on AfricanFinancials), JSE in points/ZAR, LSE in points/GBp, NYSE in points/US$. State the unit.

## Sources by exchange (all reached through the Firecrawl connector; direct HTTP is blocked here)
| Exchange | Index level and weekly change | Movers / context |
|---|---|---|
| ZSE | EFE Securities Friday "Market Comment dd.mm.yyyy" (week close, % move) and Weekly Reports; AfricanFinancials index page `pt-index/zw-xzwall/` (1-year change, 52-week range) | AfricanFinancials `zimbabwe-stock-exchange-share-prices/` (Friday close, day %, value, YTD %); week-on-week stock moves from our `data/ZSE/` snapshots |
| VFEX | EFE Securities (VFEX All Share) | AfricanFinancials `victoria-falls-stock-exchange-share-prices/` (US cents, YTD %) + `data/VFEX/` snapshots |
| JSE | Yahoo Finance history `^J203.JO` (Alexandria `finance-yahoo-com/equities/history`, 1d, 1mo) | Yahoo history for large JSE listings (`NPN.JO`, `PRX.JO`, `FSR.JO`, `SBK.JO`, `AGL.JO`, `BHG.JO`, `MTN.JO`, `CFR.JO`, `GFI.JO`, `ANG.JO`) |
| LSE | Yahoo `^FTSE` | Yahoo for FTSE heavyweights (`AZN.L`, `SHEL.L`, `HSBA.L`, `ULVR.L`, `BP.L`, `RIO.L`, `GSK.L`, `BARC.L`, `LLOY.L`, `RR.L`) |
| NYSE | Yahoo `^NYA`; MarketWatch `investing/index/nya` (5-day, YTD, 1-year) as cross-check | Yahoo for large NYSE listings (`JPM`, `BRK-B`, `XOM`, `V`, `WMT`, `JNJ`, `UNH`, `HD`, `KO`, `CAT`) |

Cost guide: about 5 Firecrawl credits per Yahoo symbol and 1–5 per page scrape, so roughly
**170–200 credits per weekly batch**. Keep the stock lists to ten names each.

## Episode format (`episodes/<EXCH>-<YYYY>-W<ww>/episode.json`)
Segments, each with a `say` line (narration) and visual data: `cover` → `compare` (index last
Friday → this Friday) → `bars` (top gainers) → `bars` (top fallers) → `cards` (turnover / key facts)
→ `but` (turn) → `bignum` or `bars` (bigger picture: YTD / 1-year) → `outro` (what to watch,
disclaimer, follow). Target **165–185 words** at voice `bm_george`, speed 1.05 → 85–95 s.

## Weekly run (Saturday, after all five markets have closed for the week)
1. `git pull`. If `market-recap/PAUSE` exists, report that and stop.
2. For each exchange: fetch the sources above, write `data/<EXCH>/<date>.json` (values + URLs).
3. Write `episodes/<EXCH>-<YYYY>-W<ww>/episode.json` from that data only.
4. `bash engine/build.sh <ID> stills`, check the contact sheet (max two fix rounds), then
   `bash engine/build.sh <ID> full` (run in the background with a 30-minute limit).
5. Send each MP4 to the owner (SendUserFile) and upload the 720p preview to the Google Drive
   folder; add TikTok/YouTube titles, descriptions and hashtags to `SOCIAL.md`.
6. Commit and push to `claude/stickman-story-universe-gz78n1`. Do not post to any platform.

## Build
`bash engine/build.sh <ID> stills|full` – Kokoro TTS narration, synthesised music bed, Playwright
frame capture at 30 fps, ffmpeg mix (−14 LUFS), 720p preview for Drive.
