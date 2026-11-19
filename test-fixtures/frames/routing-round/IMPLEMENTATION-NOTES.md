# Routing closing round (E13-R), Stage 1 — implementation notes

This directory is the **Stage 1** instrument for
[`docs/reviews/2026-11-12-routing-closing-round-preregistration.md`](../../../docs/reviews/2026-11-12-routing-closing-round-preregistration.md),
Amendment 2. Nothing here has been run: there is no `results.jsonl`, no model call
was made, and no key was read. These notes record every interpretation the build
had to make, so a reviewer can argue with the interpretation rather than
reverse-engineer it.

## What is in this directory

| File                          | Contents                                                         | Sealed?                          |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `C1.roomodes` … `C6.roomodes` | the six 45-entry pickers, derived from `../axis-stance.roomodes` | no — a picker is public material |
| `plan.json`                   | 600 runs, draw-major, **labels only**                            | no — but it names no cell        |
| `answer-key.json`             | per label: cell, expected owner, the label's picker slugs        | **yes**                          |
| `_label-map.json`             | label → cell, with the blind seed and algorithm                  | **yes**                          |
| `IMPLEMENTATION-NOTES.md`     | this file                                                        | no                               |

Both sealed files say so in their own `warning` field. No prompt, plan entry or
run record carries a cell name, a slug of the other brief's pair, or a blind
label's meaning. A scorer bundle must not contain either sealed file.

## The six cells, exactly as derived

| Cell | Brief          | Target entry rewritten | slug / name                   | Routing line               | Changed file lines                 |
| ---- | -------------- | ---------------------- | ----------------------------- | -------------------------- | ---------------------------------- |
| C1   | B3 ambiguous   | `explain`              | `explain` / `Explain`         | **IN**                     | none — the file is the base picker |
| C2   | B3 ambiguous   | `explain`              | `explanation` / `Explanation` | **IN**                     | 56, 57                             |
| C3   | B3 ambiguous   | `explain`              | `explain` / `Explain`         | **DC**                     | 60                                 |
| C4   | B3 ambiguous   | `explain`              | `explanation` / `Explanation` | **DC**                     | 56, 57, 60                         |
| C5   | B1 unambiguous | `debug`                | `debug` / `Debug`             | debug's own line           | none — the file is the base picker |
| C6   | B1 unambiguous | `debug`                | `bug-report` / `Bug Report`   | **debug's line, verbatim** | 74, 75                             |

IN = `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.`
DC = `Use when someone asks why code behaves as it does and evidence must be cited.`

The generator asserts, not merely documents, that:

- every derived file is byte-identical to the base everywhere except the lines in
  the last column;
- C1 and C5 equal the base picker byte for byte;
- C6's `whenToUse` equals `debug`'s **parsed and raw** line and **differs** from
  `artefact.roomodes`'s `bug-report` line — the independent red team's objection
  3, which is the reason this build exists;
- the six prompts are unique and each pair differs only at the brief line and/or
  the target entry's picker line.

## Interpretations made by this build

1. **Only the three picker fields are rewritten.** `description` and
   `roleDefinition` keep the base entry's bytes in every derived file. They are
   never rendered into a prompt — the projection is the three-field whitelist in
   [`pickerLine`](../../../scripts/lib/framing-pretest.mjs) — so rewriting them
   would add untested differences to the material for no experimental gain. A
   human reading `C4.roomodes` will see `description` still naming the base
   entry; that is deliberate and inert.
2. **C1 and C5 are byte-identical to the base picker.** The manipulation for a
   reference cell is _nothing_: the base entry already carries the IN line (C1)
   and debug's line (C5). Their prompts are still unique because the brief
   differs, so C1 vs C5 diff shows exactly one changed line — the brief.
3. **C6 copies the raw line, quoting included.** The generator edits only the
   slug and name lines of the `debug` block and never re-renders `whenToUse`, so
   the YAML quoting of the original line survives byte for byte.
4. **Labels are assigned by ascending `sha256(cell + seed)`**, reusing
   [`assignLabels`](../../../scripts/lib/framing-pretest.mjs) rather than
   inventing a second scheme. The default seed is a fixed literal so repeated
   generation is byte-identical; a real sweep should pass a fresh `--blind-seed`.
   The label → cell mapping is written only to `_label-map.json`.
5. **The plan carries labels, never cells.** That is why the answer key is keyed
   by label as well as by cell: the report can compute every statistic without
   opening the sealed map. `plan.json` is asserted to contain neither a `"cell"`
   key nor any `C1`…`C6` identifier.
6. **"Longest run" is measured inside the cell's draw-index subsequence** (draw
   1 to 100), not in wall-clock order. The plan interleaves cells, so two
   identical transcripts from one cell are never adjacent in wall-clock order;
   reading "consecutive" that way would measure nothing. This is the
   within-cell reading of R-3/Guard 1, and it is the conservative one for
   detecting a cell that returned the same answer repeatedly.
7. **Duplicate rate** is `(scored − distinct transcript hashes) / scored` — the
   share of the cell's draws that repeat an earlier transcript, not a count of
   duplicate pairs.
8. **Abstention is mechanical and never reads intent.** A run abstains iff no
   slug from its own picker occurs in the response as a whole token. A response
   that names a slug and then asks for information is a **declaration**. More
   than one slug is also a declaration: the last-mentioned wins and the record is
   flagged `ambiguousSlugs`, importing the E12 key's mechanical definitions
   rather than re-inventing them. `explain` does not match inside `explanation`.
9. **A `RUN` with no response is INVALID**, not a miss. There is nothing to
   score, and inventing a datum would be worse than an exclusion. This extends
   R-2's enforcement to the empty-transcript case.
10. **The refusal threshold is a hard 100 scored draws.** One excluded draw in a
    cell makes the tool refuse rather than report a partial table. That is
    stricter than §A2.5 row 10 (which asks for per-cell denominators) and it is
    what the build brief requires; the diagnostic per-cell counts are still
    printed before the refusal. No "report anyway" flag exists.
11. **The bootstrap is a percentile interval**, 2.5th/97.5th of 10,000 resamples
    drawn independently within each of C1, C2, C5, C6, seeded (default
    `20261112`) so the same run directory yields the same interval twice.
12. **Guard 2 (boundary) is implemented**: if any constituent cell's outcome
    vector has zero variance, the bootstrap interval is suppressed and Fisher's
    exact two-sided test is reported separately for the ambiguous pair (C1 vs C2)
    and the control pair (C5 vs C6). No single exact p-value is claimed for a
    difference of differences, because no such exact test exists; the tool says
    so in the line it prints.
13. **A clustered constituent cell suppresses the whole contrast** (Guard 1's
    "not estimable at this n" reading), not just that cell's interval. Cell
    intervals are `null` when clustered, so no interval can leak into a report.
14. **The 2×2 decomposition is computed for both outcomes** — hit rate and
    abstention rate. The brief named the decomposition once; computing both
    avoids choosing an outcome silently. Both are labelled descriptive and
    underpowered by design (§A2.3).
15. **The report prints counts, rates and intervals only.** It does not print an
    expected owner per row and does not apply §A2.5's reading table; that reading
    is a human step after the sweep.
16. **No generated file carries a timestamp.** `plan.json`, the answer key, the
    label map and the pickers are byte-identical across invocations, which is what
    lets `--check` serve as a drift gate.
17. **Synthetic data is a test affordance on the analysis tool.**
    `--write-synthetic` fabricates a run directory for exercising the report:
    every record carries `"synthetic": true`, every response is prefixed
    `SYNTHETIC`, and a `SYNTHETIC-DATA.md` marker is written. It cannot call a
    model and reads no key.
18. **No bundle builder exists for this round.** "No bundle may contain the
    label map" is therefore enforced by construction — prompts and the plan never
    carry a label's meaning or a cell name — and by tests, not by a bundler
    assertion. If a scorer bundle is later built for E13-R, it must be checked
    against both sealed files explicitly.

## Addendum — Stage 1 gap closure (2026-11-12)

Three gaps were closed after this instrument was built. The fixtures in this
directory are **unchanged**: the plan, the pickers, the answer key and the label
map are byte-identical, and `generate-routing-round-fixtures.mjs --check` still
passes. What changed is the tooling around them.

1. **There is now an executor.** Item 10's "no executor exists" gap is closed by
   [`scripts/run-routing-round.mjs`](../../../scripts/run-routing-round.mjs). It
   validates `plan.json` (600 entries, 100 per label, six unique prompt hashes, no
   cell identifier, no sealed answer-key field), rebuilds the prompts from the
   fixtures and requires every entry to match, then executes the runs through
   `executeRun`. `--dry-run`, `--only <label>`, `--limit <n>` and `--force` are
   supported. Item 10's parenthetical — "every rate in this directory's
   demonstrations is fabricated" — still holds.

2. **Item 10's refusal rule is superseded.** The previous build refused unless
   every cell had all 100 draws scored, which was acknowledged here as stricter
   than §A2.5 row 10. That is now exactly §A2.5 row 10: the report refuses only
   when a cell's **exclusion rate exceeds 5%**, names the cell and the rate, and
   otherwise reports every cell on its own denominator with a flag naming any cell
   whose exclusion rate is non-zero. One `MAX_TOKENS` in 600 runs no longer voids
   the sweep. A cell with no records at all still refuses, because there is no
   denominator to report.

3. **`finishReason` is enforced at write time as well as at read time.** A run
   whose sidecar reason is neither `STOP` nor absent is recorded as
   `status: "INVALID"` with the runner's own verdict kept in `runnerStatus`, and
   with `response: null` so the truncated text cannot be scored later.

4. **The Gemini output cap is 4096 tokens, fixed for the sweep.** It was 2048, and
   thinking tokens count against it, so a thinking-heavy answer could truncate and
   be excluded. Every usage sidecar records `maxOutputTokens`, and the executor
   warns when one batch contains more than one value.

## What this build could not do

- **No model call, by design.** There is no real run directory, no observed
  `results.jsonl`, and no measured clustering. Every rate in this directory's
  demonstrations is fabricated.
- **Stage 2 is not built.** The brief is Stage 1 (Gemini only); the second
  runner and the cross-vendor sweep are out of scope here.
- **`scripts/routing-round.spec.mjs` is not registered in the root
  `test:scripts` list.** That list lives in `package.json`, outside the permitted
  footprint for this change; registering the file is a one-line follow-up.
- **The registration, the red-team documents and the experiment log are
  untouched**, as instructed.
