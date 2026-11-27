# Adversarial review: `2026-11-26-agent-skills-field-survey.md`

**Date:** 2026-11-26
**Target:** [`docs/research/2026-11-26-agent-skills-field-survey.md`](../research/2026-11-26-agent-skills-field-survey.md:1) (Review copy v1, 585 lines)
**Mandate:** break the argument before publication, not improve its prose.
**Method:** every number recomputed from [`2026-11-25-skills-inventory.csv`](../research/2026-11-25-skills-inventory.csv:1) with an independent `python3` + `csv` pass; every absolute re-tested by parsing all 2,654 `SKILL.md` frontmatter blocks out of the 22 clones at `/tmp/skills-second-coder`, whose `HEAD` I verified equals the `sha12` pinned in the CSV for **all 22 repositories**. Read-only: no file under `docs/research/`, `docs/press/` or `scripts/` was modified.

---

## 1. Verdict

**Do not publish yet.** The structure, the method section and the great majority of the arithmetic survive an adversarial pass — I reproduce the entire percentage family, all nine per-catalogue character sums, the 83/166/558 duplication count, the six test-shipping collections and all 13 frontmatter field frequencies exactly. But six defects are material: two figures still carry the values the report's own §2.7 declares superseded (§2.4 star counts, §2.2 folded count), one absolute is factually false at the pinned commits ("zero `SKILL.md` files are byte-identical across repositories" — there are six), one headline metric measures the wrong thing (the 3.4% negative-scope rate omits the corpus's dominant exclusion form and rises to 16.7% when it is included), and the §5.3 context-cost table omits 332,904 characters of folded description text while claiming the two conventions differ by "exactly the sentinel bytes", which inverts the ranking the section invites. All six are repairable in place, none requires new data collection, and the report's central negative claims — no execution, no efficacy, purposive sample — are correctly and consistently stated. Fix the six, and this publishes well.

---

## 2. Findings

### BLOCKER

#### F1 — Star counts still report the pre-correction diagnosis, contradicting §2.1, §2.7 and the report's own correction

**Location:** [`§2.4, line 93`](../research/2026-11-26-agent-skills-field-survey.md:93); [`§2.5, line 110`](../research/2026-11-26-agent-skills-field-survey.md:110)

> `| Star counts | Available for 3 of 22 repositories before the API rate-limited | The other 19 are unverified; no estimate is substituted |`

> `Three counts survive in the record; nineteen do not.`

**Category:** stale figure surviving its own correction; internal contradiction.

**Why it fails.** §2.7 lists this exact sentence as corrected: `"19 of 22 star counts unavailable: rate limit"` → **`15 of 22 measured`; 7 HTTP 403** ([line 131](../research/2026-11-26-agent-skills-field-survey.md:131)). §2.1 states the corrected position independently — "cover 15 of 22 (seven returned HTTP 403)… thirteen are above 10,000 and two are below" ([line 48](../research/2026-11-26-agent-skills-field-survey.md:48)). So the "measurement limits" table and the "threats to validity" paragraph assert a state of affairs the report simultaneously denies, 20 and 60 lines later. The consequence is not cosmetic: it changes the strength of the prominence claim from "rests on 3 of 22" (weak) to "rests on 15 of 22, two below 10,000" (adequate but imperfect), and it makes the §2.5 paragraph a misstatement of a limitation the report no longer has.

**Minimal fix.** Replace with `15 of 22 measured; 7 returned HTTP 403` and rewrite the §2.5 sentence as "Fifteen of 22 post-hoc counts survive in the record; seven do not."

---

#### F2 — The definitions table still states 611 folded descriptions, inside the section that governs every description percentage

**Location:** [`§2.2, line 77`](../research/2026-11-26-agent-skills-field-survey.md:77)

> `611 rows (23.0%) are folded`

**Category:** stale figure; internal contradiction inside the same section set.

**Why it fails.** §2.7 declares this superseded: `"611 folded descriptions"` → **`610 folded, plus 1 unparsed file recorded as length 0`** ([line 138](../research/2026-11-26-agent-skills-field-survey.md:138)). §2.4 ([line 90](../research/2026-11-26-agent-skills-field-survey.md:90)), §4.3 ([line 265](../research/2026-11-26-agent-skills-field-survey.md:265)) and §5.2 ([line 310](../research/2026-11-26-agent-skills-field-survey.md:310)) all use 610. I confirm 610 from two directions: the CSV contains 264 rows with `description_chars = 1` and 346 with `2` (sum 610), and a frontmatter-scoped scan of the clones returns exactly 610 block-scalar descriptions. The definitions table is the contract every description percentage rests on; it must not be the one place the retired number lives.

**Minimal fix.** `610 rows (23.0%)`.

---

#### F3 — "Zero `SKILL.md` files are byte-identical across repositories" is false, and §6.5's licensing argument leans on it

**Location:** [`§3.6, line 222`](../research/2026-11-26-agent-skills-field-survey.md:222) and [`§6.5, line 429`](../research/2026-11-26-agent-skills-field-survey.md:429)

> `Across all 22 collections, **zero SKILL.md files are byte-identical across repositories**: the ecosystem is less copied than its reputation suggests.`

> `These four files are not byte-identical to the originals — across all 2,654 files, zero SKILL.md files are byte-identical across repositories — so the derivation is invisible in any file listing…`

**Category:** factual error (falsified absolute); the second occurrence is load-bearing for a conclusion.

**Why it fails.** At the pinned SHAs, `md5sum` over `SKILL.md` bytes finds **six** byte-identical groups spanning two repositories, all `ComposioHQ/awesome-claude-skills` ↔ `anthropics/skills`:

| Composio path               | anthropics path                    |
| --------------------------- | ---------------------------------- |
| `brand-guidelines/SKILL.md` | `skills/brand-guidelines/SKILL.md` |
| `internal-comms/SKILL.md`   | `skills/internal-comms/SKILL.md`   |
| `template-skill/SKILL.md`   | `template/SKILL.md`                |
| `webapp-testing/SKILL.md`   | `skills/webapp-testing/SKILL.md`   |
| `theme-factory/SKILL.md`    | `skills/theme-factory/SKILL.md`    |
| `canvas-design/SKILL.md`    | `skills/canvas-design/SKILL.md`    |

Beyond the six, the wider duplication census disagrees with §3.6's framing that there are only "two other duplication findings": I find 96 duplicate-content groups / 194 files, of which 83 are in NVIDIA (matching the report exactly), 5 in `google/skills`, 1 in `microsoft/skills`, 1 in `vercel-labs/skills`, and the 6 cross-repository groups above. The 4× google group the report describes does exist (`skills/developers/finding-google-skills/SKILL.md` plus three `plugins/*/…` copies) — that check passes.

The second sentence matters more than the first: the report uses the false universal as the warrant for "the derivation is invisible in any file listing". The corpus contains verbatim cross-repository copies, so copying _is_ visible in a hash listing — which weakens the provenance argument in the very section that is about to be sent for a legal read.

**Minimal fix.** Delete the universal. Replace with: "Six `SKILL.md` files are byte-identical across repositories — a set of Composio files copied verbatim from `anthropics/skills`. The four licence-bearing files discussed here are not among them, so their derivation does not show up as an identical hash."

---

#### F4 — The 3.4% negative-scope rate omits the exclusion form the corpus actually uses, and §7.2 quotes an example its own detector cannot match

**Location:** [`§7.2, line 457`](../research/2026-11-26-agent-skills-field-survey.md:457), [`§9.1, line 550`](../research/2026-11-26-agent-skills-field-survey.md:550), detector defined at [`§2.2, line 76`](../research/2026-11-26-agent-skills-field-survey.md:76)

> `Only **3.4%** of the corpus states an exclusion in a form a tool can detect, and that figure is a lower bound (§2.4). Over-firing is the failure mode the corpus is least defended against…`

**Category:** unsupported (the number is a property of the phrase list, not of the corpus, and the report reads it as a property of the corpus).

**Why it fails.** The five phrases are `when not to use`, `not for use`, `do not use this skill`, `when to skip`, `do not invoke this`/`do not use this`. I reproduce the published number exactly — 90 files, 3.39% — so the arithmetic is sound. But the phrase list does not contain the form the corpus overwhelmingly uses: "**Don't use for**". Adding `don't use for`, `do not use for`, `not for:`, `not intended for`, `do not trigger`, `don't trigger`, `out of scope` raises the count to **442 files (16.65%)**, of which **407 are hits the report's set misses** (google 166, NVIDIA 116, microsoft 27, android 18, openai 6, addyosmani 4, mattpocock 4, anthropics 3, K-Dense 2, MiniMax 2).

The self-refutation is internal. §7.2's own illustrative quotation is:

> `"Do NOT use for: simple questions, short tasks, one-off commands, linting, or code review."` — [line 453](../research/2026-11-26-agent-skills-field-survey.md:453)

The detector in §2.2 does not match that sentence. So §7.2 illustrates a pattern with a quotation its measurement definition excludes, and the report then states the resulting 3.4% as a finding about the corpus rather than as a finding about its own five phrases. Two further slips compound it: §9.1 upgrades the phrase search to "state an exclusion in a **machine-detectable form**" ([line 550](../research/2026-11-26-agent-skills-field-survey.md:550)), when the one machine-readable form is `not-for:`, used by **3 files** (§4.2, [line 256](../research/2026-11-26-agent-skills-field-survey.md:256)) — a 30-fold difference in magnitude.

**Minimal fix.** Either widen the phrase set, re-run, and republish the rate (my count: 442 / 16.65%, still a lower bound), or restate the finding as two numbers with their detectors: "3 files (0.1%) use the machine-readable `not-for:` field; 90 files (3.4%) match a five-phrase prose search that excludes the common 'Don't use for' form, which appears in at least 407 further files." Then re-check whether "least-defended failure mode" survives — at 16.7% it is still the weakest measured property, so the conclusion strengthens rather than collapses.

---

#### F5 — The catalogue-cost table omits 332,904 characters of folded description text, calls the omission "exactly the sentinel bytes", and thereby inverts the ranking

**Location:** [`§5.3, line 335`](../research/2026-11-26-agent-skills-field-survey.md:335) (table at [lines 323–333](../research/2026-11-26-agent-skills-field-survey.md:323)), conclusion at [`lines 337`](../research/2026-11-26-agent-skills-field-survey.md:337) and [`§9.1, line 551`](../research/2026-11-26-agent-skills-field-survey.md:551)

> `*Text only, folded rows excluded (§2.7). Adding the YAML sentinel characters gives the raw-scalar convention: NVIDIA 88,039, google 4,302, microsoft 49,890, K-Dense 67,359, anthropics 6,425. Both are correct; the difference is exactly the sentinel bytes.*`

> `Read the first row against §5.1: **one catalogue's descriptions alone cost about 24,000 tokens before a single instruction loads**`

**Category:** presentation that misleads on a headline claim; denominator that hides the rows that flip the finding.

**Why it fails.** Both columns exclude the same thing — the _body_ of every folded description — and the note describes their difference as "exactly the sentinel bytes", which is true but beside the point. The unmeasured quantity is not 2 characters per row; it is the block text. Parsing every frontmatter block with PyYAML (folded joined, quotes stripped) gives:

| Catalogue | §5.3 text-only | rows measured | characters actually in frontmatter | ~tokens @ ÷4 | folded characters omitted |
| --------- | -------------: | ------------: | ---------------------------------: | -----------: | ------------------------: |
| NVIDIA    |         87,635 |     361 / 641 |                        **281,616** |  **~70,400** |               **167,968** |
| google    |          3,873 |      10 / 226 |                        **126,166** |  **~31,500** |               **121,931** |
| Composio  |         96,100 |     864 / 864 |                             94,430 |      ~23,600 |                         0 |
| microsoft |         49,792 |     123 / 215 |                             79,967 |      ~20,000 |                    30,584 |
| K-Dense   |         67,355 |     174 / 177 |                             68,779 |      ~17,200 |                     1,448 |
| MengTo    |         91,467 |     223 / 223 |                           ≥77,573¹ |      ≥19,400 |                         0 |
| corpus    |              — |             — |                        **824,853** | **~206,000** |               **332,904** |

¹ my parser hit 13 frontmatter parse failures in MengTo, so that cell is a floor; the CSV's own raw-scalar sum (91,467) is the safer number there.

The Composio figure itself is fine: 96,100 ÷ 4 = 24,025, and the "five times the body budget" comparison (24,000 ÷ 5,000 = 4.8) is right. What fails is everything built on the comparison:

1. The table implies Composio is the most expensive catalogue. It is not — **NVIDIA is ~2.9× more expensive** on the quantity this section purports to measure, because 280 of its 641 descriptions are folded and counted as ~0.
2. Only the google row is marked as low-coverage (`(10 of 226 measurable)`, `unverified`). NVIDIA at 361/641, microsoft at 123/215, anthropics at 17/20 and MiniMax at 9/23 are presented in the same column with no marker, so a reader cannot see that the figures are floors.
3. §9.1's claim "Metadata cost scales with catalogue size, not skill quality" ([line 551](../research/2026-11-26-agent-skills-field-survey.md:551)) is contradicted by the corrected data: NVIDIA (641 skills) carries ~3× the metadata of Composio (864 skills). Per-skill description length varies by roughly 4× across catalogues, so cost tracks _publisher style_, not inventory size. That is a more interesting finding, and it is the one the data supports.

**Minimal fix.** Add a `measurable / total` column to the §5.3 table and mark every partial row as a floor; drop or rescope the "difference is exactly the sentinel bytes" note; and either parse folded blocks before publishing any cross-catalogue ranking, or delete the ranking claim and keep only "Composio's 864 descriptions cost ≈24,000 tokens" as a single-catalogue measurement. Then re-derive the §9.1 sentence from whichever way the data lands.

---

#### F6 — The published CSV was never regenerated, so the report's corrected figures cannot be re-derived from its own dataset

**Location:** [`§2.6, line 118`](../research/2026-11-26-agent-skills-field-survey.md:118), [`§3.4, lines 203–204`](../research/2026-11-26-agent-skills-field-survey.md:203), promise at [`§8.2, line 528`](../research/2026-11-26-agent-skills-field-survey.md:528)

> `Everything quoted is pinned to a 12-character commit SHA per collection (§3.2), so any figure here can be re-derived from the files alone`

**Category:** reproducibility defect; internal contradiction between report and dataset.

**Why it fails.** The CSV still carries the pre-correction values. Recomputed from the CSV itself: `name_conformance` = `fail` on **94** rows, and `name != parent directory` on **143** rows. The report publishes **93** and **142** (§3.4, §4.3, §2.7), correctly — I independently confirm the CRLF file `skills/huggingface-datasets/SKILL.md` has `name: huggingface-datasets`, so 93 and 142 are the right answers. But the dataset was not fixed, so a third party following §8.2's invitation computes 94 and 143 and concludes the report is wrong. §2.6's "Audited 2026-11-26" row does not mention that the audited artefact still contains the defect the report corrects, and the header's "Every figure has been re-derived from the inventory" ([line 4](../research/2026-11-26-agent-skills-field-survey.md:4)) is therefore false for three cells.

**Minimal fix.** Regenerate the three cells (`name`, `name_conformance`, `description_chars` for that one row) and republish the CSV — a one-row edit that makes 93/2,512/189 and the 2,043-row description denominator all recomputable. If the artefact must stay frozen, add a row to §2.6 and a sentence at §2.7 stating that the published CSV retains the defect by design and which three cells a reader must correct to reproduce the report.

---

### MAJOR

#### F7 — "Inflates the apparent failure rate fivefold" is arithmetically wrong by a factor of ~2.8

**Location:** [`§3.4, line 210`](../research/2026-11-26-agent-skills-field-survey.md:210)

> `Conflating the two rules inflates the apparent failure rate fivefold.`

**Category:** factual error.

**Why it fails.** Grammar failures: 94/2,654 = **3.54%**. Directory mismatches: 143/2,654 = **5.39%**. Union (the worst case for conflation, since 66 files fail both): 171/2,654 = **6.44%** — a factor of **1.8×**. Even the most generous reading, comparing the mismatch rate against the grammar rate, is 1.5×. No combination of these quantities yields five. The point the sentence makes (report the two rules separately) is correct and worth keeping; the multiplier is not.

**Minimal fix.** "Conflating the two rules nearly doubles the apparent failure rate (3.5% → 6.4%)."

---

#### F8 — §4.4's mechanism table sums to 24 collection-slots across 22 collections and its "Nothing: 10" cannot be reproduced

**Location:** [`§4.4, lines 271–277`](../research/2026-11-26-agent-skills-field-survey.md:271); repeated at [`§9.1, line 552`](../research/2026-11-26-agent-skills-field-survey.md:552)

> `| Nothing | 10 |`

> `Provenance is nearly absent | **1 of 22** pins a content digest per skill; 10 declare no version anywhere (§4.4)`

**Category:** unsupported; denominator missing.

**Why it fails.** The rows are 6 + 1 + 6 + 1 + 10 = **24** collection-slots for 22 collections, with no note that mechanisms overlap (NVIDIA appears in at least three). Worse, "Nothing = 10" is not reproducible under any definition I tried:

| Definition of "declares a version"                                   | Collections with none                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CSV repo-level `version_declared` column (`yes`=8, `no`=11, `n/a`=3) | **11** (+3 n/a)                                                                                  |
| Frontmatter scan: top-level `version:` or `metadata.version`         | **13** (+3 n/a) — version found only in K-Dense, MiniMax, NVIDIA, google, huggingface, microsoft |
| Frontmatter **or** any `plugin.json`/`package.json` `version`        | **4** (+3 n/a) — Composio, MengTo, openai, anthropics                                            |

The verified parts of §4.4 all hold: top-level `version:` is **83 files in exactly one collection** (NVIDIA); nested `metadata.version` appears in **exactly six** collections; `NVIDIA/skills/versions.json` is the content-digest mechanism, with `content_digest: sha256:…`, `last_commit` and `last_modified` per skill — so "1 of 22 pins a content digest" and "the only mechanism that survives a force-push" are sound. Only the "Nothing" row fails.

**Minimal fix.** State the denominator and the definition in the row ("collections with no version in frontmatter, `plugin.json` or `package.json`": 4 of 19, or whichever definition is intended), note explicitly that rows overlap, and correct §9.1 to match.

---

#### F9 — "903 files at minimum" is contradicted by a full parse, which finds 891

**Location:** [`§4.4, line 273`](../research/2026-11-26-agent-skills-field-survey.md:273) and [`line 279`](../research/2026-11-26-agent-skills-field-survey.md:279)

> `| Per-skill metadata.version | 6, covering 903 files at minimum |`
> `The 903 is a lower bound: … Roughly a third of the corpus versions its skills; the true figure can only be higher.`

**Category:** unsupported (direction of error not established).

**Why it fails.** A line-anchored scan of all 2,654 frontmatter blocks returns **891** indented `version:` keys across the same six collections (K-Dense 177, NVIDIA 282, google 226, microsoft 188, MiniMax 17, huggingface 1). A YAML-parsed count of `metadata.version` specifically returns **890**. Both are _below_ 903, so the "at minimum" framing — which asserts the true value can only be higher — is not supported by the artefact. Either the original grep double-counted something, or 903 includes a form my scan treats differently. The specific claim that the grep "missed deeper nesting, four-space indentation and second `version:` keys", i.e. that 903 undercounts, is the opposite of what a fuller scan shows.

**Minimal fix.** Replace with the parsed figure and its method: "890 files across 6 collections (parsed `metadata.version`); the count is not a lower bound, since a full parse finds fewer than the first-pass grep reported."

---

#### F10 — §1 promises context cost "measured rather than estimated"; §5.2–5.3 deliver a characters-÷-4 estimate that is never validated

**Location:** [`§1, line 28`](../research/2026-11-26-agent-skills-field-survey.md:28), [`§5.2, line 319`](../research/2026-11-26-agent-skills-field-survey.md:319), [`§5.3, line 323`](../research/2026-11-26-agent-skills-field-survey.md:323), [`§9.1, line 551`](../research/2026-11-26-agent-skills-field-survey.md:551)

> `3. What does always-loaded skill metadata cost in context, measured rather than estimated?`

> `At roughly four characters per token, the median skill costs **~36 tokens** of always-loaded metadata and the 90th percentile **~115 tokens**.`

**Category:** claim does not follow from the evidence cited; methodological asymmetry.

**Why it fails.** The measurement is in characters. Every token figure in §5.2, §5.3 and §9.1 is `characters ÷ 4`, and nothing in the report validates ÷4 against a tokenizer for _this_ text. These descriptions are unusually token-dense relative to prose — product names (`ColabFold`), identifiers (`CLOUDSDK_METRICS_REQUEST_ATTRIBUTION`), URLs, YAML-ish lists — where 3–3.5 characters per token is common, which would raise every estimate by 15–30%. §5.4 then criticises vendors for publishing unsourced numbers ([line 350](../research/2026-11-26-agent-skills-field-survey.md:350)); using an unstated conversion constant is the same class of move. The report is careful to write "≈" and "At roughly four characters per token", so this is a labelling failure rather than a hidden one — but §1's word "measured" is not accurate for research question 3.

**Minimal fix.** Retitle the question "…cost in context, bounded by measurement?"; add one sentence stating that token figures are an estimate at a fixed 4-characters-per-token ratio and that the ratio was not validated; or validate it once — tokenize the 2,043 measurable descriptions with the target client's tokenizer and publish both the ratio and the resulting totals.

---

#### F11 — The corrections accounting is internally inconsistent: "six corrections", "Nine corrections in total", and eleven table rows

**Location:** header [`line 16`](../research/2026-11-26-agent-skills-field-survey.md:16), header [`line 4`](../research/2026-11-26-agent-skills-field-survey.md:4), [`§2.7, line 142`](../research/2026-11-26-agent-skills-field-survey.md:142)

> `six corrections from the first pass are listed in §2.7`

> `Nine corrections in total: three found by the audit of the delivered inventory, four by the second-coder pass, and two by the surveyor's own correction commit.`

**Category:** internal contradiction; arithmetic that does not close.

**Why it fails.** The §2.7 table has **eleven** body rows ([lines 130–140](../research/2026-11-26-agent-skills-field-survey.md:130)). The prose says nine and decomposes it as 3 + 4 + 2. The header says six. A three-way disagreement about the count of corrections, in a section whose entire justification is that "a report whose numbers changed silently cannot be checked" ([line 126](../research/2026-11-26-agent-skills-field-survey.md:126)), is exactly the kind of seam a hostile reader opens first.

**Minimal fix.** Count the rows once and use that number everywhere: "Eleven rows: N from the inventory audit, M from the second-coder pass, P from the correction commit, plus one disclosure." Reconcile the header's "six" to the same number.

---

#### F12 — "Every skill in one vendor's catalogue carries an attribution section" is falsified by the corpus

**Location:** [`§6.3(c), line 400`](../research/2026-11-26-agent-skills-field-survey.md:400)

> `Every skill in one vendor's catalogue carries an attribution section requiring the agent to prefix commands — CLOUDSDK_METRICS_REQUEST_ATTRIBUTION="agent-skills/1.0 (skill:spanner-basics)" in every gcloud invocation.`

**Category:** absolute falsified by one counterexample (many).

**Why it fails.** In `google/skills` (226 `SKILL.md`), **108** contain `CLOUDSDK_METRICS_REQUEST_ATTRIBUTION` and **127** contain any attribution-shaped section or the phrase "request attribution". Under either measure "every skill" is false — the mechanism covers at most 56% of the catalogue. The example itself (`skill:spanner-basics`) is real, so the observation is worth keeping; the universal is not.

**Minimal fix.** "Roughly half the skills in one vendor's catalogue (108 of 226) carry an attribution section requiring the agent to prefix `gcloud` commands with `CLOUDSDK_METRICS_REQUEST_ATTRIBUTION=…`."

---

#### F13 — §4.2's "2,653 / 100.0%" is an artefact of the corrected defect; the true count is 2,654

**Location:** [`§4.2, lines 242–243`](../research/2026-11-26-agent-skills-field-survey.md:242); inference at [`line 256`](../research/2026-11-26-agent-skills-field-survey.md:256)

> `| name | 2,653 | 100.0% | yes (required) |`

> `The pattern is unambiguous: the two required fields are universal…`

**Category:** stale artifact of the defect §2.7 corrects; presentation.

**Why it fails.** All **2,654** files have parseable frontmatter containing both `name` and `description` — I verified this directly (0 files without frontmatter, 0 missing either key). The 2,653 is the CRLF row failing the first pass's extractor, i.e. the same cause as F6. The table therefore prints 2,653 and "100.0%" at once, and 2,653/2,654 = 99.96%: a cell that is neither the raw count nor the rounded rate. The sentence "the two required fields are universal" is _more_ correct than the table supporting it.

**Minimal fix.** `2,654 (100.0%)` for both rows, and delete the sentence at line 208 explaining a caveat that no longer applies to the table.

---

#### F14 — §7.3's reference concentration reports the top four plus a small catalogue, not the top five

**Location:** [`§7.3, line 463`](../research/2026-11-26-agent-skills-field-survey.md:463)

> `Measured: **1,135 of 2,654 skills (42.8%)** carry a reference directory, and five collections account for **960 of those (84.6%)**.`

**Category:** factual error (selection), conclusion unaffected.

**Why it fails.** The total (1,135, 42.77%) and the percentage (960/1,135 = 84.58%) are both correct. But the five largest reference-bearing collections are NVIDIA 395, google 218, K-Dense 176, microsoft 147, **MengTo 59** — summing to **995 (87.7%)**. The 960 figure is reproducible only by substituting `cloudflare/skills` (24) for MengTo (59), i.e. skipping the fifth-largest contributor. The error is in the conservative direction: the correct number makes the concentration argument _stronger_.

**Minimal fix.** "…five collections account for **995 of those (87.7%)**."

---

#### F15 — The §6.1 executable-surface table does not reproduce for at least one row

**Location:** [`§6.1, lines 362–374`](../research/2026-11-26-agent-skills-field-survey.md:362)

> `| microsoft | 90 | 5 | 2 | 4 | 15 | 11 |`

**Category:** reproducibility gap (cause unidentified).

**Why it fails.** Applying the §2.2 rule ("a `.py .sh .js .mjs .ts .ps1` file within **2** directory levels of the skill directory") to the pinned clones reproduces most rows within ±1: NVIDIA 1,129 (report 1,125), K-Dense 536 ✓, MengTo 298 ✓, google 228 ✓, openai 62 (61), Composio 55 ✓, anthropics 50 ✓, huggingface 48 ✓, MiniMax 33 (32). Microsoft is the outlier: I count **141** where the report says **90** — a 51-file gap that no rounding explains. Either the microsoft extraction used a narrower rule (perhaps excluding `.github/plugins/**` duplicates, of which that repo has many) or the cell is wrong. The rest of the table's pattern columns (`eval`, `subprocess`, `network`, credential refs, install commands) I did not attempt to reproduce, so I cannot say whether the same narrowing applies to them.

**Minimal fix.** Re-derive the microsoft cells under the stated rule and either correct the number or annotate the row with the narrower rule actually applied ("excluding `plugins/` mirrors").

---

#### F16 — §6.5 names no file, path or SHA, so its three factual claims cannot be checked from the report, and one row asserts a derivation it does not show

**Location:** [`§6.5, lines 421–429`](../research/2026-11-26-agent-skills-field-survey.md:421)

> `| A derivative carrying the original's proprietary notice | Four document skills in one collection carry license: Proprietary with © 2025 Anthropic, PBC. All rights reserved., while the same skills in the original publisher's repository ship Apache-2.0 |`

**Category:** presentation/verifiability; one assertion beyond the evidence.

**Why it fails — and what holds up.** I located and verified all three rows against the pinned clones, so none is fabricated:

1. **Nine distinct per-skill licences** — `openai/skills`: 44 `LICENSE*` files, **9 distinct** contents, and the eight `figma-*` licences do contain the "discontinue" language. **Verified.**
2. **Field with no instrument** — `slavingia/skills`: 10 `SKILL.md`, `license_field = 0` in the CSV, no `LICENSE*` file in the tree. **Verified.**
3. **The proprietary notice** — `ComposioHQ/awesome-claude-skills/document-skills/{docx,pdf,pptx,xlsx}/SKILL.md` carry `license: Proprietary. LICENSE.txt has complete terms`, and the sibling `LICENSE.txt` opens `© 2025 Anthropic, PBC. All rights reserved.` with terms that forbid extracting, copying, creating derivative works from, and distributing the materials. The same-named skills in `anthropics/skills` carry an Apache-2.0 `LICENSE.txt`. **Verified as a statement about the files.**

Three problems remain, and they are the reason this is a finding rather than a pass:

- **Unfalsifiable as published.** §8.2 promises "Everything quoted is pinned to a 12-character commit SHA per collection, so any figure here can be re-derived from the files alone". §6.5 gives no repository, path or SHA for any of its three rows. A reader cannot check the most legally sensitive section of the report without re-cloning all 22 repositories. Every other quotation in the document is locatable; these are not.
- **"Derivative" is asserted, not shown.** The four files are not byte-identical to the anthropics versions, and their descriptions differ. The evidence that they descend from Anthropic's material is the presence of Anthropic's own © notice — which is strong circumstantial evidence inside the file, but the report never states it as the basis. As written, the row title asserts a relationship the section does not establish.
- **Legal-read timing.** The header says an independent legal read of §6.5 is outstanding ([line 4](../research/2026-11-26-agent-skills-field-survey.md:4)). Publishing a paragraph whose row title reads as an allegation of relicensing against a named commercial publisher, before that read, is the single largest reputational risk in the document. The surrounding hedging ("observation, not legal advice, not an assertion about any party's conduct") helps, but it does not neutralise a row label that begins "A derivative carrying…".

I also note, without treating it as a defect, that the underlying facts are more interesting than the framing: the Composio `LICENSE.txt` forbids exactly the redistribution Composio performs, which is a clean, quotable observation about a file, whereas "a derivative carrying the original's proprietary notice" is a characterisation of conduct.

**Minimal fix.** Add repository, path and SHA to each of the three rows (e.g. `ComposioHQ/awesome-claude-skills@be2a406907db:document-skills/docx/LICENSE.txt:1`), retitle the third row as an observation about the file ("A per-skill `LICENSE.txt` whose terms forbid redistribution, shipping beside skills whose same-named originals are Apache-2.0"), and add one sentence saying the derivation is indicated by the retained Anthropic notice rather than by identical bytes. Do not publish before the legal read lands.

---

#### F17 — The stated cause of the 611→610 correction is contradicted by a reproducible alternative

**Location:** [`§2.7, line 138`](../research/2026-11-26-agent-skills-field-survey.md:138)

> `| "611 folded descriptions" | **610** folded, plus 1 unparsed file recorded as length 0 | The earlier total combined folded blocks with the unparsed row |`

**Category:** unsupported (cause attributed without evidence; the correction itself is right).

**Why it fails.** 610 is correct. But the causal story does not fit: the unparsed row is a _plain 189-character scalar_, not a block scalar, so folding it into a "folded" bucket would not produce 611 from a block count. I can reproduce 611 by a different mechanism: a **whole-file** regex for `^description: [>|]` returns exactly **611**, and the extra one is a `description: >` example inside the body of `microsoft/skills/.github/skills/skill-creator/SKILL.md` — a template demonstrating frontmatter inside prose. Scoping the same regex to the frontmatter returns 610. So the likely cause is "the count was not scoped to frontmatter", not "the count included the unparsed row".

**Minimal fix.** Either state the cause as unidentified, or state the scoped-vs-unscoped explanation and name the file.

---

### MINOR

#### F18 — A paragraph is duplicated verbatim

**Location:** [`lines 52–54`](../research/2026-11-26-agent-skills-field-survey.md:52) (identical text; my duplicate-detector found this and only this)

> `**Consequence for every claim in this report.** Five catalogues hold 81.7% of the 2,654 files, and one holds 32.6%. … A statement of the form "most skills do X" is a statement about five vendors' catalogues.`

**Fix.** Delete one occurrence.

#### F19 — One table row contains an unescaped pipe and breaks the table

**Location:** [`§2.6, line 120`](../research/2026-11-26-agent-skills-field-survey.md:120)

> `| Self-verification performed | … find … -iname SKILL.md | wc -l = 2,654; …`

The `|` inside the inline code splits the row into four cells against a three-column header. It is the only inconsistent block in the document (24 of 25 tables are clean).

**Fix.** Escape as `\|` or move the command out of the table.

#### F20 — §9.3 item 8 points at the wrong row of the §8 table

**Location:** [`§9.3, line 575`](../research/2026-11-26-agent-skills-field-survey.md:575)

> `8. **An abstention case per skill** — a test that the skill returns nothing when the evidence is absent (§7.5, §8 row 1).`

§8 row 1 is "Does a skill improve task outcomes?". Abstention/negative-trigger work is rows 2 and 6.

**Fix.** `(§7.5, §8 rows 2 and 6)`.

#### F21 — The 1,024-character sentence contradicts itself on 12 vs 13

**Location:** [`§5.2, line 319`](../research/2026-11-26-agent-skills-field-survey.md:319)

> `Thirteen files exceed the specification's 1,024-character limit under the inventory's raw-scalar convention, which counts quotation marks; twelve do once the quotations are stripped — twelve in one design catalogue, one in a vendor catalogue.`

Both numbers are right (13 raw, 12 stripped; composition 12 MengTo + 1 `microsoft/…/aks-troubleshooting/SKILL.md`, verified) but the em-dash attaches the 13-file composition to the 12-file clause, so the sentence reads `12 = 12 + 1`.

**Fix.** "…twelve do once the quotations are stripped. All thirteen are in one design catalogue (12) and one vendor catalogue (1)."

#### F22 — The p90 is convention-dependent and the convention is not stated

**Location:** [`§5.2, line 316`](../research/2026-11-26-agent-skills-field-survey.md:316)

> `| 90th percentile | ≈460 characters |`

Nearest-rank on the 2,043 values = **460**; linear interpolation = **463.2**. Both are defensible; the report states neither, and §5.3's downstream token figure depends on which is used (~115 vs ~116 tokens).

**Fix.** "460 (nearest-rank over the 2,043 measurable values)".

#### F23 — "folded (`>-`)" mislabels the 98 literal-block descriptions

**Location:** [`§2.2, line 77`](../research/2026-11-26-agent-skills-field-survey.md:77), [`§2.4, line 90`](../research/2026-11-26-agent-skills-field-survey.md:90)

The 610 rows are 513 folded (`>` 173, `>-` 340) and **98 literal** (`|` 92, `|-` 6). Both are YAML block scalars and both are excluded from the distribution, which is the substantive point; the label is what is imprecise.

**Fix.** "610 block scalars (`>`/`>-`/`|`/`|-`)".

#### F24 — "no live secret" is an absence claim whose detector and hit count are not published

**Location:** [`§6.2, line 380`](../research/2026-11-26-agent-skills-field-survey.md:380)

> `A pattern scan for vendor key prefixes, cloud access-key shapes, PEM private-key headers and chat-platform tokens returned **no live secret**.`

My own scan (AWS `AKIA`, PEM headers, `sk-…`, `gh[pousr]_…`, `xox[baprs]-…`, `AIza…`, `sk-ant-…`, JWT triples) over 24,037 files returns 12 matching files — 2 `sk-`, 1 PEM, 2 `sk-ant-`, 1 `ghp_`, 5 Slack, 3 JWT — all in K-Dense and SkillSpector test fixtures or microsoft Teams deployment docs, i.e. exactly the three categories the report names. **The claim survives my attempted falsification.** But it is unfalsifiable _as published_: no pattern list, no hit count, no per-hit disposition, and "live" is not defined. A reviewer cannot distinguish "we checked and all were fixtures" from "our patterns were too narrow".

**Fix.** Publish the pattern list, the hit count and the disposition table (as §6.2's third paragraph does for one file).

#### F25 — §8.2's "everything quoted is pinned" is not true of §6.5 or §7

**Location:** [`§8.2, line 528`](../research/2026-11-26-agent-skills-field-survey.md:528)

§6.5's three licence rows and §7's seven pattern quotations all said "one vendor", "one catalogue", "one process collection", with no path or SHA. Locatable-by-re-cloning is weaker than the promise made.

**Fix.** Either add locations for the quotations that carry a finding (§6.5 at minimum), or soften the promise to "every figure".

### PRESENTATION

#### F26 — §3.1's taxonomy rows overlap without saying so

The collections column sums to 17 + 1 + 9 + 1 + 2 + 2 = 32 across 22 repositories, because a plugin bundle can also publish folders. The sentence "Six distinct artefacts are published under the same name" is defensible; the table reads as a partition.

**Fix.** Add "collections may appear in more than one row".

#### F27 — The §5.3 table is not sorted by any column, and the narrative reads it as a ranking

Rows run 864, 641, 223, 177, 215, 20, 15, 10, 226 skills — neither count nor cost order. With F5 corrected, NVIDIA would sort first on cost; as printed, `Read the first row` invites the reader to treat row 1 as the maximum.

**Fix.** Sort by the column the section is actually about, and label it.

#### F28 — "100.0%" hides the unparsed row it is rounding over

Covered by F13; noted separately because the same rounding is defensible once the count is 2,654.

---

## 3. Checks run with no finding

Everything below was tested and holds. This section exists so that the absence of a finding is auditable.

### 3.1 Corpus and structure

| Check                                            | Result                                                                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSV row total                                    | **2,676** rows = 22 `repo` + 2,654 `skill` ✓ (§2.7, §8.2)                                                                                                             |
| Distinct pinned SHAs                             | **22** ✓; all 22 clones' `HEAD` equal the CSV `sha12` (verified with `git rev-parse`)                                                                                 |
| Per-repository skill counts, all 22 rows of §3.2 | Reproduce **exactly** ✓                                                                                                                                               |
| `all files` column of §3.2, all 22 rows          | Reproduce exactly under `find -type f` (including the two that looked off by one — `mattpocock` 189, `agentskills` 141 — which differ from a symlink-counting walk) ✓ |
| Columns 14–17 empty "by design" (§2.6)           | `version_declared`, `licence_verbatim`, `script_files_in_skills`, `tests_or_evals` are empty on **all 2,654** skill rows ✓                                            |
| Three collections publishing no `SKILL.md`       | Confirmed (4, 35, 142 files; none named `SKILL.md`) ✓                                                                                                                 |

### 3.2 The percentage family — every percentage recomputed

| Sentence                        | Report                | Recomputed                                                                                | Verdict            |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- | ------------------ |
| Five catalogues hold … 81.7%    | 81.7%                 | 2,169 / 2,654 = **81.73%**                                                                | ✓                  |
| One holds 32.6%                 | 32.6%                 | 864 / 2,654 = **32.55%**                                                                  | ✓                  |
| Name conforms                   | 2,561 (96.5%)         | 2,561 / 2,654 = **96.50%**                                                                | ✓                  |
| Name equals directory           | 2,512 (94.6%)         | 2,512 / 2,654 = **94.65%**                                                                | ✓ (CSV stale — F6) |
| No field outside the closed set | 1,477 (55.7%)         | 1,477 / 2,654 = **55.65%**                                                                | ✓                  |
| ≥1 rejected field               | 1,177 (44.3%)         | 1,177 / 2,654 = **44.35%**; 1,477+1,177 = 2,654                                           | ✓                  |
| `license` declared              | 1,082 (40.8%)         | 1,082 / 2,654 = **40.77%**                                                                | ✓                  |
| `description` ≤ 1,024           | 2,030 / 2,043 (99.4%) | **99.36%**                                                                                | ✓                  |
| `SKILL.md` ≤ 500 lines          | 2,610 (98.3%)         | 2,610 / 2,654 = **98.34%**                                                                | ✓                  |
| Over 500 lines                  | 44 (1.7%)             | **1.66%**; per-publisher 3/23 = 13.0%, 6/42 = 14.3%, 4/25 = 16.0%, 7/641 = 1.09%          | ✓                  |
| Skills with code ≤2 levels      | 546 (20.6%)           | 546 / 2,654 = **20.57%**                                                                  | ✓                  |
| Reference directory             | 1,135 (42.8%)         | 1,135 / 2,654 = **42.77%**                                                                | ✓                  |
| Folded / measurable split       | 610 + 2,043           | 610 + 2,043 = **2,654**, and 610/2,654 = **22.98%**                                       | ✓                  |
| Test/eval shipping              | 6 of 22 (27%)         | 6/22 = **27.3%**; the six are exactly the CSV's `tests_or_evals = yes` set                | ✓                  |
| Negative scope                  | 90 (3.4%)             | **90 = 3.39%** under the published five phrases (see F4 for the defect in the phrase set) | ✓ arithmetic       |

### 3.3 Per-catalogue character sums — every cell reproduced

Recomputed from `description_chars`, text-only convention (folded sentinels excluded), all nine rows of §5.3 match **to the character**: Composio 96,100 · NVIDIA 87,635 · MengTo 91,467 · K-Dense 67,355 · microsoft 49,792 · anthropics 6,421 · obra 2,319 · slavingia 1,950 · google 3,873 (10 of 226 measurable). The raw-scalar footnote also reproduces exactly: NVIDIA 88,039 · google 4,302 · microsoft 49,890 · K-Dense 67,359 · anthropics 6,425 — each differing from its text-only twin by exactly the sentinel count. The problem is what both columns omit (F5), not the arithmetic.

Downstream conversions check out: 96,100 ÷ 4 = 24,025 ≈ 24,000 ✓; 24,000 ÷ 5,000 = 4.8 ≈ "five times" ✓; 20 × 36 = 720 ✓; 20 × 115 = 2,300 ✓; 144 ÷ 4 = 36 ✓; 460 ÷ 4 = 115 ✓.

### 3.4 Description statistics

Text-only convention, n = 2,043: mean **226.69** (report 227 ✓), median **144** ✓, max **1,691** ✓, p90 **460** nearest-rank ✓ (463.2 linear — see F22). The 13-over-1,024 and 12-after-stripping counts reproduce exactly, with the composition 12 MengTo + 1 microsoft.

### 3.5 Frontmatter field frequencies (§4.2) — all 13 rows

Parsed with PyYAML from the pins: `name` 2,654 · `description` 2,654 · `metadata` 1,245 · `license` 1,082 · `requires` 832 · `compatibility` 506 · `allowed-tools` 317 · `tags` 171 · `version` 83 · `when_to_use` 38 · `permissions` 30 · `disable-model-invocation` 28 · `triggers` 19 · `not-for` 3. **Every figure matches**, including the three-file `not-for` footnote.

### 3.6 Duplication (§3.6)

NVIDIA: **83 groups / 166 files**, all pairing `skills/` with `plugins/*/skills/`, giving **558** distinct ✓. The 4× google group exists under the exact paths described ✓. (The "zero across repositories" absolute fails — F3 — and the enumeration omits four additional within-repo groups.)

### 3.7 Versioning and provenance (§4.4)

Top-level `version:` = **83 files in exactly one collection** ✓. Nested `metadata.version` in **exactly six** collections ✓. `NVIDIA/skills/versions.json` carries `content_digest: sha256:…` + `last_commit` + `last_modified` per skill, so "1 of 22 pins a content digest" and the force-push remark hold ✓. (Count and the "Nothing" row fail — F8, F9.)

### 3.8 Licence observations (§6.5)

All three rows verified against the pins, as documented in F16: openai's 44 files / 9 distinct with the "discontinue" clause; slavingia's 10 skills with no instrument; Composio's four `document-skills/*` with `license: Proprietary…` and an Anthropic © `LICENSE.txt` whose terms forbid redistribution, against Apache-2.0 in `anthropics/skills`. The facts are right; the framing and locatability are not.

### 3.9 Safety scans (§6.1, §6.2, §6.3)

- Negative-scope rate arithmetic ✓ (F4 concerns the phrase set, not the sum).
- Secret-pattern scan: 12 files matched, **all** in test fixtures or documentation placeholders — consistent with §6.2's three categories (F24 concerns publication of the method, not the finding).
- §6.1's total (546 skills with code) and nine of ten per-collection rows reproduce within ±1 (F15 concerns microsoft).
- §6.4's mechanism descriptions spot-check: `obra/superpowers/tests/skill-size/test-skill-size.sh` exists and is the 20,000-byte test ✓; `addyosmani` graders/negative cases present ✓.

### 3.10 Mechanical integrity

- Code fences: **0** (no unclosed fences possible) ✓.
- Link targets: all 5 resolve — [`scripts/skills-survey-extract.sh`](../../scripts/skills-survey-extract.sh:1), [`scripts/SKILLS-SURVEY.md`](../../scripts/SKILLS-SURVEY.md:1), the CSV, the second-coder review, the internal landscape note ✓.
- Headings: 51, sequential, **no duplicates**, no empty sections ✓.
- Tables: **24 of 25** internally consistent (the exception is F19) ✓.
- Duplicated prose: exactly one paragraph (F18) ✓.
- Section cross-references: all resolve except F20 ✓.
- Sample of the §9.1 "five claims the data carries": claims 1, 2 and 5 are reproducible from the corrected figures; claim 3 fails on F4; claim 4's token figure fails on F5.

---

## 4. What I could not check, and what would be needed

1. **The specification's own claims** — "247-line specification", "two lead and five core maintainers", the validator's exact error string, "metadata ≈ 100 tokens; body < 5,000 tokens; under 500 lines" (§4.1, §5.1). The spec is inside `agentskills/agentskills@83021e2be457`; I did not read it. _Needed:_ one `wc -l` and a read of the spec plus validator README.
2. **The 26.1% / 5.2% vulnerability figures and the 31,132-skill dataset** (§5.4, §8 row 5). The dataset is not in the repository — unverifiable by construction, as the report says.
3. **Star counts** (§2.1). Time-varying, no archived snapshot; I did not re-query the API. _Needed:_ a dated dump committed alongside the CSV.
4. **"no live secret"** as an absolute (§6.2). Absence cannot be established by pattern scanning; I can only show that my patterns (a) found 12 candidate files and (b) all 12 are fixtures or placeholders. _Needed:_ the report's pattern list and per-hit disposition.
5. **"no live bait in any authored skill body"** (§6.3). Same structure, plus an undefined term ("live bait") and an undefined denominator ("authored" — the 832 generated wrappers are presumably excluded, but the sentence does not say so).
6. **Whether the four Composio document skills descend from Anthropic's material** (§6.5). Content is not byte-identical; the inference rests on the retained © notice. _Needed:_ a body diff against the anthropics versions, or a commit-history read on a full clone.
7. **The 20,000-byte compaction claim's provenance** (§5.1, §8 row 4). The test file exists; the runtime issue it cites is out-of-tree, as the report concedes.
8. **The §6.1 pattern columns** (`eval`, `subprocess`, `network`, credential references, install commands). I reproduced the code-file column only; the pattern counts need the extractor's exact regexes, which are in the transcript but were not re-run end-to-end (the report says so itself).
9. **`microsoft`'s 90-vs-141 code-file discrepancy** (F15). Cause unidentified — I cannot tell whether the report used a narrower rule or the cell is wrong.

---

## 5. Three questions for the authors

1. **§5.3: what is the research question's answer — Composio, or the corpus?** The section answers question 3 ("what does always-loaded metadata cost, measured rather than estimated") with a table whose largest cell excludes 280 of NVIDIA's 641 descriptions and 216 of google's 226. If folded blocks are parsed, NVIDIA's metadata costs roughly 70,000 tokens, not 21,900 — nearly three times the Composio figure the narrative highlights, on a catalogue with 223 _fewer_ skills. Which claim does the report intend to stand behind: "Composio's 864 descriptions cost ≈24,000 tokens" (true, and a single-catalogue measurement), or "metadata cost scales with catalogue size" (which the corrected data contradicts — it scales with publisher style)? Answering this before publication decides whether §9.1's fourth claim is a finding or an artefact.

2. **§4.4: what exactly is "Nothing", and what is the denominator?** The five mechanism rows sum to 24 slots across 22 collections, with no note that they overlap, and "Nothing: 10" reproduces under none of the three definitions I tried (CSV column: 11; frontmatter: 13; frontmatter-or-manifest: 4). §9.1 then hardens it to "10 declare no version anywhere". Which collections are the ten, and does a `plugin.json` `version` count as versioning a skill? A one-line definition and an explicit overlap note would make the row checkable; without them it is the only cell in §4 that cannot be audited.

3. **§6.5: is "derivative" a measurement or an inference — and is this paragraph cleared for publication before the legal read?** The four files carry `license: Proprietary` and an Anthropic © notice, and the same-named skills in `anthropics/skills` ship Apache-2.0; that much I verified. But the files are not byte-identical, so "a derivative carrying the original's proprietary notice" rests on the retained notice rather than on a demonstrated relationship, and the section names no repository, path or SHA — uniquely in a report that elsewhere pins everything. Should the row be restated as an observation about what the file says (its terms forbid redistribution) rather than about what the publisher did, and should §6.5 wait for the independent legal read that the header already lists as outstanding?
