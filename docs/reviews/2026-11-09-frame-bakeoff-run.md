# Frame bake-off — run report (T-F / T-H)

| Field                         | Value                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Run date (UTC)**            | 2026-11-09                                                                                                                                                                                                                     |
| **Test**                      | **T-F** shape bake-off (axis × stance vs artefact) with **T-H** assimilation scored on the subset of D4 that this evidence can carry — [`modes-catalogue-brainstorm.md`](../modes-catalogue-brainstorm.md:223)                 |
| **Frames**                    | A = axis × stance ([`modes-catalogue-axis-stance-frame.md`](../modes-catalogue-axis-stance-frame.md:1), 45 entries) · B = artefact ([`modes-catalogue-artefact-frame.md`](../modes-catalogue-artefact-frame.md:1), 47 entries) |
| **Design**                    | 3 briefs × 2 frames × 3 independent runs = **18 trials**, all executed                                                                                                                                                         |
| **Status**                    | Report only. No catalogue, ADR, `ROADMAP.md`, `CHANGELOG.md`, changeset, fixture or generator was edited.                                                                                                                      |
| **Revision**                  | 2026-11-09 — §3 now carries the literal trial prompt in place of a reconstruction, and states the harness limitation; §4.1 scores D4 criterion 4 as a flagged judgement; §5 reason 1 restated as eighteen trials               |
| **What this document is not** | Not a frame decision, not a user study, not a measurement of what an agent does _after_ it is routed                                                                                                                           |

---

## 1. What was executed vs what was not

| Activity                                                              | Status                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture generation from both catalogue markdown files                 | **Executed** — [`generate-frame-fixtures.mjs`](../../scripts/generate-frame-fixtures.mjs:1)                                                       |
| Schema validation of both `.roomodes` fixtures                        | **Executed** — `PASS (45 entries)`, `PASS (47 entries)`, exit 0                                                                                   |
| Idempotency (two consecutive generator runs, hash diff)               | **Executed** — byte-identical                                                                                                                     |
| **18/18 selection trials** (3 briefs × 2 frames × 3 independent runs) | **Executed** — fresh-context subtasks, ask-mode agents                                                                                            |
| Cost accounting (chars per frame, chars per entry)                    | **Executed**                                                                                                                                      |
| **T-K** plan reconciliation                                           | **Cited from this task's preliminary results — NOT redone** (stance 13 uncovered / 2 double-assigned vs artefact 4 uncovered / 4 double-assigned) |
| **T-B** routing budget                                                | **Cited from this task's preliminary results — NOT redone** (Σ`whenToUse` 4,208/45 vs 2,736/35 ≈ 3.3k for 47)                                     |
| Any human selection trial                                             | **Not executed**                                                                                                                                  |
| Any cross-model run                                                   | **Not executed** — one model family ([§5](#5-what-this-run-cannot-conclude), reason 2)                                                            |
| Any real-user signal (findability, abandonment, time-to-selection)    | **Not executed** — no user ever saw either catalogue                                                                                              |
| D4 criteria **2 (Findable), 5 (Recoverable), 6 (Teach-in rate)**      | **Not measured** — requires real users                                                                                                            |

**Nothing in this report is a placeholder.** All 18 trials returned, and every fixture used by them was generated, validated and proved reproducible.

What "executed" means here, exactly:

- eighteen real model selections, each from a **fresh context**, each returning one slug and one one-line rationale, each given exactly one input file;
- a cost figure measured on the exact text those agents were shown;
- a schema and idempotency result measured on the exact files those agents were shown.

What "executed" does **not** mean:

- it is not evidence about a **human** choosing — no person performed the selection;
- it is not evidence about **model variance** — one model family supplied all eighteen answers;
- it is not evidence about **outcomes** — nothing measured what the agent did after being placed in the chosen mode;
- it is not evidence of **discovery** — the agent was handed a flat list of 45 or 47 lines, so no navigation, search or scrolling occurred.

---

## 2. Fixtures

### 2.1 Generator and outputs

[`generate-frame-fixtures.mjs`](../../scripts/generate-frame-fixtures.mjs:1) parses both catalogue markdown files **directly**; there is zero hand-copied entry data. It exits non-zero if either catalogue fails to yield its expected entry count, so a silent partial parse cannot produce a fixture.

| Fixture                                                                                           | Entries | Selection-block chars | Chars per entry |
| ------------------------------------------------------------------------------------------------- | ------- | --------------------- | --------------- |
| [`axis-stance.roomodes`](../../test-fixtures/frames/axis-stance.roomodes:1)                       | **45**  | —                     | —               |
| [`axis-stance.selection-block.txt`](../../test-fixtures/frames/axis-stance.selection-block.txt:1) | 45      | **5,104**             | **113.42**      |
| [`artefact.roomodes`](../../test-fixtures/frames/artefact.roomodes:1)                             | **47**  | —                     | —               |
| [`artefact.selection-block.txt`](../../test-fixtures/frames/artefact.selection-block.txt:1)       | 47      | **4,275**             | **90.96**       |

Selection-block format: one line per entry, `- <slug> — <whenToUse verbatim>`. The line prefix costs roughly 20 characters, so block length is a **strictly additive cost proxy** over the drafted `whenToUse` text — it measures text shown, not text stored.

### 2.2 Schema validation

The repo's own generated schema [`schemas/roomodes.json`](../../schemas/roomodes.json:1) — generated from [`roomodes-schema.ts`](../../packages/types/src/roomodes-schema.ts:39) by [`generate-roomodes-schema.ts`](../../packages/types/scripts/generate-roomodes-schema.ts:1) — was reused unchanged and validated with ajv@8.20.0 from `packages/types`. No field was renamed or dropped.

Command as recorded:

```
cd packages/types && node --input-type=module -e 'import Ajv from "ajv"; import {readFileSync} from "node:fs"; import {parse} from "yaml"; const schema=JSON.parse(readFileSync("../../schemas/roomodes.json","utf8")); const ajv=new Ajv({allErrors:true}); const validate=ajv.compile(schema); let failed=false; for (const f of ["../../test-fixtures/frames/axis-stance.roomodes","../../test-fixtures/frames/artefact.roomodes"]) { const doc=parse(readFileSync(f,"utf8")); const ok=validate(doc); console.log(f+": "+(ok?"PASS":"FAIL")+" ("+doc.customModes.length+" entries)"); if(!ok){console.log(JSON.stringify(validate.errors,null,2)); failed=true} } process.exit(failed?1:0)'
```

Result: **PASS (45 entries)** and **PASS (47 entries)**, exit 0.

It is run from `packages/types` so that `ajv` resolves from that package's devDependencies; `yaml` is a root devDependency. It exits non-zero if either fixture fails.

### 2.3 Idempotency

Two consecutive generator runs produced byte-identical output; a `diff` over `sha256sum` output was empty.

| Fixture                           | SHA-256 (truncated) |
| --------------------------------- | ------------------- |
| `axis-stance.roomodes`            | `30315cd2…06edc6`   |
| `axis-stance.selection-block.txt` | `e6836d8b…8c27590`  |
| `artefact.roomodes`               | `901ecee0…e33cf2c`  |
| `artefact.selection-block.txt`    | `4b209f1b…e3a46a`   |

`groups` assignment is one documented deterministic rule (section lookup plus one keyword overlay for `browser`). There is no per-entry tuning.

### 2.4 Drafting cross-check

| Frame         | Σ`whenToUse` | Lines | Verbatim from catalogue | Derived by generator |
| ------------- | ------------ | ----- | ----------------------- | -------------------- |
| axis × stance | **4,208**    | 45    | 45                      | 0                    |
| artefact      | **3,462**    | 47    | 35 = **2,736**          | 12 = **726**         |

The axis × stance figure of 4,208 is exactly the figure the stance catalogue itself claims, which independently proves the 45 lines are byte-faithful. The artefact figure decomposes exactly: 2,736 over the 35 drafted lines is again the catalogue's own number, and 726 characters are **derived, not drafted**.

### 2.5 Material defect: 12 artefact `whenToUse` lines were never drafted

**`docs/modes-catalogue-artefact-frame.md` §1.4 (`Non-coding artefacts`, rows A36–A47) has no `Draft whenToUse` column at all.** Those rows — `legal-note`, `control-map`, `campaign-brief`, `content-piece`, `financial-model`, `pricing-analysis`, `product-brief`, `market-analysis`, `synthesis-report`, `career-plan`, `ai-feature`, `eval-suite` — carry only `Produces` and an estimated `~chars`. The generator therefore derived those 12 lines from one fixed template, `Use when <Produces cell> must be produced.` ([`generate-frame-fixtures.mjs`](../../scripts/generate-frame-fixtures.mjs:56)). The catalogue's own §7.1 estimates the same 12 classes at ~580 characters.

Tally, stated plainly: **45/45 axis-stance lines verbatim, 35/47 artefact lines verbatim, 12 derived.**

**Cost consequence.** The artefact frame's cost figure partly reflects **absence of drafting** rather than a cheaper design:

| Quantity                                                          | Value                       |
| ----------------------------------------------------------------- | --------------------------- |
| Drafted mean (2,736 ÷ 35)                                         | **78.2** chars              |
| Derived mean (726 ÷ 12)                                           | **60.5** chars              |
| Corrected estimate if all 47 had been drafted at the drafted mean | 47 × 78.2 = **3,674** chars |

3,674 is still **below** the stance frame's 4,208. The comparison therefore survives the defect: at equal drafting effort the artefact frame would cost about 534 characters less, not 829 less. But the _reported_ gap of 829 characters overstates the artefact frame's advantage by the drafting artefact alone, and the honest comparison figure is 4,208 vs 3,674.

### 2.6 Format difference, for the record

- **axis × stance** — pipe-table rows under three `##` headings (`1. Coding owners (24)`, `2. Meta owners (5)`, `3. Non-coding owners (16)`), columns `# | Mode | Axis | Stance | Jobs owned | Draft whenToUse | ~chars`. The slug is the backticked `Mode` cell; there is no separate display name.
- **artefact** — pipe-table rows under four `###` headings (`1.1 Coding (24)`, `1.2 Operations and data (6)`, `1.3 Meta (5)`, `1.4 Non-coding (12)`), columns `# | Mode | Produces | Serves jobs | Draft whenToUse | ~chars` for §1.1–§1.3 and a shortened header for §1.4.

Both were parsed automatically; no hand-authored fixture was needed.

### 2.7 Incidental: reused built-in slugs

The axis-stance catalogue reuses four upstream built-in slugs (`architect`, `code`, `debug`, `orchestrator`). `test-fixtures/frames/` is not a packaged artifact, so nothing breaks; but the fixture would collide if installed as-is. This matters for one confound in [§5](#5-what-this-run-cannot-conclude), reason 3.

---

## 3. Protocol

The protocol below is the one that was run. One operator, eighteen subtasks, twenty minutes of wall-clock.

### Step 1 — produce the selection block

```
node scripts/generate-frame-fixtures.mjs
```

This writes both `.roomodes` fixtures and both selection blocks into `test-fixtures/frames/`. Never copy `whenToUse` text by hand; the generator is the only source of the text the trials see, which is what makes the cost figure and the choice comparable.

### Step 2 — fix the briefs before any trial

Briefs are quoted **verbatim** in quotation marks, with no added hints:

| ID  | Brief                                                          |
| --- | -------------------------------------------------------------- |
| B1  | "CI is red on a test that passes locally. I have no idea why." |
| B2  | "Make this endpoint 3× faster."                                |
| B3  | "Explain why this module is structured the way it is."         |

State the intended owner for each brief **before** any trial runs (B1 → `debug` / `bug-report`; B2 → `performance` / `benchmark`; B3 → `explain` / `explanation`). Without a pre-stated owner, "correct" can be reinterpreted after the fact.

### Step 3 — mandatory clauses of the trial prompt

One identical template for every trial. The table paraphrases the clauses and says why each exists; the fenced block below is the authoritative text.

| #   | Clause                                                                                                      | Why it is mandatory                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Read exactly one file: the selection block at `<path>`. Read nothing else."                                | Makes the frame the sole input, so a difference between frames is a difference in the catalogue                              |
| 2   | "Ignore the workspace file listing, the open editor tabs, and the list of modes in your own system prompt." | Removes accidental prior knowledge of the real catalogue — imperfectly; see [§5](#5-what-this-run-cannot-conclude), reason 4 |
| 3   | "Pick the single best mode for the brief below, from that file only."                                       | Forces one answer                                                                                                            |
| 4   | "Return exactly `{\"slug\": \"...\", \"rationale\": \"...\"}` and nothing else. One slug, one line."        | Makes agreement and correctness countable and prevents ranked lists                                                          |
| 5   | "Brief (verbatim, do not reinterpret): `<quoted brief>`"                                                    | Keeps the brief identical across frames                                                                                      |

**The literal prompt, used verbatim in all 18 trials.** The block below is the exact string; only the `<…>` substitutions changed per trial — ordering, wording, the "measurement, not implementation" framing and the single-JSON answer format were identical in every run.

```
You are performing ONE isolated mode-selection trial. This is a measurement, not an implementation task: you will not write code, edit files, or run commands.

Bindings for this trial:
- Catalogue: `test-fixtures/frames/<frame>.selection-block.txt` — a list of candidate modes, one per line, in the form `- <slug> — <whenToUse>`.
- Brief (the only thing the user said): "<BRIEF>"
- Trial: <n> of 3 for this brief/catalogue pair.

Procedure — exactly this, nothing more:
1. Call `read_file` once on the catalogue path above. Read nothing else.
2. Ignore every other source of repository context: the workspace file listing, the open editor tabs, and the list of modes that appears in your own system prompt are NOT part of this trial. The only candidate modes are the lines in that file.
3. Choose exactly ONE slug that appears in the file — the mode you would select to handle the brief.

Answer format — reply with only this JSON, no prose, no headings, nothing outside it:
{"slug": "<slug copied from the file>", "rationale": "<one line, max 25 words, why this mode fits the brief>"}

Do not ask questions. Do not hedge with a list of options. One slug.
```

Substitutions actually used: `<frame>` = `axis-stance` or `artefact`; `<BRIEF>` = each of B1/B2/B3 verbatim, exactly as quoted in Step 2 and [§4](#4-results), including the `3×` character; `<n>` = 1, 2 or 3.

Two harness facts for anyone replicating this by hand: the harness additionally supplied a per-subtask todo checklist to each trial agent — that line is **not** part of the prompt above and must **not** be reproduced; and Step 1's `read_file` means, in human terms, "open this one file and read nothing else".

**Harness limitation.** **(a)** The trials ran as isolated subagent calls, one fresh context per trial, so "independent" here means _no shared context between runs_, not "a different model". **(b)** Step 2's instruction is a mitigation, not a guarantee — each agent's own system prompt still listed the five built-in modes, which is the priming channel already described in [§5](#5-what-this-run-cannot-conclude), reason 4.

### Step 4 — run each trial as a fresh context

Each trial is a **separate agent call with no shared context** — no conversation history, no memory of the previous run, no sight of the other frame. Three runs per (brief, frame) cell. An agent that has already answered the same brief in the other frame is not a valid run: it has seen both catalogues and the comparison is contaminated.

### Step 5 — record per trial

Chosen slug, the verbatim one-line rationale, whether it matches the pre-stated intended owner, and the frame's block length. No "description reads before choosing" metric was recorded in any trial, and none could be: the agent is given one flat block, so that quantity is not observable (the same objection the red team raises against T-F as designed, [`2026-11-09-modes-catalogue-red-team.md`](2026-11-09-modes-catalogue-red-team.md:132)).

### Step 6 — independence rule

**The trials must not be run by the person who drafted the briefs.** The drafter already knows the intended owner and chose the briefs _because_ they are matchable; a drafter-run trial measures the drafter's framing, not the catalogue's routability. This is the same bias the red team names at [`§6.1`](2026-11-09-modes-catalogue-red-team.md:132) ("the three briefs are authored by the team, not observed") and at [`§4` assumption 5](2026-11-09-modes-catalogue-red-team.md:101). If a clean result is wanted, the operator reads the brief list for the first time when running the trials.

---

## 4. Results

**Frame A — axis × stance, selection block 5,104 chars.**

| Brief | Run 1         | Run 2         | Run 3         | Agreement | Correct |
| ----- | ------------- | ------------- | ------------- | --------- | ------- |
| B1    | `debug`       | `debug`       | `debug`       | 3/3       | 3/3     |
| B2    | `performance` | `performance` | `performance` | 3/3       | 3/3     |
| B3    | `explain`     | `explain`     | `explain`     | 3/3       | 3/3     |

Rationales, verbatim:

| ID     | Rationale                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A-B1-1 | "Failure cause is unknown; needs reproduction and named root cause explaining local-vs-CI divergence."                                      |
| A-B1-2 | "CI failure with unknown cause and local pass needs a reproduction and named root cause, not pipeline surgery."                             |
| A-B1-3 | "A test fails with unknown cause in one environment; reproduce the CI-only failure and name a root cause."                                  |
| A-B2-1 | "A 3× speedup is a latency budget; requires measurement and profiling before any code change."                                              |
| A-B2-2 | "Brief demands unmeasured speedup; this mode measures latency and budgets before changing code."                                            |
| A-B2-3 | "A 3× speed goal is a performance budget; measure before changing, per this mode's remit."                                                  |
| A-B3-1 | "Brief asks why a module is structured this way, requiring an evidence-backed explanation of existing design rather than review or change." |
| A-B3-2 | "Brief asks why a module is structured as it is; explain mode answers why code behaves so with cited evidence."                             |
| A-B3-3 | "Brief asks why the module is structured as it is; explain mode answers why code is so, citing evidence not recall."                        |

**Frame B — artefact, selection block 4,275 chars.**

| Brief | Run 1         | Run 2         | Run 3         | Agreement | Correct |
| ----- | ------------- | ------------- | ------------- | --------- | ------- |
| B1    | `bug-report`  | `bug-report`  | `bug-report`  | 3/3       | 3/3     |
| B2    | `benchmark`   | `benchmark`   | `benchmark`   | 3/3       | 3/3     |
| B3    | `explanation` | `explanation` | `explanation` | 3/3       | 3/3     |

Rationales, verbatim:

| ID     | Rationale                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| B-B1-1 | "Failure cause is unknown and environment-dependent; needs evidence gathering rather than a guess."                                 |
| B-B1-2 | "Test fails in CI only, cause unknown; evidence must be gathered before guessing environment or flake."                             |
| B-B1-3 | "Failure with unknown cause and local/CI divergence needs evidence gathering, not a guessed fix."                                   |
| B-B2-1 | "Speed goal is a performance budget not yet measured; benchmark establishes the baseline and proves the 3× gain before optimizing." |
| B-B2-2 | "A 3x speedup target is an unmet performance budget; measure the endpoint first, then change it."                                   |
| B-B2-3 | "A performance target is stated but unmeasured; establish measurements and baselines before optimizing the endpoint."               |
| B-B3-1 | "Brief asks why the module is structured as it is; explanation mode cites evidence for why code behaves that way."                  |
| B-B3-2 | "The brief asks why a module is structured as it is, matching the explanation mode's why-does-code-behave-this-way scope."          |
| B-B3-3 | "Brief asks why module is structured that way; this mode answers why code is as it is with cited evidence."                         |

**What the numbers say.**

| Aggregate                                                       | Value                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Trials returned a single slug and a single-line rationale       | **18/18**                                                                             |
| Trials that asked a question, hedged, or returned a ranked list | **0/18**                                                                              |
| Within-frame agreement                                          | **6/6 cells at 3/3**                                                                  |
| Cross-frame **slug** agreement                                  | **0/3 briefs** — different labels every time                                          |
| Correctness against the pre-stated intended owners              | **18/18**                                                                             |
| Cost                                                            | **5,104 vs 4,275 chars** — stance **+19.4%**, **+829 chars**, for **2 fewer entries** |

Two facts, no interpretation: every cell is unanimous, every pick is the intended owner, and the frame with fewer entries costs more. The frames agree completely on _whether_ a match exists and not at all on _what it is called_.

### §4.1 T-H assimilation rubric

Only criteria **1, 3 and 4** are scored. Each is scored 0–2, from the protocol's perspective: does the catalogue surface a choice at all without a prior, and does the winning mode name repeat a word the user used. T-H asks for D4 scored "for the _shape_, not for each mode" ([`modes-catalogue-brainstorm.md`](../modes-catalogue-brainstorm.md:135)), so each table below carries one score per criterion per frame, justified from the trial data. Quotations are verbatim from [`modes-catalogue-brainstorm.md`](../modes-catalogue-brainstorm.md:126).

**Criterion 1 — quoted verbatim from §5 of the brainstorm** ([line 128](../modes-catalogue-brainstorm.md:128)):

> 1. **Describable** — a user can name the situation in the words the mode uses ("my tests fail", "make it faster").

| Frame | Score | Justification                                                                                                                                                                                                              |
| ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | **2** | B2 ("make it faster" → `performance`) and B3 ("Explain" → `explain`) repeat the user's own word in the mode name; only B1 needs a synonym step (the user said CI is red and has no idea why; the winning name is `debug`). |
| **B** | **1** | Only B3 repeats a user word (`explanation`); B1 and B2 require the user to name a _product_ they did not ask for — nobody who says "make it 3× faster" has said "benchmark".                                               |

**Criterion 3 — quoted verbatim from §5 of the brainstorm** ([line 130](../modes-catalogue-brainstorm.md:130)):

> 3. **Explainable** — a one-sentence difference from its nearest neighbour, in the user's vocabulary.

| Frame | Score | Justification                                                                                                                                                                                                                                       |
| ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | **2** | All three A rationales bound the pick against a named adjacent stance in one clause — "not pipeline surgery" (B1), "before any code change" (B2), "rather than review or change" (B3) — which is the criterion's shape, produced without prompting. |
| **B** | **1** | Only one of three B rationales draws a boundary against a neighbour ("before optimizing", B2); the B1 and B3 rationales justify a match to the brief rather than a difference from anything else.                                                   |

**Criterion 4 — quoted verbatim from §5 of the brainstorm** ([line 131](../modes-catalogue-brainstorm.md:131)):

> 4. **Memorable** — a user who used it once can recognise it again without reading descriptions.

| Frame | Score | Justification                                                                                                                                                                                                         |
| ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | **2** | All three winning names are single everyday words the brief itself already reaches for — `debug` (CI is red), `performance` ("faster"), `explain` ("Explain"); nothing has to be decoded to recognise the pick again. |
| **B** | **1** | Two of three winning names are a compound or specialist term the brief never used (`bug-report`, `benchmark`); only `explanation` is a single everyday word.                                                          |

Criterion 4 carries the weakest evidential weight of the three: nothing in this run involved a return visit, so the scores above are an inference from how the labels behave under repetition-by-different-context, not a measurement of recall.

**This score is not a measurement of criterion 4 as written.** No participant ever returned to recognise a name again: every run was one-shot with a fresh context, so the 6/6 unanimous cells show label determinism by one model, not human recall. The 0–2 figure above is a `(judgement)` on name recognisability, drawn only from the slugs and rationales already in [§4](#4-results); the criterion needs a return-visit test — participants who already selected once re-selecting the same situation with descriptions hidden, scored for correct re-selection — before it can be called measured.

**Rubric total: Frame A 6/6, Frame B 3/6** — of which criteria 1 and 3 are measured (A 4/4, B 2/4) and criterion 4 is the flagged judgement above.

Criteria **2 (Findable)**, **5 (Recoverable)** and **6 (Teach-in rate)** were not measured in this run and require real users to measure.

### §4.2 The deliverable-construction observation

Observable, without interpretation:

- Frame A's three winners are **activities** (`debug`, `performance`, `explain`). Every A rationale answers from the brief's own situation.
- Frame B's three winners are **produced things** (`bug-report`, `benchmark`, `explanation`). On B1 and B2, every B rationale justified its pick by naming something _produced_ — "evidence gathering" three times, "the baseline" / "measurements and baselines" / "measure the endpoint first" — because the frame's organising question is "what are you producing?".

Counter-observation, also observable: this is not unique to frame B. `debug`'s line says "produce a reproduction and a named root cause", and A-B1-1 and A-B1-3 both echo that wording. The difference is in the decision, not in the rhetoric: frame B's _name_ commits to a deliverable before the brief is read, and on B2 the winning rationale had to append an action the name does not contain — "measure the endpoint first, **then change it**" (B-B2-2).

Whether this is assimilation (the frame forcing a user to think in deliverables) or repair (the agent patching a mis-named owner back onto the job) is a judgement this data cannot settle, and it is left to the reader.

---

## 5. What this run cannot conclude

1. **n = 3 per cell on 3 briefs.** Eighteen trials (six cells × three runs) is not a sample; it is a demonstration that the procedure runs and both frames answer. None of the six cells was close to splitting, so there is no variance estimate to report — and with n = 3 there could not be one.
2. **The briefs and the frame were written by the same person, who supports one frame.** The three briefs were authored by a single person who favours the axis × stance shape. That is a real bias on the input, not on the measurement: the briefs were chosen to be matchable, and the person who wrote them also judged which label was "better" in [§6](#6-where-the-frames-disagree-and-which-choice-you-judge-better).
3. **Single-model panel.** All 18 trials ran on the same underlying model family as the orchestrator that wrote the protocol — subagents of one orchestrator, not a cross-vendor panel. This was a real selection call by a real model, not keyword matching and not a simulation, but one model cannot estimate variance across models. A frame that wins on one model may lose on another whose prior vocabulary is shaped differently.
4. **Built-in-slug priming asymmetry.** The trial agents' own system prompts list the 5 built-in modes (`architect`, `code`, `ask`, `debug`, `orchestrator`). `debug` is frame A's B1 winner, so **frame A's B1 result enjoys a priming advantage frame B cannot have** — frame B has no `debug` slug to be primed toward. B2 and B3 winners (`performance`/`explain`, `benchmark`/`explanation`) are not built-in names, so no comparable priming applies there. A-B1 should not be treated as clean evidence.
5. **Twelve artefact `whenToUse` lines were never drafted by the catalogue's author.** Frame B was partly scored on text the frame's own author did not write — a fixed generator template over the `Produces` cell ([§2.5](#25-material-defect-12-artefact-whentouse-lines-were-never-drafted)). The derived lines are shorter than drafted ones (60.5 vs 78.2 chars), and their register ("must be produced") is not the author's. Three of the six frame-B cells (B1, B2, B3) were won on _drafted_ lines, so the choice results are barely exposed — but the **cost** comparison is exposed, and it is the comparison most favourable to frame B.
6. **All three briefs are easy.** Each frame contains an equivalently-named owner: `debug`/`bug-report`, `performance`/`benchmark`, `explain`/`explanation`. The test therefore could not discriminate on _whether_ a match is available, only on _how it is labelled_. A brief with no ready-made owner in either frame is the state where the two organising questions actually diverge, and no such brief was used.
7. **No real user ever saw either catalogue.** Nothing here measures findability, abandonment, time-to-selection, or whether a person would give up before finding the right entry. Those are precisely the quantities D4 criteria 2, 5 and 6 name, and the red team's competing hypothesis — "breadth is discoverability" ([`§4` assumption 5](2026-11-09-modes-catalogue-red-team.md:101)) — remains untested by anything in this report.

---

## 6. Where the frames disagree, and which choice you judge better

The frames never disagree on **whether** a match exists. They disagree on **the label**, 3 times out of 3. The following is the coordinator's judgement; below it is what this report adopts.

| Brief | Frame A pick  | Frame B pick  | Judgement                                       |
| ----- | ------------- | ------------- | ----------------------------------------------- |
| B1    | `debug`       | `bug-report`  | **`debug` better** (judgement)                  |
| B2    | `performance` | `benchmark`   | **`performance` better** (judgement)            |
| B3    | `explain`     | `explanation` | **`explanation` marginally better** (judgement) |

Every cell in the Judgement column is a `(judgement)` — a naming call by the coordinator, not a measurement of any kind.

**B1 — `debug` (stance) better than `bug-report` (artefact).** Adopted. The user asked for green CI, not for a document; an artefact-named owner promises a report and risks the agent producing one instead of fixing the failure. The artefact frame's own winning rationale is honest about the mismatch — it argues for "evidence gathering", which is the input to a fix, not the fix.

**B2 — `performance` (stance) better than `benchmark` (artefact).** Adopted, and sharpened. "3× faster" is a request to change the system; `benchmark` names one _step_ of that job. Making the measurement step the owner collapses measure-then-optimize into measure-only, and the winning rationale had to add the missing half itself: "measure the endpoint first, **then change it**" (B-B2-2). When a rationale must append the work the mode name omits, the name is doing less routing work than the answer is.

**B3 — `explanation` (artefact) marginally better than `explain` (stance).** Adopted. Here the deliverable genuinely _is_ an answer, so the artefact noun is exact, and `explain` reads as an activity rather than an owner. This is the one brief of the three where the artefact frame's organising question is the better question.

**Honest summary.** **2 of 3 briefs favour the stance label `(judgement)` — "better" here is a naming judgement about intent, not an outcome measurement.** No one has measured whether the better label changes what the agent does, how long the user takes to pick, or whether the user picks at all. The 6/6 vs 3/6 T-H total in [§4.1](#41-t-h-assimilation-rubric) (4/4 vs 2/4 measured on criteria 1 and 3, criterion 4 a flagged judgement) points the same way as the per-brief calls, and is subject to the same limitation: it scores the name against the brief, not the choice against the outcome.

---

## 7. Recommendation for the next test

This run is **inconclusive on frame choice** and **conclusive on two things**: both frames are stable (6/6 cells unanimous) and both find the intended owner on easy briefs (18/18). Those results are a floor, not a comparison.

Therefore the next test must not be "another bake-off with more briefs of the same kind" — that would raise n without raising discriminating power, because every brief so far has an equivalently-named owner in both frames.

The next test should be built to **discriminate**:

| Requirement                                                                                                                              | What it fixes                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Briefs with no ready-made owner in either frame** — the state where the two organising questions diverge                               | Reasons 6 and 1. This is the only state in which the frames can produce different _decisions_ rather than different _words_ |
| **A cross-model panel** — at least three model families, each blind to which frame is "ours"                                             | Reason 3                                                                                                                    |
| **A human selection participant who has not read either catalogue** — one operator per trial, running briefs they see for the first time | Reasons 2 and 7                                                                                                             |
| **A two-arm outcome check** — after the choice, place the agent in the winning mode and score whether it does the right thing            | The gap that makes every result here a naming result                                                                        |

Acceptance criteria, pre-registered before the run:

1. **Owner-free briefs.** At least 8 of the briefs must have no slug in either selection block sharing a stem with the brief's head noun, verified mechanically against both files and recorded. (judgement: 8 is a threshold, not a measurement)
2. **Panel.** At least 3 model families, each with 3 runs per (brief, frame) cell, and per-family results reported separately — never pooled into one headline.
3. **Human arm.** At least 8 participants who have not read either catalogue, each given the briefs in the same order, with first-click correctness and time-to-selection recorded per brief.
4. **Falsifier stated before the run.** The frame choice is declared **tied** if the top-1 routing difference between frames is under 10 percentage points (judgement: the margin, not a finding) on the owner-free briefs.
5. **Outcome arm.** For each brief, the placed agent is scored against a written rubric for the intended owner: did it produce the artefact/action the owner promises. Reporting the routing result without this arm is not an acceptable outcome of the next test.
6. **No built-in-slug confound.** Either the reading agent's system prompt is stripped of the mode list, or any brief whose winner is a built-in slug is reported separately and excluded from the headline (see [§5](#5-what-this-run-cannot-conclude), reason 4).
7. **Drafting parity.** Any artefact-frame `whenToUse` line still derived by a generator template must be replaced by an authored line, or the cost comparison must be reported at the corrected 3,674 figure ([§2.5](#25-material-defect-12-artefact-whentouse-lines-were-never-drafted)) and marked as corrected.

---

## 8. Appendix: reproduction commands

**Generate both fixtures and both selection blocks:**

```
node scripts/generate-frame-fixtures.mjs
```

Expected: 45 entries parsed from the axis-stance catalogue, 47 from the artefact catalogue, four files written under `test-fixtures/frames/`, exit 0.

**Validate both fixtures against the repo schema:**

```
cd packages/types && node --input-type=module -e 'import Ajv from "ajv"; import {readFileSync} from "node:fs"; import {parse} from "yaml"; const schema=JSON.parse(readFileSync("../../schemas/roomodes.json","utf8")); const ajv=new Ajv({allErrors:true}); const validate=ajv.compile(schema); let failed=false; for (const f of ["../../test-fixtures/frames/axis-stance.roomodes","../../test-fixtures/frames/artefact.roomodes"]) { const doc=parse(readFileSync(f,"utf8")); const ok=validate(doc); console.log(f+": "+(ok?"PASS":"FAIL")+" ("+doc.customModes.length+" entries)"); if(!ok){console.log(JSON.stringify(validate.errors,null,2)); failed=true} } process.exit(failed?1:0)'
```

Expected: `PASS (45 entries)`, `PASS (47 entries)`, exit 0.

**Inputs for the trials** — the exact text each agent was shown:

- [`test-fixtures/frames/axis-stance.selection-block.txt`](../../test-fixtures/frames/axis-stance.selection-block.txt:1) — 45 entries, 5,104 chars
- [`test-fixtures/frames/artefact.selection-block.txt`](../../test-fixtures/frames/artefact.selection-block.txt:1) — 47 entries, 4,275 chars
