# Routing closing round (E13-R), Stage 1 — harness

This page documents three files — the instrument for **Stage 1** of
[`docs/reviews/2026-11-12-routing-closing-round-preregistration.md`](../docs/reviews/2026-11-12-routing-closing-round-preregistration.md),
including **Amendment 2**:

| File                                                                                 | Job                                                                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [`scripts/generate-routing-round-fixtures.mjs`](generate-routing-round-fixtures.mjs) | derives the six pickers, the 600-run plan and the two sealed files                                       |
| [`scripts/run-routing-round.mjs`](run-routing-round.mjs)                             | **the executor**: validates the plan, writes the 600 prompts, and turns each entry into one executed run |
| [`scripts/report-routing-round.mjs`](report-routing-round.mjs)                       | the per-cell table and the two co-primary contrasts                                                      |

**Current state: `UNRUN`.** No model has been called and there is no `results.jsonl` in this
repository. The modes that have been exercised are `--dry-run` (600 prompts, no execution) and
`--run` against a **stub runner** that writes a fixed transcript — no network, no key. Every rate
shown in the examples below is fabricated by the tool's own `--write-synthetic` flag and marked
synthetic.

## What this is, and what it is not

| It is                                                                                                                                                      | It is not                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A six-cell factorial (verb/noun × IN/DC) on one ambiguous brief, plus a single-field control pair on one unambiguous brief, all inside one 45-entry picker | A catalogue comparison. The axis and artefact lists are not compared here (Amendment 1 §A1.6)  |
| A **rate** instrument: 100 draws per cell, 600 in total, interleaved                                                                                       | A single-draw observation. E12 showed single draws are samples                                 |
| A mechanical scoring pass plus the registered statistics                                                                                                   | A judgement. There are no human scorers, and the parser is frozen and tested                   |
| Stage 1 only: Gemini, one model                                                                                                                            | Stage 2. The cross-vendor replication is conditional on a Stage 1 signal and is not built here |

## The six cells

One base picker — [`test-fixtures/frames/axis-stance.roomodes`](../test-fixtures/frames/axis-stance.roomodes),
45 entries — with **only the target entry rewritten**. Nothing else in the list changes.

| Cell | Brief              | Entry shown                   | Routing line               |
| ---- | ------------------ | ----------------------------- | -------------------------- |
| C1   | ambiguous (`B3`)   | `explain` / `Explain`         | **IN**                     |
| C2   | ambiguous (`B3`)   | `explanation` / `Explanation` | **IN**                     |
| C3   | ambiguous (`B3`)   | `explain` / `Explain`         | **DC**                     |
| C4   | ambiguous (`B3`)   | `explanation` / `Explanation` | **DC**                     |
| C5   | unambiguous (`B1`) | `debug` / `Debug`             | debug's own line, verbatim |
| C6   | unambiguous (`B1`) | `bug-report` / `Bug Report`   | **debug's line, verbatim** |

IN = `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.`
DC = `Use when someone asks why code behaves as it does and evidence must be cited.`

C6 is the detail the previous design got wrong: it carries `debug`'s routing line with only slug and
name changed, so both halves of the interaction are single-field manipulations. The generator asserts
that byte-identity and that C6 did **not** copy the artefact fixture's line.

## The plan

6 cells × 100 draws = **600 runs**, draw-major round-robin: draw 1 of C1…C6, then draw 2 of C1…C6, and
so on. No cell ever runs in a block, and no two consecutive runs share a cell. One fixed persona
directive — the goal-only explorer, copied byte for byte from the `PERSONAS` constant in
[`framing-pretest.mjs`](lib/framing-pretest.mjs) — and the same standing request in every prompt.

Run ids are `<label>-d<draw>`, e.g. `CELL-4-d001`. The plan carries **labels only**: no cell name, no
owner slug. The label → cell mapping lives only in the sealed map.

## What a prompt contains

Exactly four things: the persona directive, the standing request, one brief, and one picker text
(one line per mode: `slug — name — whenToUse`). No `roleDefinition`, no `customInstructions`, no
`groups:`, no `description`, no cell name, no blind label, no run id, no preamble saying a test is
running. The projection is a three-field whitelist, and the generator counts the three doctrine
literals in every prompt and fails if any appears.

## Files

### Written into `test-fixtures/frames/routing-round/`

| File                          | Contents                                                                          | Notes                                    |
| ----------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| `C1.roomodes` … `C6.roomodes` | the six pickers, 45 entries each                                                  | C1 and C5 are byte-identical to the base |
| `plan.json`                   | 600 runs: label, draw, brief id, persona, prompt path, prompt hash and byte count | no cell name anywhere                    |
| `answer-key.json`             | per label: cell, expected owner, and that picker's 45 slugs                       | **sealed**                               |
| `_label-map.json`             | label → cell, with the seed and the algorithm                                     | **sealed**                               |
| `IMPLEMENTATION-NOTES.md`     | every interpretation the build made                                               | start here to argue with the build       |

### Written into `--out` (default `$TMPDIR/roo-plus-routing-round`)

| Path                                         | Contents                                                          | Notes                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `prompts/<runId>.txt`                        | 600 files, byte-identical across invocations                      | `--out` may not point inside `test-fixtures/`: prompts are run artefacts, not fixtures |
| `plan.json`                                  | a byte-identical copy of the plan the batch was validated against | the run directory records its own input                                                |
| `results.jsonl`                              | one record per executed run                                       | **not** written by `--dry-run`                                                         |
| `transcripts/<runId>.txt`                    | whatever the runner wrote                                         | never synthesised, never repaired                                                      |
| `usage/` or `transcripts/usage-<runId>.json` | the runner's usage sidecar                                        | the source of `finishReason` and of the token cap in force                             |

## Usage

Generate the fixtures, the plan, the key and the label map, and the 600 prompts:

```bash
node scripts/generate-routing-round-fixtures.mjs --out /tmp/routing-round
```

Check that the fixtures on disk still match the derivation, writing nothing (this is the drift gate):

```bash
node scripts/generate-routing-round-fixtures.mjs --check
```

Build the batch without executing anything (`--dry-run` is the default; it writes the 600 prompts and
a plan copy and no `results.jsonl`):

```bash
node scripts/run-routing-round.mjs --dry-run --out /tmp/rr-stage-1
```

Execute it. `--run` must be given explicitly, and the runner is an operator-supplied command template
with the placeholders `%PROMPT_FILE% %OUT_FILE% %MODEL% %TEMPERATURE% %RUN_ID% %TRANSCRIPT_DIR%`:

```bash
node scripts/run-routing-round.mjs --run \
  --out /tmp/rr-stage-1 \
  --model gemini-3.5-flash \
  --runner 'node scripts/lib/gemini-runner.mjs %PROMPT_FILE% %OUT_FILE% %MODEL% %TRANSCRIPT_DIR% %RUN_ID%'
```

Bound it: `--only CELL-4` executes one blind label, `--limit 3` executes the first three plan entries
(three different labels, because the plan is draw-major). Both compose with `--dry-run`.

The executor validates the plan before writing anything — 600 entries, 100 per label, six labels, six
unique prompt hashes, draw-major interleaving, no cell identifier and no sealed answer-key field — and
then requires every entry to match the prompts it rebuilds from the fixtures. A drifted picker fails
the batch instead of running 600 prompts that are no longer the registered material.

Report a completed run directory:

```bash
node scripts/report-routing-round.mjs --run-dir /path/to/completed-run
```

Report options: `--key` (default the sealed key above), `--resamples` (default 10,000), `--seed`
(default `20261112`), `--json <file>` for the report object.

**Test-only:** fabricate a run directory to exercise the report, then report it:

```bash
node scripts/report-routing-round.mjs --write-synthetic /tmp/rr-clean --scenario clean
node scripts/report-routing-round.mjs --run-dir /tmp/rr-clean
```

Scenarios: `clean` (all six cells at 100 scored), `clustered` (C1 returns one transcript 100 times),
`boundary` (C5 is zero-variance), `partial` (C2 has **one** `MAX_TOKENS` run — 1.0%, inside the rule,
so the sweep is reported with that cell flagged), `over-exclusion` (C2 has **six** `MAX_TOKENS` runs —
6.0%, above the rule, so the report refuses). Every fabricated record carries `"synthetic": true` and
the directory gets a `SYNTHETIC-DATA.md`; the report prints a `SYNTHETIC` banner. No model is called
and no key is read.

## `results.jsonl` — what the executor writes and the report reads

One JSON object per run, appended the moment that run finishes, so an interrupted sweep leaves an
honest partial file.

| Field                                                        | Written by the executor | Meaning                                                                                                              |
| ------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `index`, `runId`, `label`, `draw`, `briefId`, `promptSha256` | yes                     | the plan entry this record belongs to                                                                                |
| `status`                                                     | yes                     | `RUN`, `UNRUN` or `INVALID` **after** the `finishReason` rule has been applied                                       |
| `runnerStatus`                                               | yes                     | the runner's own verdict, unchanged, so the enforcement can be audited                                               |
| `reason`, `exitCode`, `startedAt`, `endedAt`                 | yes                     | as `executeRun` reported them; `reason` is replaced when truncation decides the status                               |
| `transcript`                                                 | yes                     | `{ path, bytes, sha256 }` or `null` — never synthesised                                                              |
| `response`                                                   | yes                     | the scorable text. `null` for anything that is not a `RUN`, so a truncated answer cannot be scored later by accident |
| `finishReason`                                               | yes                     | from the usage sidecar: `STOP`, `null`, or a truncation reason such as `MAX_TOKENS`                                  |
| `maxOutputTokens`                                            | yes                     | the output cap the runner recorded in its sidecar, or `null`                                                         |
| `parserVersion`                                              | yes                     | the version of the mechanical response parser, so a rule change is never read as a behaviour change                  |
| `model`, `temperature`                                       | yes                     | provenance (R-8)                                                                                                     |

The report reads `label`, `draw`, `status`, `finishReason` and `response`; anything else is ignored, so
a synthetic record needs only those (plus `"synthetic": true`). A repeated `(label, draw)` is refused,
because a retried call must not double-count.

## The output cap — 4096 tokens, fixed for the whole sweep

[`scripts/lib/gemini-runner.mjs`](lib/gemini-runner.mjs) sends `maxOutputTokens: 4096` with every call,
and the value is exposed as `--max-output-tokens` (default `4096`, floor 256, ceiling 65536) so an
operator can see it and state it.

**Why it was raised.** Gemini counts _thinking_ tokens against that cap. At `2048` a thinking-heavy
response truncated, `finishReason` came back `MAX_TOKENS`, and Guard 4 made the run `INVALID` — one
wasted draw from one cell's denominator per truncated answer. `4096` leaves room for the thinking
budget plus the short answer this instrument asks for.

**The cap is fixed for the whole sweep and must not be changed mid-run.** A batch run partly at 2048
and partly at 4096 has two different truncation regimes, so the exclusion rates per cell would no
longer be comparable — the exact confound §A2.5 row 10 exists to prevent. Two things make a drift
visible rather than silent:

1. every usage sidecar records `maxOutputTokens`, and the executor copies it into the run record as
   `maxOutputTokens`;
2. `run-routing-round.mjs` prints the cap(s) it saw and **warns** when the sidecars in one batch
   disagree.

Raising the cap changes nothing else: not the plan, not a prompt byte, not the label assignment, not
the statistics. It changes only the provider request and the recorded provenance.

## Scoring

The datum is binary and mechanical: **the declared mode equals the sealed key's owner**.

- **Declaration** — a slug from that run's own picker occurs in the response as a whole token.
  `explain` does not match inside `explanation`.
- **Abstention** — no slug occurs at all. A response that names a slug and then asks for information
  is a **declaration**; the rule never reads the request for information. More than one slug is also
  a declaration: the last-mentioned wins and the record is flagged ambiguous.
- **Hit** — the declared mode is the expected owner. Anything else is a non-key pick.

`finishReason` is **enforced, not recorded**: a run whose reason is neither `STOP` nor absent is
`INVALID`, whatever its `status` says, and leaves its cell's denominator. The same applies to a `RUN`
with no response. The excluded count and its reasons are printed per cell.

The executor applies the rule **at write time** and keeps the runner's verdict beside it: the record
carries `status: "INVALID"` and `runnerStatus: "RUN"`, its `reason` says the output was truncated, and
its `response` is `null`, so a truncated answer is never later scored by accident. The report applies
the same rule again on read, so a hand-edited record cannot smuggle a truncation into a denominator.

## Statistics and guards

- **Wilson 95% interval** on each cell's hit rate and abstention rate.
- **Co-primary contrasts**, Bonferroni α = 0.025 each in the registration: the hit-rate interaction
  `(C2 − C1) − (C6 − C5)` and the abstention-rate interaction on the same contrast, each with a
  **percentile bootstrap 95% interval** over 10,000 resamples of draws within cells, seeded so the
  same directory yields the same interval.
- **2×2 decomposition** — register effect `(C2 − C1)` and `(C4 − C3)`, mood effect `(C3 − C1)` and
  `(C4 − C2)`, and their interaction. Descriptive and underpowered by design (§A2.3); no causal
  claim is emitted.
- **Guard 1 / R-5 — clustering has a consequence.** A cell whose longest run of identical
  consecutive transcripts exceeds 5, or whose exact-duplicate transcript rate exceeds 20%, is
  clustered: its intervals are `null`, and any contrast that uses it is reported as _not estimable at
  this n_. "Consecutive" means consecutive in the cell's draw order (draw 1…100), because the plan
  interleaves cells and wall-clock adjacency is not adjacency of one cell's draws.
- **Guard 2 — boundary.** If a constituent cell's outcome is all one value, the bootstrap carries no
  information: the interval is suppressed and Fisher's exact test is reported separately for the
  ambiguous pair and the control pair. No single exact p is claimed for a difference of differences.
- **The refusal rule is §A2.5 row 10, and nothing stricter.** The tool refuses (exit 2) only when a
  cell's **exclusion rate exceeds 5%**, because cells with differing exclusion rates must not be
  compared. A cell with no records at all also refuses: there is no denominator to report.
- **Below 5%, every cell is reported on its own denominator** — `drawn`, `scored`, `excluded`, hit
  count, abstention count and Wilson intervals on the _scored_ denominator — and every cell with a
  non-zero exclusion rate is **flagged by name and rate** in the table, with the row 10 caveat
  printed alongside. One `MAX_TOKENS` in 600 runs therefore costs one draw from one cell, not the
  whole sweep. There is no override flag: the threshold is a frozen constant.

## Exit status

| Code | Meaning                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | fixtures written; `--check` found the disk byte-identical; a dry-run wrote its material; a batch completed; or a report was emitted                                                   |
| `1`  | `--check` found drift                                                                                                                                                                 |
| `2`  | a precondition failed (bad arguments, an invalid plan, a plan that no longer matches the derivation, a run directory already holding results), or a cell's exclusion rate exceeded 5% |

## What this round may and may not conclude

**May:** whether the effect of entry form on selection (or on abstention) differs between an
ambiguous and an unambiguous brief, at 100 draws per cell, for one model and one entry pair per brief.

**May not:** which frame is better; anything about the catalogue as a whole; whether register or mood
caused a difference — length and negation travel with mood and cannot be separated here; anything
about users.

The report emits no reading. §A2.5's table is applied by a human after the sweep completes.

## Tests

```bash
node --test scripts/routing-round.spec.mjs
```

The suite pins the derived fixtures by line diff, the C6 line identity, the plan's interleaving and
label-only content, the sealed key, `finishReason` enforcement, the abstention rule, the statistics,
and the report's behaviours (clean, clustered, boundary, `partial` and `over-exclusion`) through the
CLI.

It also exercises the executor end to end with a **stub runner** that writes a fixed transcript:
`--dry-run` (600 prompts, a byte-identical plan copy, no `results.jsonl`), `--limit 3` (exactly three
runs, in plan order), `--only` (one label, its first draws), a `RUN` whose sidecar says `MAX_TOKENS`
(recorded as `INVALID` with `runnerStatus: "RUN"` and no `response`), the `--force` guard, and a plan
that is not the 600-run plan. It needs no network and no key.
