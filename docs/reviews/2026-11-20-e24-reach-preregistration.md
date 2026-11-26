# Pre-registration — E24: the reach test (does the catalogue contain the words users type?)

| Field             | Value                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Registered**    | 2026-11-20, before the corpus is authored and before any call                                                                                            |
| **Question**      | For each owner in the 45-entry preload, is there a path from **the words a developer types** to **that owner** — lexically, and at the model?            |
| **Starting fact** | On the 20-probe gate corpus, 14 of 20 ordinary requests share no token with the name or slug of the mode that owns them: reachability **0.30** (log §31) |
| **Deliverable**   | A per-owner reachability map and a derived `triggers` vocabulary — **catalogue content**, not an amendment to the routing report                         |
| **Status**        | Registered, **not run**. Corpus not yet authored.                                                                                                        |

## 0. What this is, and what it is not

This is **not** a new report on the routing hypothesis, and it does not change any number in [`2026-11-17-routing-report-e17-draft.md`](2026-11-17-routing-report-e17-draft.md:1). Its output is the material the catalogue builder consumes: for each of the 45 owners, the phrases users actually type, the ones the line fails to contain, and the jobs whose owner is not reachable at all. It runs on the **product** rendered line, so it doubles as a first product-form reading — but on 119 briefs, not on a contrast, so it is not R0 and cannot be quoted as one.

## 1. Corpus rule (fixed before authoring)

- **Sampling frame:** the 119 jobs in [`modes-needs-baseline-2026-11.md`](../research/modes-needs-baseline-2026-11.md:194) §5, not the catalogue's slugs. Each job gets **4–6 requests**, giving ≈480–700 probes.
- **Authoring rule:** a request is written as a developer would type it into a chat box — no mode name, no slug, no artefact produced by the mode, and no word taken from the owner's `whenToUse`. **A probe that contains an owner's name or slug is excluded by construction**, because that is the condition the test is about.
- **Second author, blind:** a second person (or a second model instance with no sight of the lines) writes half the probes, so the corpus is not written by the same mind that wrote the lines. Their agreement is reported.
- **Provenance:** every probe carries `jobId`, `axis`, the authored owner, a `source`, and a one-line note on why that owner.

### 1.1 Authoring procedure — added 2026-11-20, before the remaining eleven axes

The DBG seed was authored from the job's trigger column, but by someone who had already read the catalogue's lines. That is the weak version of the bias the blind second author exists to remove, so the procedure is fixed before the rest is written:

1. **Wording comes from the trigger and the definition of done, and from nothing else.** The two frame documents are not opened for wording. A probe that echoes a `whenToUse` phrase is a probe that tests the line against itself.
2. **Ownership is derived, never chosen.** `owner` is read from [`test-fixtures/reach/owners.json`](../../test-fixtures/reach/owners.json:1), which is the frame's "Jobs owned" column reduced to `jobId → [slugs]`. An empty array means the frame assigns no owner; that is a coverage gap and the probe records `owner: null` with a note.
3. **The rule is checked, not trusted.** [`reach-corpus.spec.mjs`](../../scripts/reach-corpus.spec.mjs:1) refuses a probe containing its owner's name or slug, refuses an `owner` that disagrees with `owners.json`, and refuses an unknown `source`.
4. **At least half of the remaining axes are authored blind** — by someone who has not read the catalogue — and tagged `source: "trigger-column-blind"`. Probes authored with knowledge of the lines are tagged `trigger-column` and are not evidence of blindness.

## 2. Two arms, one free

| Arm             | Instrument                                                                                                          | Cost              | What it measures                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| **L — lexical** | the existing `mode-probe-gate` BM25, over the **product** lines                                                     | free              | whether the words exist in the line at all                         |
| **M — model**   | one call per job on its own brief, product form, no mode named: _"which single mode, or what do you need to know?"_ | ≈119 calls ≈ €0.6 | whether the model can reach the owner when the vocabulary does not |

The two arms answer different questions and must not be blended: L is a property of the catalogue text, M is a property of the routing behaviour. Where they disagree, the disagreement is the finding.

## 3. Outcomes, fixed before the data

| Measure              | Definition                                                                                  | Reported as                                                         |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Per-owner reach**  | share of an owner's job-probes whose top-1 is that owner                                    | per-owner row, with the count, never as an overall rate             |
| **Unreachable jobs** | jobs where neither arm reaches the authored owner                                           | a list, and this is the input to D-5 (coverage)                     |
| **Trigger yield**    | for each owner, the 3–6 words that appear in the failed probes and are absent from its line | the candidate `triggers` field, **unvalidated** until a later round |
| **Ask rate**         | share of M-arm replies that ask instead of naming an owner                                  | descriptive; **not** a contrast against E20                         |

## 4. Decision rules

- **If per-owner reach is ≥ 0.8 for most owners**, the `triggers` field is unnecessary and the 0.30 figure was a property of the 20-probe set. That is a finding, and the catalogue build proceeds without `triggers`.
- **If an owner's jobs are unreachable in both arms**, that owner has a line problem, not a corpus problem: the line names the wrong things. These rows are the highest-value output.
- **If a job has no reachable owner at all**, it is a **coverage** defect and goes to D-5, possibly as a new owner. It is not fixed by rewording.
- **No trigger word enters the catalogue** unless the later round that tests it is registered; this round produces candidates only.

## 5. Falsifiers

- A second author's probes reach owners at a materially different rate from the first author's — then the corpus is measuring its author, not the words users type.
- The lexical arm reaches owners the model does not, at scale — then vocabulary is not the binding constraint and `triggers` is the wrong fix.
- Reach is high on the job corpus but low on the 20-probe gate — then the gate corpus, not the catalogue, is the defect.

## 6. Cost and order

**Free half first**: author the corpus, run the lexical arm, publish the per-owner map. **Paid half second**: ≈119 calls, ≈€0.6, gated on the map existing. Total under €1.

This runs **before** the 45 are built, because its output is content the build needs; R0 runs **before** §7's authoring advice is published, because its output is a constraint on a claim. They are independent and can be sequenced either way.

---

## Amendment 1 — 2026-11-20: the anchor rule and the exclusion rule are opposites, and the first seed exposed it

The DBG seed (44 probes, 11 jobs) was authored to the §1 rule and read under both plausible definitions of reachability. The read found a contradiction in this registration, before any result was published from it.

| Definition         | Anchor                                                                          | On the DBG seed               |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------- |
| §31's anchor rule  | the expected owner shares a token with the request **through its name or slug** | **0 / 40 = 0.000**            |
| This corpus's rule | a probe contains **neither** the name nor the slug of its owner                 | excludes exactly those tokens |

**The two are mutually exclusive by construction**, so the §31 metric is _inapplicable_ to this corpus, not adverse evidence about the catalogue. Anyone re-running the anchor rule here will get 0.000 and should read it as "the corpus was built to make this impossible", never as "the catalogue is worse than 0.30".

**What E24 measures instead — line reachability.** A probe is reachable when it shares a token with its owner's **`whenToUse`**, which is the only part of the line an author can change. The identity anchor is reported for the record and never as a rate.

**First read of the seed, and it is a preview, not a result:** line reachability **13 / 40 = 0.325**; BM25 top-1 over the product lines **6 / 40 = 0.150**, top-3 **9 / 40 = 0.225**. The top-1 figure is a **lower bound under an unstemmed exact-token matcher** — "failing" does not match "fails" — so the actionable output is the missing words, not the rate. Two of the wild misses are worth keeping as examples: a failing test drew `venture-analyst`, and an intermittent timeout drew `career-coach`.

**Coverage gap found mechanically.** The frame assigns **no owner to B9** (race and deadlock, 4 probes), which is one of the 13 uncovered jobs. The corpus records `owner: null` and a note, and the spec refuses a null owner without one. That row is direct input to **D-5**.

**What this amendment does not change.** The corpus rule, the two arms, the four decision rules and the falsifiers stand. The only change is which anchor defines reachability, and it is now stated rather than assumed.

## Amendment 2 — 2026-11-20: the corpus is complete, and it separates two different defects

The corpus now covers all twelve axes: **476 probes over 119 jobs**, 4 per job. The free arm has been read. No money has been spent and the paid arm has not run.

### The defect the author introduced, and how it was caught

The owner mapping was derived from the frame's "Jobs owned" column, and one row was invented: the author mapped **Q6 to `documentation`**, a slug that no owner row lists. The frame's own coverage table counts **13** uncovered jobs; the corpus said 12. The check in the spec compares a probe's owner against `owners.json`, which the same pass had written — **it is circular and cannot catch a wrong derivation.** What caught it was a second route: the frame's count. Q6 is now `null`, and the corpus's uncovered set matches the frame's 13 exactly.

Recorded because it generalises: _a "derived, never chosen" rule is only as good as the derivation, and needs an independent count beside it._

### The read, on the product lines

| Measure                                                                   | All 428 owned probes  |
| ------------------------------------------------------------------------- | --------------------- |
| **Line reachability** (probe shares a token with the owner's `whenToUse`) | **176 / 428 = 0.411** |
| **BM25 top-1**                                                            | **65 / 428 = 0.152**  |
| **BM25 top-3**                                                            | **116 / 428 = 0.271** |
| Mean tokens per probe that also occur in a **wrong** owner's line         | **2.36**              |

| Axis |   n | line reach |     top-1 | top-3 |
| ---- | --: | ---------: | --------: | ----: |
| TST  |  44 |  **0.591** | **0.091** | 0.409 |
| IMP  |  40 |  **0.600** |     0.200 | 0.275 |
| SEC  |  32 |  **0.563** |     0.125 | 0.250 |
| REQ  |  20 |      0.450 |     0.250 | 0.400 |
| DOC  |  36 |      0.389 |     0.167 | 0.306 |
| REV  |  36 |      0.389 |     0.111 | 0.222 |
| REF  |  36 |      0.361 |     0.222 | 0.278 |
| ARC  |  32 |      0.344 |     0.125 | 0.219 |
| DAT  |  32 |      0.344 |     0.188 | 0.281 |
| DBG  |  40 |      0.325 |     0.150 | 0.225 |
| UND  |  36 |      0.306 |     0.083 | 0.194 |
| OPS  |  44 |      0.273 |     0.159 | 0.227 |

**Two defects, not one, and they need different fixes.**

1. **Missing words.** On UND, OPS, DBG, DAT, ARC and REF the line shares almost nothing with what users type (reach 0.27–0.36). A `triggers` list of surface forms is the fix.
2. **Capture.** On **TST, IMP and SEC** the words _are_ present — reach 0.56–0.60 — and top-1 is still 0.09–0.20, because three or four neighbouring lines contain the same words. `triggers` will not fix this; a **discriminator** ("not for X") will. Mean _wrong-owner_ token overlap of 2.36 per probe is the size of that problem.

That distinction is the round's first deliverable to the catalogue builder, and it was invisible before the corpus existed.

### Blindness: not achieved, and not claimed

Every probe is tagged `source: "trigger-column"`. The author never read the `whenToUse` column, but did read the mode names and slugs in order to derive ownership, so §1.1's blind fraction is **not met** and the falsifier about a second author's rate cannot be evaluated. A genuinely blind half remains outstanding work.

## Amendment 3 — 2026-11-20: the model arm has run, and the two arms fail in the same places

119 calls, one per job, product-rendered picker, ≈€0.61 at the measured rate. Extractors validated first (R0 §5.2): 20/20 against R2's hand pass.

| Measure                                      | Value                                                             |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Calls / jobs                                 | 119 / 119 (13 jobs have no owner and are excluded from agreement) |
| ASK                                          | **9**                                                             |
| DECLARATION                                  | **104**                                                           |
| UNRESOLVED                                   | **6**                                                             |
| **Strict agreement with the authored owner** | **57 / 106 = 0.538**                                              |
| Same-axis (adjacent) owner                   | 11 → **appropriate = 68 / 106 = 0.642**                           |
| Unrelated owner                              | **25 / 106 = 0.236**                                              |
| No commitment (ask or unresolved)            | 13 / 106 = 0.123                                                  |

**Against the lexical arm, the model is 3.5× better** — 0.538 strict against 0.152 top-1. So the catalogue is not unusable; the model compensates for lines that do not carry the user's words. What it cannot do is compensate where several lines claim the same words.

**The two failure modes survive the change of instrument, and that is the finding.** The axes that lost in the lexical arm lose again here:

| Axis | Lexical top-1 | Model strict |
| ---- | ------------: | -----------: |
| REV  |         0.111 |    **1 / 8** |
| TST  |         0.091 |   **3 / 11** |
| REQ  |         0.250 |        2 / 5 |
| DAT  |         0.188 |        4 / 8 |
| ARC  |         0.125 |        7 / 8 |

A failure that persists across a matcher and a language model is a property of the **text**, not of the instrument. That is what makes capture — several lines containing the same words — a real routing defect rather than a gate artefact, and it is why `triggers` alone will not fix TST or REV.

**Harm, not adjacency, is the number to carry forward.** 25 of 106 landed on an owner outside the job's axis: "works locally, fails in CI" went to `devops`, "explain the history of a decision" went to `debug`, "integrate a payment provider" went to `modernisation`. The adjacency category (11) is the E21 "appropriate" reading; the 25 are wrong in the way that matters.

**Recorded limits.** One call per job, one model, one probe per job, and the "authored owner" is a judgement from the frame rather than a golden key. No contrast was run and no p-value is quoted: this is a descriptive map, and its decision rules were declared in §3 before the data existed.
