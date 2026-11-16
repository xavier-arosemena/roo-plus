# Implementation notes — E12 instrument (B3 isolation), Amendment 2 rebuild

Fixture of record: [`docs/reviews/2026-11-11-b3-isolation-preregistration.md`](../../../docs/reviews/2026-11-11-b3-isolation-preregistration.md),
read with **Amendment 2** (§A2.1–§A2.8). Adversarial review, whose objections this
rebuild closes: [`docs/reviews/2026-11-11-b3-isolation-red-team.md`](../../../docs/reviews/2026-11-11-b3-isolation-red-team.md).
Neither document is modified by this work.

State: **UNRUN.** Every command below is `--dry-run` or synthetic. No model call was
made, no `.env` was read, and no `results.jsonl` exists from a real run.

**§3 of the registration is withdrawn.** No code, test or note here asserts the pattern
table; the reading is the sequential procedure in §A2.2, implemented in
[`scripts/lib/b3-sequence.mjs`](../../../scripts/lib/b3-sequence.mjs:1).

| File                                        | Role                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `A0.roomodes` … `C2.roomodes`, `P.roomodes` | the seven material variants (A3 and C2 retained, not run)                      |
| `arms.json`                                 | the §A2.2 plan: C1 → A0×3 → A5 → P → M(A1) → L(A2) → X(A4)                     |
| `answer-key.json`                           | **sealed**: expected owner per (condition, brief), plus E11's reference vector |
| `IMPLEMENTATION-NOTES.md`                   | this file                                                                      |

Fixtures are derived by [`scripts/generate-b3-isolation-fixtures.mjs`](../../../scripts/generate-b3-isolation-fixtures.mjs:1),
which re-serialises each source and asserts byte identity (or the registered diff)
before writing. Re-running it is idempotent.

---

## What Amendment 2 changed, and where it lives

| Amendment 2 item                                            | Implemented at                                | Evidence                                        |
| ----------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| C1 first (§A2.2 step 0, objection 9)                        | `arms.json` condition 1                       | plan order `C1, A0, A5, P, A1, A2, A4`          |
| A0 × 3, repeats interleaved (step 1, objection 19)          | `planRunsFromPlan`, repetition loop outermost | 0 adjacent identical prompts of 45              |
| A5 as the contrast (step 2)                                 | `arms.json`                                   | 45 prompts materialised                         |
| Placebo P (step 3, objection 10)                            | `P.roomodes`, IN-13                           | 2 changed lines vs A0                           |
| A4's brief replaced (§A2.4, objection 6)                    | `REGISTERED_B3P`, IN-14                       | loader refuses the old paraphrase               |
| A3 not run, S withdrawn (§A2.3)                             | `arms.json` `status: not-run`, loader refusal | `--only A3` exits 2 with the registered reason  |
| Sealed answer key (§A2.5, objection 14)                     | `answer-key.json`                             | banned token + sealed filename                  |
| Sequential stops (§A2.2)                                    | `scripts/run-b3-sequence.mjs`                 | seven reason codes reproduced on synthetic runs |
| 35–45 calls, not 40–89k unconditional (§A2.6, objection 20) | dry-run arithmetic                            | IN-16                                           |

## IN-1 — A1 renames `name` as well as `slug` (unchanged)

The picker renders `slug — Name — routing line`. Renaming only the slug would emit
`explanation — Explain — …`, leaving the verb on screen and making A1 test material no
catalogue has. A1 renames both, which is exactly two field changes and is asserted by
diff. Consequence: A1 tests **noun form as a reader sees it**, not the slug alone.

## IN-2 — the two A3 padding modes (retained, not run)

`onboarding-guide` and `release-notes`, appended, `groups: [read]`. Neutrality is checked
mechanically on the three projected fields and now bans **`explanation` as well as
`explain`** (objection 21: the longer word does not contain the shorter one). A3 is
retained at §A2.3's request and is never planned.

## IN-3 — the exact `whenToUse` copied into A2 (unchanged)

`Use when someone asks why the code behaves as it does and evidence must be cited.`,
copied from the artefact picker over A1's line with nothing else touched.

## IN-4 — diff summary, computed from the written bytes

| Comparison                     | Result                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| `A0` vs `axis-stance.roomodes` | `cmp` identical; 45 modes; 26,734 bytes                            |
| `A5` vs `artefact.roomodes`    | `cmp` identical; 47 modes; 25,870 bytes                            |
| `A1` vs `A0`                   | exactly 2 fields (`slug`, `name`), 0 lines added/removed           |
| `A2` vs `A1`                   | exactly 1 field (the comprehension route line)                     |
| `A3` vs `A0`                   | +2 modes appended, 45 → 47, no existing line moved                 |
| **`P` vs `A0`**                | **exactly 2 fields**, both `slug`; 45 modes; 26,734 → 26,739 bytes |
| `C2` vs `A0`                   | same 45 blocks reversed, no field changed                          |

## IN-5 … IN-12 — earlier construction gaps (superseded where noted)

Kept because a later reader needs them; the parts Amendment 2 replaces are marked.

- **IN-5** framing categories were undefined — **superseded** by Amendment 1 §A1.1,
  whose text is now copied verbatim into the rubric.
- **IN-6** `MATCH`/`PLAUSIBLE`/`MISS` were undefined and the shipped rubric re-anchored
  `MATCH` to "what a reader would expect" — **superseded** by §A1.2's routing-line
  anchor (objection 12). The old wording is gone.
- **IN-7** "independent scorers" is procedural, not script-enforceable. Accepted as
  stated threat §7.6. Two adversarial bundles with different seeds is the whole
  mechanical part.
- **IN-8** C2 is an exact reversal, not "seeded"; no seed is invented.
- **IN-9** the registered 40 runs assume k = 1 — **superseded** by §A2.6's 35–45.
- **IN-10** `frame` is counted, never failed (parent Amendment 6).
- **IN-11** A3's picker is a superset of A0's; a foreign picker fails only when it is
  not a substring of the run's own.
- **IN-12** `plan.json` gained `repetitions`, `planFile`, `conditions` and now a
  `notRun` table.

## IN-13 — the placebo arm P: `career-coach` and `pricing-analyst`

P is A0 with **two slugs renamed and nothing else**:
`career-coach → career-adviser`, `pricing-analyst → pricing-strategist`. The generator
asserts the diff is exactly two lines and refuses any other change.

**Why these two.** They are the furthest modes from the brief's semantics that still read
as ordinary catalogue members: career advice and pricing are non-engineering domains
(`groups: [read]`), neither can own "why is this module structured the way it is", and
neither is a comprehension, review, mapping, reasoning or implementation mode. The
excluded set — `explain`, `explanation`, `architecture-reviewer`, `codebase-cartographer`,
`code`, `requirements` — is asserted in the generator, so a later edit cannot rename
something adjacent by accident. The replacement slugs are also checked against the
brief's vocabulary (`why`, `explain`, `explanation`, `reason`, `rationale`, `structure`,
`arrange`, `modul`, `evidence`).

**Why slug only, when A1 changes slug _and_ name.** A1 changes two fields of one mode
because it must test the noun form a reader sees. P must change material with no
consequence, so the smallest quotient is the honest one: two fields, total. The visible
cost is a slug/label mismatch on those two lines (`career-adviser — Career Coach`). If a
model ever elects to discuss a career or pricing mode on a comprehension brief, the
floor moves — which is the safe direction: a larger floor makes attribution harder, never
easier.

**What P does not do.** It cannot distinguish "no effect" from "an effect this
manipulation was too small to trigger", and it shares A0's picker order, so it says
nothing about position. §A2.2 step 3 reads it as a floor only.

## IN-14 — A4's replacement brief

`Set out the reasons this module is arranged as it is.` (53 characters; B3 is 52).

**Rationale, one line:** it removes the lexical overlap between the brief and the slug
`explain` while keeping the same speech act, no first person, and no `GOAL` marker — the
withdrawn text (`This module is structured the way it is. I want to understand the
reasoning behind that.`) changed five things, including adding "I want…", the
experiment's own `GOAL` marker.

The string is a constant (`REGISTERED_B3P`) and the loader refuses any other text for
`B3P`, so A4 cannot drift from the registration again (objection 21). A test asserts
that the withdrawn text is refused.

## IN-15 — the answer key's C1 owner: `debug`, and where §A2.5 is inconsistent

§A2.5 says the key records "`explain` for A0, C2 and P; `explanation` for A1, A2 and A5;
and for A4 on the unmodified picker, `explain`". **C1 is not named**, yet step 0 is a
5/5 requirement on C1, so it must be keyed. C1 carries **B1** ("CI is red…"), whose owner
in the axis picker is `debug` ("something fails and the cause is unknown"). A key of
`explain` for C1 would make step 0 unsatisfiable.

The key therefore records `(C1, B1) → debug`, and this note is the record of the
deviation. It is the only place a key entry is not literally quoted from §A2.5.

## IN-16 — the arithmetic: 45 materialised, 35 executable minimum

§2's registered "40 calls" is withdrawn (§A2.6). The dry run prints the arithmetic from
the run list, not from a comment:

```
arithmetic: C1 5 + A0 15 + A5 5 + P 5 + A1 5 + A2 5 + A4 5 = 45 materialised
  §A2.6: steps 0-4 = 30 calls; step 5 = 15 calls at most (5 + 5 + 5), stopping at the first match
  executable range: 35 minimum (stop at M), 45 maximum (all three arms)
```

The brief for this rebuild said "35 runs". That figure is the **minimum** (stop at M),
not the plan: materialising the plan produces 45 prompts, 35 of them distinct (A0's
three draws are one prompt each per persona). Both numbers are recorded above rather
than reconciled by changing one of them.

## IN-17 — where the bundles and the maps go

Default output is now `$TMPDIR/roo-plus-scoring-bundles`, outside the run directory. The
builder refuses an `--out` inside the run directory or inside a bundle, refuses to write
`_case-maps.json` or `_duplicate-map.json` inside either, re-checks the written tree for
sealed filenames, and prints only bundle and map paths — never the run path.

## IN-18 — what in §A2.2 is mechanical, and the one place a slug is needed

Every stop is decidable from `declared_mode` versus the key, plus "did it declare
anything at all": HELP is `declared_mode === null`, a key hit is
`declared_mode === owner`, everything else is non-key. No scorer participates.

Two consequences are recorded rather than hidden:

1. **Step 4 needs one slug.** E11's vector contains one `PLAUSIBLE`
   (`P3 → architecture-reviewer`). PLAUSIBLE is a judgement, but E11 recorded the slug it
   settled on, so agreement is exact slug equality. A different non-key mode does not
   agree — the conservative reading.
2. **Multiple slugs.** The extractor takes the last-mentioned slug and sets an
   `ambiguous` flag. That is Amendment 1's "mode after the marker" rule reduced to the
   only marker a script can find. The scorer's tie-break governs the scoring pass, not
   the sequence.

## OW-1 — open wording item against the frozen edge-case table

The frozen edge-case row says an echo "is reported as an engagement signal". The rubric
now states the narrower operational claim — an echo is **not scored as correctness** and
never moves `owner_judgement` — while quoting the frozen row verbatim. The registration is
not edited; the difference is recorded here and in the rubric as OW-1.

## What this work did not do

- **No model was called**, and no `.env` was read. Every statement about `finishReason`,
  `language` or `echoed` is a statement about the code path, pinned by
  [`scripts/b3-isolation.spec.mjs`](../../../scripts/b3-isolation.spec.mjs:1).
- **The synthetic runs prove the instrument, not the model.** The sequence was driven
  through all seven reason codes on hand-written transcripts, and the bundle builder was
  exercised on a real dry run plus invented responses.
- **The registration and the red-team review were not modified.**
