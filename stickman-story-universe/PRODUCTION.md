# Stickman Story Universe – production plan (scheduled runs read this)

Two scheduled runs a day each produce **one** finished episode. To pause production, create a file
`stickman-story-universe/PAUSE` on the branch (any content); runs exit immediately while it exists.

## Run protocol (one episode per run)

1. Repo: `ianmhonderwa/OpenMontage`, branch `claude/stickman-story-universe-gz78n1`. Work in
   `stickman-story-universe/`. Pull first. If `PAUSE` exists, stop and report "paused".
2. Take the **first unchecked row** of the queue below. Skip rows marked ⏸ (waiting for the owner's decision).
3. Script: find the episode in `scripts_source/` (Batch 01 = `batch01.md`, Batch 02–05 = `batchNN_pN.md`; for
   Batch 05 use these 2-part files). Keep the author's voice-over and scene plan. Apply the row's action:
   - *Lengthen*/*Trim*: rewrite lightly to **130–160 words** total including the tease, faithful to the source.
   - Final narration must be **45–60 s** (tts.py warns otherwise; adjust words or `speed` 1.0–1.05).
   - Spell numbers as words for TTS ("twenty-four hundred"). British spelling.
   - Exactly 8 lines: 7 story scenes + 1 end-card line ("Next time: … Follow so you don't miss it!").
   - New episodes (status "To write"): research the source text first (KJV passage / Gutenberg text), retell in
     your own words, follow `scripts_source/` format and the Style & Script Guide five-beat formula.
4. Write `episodes/<ID>/script.json` (copy `episodes/SOC-001/script.json` shape; voice per series below) and
   `episodes/<ID>/scenes.js` (copy the SOC-001 pattern: `build(ctx)` returns 8 scene functions).
   - Reuse `engine/lib.js` characters and props. When a recurring character first appears, add a preset to
     `lib.js` built from the Guide's fixed description and reuse it ever after (never redesign a character).
   - When a set is used by a second episode, move it into `engine/sets/<name>.js` and import it.
   - Branding is automatic (engine/index.html + engine/assets/logo.jpg): @reian.creative.art logo watermark top-right
     on every scene and the large logo + handle on the end card. Never remove it; keep the top-right corner clear.
   - Bible (BIB) episodes: show the scripture reference under the title (see episodes/BIB-001/script.json `title_html`).
     God is never drawn as a figure (light/glow/voice only).
   - Engine extras available in `engine/lib.js`: ADAM, EVE, makeAnimal('elephant'|'lion'|'giraffe'|'rabbit'),
     makeBird, makeFish. Sets in `engine/sets/` (agora, endcard). BIB-001 shows how to build a world, a void and a hammock scene.
   - Also in `engine/lib.js`: makeAnimal 'mouse' (+ `.mouth`, `.eyes`, `.lie(k)`), makeTree. `engine/sets/meadow.js`
     (Greek countryside, shade tree). AES-001 shows a rope-net build, snapping physics, and contact/high-five posing.
   - Look: 3D toon stickmen (round white heads, black outlines, thin black limbs), warm cartoon sets, 9:16.
   - Rules: violence off-screen; nothing sexual; Bible – never depict God as a figure (light, voice, glow only),
     humour only about people's reactions; Nasreddin – gentle, respectful; no text inside the 3D scene.
5. `bash engine/build.sh <ID> stills` → Read `out/<ID>/contact_sheet.jpg`; fix framing (characters cut off,
   faces hidden, objects off-set). At most two fix rounds. Then `bash engine/build.sh <ID> full`
   (about 10 min render).
6. Deliver: send the full MP4 to the user (SendUserFile, status proactive), and upload
   `out/<ID>/<name>_preview720.mp4` to Google Drive folder `1VCVWgT_O83g2ty4uX69U3SyH9PTlezbk` with
   `create_file` (contentMimeType video/mp4, disableConversionToGoogleType true, base64Content as a
   `sha256:<hash>:<absolute path>` file reference), title `<ID> <Title> (720p preview).mp4`.
6b. Add the episode's posting copy (TikTok title/description, YouTube title/description/tags, hashtags from the series set) to `SOCIAL.md`.
7. Tick the row `[x]` with the date and Drive link, commit (episode folder, lib/sets changes, this file) and push.
8. Report in two lines: what was made + links, and what the next run will make.

## Series settings

| Series | Badge | Voice (Kokoro) | Host / end card |
|---|---|---|---|
| BIB | STICKMAN BIBLE | bm_george | STORYTELLER |
| SOC | SOCRATES &amp; THE WISE ONES | bm_george | SOCRATES |
| AES | AESOP IN 60 SECONDS | bf_lily | STORYTELLER |
| NAS | NASREDDIN | bm_george | NASREDDIN (+ donkey) |
| ANA | ANANSI &amp; AFRICAN TALES | bm_daniel | STORYTELLER (+ Anansi) |
| GRM | GRIMM STICKMAN TALES | bf_lily | STORYTELLER |

## Queue (Season 1, rotation SOC · BIB · AES · NAS · BIB · GRM · ANA)

Done: SOC-001 (pilot, branded 2026-11-14, Drive: https://drive.google.com/file/d/1QIDDliYweIlGR0Bph61WmFAIZQPJzxEp/view)

⏸ Waiting for owner decision (do not produce): ANA-005 (Lizard tale – adapt or skip), NAS-015 (Old Tomb).

| # | ID | Title | Source | Script status | Action | Done |
|---|---|---|---|---|---|---|
| 1 | SOC-002 | Testing the Politicians | Plato, Apology 21c-e | Written – Batch 01 | Lengthen: 127 words (min 130) | [x] 2026-11-14, 130 words, 52.0 s, Drive: https://drive.google.com/file/d/1swme5n6drvs-hWpXPMTpyOIbPToSyR-F/view |
| 2 | BIB-001 | Creation, Day by Day | Genesis 1:1-2:3 | Written – Batch 01 | – | [x] 2026-11-14, 131 words, 49.4 s, Drive: https://drive.google.com/file/d/1ASQsm2qir_4Ko6vuRsxwcFZjzcQwcuKh/view |
| 3 | AES-001 | The Lion and the Mouse | Aesop's Fables, tr. G. F. Townsend | Written – Batch 01 | Lengthen: 122 words (min 130) | [x] 2026-11-14, 140 words, 45.5 s, Drive: https://drive.google.com/file/d/1uIM-PkIhhbLdsEeazwdRhU9jq4Es7X-q/view |
| 4 | NAS-001 | Do You Know What I'm Going to Say? | The Turkish Jester, tr. George Borrow | Written – Batch 01 | – | [x] 2026-11-14, 130 words, 46.6 s, Drive: https://drive.google.com/file/d/1-5QgnfnFxet0Ms2SizcgzYzaQ88dh32Q/view |
| 5 | BIB-002 | The Garden of Eden | Genesis 2:4-25 | Written – Batch 01 | – | [x] 2026-11-14 video made by the scheduled run and sent to the owner; source NOT saved (push failed, no repo access). Re-make only if the source is needed. |
| 6 | GRM-001 | The Frog-King, or Iron Henry | Hunt tale 1, 'The Frog-King, or Iron Henry' | Written – Batch 02 | – | [x] 2026-11-15, 158 words, 51.4 s, Drive: https://drive.google.com/file/d/1NV5kQgLgg2UBKIflai13Y4hItXhOe9sU/view |
| 7 | ANA-001 | How We Got the Name 'Spider Tales' | Barker & Sinclair, tale I, 'How We Got the Name "Spider Tales"' | Written – Batch 02 | – | [x] 2026-11-15, 157 words, 51.8 s, Drive: https://drive.google.com/file/d/1Dc2shnMtqDPN1Puv63DZy9hXxciUL-RK/view |
| 8 | SOC-003 | How Many Things I Do Not Need | Diogenes Laertius, Lives of the Philosophers II.25 | Written – Batch 01 | Lengthen: 107 words (min 130) | [x] 2026-11-15, 130 words, 52.3 s, Drive: https://drive.google.com/file/d/1vVTwBIpD2JsfPqB9_yVDyUXkj-ufkvkh/view |
| 9 | BIB-003 | The Serpent's Trick | Genesis 3:1-13 | Written – Batch 01 | – | [x] |
| 10 | AES-002 | The Wolf and the Lamb | Aesop's Fables, tr. G. F. Townsend | Written – Batch 01 | Lengthen: 114 words (min 130) | [x] |
| 11 | NAS-002 | Thank God Camels Can't Fly | The Turkish Jester, tr. George Borrow | Written – Batch 01 | Lengthen: 108 words (min 130) | [x] |
| 12 | BIB-004 | Cain and Abel | Genesis 4:1-16 | Written – Batch 01 | – | [x] |
| 13 | GRM-002 | Cat and Mouse in Partnership | Hunt tale 2, 'Cat and Mouse in Partnership' | Written – Batch 02 | Trim: 165 words (max 160) | [x] |
| 14 | ANA-002 | How Wisdom Became the Property of the Human Race | Barker & Sinclair, tale II, 'How Wisdom Became the Property of the Human Race' | Written – Batch 03 | – | [x] |
| 15 | SOC-004 | After Thunder Comes Rain | Diogenes Laertius, Lives II.36 | Written – Batch 01 | Lengthen: 108 words (min 130) | [x] |
| 16 | BIB-005 | Noah Builds the Ark | Genesis 6 | Written – Batch 01 | Lengthen: 120 words (min 130) | [x] |
| 17 | AES-003 | The Father and His Sons | Aesop's Fables, tr. G. F. Townsend | Written – Batch 01 | Lengthen: 97 words (min 130) | [x] |
| 18 | NAS-003 | The Same Stars | The Turkish Jester, tr. George Borrow | Written – Batch 01 | Lengthen: 112 words (min 130) | [ ] |
| 19 | BIB-006 | The Animals Arrive | Genesis 7:1-16 | Written – Batch 01 | Lengthen: 93 words (min 130) | [ ] |
| 20 | GRM-004 | The Youth Who Went Forth to Learn What Fear Was | Hunt tale 4, 'The Story of the Youth Who Went Forth to Learn What Fear Was' | Written – Batch 02 | Trim: 162 words (max 160) | [ ] |
| 21 | ANA-003 | Anansi and Nothing | Barker & Sinclair, tale III, 'Anansi and Nothing' | Written – Batch 04 | – | [ ] |
| 22 | SOC-005 | Socrates and the Kick | Diogenes Laertius, Lives II.21 | Written – Batch 01 | Lengthen: 86 words (min 130) | [ ] |
| 23 | BIB-007 | The Great Flood | Genesis 7:17-8:12 | Written – Batch 01 | Lengthen: 121 words (min 130) | [ ] |
| 24 | AES-004 | The Crow and the Pitcher | Aesop's Fables, tr. G. F. Townsend | Written – Batch 01 | Lengthen: 108 words (min 130) | [ ] |
| 25 | NAS-004 | The Dream of Nine Coins | The Turkish Jester, tr. George Borrow | Written – Batch 01 | Lengthen: 103 words (min 130) | [ ] |
| 26 | BIB-008 | The Rainbow Promise | Genesis 8:13-9:17 | Written – Batch 01 | Lengthen: 108 words (min 130) | [ ] |
| 27 | GRM-005 | The Wolf and the Seven Young Kids | Hunt tale 5, 'The Wolf and the Seven Young Kids' | Written – Batch 02 | – | [ ] |
| 28 | ANA-004 | Thunder and Anansi | Barker & Sinclair, tale IV, 'Thunder and Anansi' | Written – Batch 05 (2-part) | – | [ ] |
| 29 | SOC-006 | The Ring of Invisibility | Plato, Republic II 359c-360d | Written – Batch 01 | Lengthen: 124 words (min 130) | [ ] |
| 30 | BIB-009 | The Tower of Babel | Genesis 11:1-9 | Written – Batch 02 | – | [ ] |
| 31 | AES-005 | The Ass and the Grasshopper | Townsend, 'The Ass and the Grasshopper' | Written – Batch 02 | Trim: 164 words (max 160) | [ ] |
| 32 | NAS-005 | Just Out for a Walk (the tomb) | Borrow, anecdote 5 in book order | Written – Batch 02 | – | [ ] |
| 33 | BIB-010 | Abram Leaves Home | Genesis 12:1-9 | Written – Batch 02 | Trim: 169 words (max 160) | [ ] |
| 34 | GRM-006 | Faithful John | Hunt tale 6, 'Faithful John' | Written – Batch 03 | – | [ ] |
| 35 | ANA-006 | Tit for Tat | Barker & Sinclair, tale VI | To write | Anansi vs his son Kweku Tsin; suitable. | [ ] |
| 36 | SOC-007 | The Allegory of the Cave, Part 1 | Plato, Republic VII 514a-517a | Written – Batch 01 | – | [ ] |
| 37 | BIB-011 | Abram and Lot Part Ways | Genesis 13 | Written – Batch 02 | Trim: 170 words (max 160) | [ ] |
| 38 | AES-006 | The Wolf and the Crane | Townsend, 'The Wolf and the Crane' | Written – Batch 02 | Trim: 165 words (max 160) | [ ] |
| 39 | NAS-006 | Blown In by the Wind | Borrow, anecdote 6 in book order | Written – Batch 02 | – | [ ] |
| 40 | BIB-012 | Abram Rescues Lot | Genesis 14 | Written – Batch 02 | Trim: 170 words (max 160) | [ ] |
| 41 | GRM-007 | The Good Bargain | Hunt tale 7, 'The Good Bargain' | Written – Batch 03 | – | [ ] |
| 42 | ANA-007 | Why White Ants Harm Man's Property | Barker & Sinclair, tale VII | To write | Ants boiled in source: keep off-screen. | [ ] |
| 43 | SOC-008 | The Allegory of the Cave, Part 2 | Plato, Republic VII 517a-521b | Written – Batch 01 | Lengthen: 110 words (min 130) | [ ] |
| 44 | BIB-013 | Count the Stars | Genesis 15 | Written – Batch 02 | Trim: 172 words (max 160) | [ ] |
| 45 | AES-007 | The Bat and the Weasels | Townsend, 'The Bat and the Weasels' | Written – Batch 02 | – | [ ] |
| 46 | NAS-007 | The Tart in Konya | Borrow, anecdote 7 in book order | Written – Batch 03 | Trim: 161 words (max 160) | [ ] |
| 47 | BIB-014 | Hagar in the Desert | Genesis 16 | Written – Batch 02 | Trim: 166 words (max 160) | [ ] |
| 48 | GRM-008 | The Strange Musician | Hunt tale 8, 'The Strange Musician' | Written – Batch 03 | – | [ ] |
| 49 | ANA-008 | The Squirrel and the Spider | Barker & Sinclair, tale VIII | To write | Suitable. | [ ] |
| 50 | SOC-009 | Testing the Poets | Plato, Apology 22a-c | Written – Batch 02 | – | [ ] |
| 51 | BIB-015 | Three Visitors and a Laugh | Genesis 18:1-15 | Written – Batch 02 | Trim: 163 words (max 160) | [ ] |
| 52 | AES-008 | The Cock and the Jewel | Townsend, 'The Cock and the Jewel' | Written – Batch 02 | Trim: 165 words (max 160) | [ ] |
| 53 | NAS-008 | Counting the Days | Borrow, anecdote 8 in book order | Written – Batch 03 | – | [ ] |
| 54 | BIB-016 | Bargaining for Sodom | Genesis 18:16-33 | Written – Batch 03 | – | [ ] |
| 55 | GRM-009 | The Twelve Brothers | Hunt tale 9, 'The Twelve Brothers' | Written – Batch 03 | – | [ ] |
| 56 | SOC-010 | Testing the Craftsmen | Plato, Apology 22c-e | Written – Batch 02 | – | [ ] |
| 57 | BIB-017 | Lot's Wife Looks Back | Genesis 19:1-26 | Written – Batch 03 | Trim: 161 words (max 160) | [ ] |
| 58 | AES-009 | The Swallow and the Crow | Townsend, 'The Swallow and the Crow' | Written – Batch 02 | – | [ ] |
| 59 | NAS-009 | Where Do Old Moons Go? | Borrow, anecdote 9 in book order | Written – Batch 04 | – | [ ] |
| 60 | BIB-018 | Isaac Is Born | Genesis 21:1-7 | Written – Batch 03 | – | [ ] |
| 61 | GRM-010 | The Pack of Ragamuffins | Hunt tale 10, 'The Pack of Ragamuffins' | Written – Batch 04 | – | [ ] |
| 62 | SOC-011 | The Gadfly of Athens | Plato, Apology 30e-31a | Written – Batch 02 | – | [ ] |
| 63 | BIB-019 | Ishmael and the Well | Genesis 21:8-21 | Written – Batch 03 | – | [ ] |
| 64 | AES-010 | The Kingdom of the Lion | Townsend, 'The Kingdom of the Lion' | Written – Batch 02 | Trim: 163 words (max 160) | [ ] |
| 65 | NAS-010 | The Perfidious Camel | Borrow, anecdote 10 in book order | Written – Batch 04 | – | [ ] |
| 66 | BIB-020 | The Test on the Mountain | Genesis 22:1-14 | Written – Batch 03 | – | [ ] |
| 67 | GRM-011 | Little Brother and Little Sister | Hunt tale 11, 'Little Brother and Little Sister' | Written – Batch 04 | – | [ ] |
| 68 | SOC-012 | The Unexamined Life | Plato, Apology 37e-38a | Written – Batch 03 | – | [ ] |
| 69 | BIB-021 | A Wife for Isaac at the Well | Genesis 24 | Written – Batch 03 | – | [ ] |
| 70 | AES-011 | The Traveller and His Dog | Townsend, 'The Traveler and His Dog' | Written – Batch 02 | – | [ ] |
| 71 | NAS-011 | Eggs at Nine, Sold at Ten | Borrow, anecdote 11 in book order | Written – Batch 05 (2-part) | – | [ ] |
| 72 | BIB-022 | Soup for a Birthright | Genesis 25:27-34 | Written – Batch 03 | – | [ ] |
| 73 | GRM-012 | Rapunzel | Hunt tale 12, 'Rapunzel' | Written – Batch 04 | – | [ ] |
| 74 | SOC-013 | Socrates on Trial | Plato, Apology 24b-28a and 36a | Written – Batch 03 | – | [ ] |
| 75 | BIB-023 | Jacob's Hairy Disguise | Genesis 27 | Written – Batch 04 | – | [ ] |
| 76 | AES-012 | The Ants and the Grasshopper | Townsend, 'The Ants and the Grasshopper' | Written – Batch 03 | – | [ ] |
| 77 | NAS-012 | I Neither Buy Nor Sell the Moon | Borrow, anecdote 13 in book order | Written – Batch 05 (2-part) | – | [ ] |
| 78 | BIB-024 | Jacob's Ladder | Genesis 28:10-22 | Written – Batch 04 | – | [ ] |
| 79 | GRM-013 | The Three Little Men in the Wood | Hunt tale 13, 'The Three Little Men in the Wood' | Written – Batch 04 | – | [ ] |
| 80 | SOC-014 | The Sentence: Free Meals for Life? | Plato, Apology 36b-38b | Written – Batch 03 | – | [ ] |
| 81 | BIB-025 | The Wrong Bride | Genesis 29:1-30 | Written – Batch 04 | – | [ ] |
| 82 | AES-013 | The Hare and the Tortoise | Townsend, 'The Hare and the Tortoise' | Written – Batch 03 | – | [ ] |
| 83 | NAS-013 | The Ladder Seller | Borrow, anecdote 14 (the ladder over the garden wall) | To write | – | [ ] |
| 84 | BIB-026 | Jacob and the Spotted Goats | Genesis 30:25-43; 31 | Written – Batch 04 | Trim: 162 words (max 160) | [ ] |
| 85 | GRM-014 | The Three Spinners | Hunt tale 14, 'The Three Spinners' | Written – Batch 05 (2-part) | – | [ ] |
| 86 | SOC-015 | Crito's Escape Plan | Plato, Crito 43a-49e | Written – Batch 04 | – | [ ] |
| 87 | BIB-027 | Wrestling Till Dawn | Genesis 32 | Written – Batch 04 | – | [ ] |
| 88 | AES-014 | The Charcoal-Burner and the Fuller | Townsend, 'The Charcoal-Burner and the Fuller' | Written – Batch 03 | – | [ ] |
| 89 | NAS-014 | Hens in Mourning | Borrow, anecdote 15 (fowls with apron strips) | To write | Keep the reference to slaughtered hens verbal only. | [ ] |
| 90 | BIB-028 | Jacob Meets Esau | Genesis 33 | Written – Batch 04 | – | [ ] |
| 91 | GRM-015 | Hansel and Grethel | Hunt tale 15, 'Hansel and Grethel' | Written – Batch 05 (2-part) | – | [ ] |
| 92 | SOC-016 | The Laws Speak | Plato, Crito 50a-54e | Written – Batch 04 | – | [ ] |
| 93 | BIB-029 | Joseph's Coat of Many Colours | Genesis 37:1-11 | Written – Batch 04 | – | [ ] |
| 94 | AES-015 | The Boy Hunting Locusts | Townsend, 'The Boy Hunting Locusts' | Written – Batch 03 | – | [ ] |
| 95 | NAS-016 | Dressed in Black | Borrow, anecdote 20 (mourning “my son's father”) | To write | Anecdotes 16, 18 and 19 skipped (crude / mocks prayer / boys in the bath). | [ ] |
| 96 | BIB-030 | Sold by His Brothers | Genesis 37:12-36 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 97 | GRM-016 | The Three Snake-Leaves | Hunt tale 16, 'The Three Snake-Leaves' | Written – Batch 05 (2-part) | – | [ ] |
| 98 | SOC-017 | The Last Day | Plato, Phaedo 115a-117e | Written – Batch 04 | – | [ ] |
| 99 | BIB-031 | Joseph in Potiphar's House | Genesis 39:1-6 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 100 | AES-016 | The Fisherman Piping | Townsend, 'The Fisherman Piping' | Written – Batch 03 | – | [ ] |
| 101 | BIB-032 | Thrown Into Prison | Genesis 39:7-23 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 102 | GRM-017 | The White Snake | Hunt tale 17, 'The White Snake' | Written – Batch 05 (2-part) | – | [ ] |
| 103 | SOC-018 | A Rooster for Asclepius | Plato, Phaedo 117e-118a | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card; Two different versions exist (Batch 05 2-part vs 4-part): choose one. | [ ] |
| 104 | BIB-033 | The Baker and the Butler | Genesis 40 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 105 | AES-017 | The Dog and the Shadow | Townsend, 'The Dog and the Shadow' | Written – Batch 03 | – | [ ] |
| 106 | BIB-034 | Pharaoh's Strange Dreams | Genesis 41:1-36 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 107 | GRM-018 | Straw, Coal and Bean | Hunt tale 18 | To write | Suitable. | [ ] |
| 108 | BIB-035 | From Prisoner to Ruler | Genesis 41:37-57 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 109 | AES-018 | Hercules and the Wagoner | Townsend, 'Hercules and the Wagoner' | Written – Batch 03 | – | [ ] |
| 110 | BIB-036 | The Brothers Come for Grain | Genesis 42 | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card | [ ] |
| 111 | GRM-019 | The Fisherman and His Wife | Hunt tale 19 | To write | Suitable. | [ ] |
| 112 | BIB-037 | The Silver Cup | Genesis 44 (KJV) | To write | Judah offers himself in Benjamin's place. | [ ] |
| 113 | AES-019 | The Mole and His Mother | Townsend, 'The Mole and His Mother' | Written – Batch 04 | – | [ ] |
| 114 | BIB-038 | "I Am Joseph" | Genesis 45 (KJV) | To write | – | [ ] |
| 115 | GRM-020 | The Brave Little Tailor | Hunt tale 20 | To write | Giants' deaths off-screen. | [ ] |
| 116 | BIB-039 | Jacob Goes to Egypt | Genesis 46–47 (KJV) | To write | – | [ ] |
| 117 | AES-020 | The Herdsman and the Lost Bull | Townsend, 'The Herdsman and the Lost Bull' | Written – Batch 04 | Trim: 161 words (max 160) | [ ] |
| 118 | BIB-040 | You Meant It for Evil | Genesis 50:15–21 (KJV) | To write | Season finale: closes the Genesis arc. | [ ] |
| 119 | GRM-021 | Cinderella (Aschenputtel) | Hunt tale 21 | To write | Season finale. Omit the stepsisters' foot-cutting and the pigeons pecking out eyes. | [ ] |

## Owner's voice (from 2026-11-20 10:00 CAT)
Narration is written with Kokoro, then re-voiced with the owner's own voice (FreeVC, MIT) by
`engine/apply_owner_voice.sh`, called from both build scripts (stickman and market-recap).
Settings: `engine/owner_voice.json`. The reference recording is private and is NOT in git (public repo):
it lives at `out/_models/owner_voice/reference.wav`; if missing, download the Drive backup
(file id in owner_voice.json), convert to 24 kHz mono WAV, and save it there. One-time setup on a fresh
container: `pip install torch torchaudio torchcodec coqui-tts-trainer aiohttp requests librosa && pip install --no-deps coqui-tts`,
then download FreeVC + WavLM from the Coqui GitHub release v0.13.0_models into out/_models/freevc and link
WavLM-Large.pt into ~/.local/share/tts/wavlm/. Posting copy should note "AI voice (creator's own voice)".

## Saving tokens: graphify code graph
Before reading engine files, query the local code graph instead (free, no LLM): `graphify update .` in
this folder after code changes, then `graphify explain "<name>"`, `graphify query "<question>"`,
`graphify path "A" "B"`. Install once per container: `pip install /home/user/ianmhonderwa/graphify`
(the owner's fork; clone it with git if missing). Output lives in `graphify-out/` (gitignored).
