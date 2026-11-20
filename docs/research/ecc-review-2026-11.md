# ECC review (2026-11) — what `affaan-m/ECC` does and does not offer the routing benchmark

| Field                    | Value                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Subject**              | `affaan-m/ECC`, cloned read-only to `/tmp/ecc` at `3f14a103a8694e51c1df9a806217a6d0b5f7a6f7` (2026-11-17), `VERSION` 2.2.3 |
| **Question**             | Does ECC change what our routing benchmark can say, measure next, or what a mode author should write?                      |
| **Status**               | Review. No ECC code was installed; one offline script and one offline test suite were executed.                            |
| **Method rules applied** | M-1, M-9, M-12, M-14 from [`modes-experiment-log.md`](modes-experiment-log.md:808)                                         |

---

## 1. Executive answer

ECC contains **nothing that bears on the causal finding**: it never varies picker wording or list position, never reports a selection rate, and pins one model, so it cannot confirm, contradict or extend the 27.5-point polarity result or the 30-point position difference. It does contain **three usable instruments** — a runnable, deterministic routing-quality gate over a 77-query probe corpus; an implemented and versioned selection-versus-mention admission rule; and a neighbour-invariance test — each of which changes what we can measure next at zero model cost. For a mode author it supplies **no rule**, only a description corpus whose dominant convention (imperative "Use PROACTIVELY"/"MUST BE USED" forms, no exclusions) sits on the opposite side of our one confirmatory result from our own advice, without any measurement behind it.

## 2. Grade legend and method

**High** = read from source or executed and reproduced. **Medium** = read from documentation, or a single secondary mention. **Low** = inference from structure or naming.

How I worked: cloned with full history; counted from the tree (two routes for every published count, per M-14); read the selection, gate and evaluation code; executed `scripts/consult.js` and `tests/scripts/consult.test.js`; attempted the two most relevant gates and recorded why they would not run. I refused to infer: that Claude Code renders agent descriptions the way our `getModesSection()` renders mode lines (host behaviour, not in the repo); that any ECC skill is auto-invoked in practice; and that ECC's description conventions have any measured effect.

What I could not run, and why, is in §10. No model call was made and no dependency was installed.

## 3. Anatomy of ECC

### 3.1 What it is

| Property  | Value                                                                                                                                                                  | Grade / source                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Purpose   | "Harness-native agent operating system" — a bundle of agents, skills, commands, hooks, rules and install manifests for Claude Code, Codex, Cursor, OpenCode and others | High — `package.json:3`, `README.md:133` (ECC clone)    |
| Licence   | MIT                                                                                                                                                                    | High — `LICENSE:1-3`, `package.json` `"license": "MIT"` |
| Languages | Markdown-dominant: 2,919 `.md`, 1,098 `.js`, 276 `.json`, 191 `.py`, 23 `.ts`, 17 `.rs`, 3 `.tsx`                                                                      | High — extension count over `git ls-files`              |
| Size      | 4,878 tracked files; skills 139,269 lines, docs 287,781, tests 204,161, scripts 110,646, agents 10,409, commands 12,685                                                | High — `git ls-files`; `wc -l` per area                 |
| Activity  | 4,986 commits, 2026-01-17 → 2026-11-17; 395 commits in the last partial month; 573 author identities in `git shortlog` (bots and duplicate identities included)        | High — `git rev-list --count`, `git shortlog`           |
| Releases  | 20 tags, `v0.6.0` … `v2.2.3`; `v2.2.3` tagged 2026-10-01; `CHANGELOG.md` has an unreleased section after it                                                            | High — `git tag`, `git log -1 v2.2.3`                   |

### 3.2 Counts: README against the repository

| Component            |               README says |                                                                                         Counted | Route                                         |
| -------------------- | ------------------------: | ----------------------------------------------------------------------------------------------: | --------------------------------------------- |
| Agents               |                        72 |                       **72** files in `agents/`, each with `name`/`description`/`tools`/`model` | `ls`; YAML key census                         |
| Skills               |                       327 |          **327** `SKILL.md` under `skills/`; 327 distinct names and 327 distinct bodies (SHA-1) | `find`; Node walk + hash                      |
| Commands             | 98 "legacy command shims" |                         **98** `.md` in `commands/`; `legacy-command-shims/` holds **13** files | `find`                                        |
| Install components   |                         — |     **96** (baseline 6, language 14, framework 9, capability 23, agent 13, skill 18, locale 13) | Node over `manifests/install-components.json` |
| `SKILL.md` repo-wide |                         — | **1,087** (327 `skills/` + 518 translated `docs/` mirrors + 138 `pi/` + 48 `.agents/` + others) | `find`                                        |

The README's "98 legacy command shims" is a definitional mismatch: 98 is the count of current command definitions, not of the 13-file shim directory. This is the "claim without a denominator" failure mode in miniature — grade **High** for both numbers, **Low** for reading them as the same quantity.

### 3.3 Architecture

- **Entry points:** `scripts/ecc.js` CLI dispatcher (`consult` at `scripts/ecc.js:30`); `scripts/eval-harness.js`; `scripts/ci/evaluate-context-routing.js`; `docker/context-profiles/ai-eval.js`; hooks via `hooks/hooks.json` (`SessionStart` at `hooks/hooks.json:137`).
- **Module boundaries:** `scripts/lib/` (context registry, selection, retrieval, install manifests, eval harness), `docker/` (development-only evaluators), `src/llm/` (Python provider layer), `ecc2/` (Rust TUI), `pi/` (portable bundle), `manifests/` (install components/profiles/packs).
- **Data flow (runtime selection):** task JSON → `resolveTaskContext()` → profile compiler → BM25 index over registry entries → candidate list → admission policy → selected IDs → selected skill bodies, capped at 8 skills and 32,000 bytes (`scripts/lib/context-selection.js:359-449`).
- **Persistence:** a managed profile store with immutable generations, receipts, rollback and recovery (`docs/design/context-profile-delivery.md:11`, `:95`).
- **External calls:** provider adapters for Codex/Claude in the evaluators (explicit opt-in, isolated homes); npm publishing. **Grade Medium** — read from docs, not executed.

### 3.4 Its agent/prompt surface — and how a choice is made

| Surface            | Fields                                                                | Count | Who chooses                                                 | Source                                        |
| ------------------ | --------------------------------------------------------------------- | ----: | ----------------------------------------------------------- | --------------------------------------------- |
| Agents (subagents) | `name`, `description`, `tools`, `model`                               |    72 | **The host model**, from descriptions; no ECC code involved | `agents/architect.md:1-6`                     |
| Skills             | `name`, `description`, `metadata.origin` (plus licence/tools on some) |   327 | Host progressive disclosure, or ECC's resolver              | `skills/kotlin-coroutines-flows/SKILL.md:1-5` |
| Commands           | `description`                                                         |    98 | **The user** (`/command`); mapping to agents is static      | `docs/COMMAND-AGENT-MAP.md:5-10`              |
| Install components | id, family, description, modules                                      |    96 | `consult.js` (lexical) and install profiles                 | `manifests/install-components.json`           |

**There is no renderer in ECC.** No code in the repo assembles a picker line; `.claude-plugin/plugin.json:40` simply points the host at `./skills/`, and the project's own docs say the always-on listing is observed from the host (`surface: plugin-always-on-listing`, `docs/design/context-profile-delivery.md:99`) rather than produced by ECC. **Grade High** for delegation to the host; **Medium** for the absence claim (grep for a `* "<name>" mode (<slug>)`-style template found none).

Three artefacts _do_ make choices:

1. **A lexical install-time matcher.** `scripts/consult.js:263` scores query tokens against component id/description/module/alias tokens (exact 5/4, fuzzy 1), adds hand-written bonuses (`consult.js:295-323`), sorts by score then `localeCompare` on family and id (`consult.js:347-351`), and emits `ecc.consult.v1` JSON with `reasons`, `installCommand` and `planCommand`. **Executed**: returns `capability:security` at score 22 with reasons `matched "security"; fuzzy matched "reviews"; matched "review"`. Its 13-test suite passes offline.
2. **A runtime skill resolver.** BM25 retrieval plus curated triggers, with auto-admission only on unambiguous evidence: `bm25 ≥ 20`, ≥ 3 matched terms, ≥ 1 anchor term in the name/triggers, and a 1.5× margin over second place (`context-selection.js:19-21`, `409-411`). Policy version 12 (`:56`).
3. **A static command→agent table** (`docs/COMMAND-AGENT-MAP.md`) — no model choice at all.

### 3.5 Evaluation apparatus

| Item                    | What it is                                                                                                                                                                                                                                           | Classification                                         | Source                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Routing-quality gate    | 77-query corpus (52 direct, 25 paraphrased; 81 distinct expected skill ids; 32 multi-expected), scored for `top1Rate`, `top3Rate`, `admissionPrecision`, with a hard zero-wrong-load rule; thresholds `direct.top3Rate 0.88`, `direct.top1Rate 0.80` | **Executable but did not run here** — needs `js-yaml`  | `scripts/ci/evaluate-context-routing.js:16-24`, `tests/fixtures/context-selection/routing-prompts.json:2` |
| Resolver unit tests     | 54 selection tests + 5 admission tests, including pinned top-1 probes against the live registry                                                                                                                                                      | **Executable but did not run** — same dependency       | `tests/lib/context-selection.test.js`, `tests/lib/context-selection-admission.test.js`                    |
| `consult` suite         | 13 tests over the lexical matcher                                                                                                                                                                                                                    | **Executed: 13 pass**                                  | `tests/scripts/consult.test.js`                                                                           |
| AI outcome evaluator    | 30-task repair corpus, ≥ 30 selection probes, hidden graders, 5 arms, non-inferiority margin 0.05, digest-bound registration                                                                                                                         | **Executable but unreproducible here** — provider auth | `docs/design/context-profile-ai-evaluation.md:10-12`, `docker/context-profiles/ai-corpus.json:6`          |
| Complex-task benchmark  | 3 tasks, 5 arms, deterministic graders, reference and naive controls, preregistered before first call                                                                                                                                                | **Executable but did not run** — `js-yaml`             | `docker/context-profiles/complex-eval/DESIGN.md:5-18`, `:79`                                              |
| GateGuard effectiveness | 6 trapped tasks × 4 arms (off / gate / minus-target / placebo) × 3 reps; published pilot                                                                                                                                                             | **Executable but unreproducible here** — Claude login  | `docs/gateguard/question-effectiveness.md:54-62`, `:159-175`                                              |
| Eval harness            | capsule/receipt/gate CLI; gate runner hard-disabled                                                                                                                                                                                                  | **Deliberately unavailable**                           | `scripts/lib/eval-harness/gate.js:176`                                                                    |

No ECC document reports a `top1Rate`/`top3Rate` number: the corpus and gate exist, the result does not. **Grade High** (grep across `docs/`, `docker/`).

### 3.6 Documentation claims I could not verify

| Claim                                                                                                          | Status                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "327 skills … production-ready workflows" (`README.md:145`)                                                    | Count verified; "production-ready" unverifiable                                                                                                                                                |
| Codex/Claude native install works across ten target/profile combinations (`docker/context-profiles/README.md`) | Unverified — needs both CLIs                                                                                                                                                                   |
| Auto skill matching delivers equal task outcomes to manual selection (`DESIGN.md` research question)           | **Unverified and unpublished** — the design says the comparison is preregistered; no results file exists                                                                                       |
| "Skills activate when the task matches" (`docs/SKILL-DEVELOPMENT-GUIDE.md:29`)                                 | Unverified; the project's own README says the probes "do not certify model invocation, skill workflow outcomes, implicit provider invocation of Auto" (`docker/context-profiles/README.md:67`) |

## 4. Evidence-graded claims

| #   | Claim about ECC                                                                                                                                   | Grade         | Source                                                                  | Would raise the grade          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 1   | 72 agents, 327 skills, 98 commands exist with those frontmatter fields                                                                            | High          | `agents/*.md`, `skills/*/SKILL.md`, `commands/*.md`                     | —                              |
| 2   | No ECC code renders a picker line; the host does                                                                                                  | High / Medium | `.claude-plugin/plugin.json:40`; absence grep                           | Host source or captured prompt |
| 3   | `consult.js` is a deterministic lexical ranker and runs offline                                                                                   | High          | executed; `scripts/consult.js:263-364`                                  | —                              |
| 4   | The runtime resolver admits only on score + margin + anchor terms, and defers otherwise                                                           | High          | `scripts/lib/context-selection.js:19-21`, `390-415`                     | —                              |
| 5   | "Mere mentions — questions, negations, reported speech, multiple cited names — never admit implicitly"                                            | High          | `context-selection.js:392-395`; `citationFor()` `:127`                  | —                              |
| 6   | Ambiguity is an explicit state (`pending` / `agent-selection-required`), not an error                                                             | High          | `context-selection.js:436-440`                                          | —                              |
| 7   | Neighbour listing must not change ECC's selection (invariance requirement)                                                                        | High          | `tests/fixtures/context-selection/neighbor-skills.json:2`               | —                              |
| 8   | A 77-query routing corpus with top-1/top-3/admission metrics and thresholds exists                                                                | High          | `routing-prompts.json:2-3`, `:333`; `evaluate-context-routing.js:16-19` | —                              |
| 9   | The routing gate does not run in a clean checkout                                                                                                 | High          | executed; `MODULE_NOT_FOUND js-yaml`                                    | `npm ci`, then run             |
| 10  | 291/327 skill descriptions use "Use when"; 13 agent descriptions say "Use PROACTIVELY", 17 "MUST BE USED", 14 "Use when" (pattern counts overlap) | High          | computed over frontmatter                                               | —                              |
| 11  | Skill descriptions total 98,183 chars (median 286); agent descriptions 15,012                                                                     | High          | computed twice (Node, second Node route)                                | —                              |
| 12  | No ECC validation rule constrains description length or form; only presence and inline-scalar shape                                               | High          | `scripts/ci/validate-skills.js:10-14`, `:278-286`                       | —                              |
| 13  | GateGuard's published pilot is a saturated null reported as uninformative                                                                         | High          | `docs/gateguard/question-effectiveness.md:159-175`                      | —                              |
| 14  | The 30-task evaluator's results are not in the repository                                                                                         | Medium        | absence; DESIGN/README reference methodology only                       | A results artefact             |
| 15  | Any model-level effect of ECC's descriptions on delegation                                                                                        | Low           | no measurement exists                                                   | An experiment                  |

## 5. Strengths

| Strength                                                                               | Problem it solves                                                                           | Do we have that problem?                                                          | Evidence                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Registration binds artefacts by digest, and "a changed corpus is a new experiment"** | Silent corpus drift between registration and run                                            | Yes — our prompt hashes cover prompts but not the extractor, fixture and registry | `docs/design/context-profile-ai-evaluation.md` (registration binds "corpus bytes, registry resource digests, both profile plans, evaluator, launcher, resolver and native adapter digests") |
| **Zero wrong loads is a hard gate, not a rate**                                        | Averages hide catastrophic misroutes                                                        | Yes — our most policy-relevant number is 12 wrong commits in 100                  | `evaluate-context-routing.js:19`, `:59`                                                                                                                                                     |
| **Explicit deferral as a designed state**                                              | Forces the product to have an "ask" outcome; prevents the model being scored for committing | Yes — our whole effect lives in commit-vs-ask                                     | `context-selection.js:436-440`                                                                                                                                                              |
| **Placebo and ablation arms**                                                          | Separates "stopping the agent helps" from "the question helps"                              | Yes — our slot-occupant design had no placebo                                     | `question-effectiveness.md:54-62`                                                                                                                                                           |
| **Saturated pilot published as "returns no information at all"**                       | The ceiling null is not spun as a win                                                       | Yes — M-8/M-11 say the same after the fact                                        | `question-effectiveness.md:159-175`                                                                                                                                                         |
| **Neighbour invariance as a test**                                                     | Catalogue edits can silently change unrelated selections                                    | Yes — E20c asked this and was inconclusive                                        | `neighbor-skills.json:2`                                                                                                                                                                    |
| **Selection/mention policy with 12 versions and tests**                                | A classification rule that decides the answer                                               | Yes — cost us 88 points on the wrong construct (M-12)                             | `context-selection.js:56`, `:392-395`                                                                                                                                                       |

## 6. Weaknesses

1. **Metrics named for a stronger claim than they make.** `top1Rate` counts "expected set contains candidate 1"; 32 of 77 queries have multi-element expected sets, so a "top-1" hit is often "one of the acceptable owners came first". The thresholds 0.88/0.80 have no derivation in the repo. Grade High for the structure, Medium for there being no calibration.
2. **Expectations authored with the resolver.** The corpus came from the same community PR that informed the ranking code (`evaluate-context-routing.js:3-6`; `docs/design/context-profile-delivery.md` credits PR #2945). Self-authored keys are the failure E2 named in our own programme. Grade High (provenance), Medium (consequence).
3. **A gate that does not run from a clean checkout**, plus a harness whose execution path is deliberately disabled (`gate.isolation_required`). Honest, but "executable" is weaker than it sounds.
4. **No published routing numbers.** The instrument exists, the reading does not — the exact "metric without a reported denominator" pattern.
5. **Description bloat, by our own standard.** 327 skill descriptions total ≈ 98k characters; combined with 72 agent descriptions ≈ 113k. Under a rough 4-chars-per-token conversion that is ≈ 28k tokens of always-on description if all were surfaced together, against the 15,000-token combined description budget our architecture doc cites for Claude Code ([`modes-architecture.md`](../modes-architecture.md:105)). **Grade Medium** — the token figure is an approximation and the host's actual budget applies to a different object than skills.
6. **Repo-wide duplication.** 1,087 `SKILL.md` files for 327 distinct skills; four harness-specific mirror trees (`pi/`, `.agents/`, `.docs` translations, `.cursor/`, `.kiro/`). Any count of "what ECC ships" is a packaging fact, not a capability count.
7. **Absolute imperative descriptions, unmeasured.** 17 descriptions say "MUST BE USED" (e.g. `agents/code-reviewer.md:3`), 13 "Use PROACTIVELY". Over-delegation is not measured anywhere; the only related measurement is a saturated null.
8. **Order is assumed neutral, not tested.** Both selectors break ties deterministically by identifier (`consult.js:349-351`), which makes serial position a fixed function of the alphabet. Given our position result, that is an uncontrolled bias in a deterministic system, not a control. **Grade Low** — inference from code, no measurement.

## 7. What to learn

| Adopt                                                        | Why it is worth adopting                                                  | Not to adopt                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Probe corpus + top-k + admission precision + zero-wrong rule | Model-free, seconds to run, catches catalogue drift                       | The specific aliases and id-tie-break in `consult.js`            |
| Selection/mention admission rule with explicit defer         | A worked implementation of M-12's construct discipline                    | The 12-version policy history as a substitute for a written rule |
| Neighbour invariance                                         | Cheap pre-screen for catalogue edits                                      | As a substitute for E20c — it cannot speak to model behaviour    |
| Direct/paraphrased split, gating one and reporting the other | Contains corpus failure without deleting it; matches our brief screen     | Treating the ungated set as evidence                             |
| Placebo/ablation arms, pre-committed escalation rule         | The only design that separates mechanism from "the agent was interrupted" | Its 6-scenario scale                                             |
| Digest-bound registration                                    | Machine-checkable registration identity                                   | The provider-specific launcher stack                             |

## 8. Relation to our report

| Our report establishes                                        | ECC has                                                                                     | Relation                                                          | Evidence                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| Polarity: exclusion line +27.5 pts over requirement line      | 72 agent + 327 skill descriptions, dominated by positive imperatives; no wording experiment | **Orthogonal** (stimulus bank, not evidence)                      | `agents/architect.md:3`; counts §3.2                      |
| Position: 30 pts first vs last, mechanism unidentified        | Deterministic scoring and id tie-break; no positional variation                             | **Orthogonal**; also an untested assumption in their design       | `consult.js:347-351`                                      |
| Mechanism candidates: first penalty / last reward / neighbour | Neighbour _listing_ invariance test (not positional)                                        | **Cannot tell** — different construct                             | `neighbor-skills.json:2`                                  |
| Model-specificity: 0 asks in 91 replies on a second provider  | One pinned model per evaluator; `/model-route` is a prose heuristic with no data            | **Silent**                                                        | `commands/model-route.md:9-14`                            |
| Commit-vs-ask is the channel                                  | `agent-selection-required`, `decision: pending`, bounded proposal path                      | **Supports** (productised ask state)                              | `context-selection.js:386-395`, `436-440`                 |
| Ask is cheaper than a wrong commit                            | "Running without context is safer than loading a likely-wrong skill"; zero wrong loads      | **Supports**                                                      | `context-selection.js:23-27`; gate thresholds             |
| 598/600 appropriate; 2 wrong commits                          | Hard zero-wrong-load gate                                                                   | **Supports** (same harm hierarchy)                                | `evaluate-context-routing.js:19`                          |
| One brief out of seven; channel opens on ownership ambiguity  | Direct/paraphrased split; hidden-intent multi-turn scenarios                                | **Supports and supplies a generator**                             | `routing-prompts.json:2`; `question-effectiveness.md:206` |
| M-12: selection ≠ mention, 88 points at stake                 | Implemented `citationFor()` policy, v12, with tests                                         | **Supports** (independent evidence the construct problem is real) | `context-selection.js:127`, `:392-395`                    |
| Batch means are unstable; interleaving is not enough          | Deterministic selectors have no batch variance at all                                       | **Orthogonal** — their stationarity is free, ours is not          | `consult.js` (no model call)                              |

### Direct answers

**A fourth mechanism candidate for position?** No. ECC never varies order, and its determinism removes the variance our mechanism question lives in. The only transferable idea is a confound, not a mechanism: an identifier tie-break creates serial position by alphabet — grade **Low**, inference.

**Anything for the seven-brief problem?** Yes, one idea worth testing: **hidden-intent briefs**. GateGuard's second harness exists because "the deciding fact exists only in a simulated user's hidden intent and sessions are multi-turn" (`CHANGELOG.md:18`; `question-effectiveness.md:206`). That is a _generator_ for the condition our §28 identified — ownership ambiguity — rather than a mechanism question whose only missing information is the code. Grade **Medium**.

**A routing-capable artefact we could measure?** Yes, three, all model-free: a 96-component catalogue with a runnable selector and a 13-test suite; a 77-query probe corpus with top-k metrics and a gate; and 399 description lines (72 agents + 327 skills) in natural form variation. These extend the **stimulus** n (two new lists, 399 lines, one extra catalogue of 96), not the **model** n. Our §5 forbids quoting a stimulus extension as a model result, and nothing here changes that.

**Anything on model-specificity?** Nothing. No ECC artefact measures routing behaviour on more than one model. `/model-route` recommends a tier from prose, with no data (`commands/model-route.md:9-14`).

**Does it contradict us?** No, and I looked hardest here. The nearest thing to a contradiction is a convention, not a result: the most-used description catalogue in this space writes triggers as requirements and absolutes ("MUST BE USED for all code changes"), which is the B form in our E20 contrast, on the losing side. But it is a different construct (always-on delegation, no picker, no position) with no measurement, and our own architecture doc already cites vendor guidance to say what the agent should do rather than what it should not ([`modes-architecture.md`](../modes-architecture.md:106)). What would settle it: a within-run test on a rendered _agent_ list, C-form (exclusion) against B-form (requirement), on a model that asks. That is a new experiment, not a reading of ECC.

## 9. Recommendations

| #   | Recommendation                                                                                                                                                           | Files in our repo                                                                           | Evidence                                                | Cost           | Risk                                       | Falsifier                                        | Workstream |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------- | ------------------------------------------ | ------------------------------------------------ | ---------- |
| R1  | Build a model-free probe harness for the 45-entry preload and for `search_modes`: fixed query set, top-1/top-3, admission precision, **zero wrong-owner** as a hard gate | `scripts/`, `test-fixtures/`, [`modes-architecture.md`](../modes-architecture.md:795) §10.8 | `evaluate-context-routing.js:16-59`                     | hours          | Probe set authored by us (E2 failure mode) | A deliberately wrong `whenToUse` passes the gate | Catalogue  |
| R2  | Generate hidden-intent briefs and screen 20 calls before any sweep                                                                                                       | [`modes-experiment-log.md`](modes-experiment-log.md:1000) new §, fixture generator          | `question-effectiveness.md:206`; §28                    | hours + ~€0.10 | Intent leaking into the prompt             | 20/20 still commit                               | Benchmark  |
| R3  | Bind the next registration to digests of corpus, extractor and fixture                                                                                                   | `docs/reviews/*preregistration*`, `scripts/run-routing-round.mjs`                           | `context-profile-ai-evaluation.md` registration section | hours          | Over-binding blocks legitimate fixes       | An edited prompt still passes the binding        | Benchmark  |
| R4  | Run neighbour invariance as a pre-screen before any further slot experiment                                                                                              | `scripts/`, `test-fixtures/`                                                                | `neighbor-skills.json:2`                                | hours          | Zero predictive value for model behaviour  | Pre-screen passes, model effect persists         | Catalogue  |
| R5  | Record failed briefs in a non-gating "paraphrased" register                                                                                                              | log §29                                                                                     | `routing-prompts.json:2`                                | minutes        | Becomes dead documentation                 | No later round ever consults the register        | Benchmark  |

**Already covered, not recommendations:** M-12's selection/mention rule (written); the description budget (proposed in §4 of the architecture doc); "one brief, one model" (in the report); harm asymmetry (in §6).

**Decline:** porting `consult.js` as a routing benchmark (it measures token overlap, and its alias tables encode the answers); adopting 327-skills scale; copying the eval-harness plumbing; adopting "MUST BE USED" description style.

**Order:** R1 first (free, reusable, and it is the only one that produces a number this quarter), then R5, then R2, then R3, then R4.

## 10. No-data register

| Question                                                                       | Why unanswered                                                                                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Actual top-1/top-3 rates on ECC's 77-query corpus                              | Gate needs `js-yaml`; installing dependencies was out of scope. `npm ci` then `node scripts/ci/evaluate-context-routing.js --json` |
| Whether complex-task graders are calibrated (reference 1.0, fixture < 1.0)     | `verify-checks.js` also needs `js-yaml`                                                                                            |
| Any model-level effect of ECC descriptions                                     | Requires provider calls; none made                                                                                                 |
| How Claude Code renders 72 agent descriptions and whether the 15k budget binds | Host behaviour, not in the repo, not executable here                                                                               |
| Whether Auto skill matching matches manual selection                           | Preregistered, results absent from the repo                                                                                        |
| Whether "MUST BE USED" over-delegates                                          | No measurement exists                                                                                                              |
| Licence provenance of every skill (`metadata.origin: community`)               | Not audited file by file                                                                                                           |

## 11. Source register

| Source                                                                                                                                                                                                                                                                | Establishes                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `/tmp/ecc` @ `3f14a103` (2026-11-17)                                                                                                                                                                                                                                  | All anatomy counts, activity, tags                        |
| `README.md:145`, `.claude-plugin/marketplace.json`                                                                                                                                                                                                                    | The 72/327/98 claims                                      |
| `agents/*.md` frontmatter                                                                                                                                                                                                                                             | Description fields, 72 agents, form distribution          |
| `skills/*/SKILL.md` frontmatter                                                                                                                                                                                                                                       | 327 skills, description lengths, "Use when" prevalence    |
| `scripts/consult.js:13,54,263-364`                                                                                                                                                                                                                                    | Lexical matcher, aliases, schema, deterministic order     |
| `scripts/lib/context-selection.js:19-21,56,127,359-449`                                                                                                                                                                                                               | Admission policy, defer state, selection/mention rule     |
| `scripts/ci/evaluate-context-routing.js:5-24,58-59`                                                                                                                                                                                                                   | Gate design, metrics, thresholds, zero-wrong rule         |
| `tests/fixtures/context-selection/routing-prompts.json:2-3,333`                                                                                                                                                                                                       | 52 direct + 25 paraphrased queries, expectations          |
| `tests/fixtures/context-selection/neighbor-skills.json:2`                                                                                                                                                                                                             | Invariance requirement                                    |
| `docker/context-profiles/complex-eval/DESIGN.md:5-18,79`                                                                                                                                                                                                              | Preregistration, five arms, deterministic graders         |
| `docs/design/context-profile-ai-evaluation.md:10-12`                                                                                                                                                                                                                  | 30 tasks, ≥ 30 probes, hidden graders                     |
| `docker/context-profiles/ai-corpus.json:4-6`                                                                                                                                                                                                                          | Sampling statement, 0.05 non-inferiority margin           |
| `docs/gateguard/question-effectiveness.md:11-25,54-62,159-175`                                                                                                                                                                                                        | Hypotheses, placebo/ablation, saturated null              |
| `docker/context-profiles/README.md:67`                                                                                                                                                                                                                                | Self-declared limits ("do not certify model invocation…") |
| `scripts/ci/validate-skills.js:10-14,278-286`                                                                                                                                                                                                                         | No length/form constraint on descriptions                 |
| `scripts/lib/eval-harness/gate.js:176`                                                                                                                                                                                                                                | Gate runner disabled                                      |
| Executed: `node scripts/consult.js "security reviews" --json`; `node --test tests/scripts/consult.test.js`                                                                                                                                                            | Determinism; 13/13 pass                                   |
| Our: [`routing report`](../reviews/2026-11-17-routing-report-e17-draft.md:28), [`log §22`](modes-experiment-log.md:812), [`log §28`](modes-experiment-log.md:980), [`log §29`](modes-experiment-log.md:1004), [`modes-architecture.md`](../modes-architecture.md:105) | The results and rules this review is measured against     |

## 12. Reviewer verdict

**Objection 1 — "This is an instrument review, not evidence, and you say so in the title."** Correct, and the review survives it only because each borrowed instrument is stated with its construct: model-free retrieval gates cannot speak to commit-versus-ask. The recommendations are scoped accordingly, and R1 is justified by cost and reuse, not by any ECC result.

**Objection 2 — "Your description-budget comparison mixes objects and units."** The weakness is real: skills and subagents differ, and 4 chars/token is an approximation. Mitigation: the claim is graded Medium, the token figure is labelled approximate, and no recommendation depends on it. If the reader rejects it, §6.5 disappears and nothing else moves.

**Objection 3 — "You could not run the two most relevant gates, so 'executable' is asserted from reading."** True for the routing gate and the complex-task graders; both failed on a missing third-party module, not on logic, and both failures are recorded. The executed `consult` script and its suite carry the strongest grade. The grade table marks exactly which claims rest on execution.

The report survives all three with one downgrade each. Its weakest point is not coverage but the thinness of the answer: ECC is large and well-built, and it still has nothing to say about the question our benchmark spent 3,200 calls on.

---

## Addendum — R1 built and run, R2 screened (2026-11-20)

This addendum records what happened after the review was delivered. It changes one recommendation's rank and adds one finding about our own programme.

### A1. R1 was built, tested and run

| Piece                                | Path                                      | State                                                                         |
| ------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Strict `.roomodes` reader            | `scripts/lib/roomodes-lite.mjs`           | 45 entries parsed; refuses block scalars, unknown keys, duplicate slugs, tabs |
| BM25 gate + baseline logic           | `scripts/lib/mode-probe-gate.mjs`         | deterministic; ties by slug                                                   |
| CLI                                  | `scripts/mode-probe-gate.mjs`             | `--json`, `--baseline`, `--write-baseline`; exit 1 on breach                  |
| Probes (20 gate + 7 screened briefs) | `test-fixtures/mode-probes/probes.json`   | construct and provenance recorded in-file                                     |
| Baseline                             | `test-fixtures/mode-probes/baseline.json` | catalogue + probe digests, top-1 per gate probe                               |
| Tests                                | `scripts/mode-probe-gate.spec.mjs`        | 11 pass; a mutated catalogue is refused on digest                             |

**Result 1 — coverage, not accuracy, is the finding.** With a declared anchor rule (the expected owner must share a token with the request through its _name or slug_), only **6 of 20** ordinary requests are lexically reachable at all: reachability **0.30**. On those six, top-1 and top-3 are **100%** and wrong owners are **0**. The catalogue's problem is not that the right entry wins when its words appear; it is that users do not type the mode's name.

**Result 2 — three concrete captures before the anchor rule.** "The API returns 500 … find out why it fails" returned **`requirements`** (it matches "request" and "work" twice); "An API key leaked in a public commit" returned **`devops`**; "Set up CI that lints, tests and publishes on tag" returned **`pricing-analyst`** (on the word "set" — `devops`'s line contains neither "CI", "test", "tag" nor "publish"). Those are catalogue vocabulary gaps, and they have the shape of a wrong commit.

**Result 3 — the proxy is tune-sensitive, so only deltas count.** Keeping "why" in the tokenizer (removed, then restored during the build) moved the ambiguous-brief top-1 rate from **0.286 to 0.857**. One function word is worth 57 points here. Absolute rates from this gate must never be quoted; only baseline-to-baseline changes are meaningful, which is why a digest mismatch is fatal.

**Result 4 — the lexical proxy does not reproduce the model.** All seven screened briefs now top-1 `explain`, including the two the model answered with `architecture-reviewer` (log §29). A net that catches everything is not evidence about ownership; it is further proof that the gate cannot stand in for the 20-call screen.

### A2. Finding about our own programme — the picker the experiments used is not the picker the product emits

While building R1 I rendered the catalogue two ways and compared them with an archived prompt:

| Surface                  | Rendered form                                                                                                       | Source                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Product                  | `  * "<name>" mode (<slug>) - <whenToUse>`, under a `MODES` heading with "These are the currently available modes:" | `src/core/prompts/sections/modes.ts:33`                                                                                                    |
| Every experiment fixture | `- <slug> — <name> — <whenToUse>`, no heading, field order different                                                | `pickerLine`, `scripts/lib/framing-pretest.mjs:243`; used by E13 (`scripts/lib/routing-round.mjs:331`) and E20 (`scripts/lib/e20.mjs:301`) |

A verbatim line from the published E20 batch confirms it: `- explain — Explain — Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.` (`runs/e20-2026-11-17/prompts/ARM-1-d001.txt:7`). **Grade High** — read from source and from archived prompts.

**What it does and does not do.** It does not touch any within-run contrast: every arm in E13, E20, E20b and E20c saw the same form, so sign and magnitude survive as statements about _that_ form. It does touch external validity and one paragraph of advice: §7 of the routing report says "what follows is a way to write one line of a mode entry" and prints the product template, while the measured 27.5 points were obtained on a different template with the fields in a different order and no heading. "The line the model receives" is therefore true of the fixture, not of the extension.

**It also reframes the position result.** Field order is part of the rendered line. In the fixture the slug comes first; in the product the name comes first. A first-entry penalty and a first-_token_ effect are not the same hypothesis, and nothing in the programme has separated them.

### A3. R2 was built, run and adjudicated

| Piece                              | Path                                                     | State                                                                                                      |
| ---------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Ten hidden-intent briefs + control | `test-fixtures/hidden-intent/briefs.json`                | each brief carries the withheld fact and its plausible owners                                              |
| Screen harness                     | `scripts/hidden-intent-screen.mjs`                       | reuses the E20 persona and standing request; product line form; 20 interleaved prompts, 11 distinct hashes |
| Raw batch                          | `runs/hidden-intent-screen-2026-11-20/`                  | 20/20 `STOP`, 20/20 distinct transcripts, 1.9 min, 50,362 tokens total                                     |
| Hand adjudication                  | `runs/hidden-intent-screen-2026-11-20/adjudication.json` | 20 replies, verdict and note per reply                                                                     |

**Result.** The hidden-intent class **opens the channel**: 7 asks, 3 declarations in 10 replies; the interleaved control (B3) gives 3 asks, 7 declarations. Two of the three commits were briefs that stated their own owner ("make the API faster", "the docs are out of date"), so excluding them post hoc gives 7 of 8 — a finding about the design, disclosed as post-hoc, not a headline. The one commit scored outside its authored owner set (`requirements` on an audit-scoping request) is the harm category, and whether it is wrong or merely adjacent must be pre-registered next time.

**Mechanical classification agreed on 15 of 20 replies, and failed in both directions**: it missed two declarations written `Selected mode: **"Explain" mode (explain)**`, and it scored one ask as a declaration of `code` because the asker wrote "source code". The rule now in the tool agrees on 19 of 20 and never over-counts asking; the one residual is an ask it leaves `UNRESOLVED`.

**Cost.** 20 calls, ≈€0.10, 1.9 minutes — measured from the usage sidecars, not estimated.

### A4. What this changes in §9

1. **New R0, above R1: re-run one contrast on the product-rendered picker before any further authoring advice.** Files: `scripts/lib/framing-pretest.mjs` (a second renderer), a new registration, 200–400 calls. Cost: hours + ≈€1–2. Falsifier: the C − B gap and the P1/P45 gap both survive the format change. This is a construct check, not a new hypothesis.
2. **R1 is delivered**, and its first result is a coverage number (0.30), not an accuracy number.
3. **R2 is delivered as a screen, not a result**: the hidden-intent class asks (7/10), so the next round should be registered on that class rather than searching for a second hand-written brief.
4. **R4 (neighbour invariance) drops** to a catalogue-workstream chore: A2 already shows the rendered form matters more than the occupant of a slot.

### A5. Five more instruments for the catalogue, beyond `triggers`

`triggers` is the borrow that the reachability result demands. These five are the rest of what ECC's evaluator design offers the catalogue work, scoped to what we would actually build. Each is listed with the part to refuse, because three of the five come bundled with something that would hurt.

| #      | Instrument                                                         | What ECC does                                                                                                                   | What we would build                                                                                                                                                                                                     | Refuse                                                                                  | Grade                          |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------ |
| **B1** | **Zero-wrong-load as a hard gate**                                 | Fails a routing run if any query loads a wrong owner, rather than reporting a rate (`evaluate-context-routing.js:19`)           | A `gate:routing` failure on the probe corpus when any probe's top-1 is outside the allowed-owner set. Our most policy-relevant number is 12 wrong commits in 100; a rate hides that, a policy gate does not             | Their thresholds (0.88 / 0.80) — underived, and a gate that always passes is not a gate | High — read from source        |
| **B2** | **Digest-bound registration**                                      | Binds the registration to digests of corpus, registry, evaluator, launcher and resolver; "a changed corpus is a new experiment" | Hash the probe corpus, the rendered picker text and the extractor profile into each registration. R0's §5 already adopts this; the catalogue build should inherit it so "this edit helped" is checkable a release later | Their provider/launcher stack — we have one client                                      | High                           |
| **B3** | **Neighbour invariance**                                           | A fixture asserting that editing one entry does not change an unrelated selection (`neighbor-skills.json:2`)                    | Per-edit pre-screen: re-run the gate over the whole corpus after a `whenToUse` change, and fail on any moved top-1 outside the edited owner. Cheaper than E20c and answers the question E20c could not                  | As a substitute for a model run — it cannot speak to behaviour, only to the gate        | High                           |
| **B4** | **Explicit deferral as a first-class state**                       | `agent-selection-required`, `decision: pending` — ambiguity is a designed outcome, not an error                                 | The picker's "I need X to choose" should be a state we model, log and score — which is what our commit-versus-ask channel already measures                                                                              | Nothing material                                                                        | High                           |
| **B5** | **Placebo and ablation arms with a pre-committed escalation rule** | 6 trapped tasks × 4 arms (off / gate / minus-target / placebo) × 3 reps, with the escalation rule fixed before the run          | The next capability round's arm set. The placebo is what separates "the intervention helped" from "the agent was interrupted", and our E20c slot-occupant design had none                                               | Its 6-scenario scale — too small to resolve anything we care about                      | High for design, Low for scale |
