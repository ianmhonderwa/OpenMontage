# Stickman Story Universe – Season 1 Catalogue (PROPOSED, awaiting approval)

Prepared 12 November 2026. Status: **proposal only. No new episodes will be written until you approve.** The scheduled task “Stickman Story Universe – write next batch” is disabled and has not been re-enabled.

## 1\. What was audited

  - Google Drive folder “TikTok Shorts”: 00 · Style & Script Guide; 01 · Master Episode List; *Stickman Story Universe – 1000+ Episodes* (contains Batch 01); Batch 02–05 docs (10 files).
  - The ZIP project you described (CLAUDE.md, series.json, episode.md, research.md, new\_episode.py, validate\_episode.py, EPISODE\_CATALOGUE.csv, .env.example) is **not present** in this session or in Drive, so those files could not be audited. Everything below was checked against the Drive documents.
  - Sources checked on Project Gutenberg: \#21, \#16244, \#66923, \#5314 (catalogue records and contents).
  - A script checked all 96 scripts in Batches 02–05 for: word count, 7 scenes + end card, + STYLE and Setting: on every prompt, tease and follow line, timing, character descriptions and US spellings. Batch 01's 24 scripts were checked from their stated runtimes and word counts.

## 2\. Audit findings

### 2.1 Configuration: correct

  - All six series are defined the same way in the Guide, Master List and batch docs: IDs, settings, ElevenLabs voices and settings (BIB George 45/75/20; SOC Brian 40/75/30; AES Lily 45/75/30; NAS George 40/75/35; ANA Daniel 45/75/30; GRM Lily 45/75/25), and hosts (Socrates and Nasreddin host their own series; the Storyteller hosts the other four).
  - The style line, negative prompt and motion suffix are identical in every batch.
  - Source numbering was checked against the books: AES order matches Townsend's book order; GRM = Hunt tale numbers; NAS positions 1–13 match Borrow's anecdote order; ANA 1–4 match tales I–IV.

### 2.2 Character consistency: good, with one exception

  - Recurring characters (Socrates, Crito, Xanthippe, Nasreddin, the donkey, Anansi, the Storyteller, Abram/Abraham, Sarai/Sarah, Lot, Jacob, Esau, Rebekah, Rachel, Laban, Hagar, Joseph, Meletus, Plato and others) are described word for word the same across Batches 02–05 (2-part set).
  - **Exception:** the 4-part Batch 05 redefines **Kweku Tsin** (blue cap instead of the established red cap) and **Thunder** (different robe and eyes). If that version is used, those prompts must be corrected.
  - SOC-011 deliberately draws Socrates as a gadfly. This is a joke and not drift, but it will need a separate reference image.

### 2.3 Issues to fix (ranked)

1.  **Batch 05 exists twice.** “part 1–2 of 2” and “part 1–4 of 4” are *different scripts* for the same 24 IDs: different hooks, jokes and lessons (e.g. SOC-019). Only one set can be canonical. *Recommendation:* use the **2-part set**. It keeps the character descriptions from Batches 02–04 and carries the SOC-019 correction note. Then fix its timing (item 4) and archive the 4-part set.
2.  **Batch 01 is under length.** 17 of 24 scripts are below the 130-word minimum, and 15 run under the 45-second floor (e.g. SOC-005: 86 words, about 34 s; BIB-006: 93 words, about 36 s). These are the first episodes viewers see, so they should be lengthened before release.
3.  **Batch 02–04 over length.** 16 scripts exceed 160 words (BIB-010 to BIB-015, BIB-017, BIB-026, AES-005, -006, -008, -010, -020, GRM-002, -004, NAS-007; maximum 172). At normal ElevenLabs pace they will run past 60 s.
4.  **Batch 05 (2-part) timing.** 9 scripts end the story at 0:58 and then add a 3-second end card, giving 61 s (BIB-030 to -034, -036; GRM-017; SOC-019; SOC-020). Each needs about 2–4 seconds trimmed.
5.  **Two prompts ask for split or inset images** (BIB-009 sc3; GRM-006 sc5), but the negative prompt forbids “split panels”. This conflict will give unpredictable results; rewrite them as single images. (BIB-030 and BIB-035 in the 4-part set have the same problem.)
6.  **US spellings in titles:** “Traveler” (AES-011 source line) and “Labor” (AES-029 source line). They are Townsend's original titles, so they can stay in source citations, but on-screen titles should use “Traveller” and “Labour” (the scripts already do).
7.  **Episode totals disagree.** The 1000+ doc says 1,043 episodes (NAS 103, ANA 39); the Master List says about 1,040 (NAS about 100, ANA 37). The Gutenberg record and contents show **36 tales** in Barker & Sinclair, so the maximum is ANA-036.
8.  **Production mix does not match the release rhythm.** Batches are written 7 BIB : 7 AES : 4 GRM : 3 SOC : 2 NAS : 1 ANA, but the planned week posts 3 BIB : 1 SOC : 1 AES : 1 NAS : 1 ANA/GRM. AES is being written twice as fast as it can be posted, and NAS too slowly. Future batches should follow the release mix.
9.  **GRM IDs have gaps by design** (GRM-003 does not exist because Hunt tale 3 is skipped). This is fine, but on-screen “Ep” numbers should be Hunt numbers or renumbered consistently. Decide which before release.
10. **The Guide's script template is corrupted.** Section “Script template” contains stray HTML (\</div\>\</body\>\</html\>) and missing placeholders (“– Ep :”). The batches follow the correct structure, but the template text should be repaired so scheduled runs cannot misread it.

### 2.4 Rights and sensitivity notes

  - All non-Bible sources are public domain in the USA per their Gutenberg records. For a Zimbabwe/UK/EU audience the translators' death dates also matter: Townsend 1900, Borrow 1881, Hunt 1912, Jowett 1893, Yonge 1891, Barker 1929. These are clear everywhere. **Cecilia Sinclair** (ANA co-compiler): I could not find her death date. Because the scripts are fresh retellings of traditional tales, risk is low, but it is unverified.
  - Later SOC sources in the Master List name no public-domain translator for SOC-097 (Xunzi 28) and SOC-101 (Lienü Zhuan). This does not affect Season 1, but those must be fixed before Season 2+.
  - Bible humour rule: the written Season 1 scripts keep jokes on human reactions. BIB-001's joke (“every parent… nodded”) is about parents, not God, so it is acceptable, but give it a final read.
  - Nasreddin: anecdotes 12, 16, 18 and 19 are recommended skips (cruelty to an animal owner, crude, mocks people at prayer, boys in a bath).

## 3\. Season 1 proposal

**Principle:** each series runs in order from Ep 1, because every script's tease names the next episode, and Season 1 ends on a natural arc finale. **122 episodes: 106 already written, 16 to write.** Written stock carried to Season 2: SOC-019–020, AES-021–032.

  

|  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: |
| \*\*Series\*\* | \*\*Season 1 range\*\* | \*\*Written\*\* | \*\*To write\*\* | \*\*Finale\*\* |
| BIB | 001–040 | 36 | 4 | “You Meant It for Evil” (Genesis complete) |
| SOC | 001–018 | 18 | 0 | “A Rooster for Asclepius” (death of Socrates) |
| AES | 001–020 | 20 | 0 | – |
| NAS | 001–016 | 12 | 4 | – |
| ANA | 001–008 | 4 | 4 | – |
| GRM | 001–021 (no 003) | 16 | 4 | “Cinderella” |
| \*\*Total\*\* |   | \*\*106\*\* | \*\*16\*\* |   |

  

**Suggested release grid (one post a day, about 18 weeks):** Mon BIB · Tue SOC · Wed AES · Thu NAS · Fri BIB · Sat GRM · Sun alternating ANA / BIB / GRM. This fits the 122 episodes with four spare slots. I have not set calendar dates.

  

**Before release, these Season 1 scripts need rework:** 17 Batch 01 scripts lengthened; 16 Batch 02–04 scripts trimmed; the Batch 05 version chosen and 9 timings trimmed; 2 split-image prompts rewritten. That is about 44 scripts touched, plus 16 new ones.

### Decisions needed from you

1.  Approve the Season 1 scope above (or change the ranges).
2.  Batch 05: keep the 2-part set (recommended) or the 4-part set?
3.  ANA-005 (Lizard): adapt heavily (remove the boiling water and the wives as a prize) or skip it (and edit ANA-004's tease)?
4.  NAS-015 (“The Old Tomb”, the questioning angels): include it, or replace it with the next suitable anecdote?
5.  GRM on-screen numbering: Hunt numbers with gaps, or continuous 1, 2, 3…?
6.  Rework order: fix existing scripts first (recommended), or write the 16 new ones first?

## 4\. Episode catalogue

Lessons for written episodes are taken from the scripts. Lessons marked *(proposed)* are new and will be refined at scripting.

### BIB – Stickman Bible (Genesis arc, 40 episodes)

Source and rights: King James Version (1611). Public domain in most countries; in the UK publication is governed by Crown letters patent, but short quotation in a retelling is normal practice.

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Title\*\* | \*\*Original source\*\* | \*\*Lesson\*\* | \*\*Status\*\* | \*\*Action / notes\*\* |
| BIB-001 | Creation, Day by Day | Genesis 1:1-2:3 | God made everything good, and that includes you. | Written – Batch 01 | – |
| BIB-002 | The Garden of Eden | Genesis 2:4-25 | Good gifts come with good boundaries. | Written – Batch 01 | – |
| BIB-003 | The Serpent's Trick | Genesis 3:1-13 | The oldest trick is making you doubt what God said. | Written – Batch 01 | – |
| BIB-004 | Cain and Abel | Genesis 4:1-16 | Jealousy left unchecked grows into something terrible. Master it early. | Written – Batch 01 | – |
| BIB-005 | Noah Builds the Ark | Genesis 6 | Obey God even when everyone laughs. | Written – Batch 01 | Lengthen: 120 words (min 130) |
| BIB-006 | The Animals Arrive | Genesis 7:1-16 | God gets your attention before the storm, not after. | Written – Batch 01 | Lengthen: 93 words (min 130) |
| BIB-007 | The Great Flood | Genesis 7:17-8:12 | Wait patiently; God has not forgotten you. | Written – Batch 01 | Lengthen: 121 words (min 130) |
| BIB-008 | The Rainbow Promise | Genesis 8:13-9:17 | God keeps His promises; every rainbow is a reminder. | Written – Batch 01 | Lengthen: 108 words (min 130) |
| BIB-009 | The Tower of Babel | Genesis 11:1-9 | Pride builds towers to make its own name; humility lets God write the name. | Written – Batch 02 | – |
| BIB-010 | Abram Leaves Home | Genesis 12:1-9 | Faith is taking the next step before you can see the whole road. | Written – Batch 02 | Trim: 169 words (max 160) |
| BIB-011 | Abram and Lot Part Ways | Genesis 13 | Generosity is choosing peace over getting the best piece. | Written – Batch 02 | Trim: 170 words (max 160) |
| BIB-012 | Abram Rescues Lot | Genesis 14 | Real courage runs toward the people it loves, and real integrity won't be bought. | Written – Batch 02 | Trim: 170 words (max 160) |
| BIB-013 | Count the Stars | Genesis 15 | Faith is trusting the promise while the cradle is still empty. | Written – Batch 02 | Trim: 172 words (max 160) |
| BIB-014 | Hagar in the Desert | Genesis 16 | When you feel unseen, remember: there is a God who sees you. | Written – Batch 02 | Trim: 166 words (max 160) |
| BIB-015 | Three Visitors and a Laugh | Genesis 18:1-15 | Is anything too hard for the Lord? | Written – Batch 02 | Trim: 163 words (max 160) |
| BIB-016 | Bargaining for Sodom | Genesis 18:16-33 | God is more merciful than our boldest prayers, so pray boldly for others. | Written – Batch 03 | – |
| BIB-017 | Lot's Wife Looks Back | Genesis 19:1-26 | When God pulls you out of something, don't keep looking back at it. | Written – Batch 03 | Trim: 161 words (max 160) |
| BIB-018 | Isaac Is Born | Genesis 21:1-7 | God's promises can be slow, but they are never late. | Written – Batch 03 | – |
| BIB-019 | Ishmael and the Well | Genesis 21:8-21 | Sometimes help is closer than our tears let us see. | Written – Batch 03 | – |
| BIB-020 | The Test on the Mountain | Genesis 22:1-14 | Trust God even when you cannot see how He will provide. | Written – Batch 03 | – |
| BIB-021 | A Wife for Isaac at the Well | Genesis 24 | Kindness to strangers can open the door to your future. | Written – Batch 03 | – |
| BIB-022 | Soup for a Birthright | Genesis 25:27-34 | Never trade what matters most for what you want right now. | Written – Batch 03 | – |
| BIB-023 | Jacob's Hairy Disguise | Genesis 27 | A lie can win you a moment, but it can cost you years. | Written – Batch 04 | – |
| BIB-024 | Jacob's Ladder | Genesis 28:10-22 | God is closer than you think, even in your loneliest place. | Written – Batch 04 | – |
| BIB-025 | The Wrong Bride | Genesis 29:1-30 | The tricks we play have a way of coming back to us. | Written – Batch 04 | – |
| BIB-026 | Jacob and the Spotted Goats | Genesis 30:25-43; 31 | You can be cheated by people, but you are never hidden from God. | Written – Batch 04 | Trim: 162 words (max 160) |
| BIB-027 | Wrestling Till Dawn | Genesis 32 | Hold on to God until He blesses you. | Written – Batch 04 | – |
| BIB-028 | Jacob Meets Esau | Genesis 33 | Forgiveness can melt twenty years of fear in a single hug. | Written – Batch 04 | – |
| BIB-029 | Joseph's Coat of Many Colours | Genesis 37:1-11 | Favouritism and boasting both feed envy. | Written – Batch 04 | – |
| BIB-030 | Sold by His Brothers | Genesis 37:12-36 | Envy, left unchecked, will sell what it should protect. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-031 | Joseph in Potiphar's House | Genesis 39:1-6 | Faithful work in a hard place can still be blessed. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-032 | Thrown Into Prison | Genesis 39:7-23 | Doing right may cost you, but God never leaves you in the dark. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-033 | The Baker and the Butler | Genesis 40 | Even when people forget you, God does not. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-034 | Pharaoh's Strange Dreams | Genesis 41:1-36 | Use the good years to prepare for the hard ones. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-035 | From Prisoner to Ruler | Genesis 41:37-57 | God can lift you from the pit to the palace, so stay faithful while you wait. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-036 | The Brothers Come for Grain | Genesis 42 | A guilty conscience remembers what the years tried to bury. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card |
| BIB-037 | The Silver Cup | Genesis 44 (KJV) | Real change shows when you protect the one you once failed. (proposed) | To write | Judah offers himself in Benjamin's place. |
| BIB-038 | "I Am Joseph" | Genesis 45 (KJV) | Forgiveness opens a door that guilt has kept shut for years. (proposed) | To write | – |
| BIB-039 | Jacob Goes to Egypt | Genesis 46–47 (KJV) | God goes with you into the unknown (Genesis 46:3–4). (proposed) | To write | – |
| BIB-040 | You Meant It for Evil | Genesis 50:15–21 (KJV) | What others mean for harm, God can turn to good (Genesis 50:20). (proposed) | To write | Season finale: closes the Genesis arc. |

### SOC – Socrates & the Wise Ones (mission, trial and death, 18 episodes)

Source and rights: Plato, tr. Jowett (d. 1893); Diogenes Laertius, tr. Yonge (d. 1891). Public domain.

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Title\*\* | \*\*Original source\*\* | \*\*Lesson\*\* | \*\*Status\*\* | \*\*Action / notes\*\* |
| SOC-001 | The Oracle Says No One Is Wiser | Plato, Apology 20e-23b | Wisdom begins when you admit what you don't know. | Written – Batch 01 | – |
| SOC-002 | Testing the Politicians | Plato, Apology 21c-e | Confidence is not the same as knowledge. | Written – Batch 01 | Lengthen: 127 words (min 130) |
| SOC-003 | How Many Things I Do Not Need | Diogenes Laertius, Lives of the Philosophers II.25 | Real wealth is needing less. | Written – Batch 01 | Lengthen: 107 words (min 130) |
| SOC-004 | After Thunder Comes Rain | Diogenes Laertius, Lives II.36 | You can't control others' anger, only your response. | Written – Batch 01 | Lengthen: 108 words (min 130) |
| SOC-005 | Socrates and the Kick | Diogenes Laertius, Lives II.21 | Don't sink to the level of people who insult you. | Written – Batch 01 | Lengthen: 86 words (min 130) |
| SOC-006 | The Ring of Invisibility | Plato, Republic II 359c-360d | Character is what you do when no one can see you. | Written – Batch 01 | Lengthen: 124 words (min 130) |
| SOC-007 | The Allegory of the Cave, Part 1 | Plato, Republic VII 514a-517a | What you've always seen isn't always the truth. | Written – Batch 01 | – |
| SOC-008 | The Allegory of the Cave, Part 2 | Plato, Republic VII 517a-521b | Truth can be unpopular; share it anyway, with love. | Written – Batch 01 | Lengthen: 110 words (min 130) |
| SOC-009 | Testing the Poets | Plato, Apology 22a-c | Talent in one thing is not wisdom in everything. | Written – Batch 02 | – |
| SOC-010 | Testing the Craftsmen | Plato, Apology 22c-e | Know where your knowledge ends. | Written – Batch 02 | – |
| SOC-011 | The Gadfly of Athens | Plato, Apology 30e-31a | The people who annoy you with questions may be the ones keeping you awake. | Written – Batch 02 | – |
| SOC-012 | The Unexamined Life | Plato, Apology 37e-38a | Ask yourself the hard questions; that is where real living begins. | Written – Batch 03 | – |
| SOC-013 | Socrates on Trial | Plato, Apology 24b-28a and 36a | Winning the argument is not always winning the room. | Written – Batch 03 | – |
| SOC-014 | The Sentence: Free Meals for Life? | Plato, Apology 36b-38b | Honesty about your worth can cost you, but it can never be taken from you. | Written – Batch 03 | – |
| SOC-015 | Crito's Escape Plan | Plato, Crito 43a-49e | Two wrongs never make a right. | Written – Batch 04 | – |
| SOC-016 | The Laws Speak | Plato, Crito 50a-54e | Keep your promises, even when breaking them would save you. | Written – Batch 04 | – |
| SOC-017 | The Last Day | Plato, Phaedo 115a-117e | Live well, and you can face the end in peace. | Written – Batch 04 | – |
| SOC-018 | A Rooster for Asclepius | Plato, Phaedo 117e-118a | Keep your word to the very end, even in small things. | Written – Batch 05 (2-part) | Choose Batch 05 version; 2-part runs to 0:58 + 3 s end card; Two different versions exist (Batch 05 2-part vs 4-part): choose one. |

### AES – Aesop in 60 Seconds (20 episodes)

Source and rights: Townsend, *Three Hundred Aesop's Fables* (1867), Project Gutenberg \#21. Public domain (Gutenberg record checked).

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Title\*\* | \*\*Original source\*\* | \*\*Lesson\*\* | \*\*Status\*\* | \*\*Action / notes\*\* |
| AES-001 | The Lion and the Mouse | Aesop's Fables, tr. G. F. Townsend | No act of kindness is ever wasted, and no one is too small to help. | Written – Batch 01 | Lengthen: 122 words (min 130) |
| AES-002 | The Wolf and the Lamb | Aesop's Fables, tr. G. F. Townsend | A bully will always find an excuse. | Written – Batch 01 | Lengthen: 114 words (min 130) |
| AES-003 | The Father and His Sons | Aesop's Fables, tr. G. F. Townsend | Together you are strong; divided, you break. | Written – Batch 01 | Lengthen: 97 words (min 130) |
| AES-004 | The Crow and the Pitcher | Aesop's Fables, tr. G. F. Townsend | Little by little does the trick. | Written – Batch 01 | Lengthen: 108 words (min 130) |
| AES-005 | The Ass and the Grasshopper | Townsend, 'The Ass and the Grasshopper' | Copying someone's secret won't give you their gift. | Written – Batch 02 | Trim: 164 words (max 160) |
| AES-006 | The Wolf and the Crane | Townsend, 'The Wolf and the Crane' | In serving the wicked, expect no reward, and be thankful if you escape injury. | Written – Batch 02 | Trim: 165 words (max 160) |
| AES-007 | The Bat and the Weasels | Townsend, 'The Bat and the Weasels' | It is wise to turn circumstances to good account. | Written – Batch 02 | – |
| AES-008 | The Cock and the Jewel | Townsend, 'The Cock and the Jewel' | A treasure is only treasure to someone who can use it. | Written – Batch 02 | Trim: 165 words (max 160) |
| AES-009 | The Swallow and the Crow | Townsend, 'The Swallow and the Crow' | Fair-weather friends are not worth much; choose what lasts through winter. | Written – Batch 02 | – |
| AES-010 | The Kingdom of the Lion | Townsend, 'The Kingdom of the Lion' | A promise on paper doesn't change nature overnight; trust is earned slowly. | Written – Batch 02 | Trim: 163 words (max 160) |
| AES-011 | The Traveller and His Dog | Townsend, 'The Traveler and His Dog' | The one who is late often blames the friend who was ready. | Written – Batch 02 | – |
| AES-012 | The Ants and the Grasshopper | Townsend, 'The Ants and the Grasshopper' | Work while the sun shines, so you're ready when winter comes. | Written – Batch 03 | – |
| AES-013 | The Hare and the Tortoise | Townsend, 'The Hare and the Tortoise' | Slow but steady wins the race. | Written – Batch 03 | – |
| AES-014 | The Charcoal-Burner and the Fuller | Townsend, 'The Charcoal-Burner and the Fuller' | Like will draw like: choose companions whose ways fit your own. | Written – Batch 03 | – |
| AES-015 | The Boy Hunting Locusts | Townsend, 'The Boy Hunting Locusts' | When things are going well, slow down and look before you grab. | Written – Batch 03 | – |
| AES-016 | The Fisherman Piping | Townsend, 'The Fisherman Piping' | Use the right tool for the job, not the one you like best. | Written – Batch 03 | – |
| AES-017 | The Dog and the Shadow | Townsend, 'The Dog and the Shadow' | Grab at everything, and you may lose what you already have. | Written – Batch 03 | – |
| AES-018 | Hercules and the Wagoner | Townsend, 'Hercules and the Wagoner' | Self-help is the best help: do your part, then ask for more. | Written – Batch 03 | – |
| AES-019 | The Mole and His Mother | Townsend, 'The Mole and His Mother' | Boasting about what you can do often reveals what you can't. | Written – Batch 04 | – |
| AES-020 | The Herdsman and the Lost Bull | Townsend, 'The Herdsman and the Lost Bull' | Be careful what you wish for; you might get it. | Written – Batch 04 | Trim: 161 words (max 160) |

### NAS – Nasreddin (16 episodes)

Source and rights: Borrow, *The Turkish Jester* (1884), PG \#16244. Public domain (record checked).

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Title\*\* | \*\*Original source\*\* | \*\*Lesson\*\* | \*\*Status\*\* | \*\*Action / notes\*\* |
| NAS-001 | Do You Know What I'm Going to Say? | The Turkish Jester, tr. George Borrow | Help each other learn; knowledge is meant to be shared. | Written – Batch 01 | – |
| NAS-002 | Thank God Camels Can't Fly | The Turkish Jester, tr. George Borrow | Be grateful for the problems you don't have. | Written – Batch 01 | Lengthen: 108 words (min 130) |
| NAS-003 | The Same Stars | The Turkish Jester, tr. George Borrow | People are more alike than different, wherever they live. | Written – Batch 01 | Lengthen: 112 words (min 130) |
| NAS-004 | The Dream of Nine Coins | The Turkish Jester, tr. George Borrow | Greed can make you lose what you already have. | Written – Batch 01 | Lengthen: 103 words (min 130) |
| NAS-005 | Just Out for a Walk (the tomb) | Borrow, anecdote 5 in book order | Running from a problem before you know what it is can land you somewhere much more awkward. | Written – Batch 02 | – |
| NAS-006 | Blown In by the Wind | Borrow, anecdote 6 in book order | One excuse leads to another, until even you run out of answers. | Written – Batch 02 | – |
| NAS-007 | The Tart in Konya | Borrow, anecdote 7 in book order | If you take what isn't yours, don't be surprised when the bill arrives, in whatever form. | Written – Batch 03 | Trim: 161 words (max 160) |
| NAS-008 | Counting the Days | Borrow, anecdote 8 in book order | A system is only as reliable as the hands that can reach it. | Written – Batch 03 | – |
| NAS-009 | Where Do Old Moons Go? | Borrow, anecdote 9 in book order | Sounding sure is not the same as being right. | Written – Batch 04 | – |
| NAS-010 | The Perfidious Camel | Borrow, anecdote 10 in book order | When you take a ride that isn't yours, don't blame the camel for the bumps. | Written – Batch 04 | – |
| NAS-011 | Eggs at Nine, Sold at Ten | Borrow, anecdote 11 in book order | Better to lose a little coin than a friend's trust. | Written – Batch 05 (2-part) | – |
| NAS-012 | I Neither Buy Nor Sell the Moon | Borrow, anecdote 13 in book order | There's no shame in saying, "I don't know." | Written – Batch 05 (2-part) | – |
| NAS-013 | The Ladder Seller | Borrow, anecdote 14 (the ladder over the garden wall) | A clever excuse is still an excuse. (proposed) | To write | – |
| NAS-014 | Hens in Mourning | Borrow, anecdote 15 (fowls with apron strips) | A funny explanation does not make an odd deed right. (proposed) | To write | Keep the reference to slaughtered hens verbal only. |
| NAS-015 | The Old Tomb | Borrow, anecdote 17 (the last will) | You can plan for many things, but not your way out of honesty. (proposed) | To write | Religious content (questioning angels): respectful tone; check before scripting. |
| NAS-016 | Dressed in Black | Borrow, anecdote 20 (mourning “my son's father”) | Sometimes the wisest thing is to laugh at yourself. (proposed) | To write | Anecdotes 16, 18 and 19 skipped (crude / mocks prayer / boys in the bath). |

### ANA – Anansi & African Tales (8 episodes)

Source and rights: Barker & Sinclair, *West African Folk-Tales* (1917), PG \#66923. Public domain in the USA (record checked). Barker died 1929; I could not find Cecilia Sinclair's death date, so UK/EU status is unconfirmed.

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Title\*\* | \*\*Original source\*\* | \*\*Lesson\*\* | \*\*Status\*\* | \*\*Action / notes\*\* |
| ANA-001 | How We Got the Name 'Spider Tales' | Barker & Sinclair, tale I, 'How We Got the Name "Spider Tales"' | Cleverness can win what strength cannot. | Written – Batch 02 | – |
| ANA-002 | How Wisdom Became the Property of the Human Race | Barker & Sinclair, tale II, 'How Wisdom Became the Property of the Human Race' | Sometimes the smallest voice is the wisest. | Written – Batch 03 | – |
| ANA-003 | Anansi and Nothing | Barker & Sinclair, tale III, 'Anansi and Nothing' | Envy digs pits that only bring grief. | Written – Batch 04 | – |
| ANA-004 | Thunder and Anansi | Barker & Sinclair, tale IV, 'Thunder and Anansi' | Greed that won't share ends up with nothing. | Written – Batch 05 (2-part) | – |
| ANA-005 | Why the Lizard Nods His Head | Barker & Sinclair, tale V | Think twice before trusting someone who has tricked others. (proposed) | To write | DECISION NEEDED: source has boiling water poured into Lizard's mouth and his wives handed to Anansi. Adapt heavily or skip (skipping needs ANA-004 tease edited). |
| ANA-006 | Tit for Tat | Barker & Sinclair, tale VI | A trick you play on others will one day be played on you. (proposed) | To write | Anansi vs his son Kweku Tsin; suitable. |
| ANA-007 | Why White Ants Harm Man's Property | Barker & Sinclair, tale VII | One unkind act can spread harm far beyond the first wrong. (proposed) | To write | Ants boiled in source: keep off-screen. |
| ANA-008 | The Squirrel and the Spider | Barker & Sinclair, tale VIII | What is stolen brings little profit. (proposed) | To write | Suitable. |

### GRM – Grimm Stickman Tales (Hunt tales 1–21 less 3; 20 episodes)

Source and rights: Grimm, tr. Margaret Hunt (1884), PG \#5314. Public domain (record checked; Hunt d. 1912).

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Title\*\* | \*\*Original source\*\* | \*\*Lesson\*\* | \*\*Status\*\* | \*\*Action / notes\*\* |
| GRM-001 | The Frog-King, or Iron Henry | Hunt tale 1, 'The Frog-King, or Iron Henry' | Keep your promises, even the inconvenient ones. | Written – Batch 02 | – |
| GRM-002 | Cat and Mouse in Partnership | Hunt tale 2, 'Cat and Mouse in Partnership' | Watch who you share your pot with. | Written – Batch 02 | Trim: 165 words (max 160) |
| GRM-004 | The Youth Who Went Forth to Learn What Fear Was | Hunt tale 4, 'The Story of the Youth Who Went Forth to Learn What Fear Was' | Being brave doesn't mean feeling nothing. | Written – Batch 02 | Trim: 162 words (max 160) |
| GRM-005 | The Wolf and the Seven Young Kids | Hunt tale 5, 'The Wolf and the Seven Young Kids' | Trust is good. Checking is better. | Written – Batch 02 | – |
| GRM-006 | Faithful John | Hunt tale 6, 'Faithful John' | True loyalty pays any price. | Written – Batch 03 | – |
| GRM-007 | The Good Bargain | Hunt tale 7, 'The Good Bargain' | A cheerful heart can turn bad luck into good fortune. | Written – Batch 03 | – |
| GRM-008 | The Strange Musician | Hunt tale 8, 'The Strange Musician' | Real friends stand beside you when trouble comes. | Written – Batch 03 | – |
| GRM-009 | The Twelve Brothers | Hunt tale 9, 'The Twelve Brothers' | Faithful love can be silent and still be strong. | Written – Batch 03 | – |
| GRM-010 | The Pack of Ragamuffins | Hunt tale 10, 'The Pack of Ragamuffins' | Repay kindness with kindness, not tricks. | Written – Batch 04 | – |
| GRM-011 | Little Brother and Little Sister | Hunt tale 11, 'Little Brother and Little Sister' | Love that never lets go can break any spell. | Written – Batch 04 | – |
| GRM-012 | Rapunzel | Hunt tale 12, 'Rapunzel' | You can lock a door, but you can't lock away love. | Written – Batch 04 | – |
| GRM-013 | The Three Little Men in the Wood | Hunt tale 13, 'The Three Little Men in the Wood' | Kindness costs half a crust and pays back in gold. | Written – Batch 04 | – |
| GRM-014 | The Three Spinners | Hunt tale 14, 'The Three Spinners' | Never be ashamed of the people who helped you. | Written – Batch 05 (2-part) | – |
| GRM-015 | Hansel and Grethel | Hunt tale 15, 'Hansel and Grethel' | Brave and clever together, you can find the way home. | Written – Batch 05 (2-part) | – |
| GRM-016 | The Three Snake-Leaves | Hunt tale 16, 'The Three Snake-Leaves' | Faithfulness given deserves faithfulness returned. | Written – Batch 05 (2-part) | – |
| GRM-017 | The White Snake | Hunt tale 17, 'The White Snake' | One good turn deserves another. | Written – Batch 05 (2-part) | – |
| GRM-018 | Straw, Coal and Bean | Hunt tale 18 | Don't laugh at someone else's misfortune. (proposed) | To write | Suitable. |
| GRM-019 | The Fisherman and His Wife | Hunt tale 19 | Greed is never satisfied. (proposed) | To write | Suitable. |
| GRM-020 | The Brave Little Tailor | Hunt tale 20 | Confidence and cleverness can beat size. (proposed) | To write | Giants' deaths off-screen. |
| GRM-021 | Cinderella (Aschenputtel) | Hunt tale 21 | Kindness and patience outlast cruelty. (proposed) | To write | Season finale. Omit the stepsisters' foot-cutting and the pigeons pecking out eyes. |

  

*All sources: availability verified (Gutenberg text or KJV passage reachable). Full machine-readable list: Season 1 Catalogue (sheet) in the same folder.*