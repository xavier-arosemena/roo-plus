# Agent framing pretest — harness

This page documents [`scripts/run-framing-pretest.mjs`](run-framing-pretest.mjs), the harness for
the agent framing pretest registered as **Amendment 5** in
[`docs/reviews/2026-11-09-frame-decision-preregistration.md`](../docs/reviews/2026-11-09-frame-decision-preregistration.md).
The programme had planned a first-run observation with five developers. There are no external
developers, so the instrument was re-registered as a pretest with a deliberately narrow claim.

**Current state: `UNRUN`.** The harness has been exercised in `--dry-run` only. No model has been
called, and `results.jsonl` has never been produced in this repository.

## What this is, and what it is not

| It is                                                                                                                      | It is not                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| An **instrument-sensitivity** check: do the five persona directives separate goal-framing from deliverable-framing at all? | Evidence about real developers, adoption, or first-run abandonment                                          |
| A **discriminability** check: from picker text alone (slug, name, `whenToUse`), does a reader land on the intended owner?  | A population estimate. Five personas on one model family are five framing conditions, not five observations |
| A **help-seeking** check: does a reader ask which mode to use when choosing is offered?                                    | A catalogue decision. Scoring is a separate, blinded pass; the harness has no rubric                        |

The name "first-run observation" must not be reused for this instrument.

## The 30 runs

5 declared personas × 3 briefs × 2 catalogues = 30 runs (`run-01` … `run-30`). A persona is a
**framing condition**, not a demographic: the directive is the only text that varies between
personas, and the choice request plus the help-seeking permission are byte-identical in all 30
prompts.

| ID  | Condition                                  | Directive (verbatim)                                                                            |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| P1  | goal-only explorer                         | You are exploring. Say what you want to achieve, not what you want handed back.                 |
| P2  | artefact-only deliverer                    | You are commissioning work. Name the deliverable you want in your hand, not the goal behind it. |
| P3  | terse one-liner                            | You write one short line and nothing else.                                                      |
| P4  | verbose context dump                       | You describe the surrounding situation at length before you say anything else.                  |
| P5  | imprecise vocabulary / non-native phrasing | You use approximate, everyday words: you do not know this project's technical vocabulary.       |

The three repetition slots are filled by the three fixed briefs, one each — the briefs are reused
across personas, so there are 5 × 3 × 2 runs rather than 5 × 3 repeats of one brief. Consequence,
stated because it limits the analysis: **repetition and brief are not separable**. Within-persona
variance cannot be estimated separately from brief effects. Report by persona × brief, never pooled.

This plan is unchanged and is what `--plan` absent still produces. It is frozen so that the E11 run
stays reproducible byte for byte.

## Plan-driven runs (E12 and later)

E12 (`docs/reviews/2026-11-11-b3-isolation-preregistration.md`) is **material-variant** based: eight
conditions, each naming its own `.roomodes` fixture and its own brief. That is data, not code, so it
lives in [`test-fixtures/frames/b3-isolation/arms.json`](../test-fixtures/frames/b3-isolation/arms.json)
and is passed with `--plan`:

```bash
node scripts/run-framing-pretest.mjs --plan test-fixtures/frames/b3-isolation/arms.json --dry-run
```

A plan file has `personas`, `conditions` and `repetitions`:

| Key            | Meaning                             | Enforced                                                                                                                  |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `personas[]`   | `id`, `condition`, `directive`      | must be byte-identical to the frozen `PERSONAS` constant, otherwise the run is refused                                    |
| `conditions[]` | `id`, `fixture`, `briefId`, `brief` | `fixture` must resolve inside `test-fixtures/`; a `briefId` of `B1` or `B3` must carry that registered text byte for byte |
| `repetitions`  | k, default 1                        | `--repetitions` overrides it and the effective value is recorded                                                          |

Run ids in plan mode encode all three axes — `A0-P1-r1` is condition A0, persona P1, repetition 1 —
so a single draw is distinguishable from a repeat without opening the plan. Condition ids are
registered arm letters and are **not** allowed to reach a prompt; the prompt carries only the
fixture's own picker text.

`--repetitions k` is refused with the fixed 5 × 3 × 2 plan: repeating that plan would be a design the
registration does not describe.

## The three briefs

The briefs are the pre-registration's own §3.1 texts, reused **verbatim** and written to
`briefs.json` with a `sha256` each. They are not rewritten for this instrument: inventing new
briefs would make the pretest a different experiment from the registered one. Provenance is
`CONSTRUCTED`, which §3.1 already discloses.

| ID  | Text                                                           |
| --- | -------------------------------------------------------------- |
| B1  | `CI is red on a test that passes locally. I have no idea why.` |
| B2  | `Make this endpoint 3× faster.`                                |
| B3  | `Explain why this module is structured the way it is.`         |

## What a prompt contains

Exactly four things: the persona directive, the standing request, one brief, and one catalogue's
picker text (one line per mode: `slug — name — whenToUse`). No `roleDefinition`, no
`customInstructions`, no `groups`, no arm name, no frame name, no run id, and no preamble saying a
test is running. The projection is a whitelist of three fields, and the audit re-checks the emitted
bytes for doctrine and grant material.

## Files it writes

| File                     | Contents                                                                                                                                        | Notes                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `prompts/run-NN.txt`     | the prompt, byte-identical across invocations                                                                                                   | the only file a runtime sees                                                              |
| `briefs.json`            | the three briefs verbatim, with hashes                                                                                                          | auditable provenance                                                                      |
| `plan.json`              | run table: persona, brief, **blind label**, prompt hash and size, model, seed, temperature, `repetitions`, and in plan mode the condition table | no frame names in a prompt; the condition table means this file must never reach a scorer |
| `_blind-map.json`        | label → frame name, with the seed and the algorithm                                                                                             | **scorers must not open this**                                                            |
| `blindness-report.json`  | the audit result, per-token counts, header vocabulary, **per-condition** byte range and header hashes                                           | written in both modes                                                                     |
| `results.jsonl`          | one record per run, including `finishReason`, `language`, `echoed`                                                                              | written in `--run` mode only                                                              |
| `transcripts/run-NN.txt` | whatever the runner wrote                                                                                                                       | never synthesised                                                                         |

`blindness-report.json` groups by condition, and `distinctHeaders` against `runs` is the check that
two conditions whose prompts differ only in the picker also share every header: in E12, A0/A1/A2/A3/A5/C2
report 5 distinct headers over 5 runs (one per persona) with the same five hashes, while A4 and C1
report their own.

Label assignment mirrors the discipline of
[`run-b1-pilot.sh`](../test-fixtures/frames/outcome-arm/run-b1-pilot.sh:30): the execution order is
public, so a label that tracked it would de-blind the sheet. Labels are assigned by sorting the frame
names on `sha256(frame + seed)` — reproducible, independent of run order, and recorded only in the
blind map. The default seed is a fixed literal so repeated dry-runs are byte-identical; a real run
should pass `--blind-seed` with a fresh value.

## Usage

Dry run (the default — no provider, no network, no `results.jsonl`):

```bash
node scripts/run-framing-pretest.mjs --dry-run --out /tmp/framing-pretest
```

A real run requires an explicitly configured provider, a model, a runner and a key:

```bash
FRAMING_PRETEST_API_KEY=... node scripts/run-framing-pretest.mjs --run \
    --out /tmp/framing-pretest --blind-seed "$(date +%s)" \
    --provider <provider-id> --model <model-id> \
    --runner '<your command> %PROMPT_FILE% %OUT_FILE%'
```

The harness contains no provider protocol. It delegates the call to the command you supply, exactly
as the B1 pilot does, so it needs no new dependency and cannot invent a request format. Placeholders
are shell-single-quoted by the harness; write them bare:

| Placeholder                    | Value                                                   |
| ------------------------------ | ------------------------------------------------------- |
| `%PROMPT_FILE%`                | absolute path of this run's prompt                      |
| `%OUT_FILE%`                   | absolute path the runner **must** write the response to |
| `%MODEL%`, `%TEMPERATURE%`     | the model id and the pinned `0`                         |
| `%RUN_ID%`, `%TRANSCRIPT_DIR%` | the run id and the transcript directory                 |

Nothing identifies the catalogue to the runner, by design.

## The three added observations (registration I-2)

Every `results.jsonl` record carries three fields beyond the runner's own report. None of them can
revise `status`, `reason` or the transcript hash.

| Field          | Source                                                                   | Rule                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `finishReason` | the runner's usage sidecar, `attempts[attempts.length - 1].finishReason` | `null` when no sidecar exists. `--usage-dir` names where to look (default `<out>/transcripts`, then `<out>/usage`, then `<out>/transcripts` again). `MAX_TOKENS` is `INVALID` per registration §6 and must never be partially scored                                                                                                                                                              |
| `language`     | the transcript                                                           | **`en`** when at least 95% of the letters are Latin-script letters; **`und`** (ISO 639-2 "undetermined") when there are no letters or more than 5% are non-Latin; **`null`** when there is no transcript. Script alone cannot name a language, so `und` is a refusal to guess, not a claim that the text is in no language. It cannot separate Japanese from Chinese from Korean and does not try |
| `echoed`       | the transcript vs its own picker                                         | `true` when the transcript contains a whole `- slug — Name — whenToUse` line from its own picker. A response that merely mentions a slug is not an echo. This is registration §6's `echo` edge case                                                                                                                                                                                               |

## Status semantics

| Status    | Meaning                                                                                     | What it is not                 |
| --------- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| `RUN`     | the runner exited 0 and wrote a non-empty file                                              | not a pass, not a score        |
| `UNRUN`   | nothing was produced: no runner, or no output file                                          | not a failure of the model     |
| `INVALID` | output exists but cannot be trusted: an empty file, or bytes left behind by a non-zero exit | never repaired, never replaced |

A missing response is never substituted with a placeholder and no transcript is ever synthesised. The
absence of `results.jsonl` is the machine-readable meaning of "nothing was run".

## Blindness rules

Three classes, and only the first two fail the batch:

1. **Identity tokens** — `axis`, `stance`, `artefact`, `catalogue`, `blind`, `seed`, `pretest`,
   `experiment`, `fixture`, `roomodes`, `arm-a`, `arm-b`, plus `frame` outside the picker. Must be
   absent from the whole prompt.
2. **Doctrine and grants** — no `roleDefinition`, `customInstructions`, `groups` or `description`
   text, and the picker must be the byte-identical projection of its own catalogue (a prompt
   carrying the other catalogue's picker also fails).
3. **Reported vocabulary** — a word in the request that happens to equal a slug, and the
   ordinary-English `frame`/`framed`/`framework` in the catalogued prose. Counted per run, never
   failed. B3's "Explain" collides with the slug `explain`; editing the brief would change the
   registered material, and stripping the word would remove the very overlap signal under test.

## What the pretest can and cannot conclude

**Can:** whether the instrument separates the persona conditions at all; whether one catalogue's
picker text is easier to land on than the other's; whether help-seeking occurs when it is offered.

**Cannot:** any statement about developers, adoption, or abandonment; any population estimate; any
claim about doctrine quality; any claim that a passing sensitivity gate means the instrument works.
Slug counts differ (45 vs 47) and the fixture names are public, so a reader who knows the fixtures
could identify a catalogue out-of-band — which is why scoring is blinded and the map is sealed.

A failing sensitivity result is strong evidence the instrument is dead. A passing result is only weak
evidence. The sensitivity gate is read and recorded **before** any discriminability claim is made.

## Scorer bundles (registration I-5, I-6)

Scoring is a separate blinded pass, and the mitigation is structural: the tool that prepares it
copies only what a scorer needs and refuses to write a file that could de-blind the batch.

```bash
node scripts/build-scorer-bundle.mjs --run /tmp/b3-run
```

It writes `bundle-A/` and `bundle-B/` beside `_case-maps.json` (default `<run>/scoring-bundles`).
Each bundle holds one `case-NN/` folder per run that finished with status `RUN`, containing
`prompt.txt`, `response.txt` and `rubric.md`. The two bundles are shuffled from different seeds, so
the orderings cannot be aligned by position, and each carries a different case→run mapping.

The leak check fails the run — exit 1, nothing written — if any file about to be copied contains
`plan.json`, `arms.json`, `_blind-map.json`, `CATALOGUE-n`, `PICKER-n`, an arm letter (`A0`–`A5`,
`C1`, `C2`), a fixture name (`axis-stance`, `artefact`, `b3-isolation`, `.roomodes`) or a run id
(`A0-P1-r1`). A response that happens to contain one of those strings is a real collision: resolve
it by inspection, never by loosening the guard. `--out` pointing inside `bundle-A/` or `bundle-B/`
is refused, so the case map cannot land in a scorer's folder by a mistyped path.

`rubric.md` is written from one constant
([`scripts/lib/scorer-rubric.mjs`](lib/scorer-rubric.mjs)), so the two scorers provably receive the
same rubric. It copies the registration's disagreement rule and edge-case table verbatim, applies
I-4's `NARRATIVE` → `IMPLICIT` rename to the framing categories, and marks the three judgement labels
the registration uses without defining as `INSTRUMENT DEFINITION`.

## Related

- [Pre-registration and Amendment 5](../docs/reviews/2026-11-09-frame-decision-preregistration.md)
- [Programme state review §6](../docs/reviews/2026-11-10-programme-state-review.md) — the redesign this implements
- [`scripts/generate-frame-fixtures.mjs`](generate-frame-fixtures.mjs) — how the two fixtures are built

The harness is a set of small modules with one responsibility each:

| Module                                                                       | Responsibility                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`scripts/run-framing-pretest.mjs`](run-framing-pretest.mjs)                 | arguments, guards, orchestration, exit codes                                    |
| [`scripts/lib/framing-pretest.mjs`](lib/framing-pretest.mjs)                 | fixtures → modes, blind labels, prompt construction, the fixed E11 run plan     |
| [`scripts/lib/framing-pretest-plan.mjs`](lib/framing-pretest-plan.mjs)       | plan files: validation, per-condition fixtures, arm × persona × repetition runs |
| [`scripts/lib/framing-pretest-audit.mjs`](lib/framing-pretest-audit.mjs)     | the blindness audit and its report                                              |
| [`scripts/lib/framing-pretest-runner.mjs`](lib/framing-pretest-runner.mjs)   | the provider boundary and RUN / UNRUN / INVALID reconciliation                  |
| [`scripts/lib/framing-pretest-results.mjs`](lib/framing-pretest-results.mjs) | the three I-2 observations and the result record                                |
| [`scripts/lib/framing-pretest-output.mjs`](lib/framing-pretest-output.mjs)   | every file written, including the sealed blind map                              |
| [`scripts/build-scorer-bundle.mjs`](build-scorer-bundle.mjs)                 | the two blinded scorer bundles                                                  |
| [`scripts/lib/scorer-bundle-guards.mjs`](lib/scorer-bundle-guards.mjs)       | leak patterns and the "map outside the bundle" path check                       |
| [`scripts/lib/scorer-rubric.mjs`](lib/scorer-rubric.mjs)                     | the one rubric text both bundles receive                                        |

Tests: `node --test scripts/b3-isolation.spec.mjs` pins the six fixtures, the I-2 observations, plan
validation and the bundle guards. `scripts/` has no vitest runner, so Node 22's `node:test` is used;
no dependency is added.
