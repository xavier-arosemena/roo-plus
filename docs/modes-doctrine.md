# Modes Doctrine — the full record behind the catalogue

| Field             | Value                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Working record v1, 2026-11-04. **Not** the source of truth for design decisions — that is [`docs/modes-architecture.md`](modes-architecture.md). This file preserves the reasoning, the fine detail and the caveats that a shorter document would lose. |
| **Purpose**       | The raw material and argumentative spine for a future paper / long-form article / published doctrine. Everything here is written so it can be lifted into prose with citations intact.                                                                  |
| **Evidence base** | [`docs/research/modes-research-2026-11.md`](research/modes-research-2026-11.md) — source register, grades, no-data register. Source IDs `[S*]`/`[R*]` below refer to that file's §14.                                                                   |
| **Audience**      | Maintainers, future authors of the paper, and anyone who needs to know _why_ a budget, gate or catalogue rule exists.                                                                                                                                   |
| **Rule of use**   | If this file and [`modes-architecture.md`](modes-architecture.md) disagree, the architecture document wins and this file gets corrected.                                                                                                                |

---

## 0. The one-paragraph thesis

A mode is not a persona and not a prompt: it is a **three-plane contract** — a routing entry paid on
every request, a charter paid while active, and a capability grant that is the only plane a model
cannot talk its way around. Almost every defect in a large mode catalogue is a consequence of
collapsing those three planes into one blob of prose: routing cost that nobody budgets, doctrine that
grows until it displaces the task, and capability grants so uniform they constrain nothing. The
evidence says the biggest available lever is not better writing but **filtering the candidate set** —
and the most durable structure is **thin modes with fat skills**, measured continuously rather than
argued about.

That is the claim the paper defends. Everything below is the material for defending it.

---

## Part I — The problem, stated precisely

### 1.1 What we inherited

| Dimension         | Measurement (2026-10-26)                                                        | Why it matters                                                                        |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Catalogue         | 302 modes, one YAML each                                                        | Largest role catalogue of any product surveyed                                        |
| Preload           | 90 modes (curated by an explicit slug list)                                     | The only set whose cost every user pays                                               |
| Routing cost      | 17,028 chars for 90 installed; 70,987 for 302                                   | Always-on, per request, per user                                                      |
| Doctrine          | 2,168,029 chars total; mean 7,179; max 49,299                                   | Paid only when a mode is active — which is why a large catalogue is affordable at all |
| Over-budget modes | 170 > 4,000 chars; 160 > 6,000                                                  | Two thirds of the doctrine surface is outside any sane maintainable band              |
| Capability        | 283/302 share an identical five-group grant; 289/302 declare a deprecated group | Restriction that applies to 94% of the population constrains nothing                  |
| Distinct grants   | 6 signatures across 302 modes                                                   | The capability plane is decorative                                                    |
| Duplication       | 0 exact-duplicate blocks                                                        | Duplication is paraphrase-level — invisible to naive tooling                          |

### 1.2 The three properties that make this a _structural_ problem

1. **Routing cost is multiplicative** (`× installed modes × requests`), doctrine cost is additive
   (`× 1 per active request`). The same number of characters costs 90× more in one field than the other.
2. **Only capability is enforced.** Prose is advisory; `groups`/`fileRegex`/`allowedMcpServers` are
   real. Therefore any safety property expressed only in prose is a preference.
3. **Behaviour changes are silent.** Editing doctrine changes outcomes with no signal. Without evals,
   a catalogue is a set of unfalsifiable claims.

---

## Part II — The evidence, finding by finding

Each entry states the claim, its grade, what it changes, and — critically — **what it does not
justify**. That last column is the discipline that keeps a research pass from becoming a licence.

### 2.1 The routing/doctrine split is real and someone else wrote it down

|                      |                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | Claude Code budgets the _combined descriptions_ of all subagents at 15,000 tokens, warns at startup when exceeded, and advises moving detail into the system prompt "which only loads when that subagent runs" `[S5]`. |
| **Grade**            | MODERATE (vendor), verified verbatim by this reviewer.                                                                                                                                                                 |
| **Changes**          | Validates the model and the aggregate budget; justifies a _visible runtime warning_, not just a CI gate (§7.6).                                                                                                        |
| **Does not justify** | Any specific character count for our `whenToUse`. 15,000 tokens is ~60k chars — 5× looser than our 12k. It tells us the _shape_ is right, not the size.                                                                |

### 2.2 Every published role-prompt cap is looser than ours

|                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | M365 declarative agents: `instructions` ≤ 8,000 chars **schema-enforced**, `description` ≤ 1,000, `name` ≤ 100, capabilities 1–5, conversation starters ≤ 4 `[S10][S11]`. Copilot custom agents: prompt ≤ 30,000 chars; `tools` omitted ⇒ all tools `[S8]`. Codex: `project_doc_max_bytes` 32 KiB `[S15]`. Windsurf: 12,000 chars/file, with reported silent truncation at a 12,000 total `[S13][S14][S48]`. Cursor: "keep rules under 500 lines" `[S12]`. |
| **Grade**            | MODERATE for the caps (vendor docs; M365 and Copilot re-verified by this reviewer); WEAK–MODERATE for the Windsurf truncation detail.                                                                                                                                                                                                                                                                                                                      |
| **Changes**          | Our 4k/6k is the strictest published-style ceiling in the field — defensible as a deliberate choice, never as an industry norm.                                                                                                                                                                                                                                                                                                                            |
| **Does not justify** | The inference "everyone allows more, so more is fine". Vendor caps describe what is _tolerated_, not what is _good_.                                                                                                                                                                                                                                                                                                                                       |

### 2.3 The ceiling must be defended on engineering grounds, not psychology

|                      |                                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | No study varies role-definition length in characters against compliance. There is no measured 4,000- or 6,000-char inflection point.                                                                                                |
| **Grade**            | NONE for the numbers (no-data register N1); MODERATE for the direction (longer/more-constrained is worse).                                                                                                                          |
| **Changes**          | Six independent engineering arguments: per-turn cost, review throughput, diff semantic density, failure attribution, decay surface, and **length converts into unattended text** (attention peaks at the ends, sags in the middle). |
| **Does not justify** | Any claim that the number is _optimal_. It marks a decision, and it reverses the burden of proof: whoever wants more characters must show the engineering cost is repaid.                                                           |

### 2.4 Filtering the candidate set beats enriching descriptions — the single largest measured effect

|                      |                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | RAG-MCP: retrieving relevant tool descriptions before the model sees them raised selection accuracy **13.62% → 43.13%** (more than tripled) and cut prompt tokens **2,133.84 → 1,084** (>50%). Completion tokens rose 23.60 → 78.14 `[S26]`. |
| **Grade**            | MODERATE (May 2025 preprint, not peer-reviewed; mechanism and numbers verified at source by this reviewer).                                                                                                                                  |
| **Changes**          | Reframes the whole routing plane as retrieval; produces two-stage routing (§7.7) and `search_modes` for orchestrators (§7.8); makes the preload a _filter_, not a sampler.                                                                   |
| **Does not justify** | A claim about modes. The benchmark is synthetic and tool-shaped; the transfer is an argument, not a measurement — hence Phase 2.7/2.9 exist.                                                                                                 |

### 2.5 Richer descriptions buy accuracy and cost turns

|                      |                                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | Across 856 MCP tools: 97.1% of descriptions carry at least one quality "smell", 56% fail to state purpose; augmenting descriptions raised task success ~5.85 pp and partial completion 15.12%, while increasing execution steps **67.46%** `[S25]`. |
| **Grade**            | MODERATE (Feb 2026 preprint).                                                                                                                                                                                                                       |
| **Changes**          | Description quality is a first-class gate; verbosity has a measurable turn cost; "write for discriminability, not completeness".                                                                                                                    |
| **Does not justify** | Longer descriptions. It bounds the trade-off in both directions.                                                                                                                                                                                    |

### 2.6 Constraints, not characters, are the binding limit

|                      |                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | FollowBench (ACL 2024): instructions built in levels L1–L5, each adding exactly one constraint, across five types (content, situation, style, format, example). The reported **Consistent Satisfaction Levels** metric — how many consecutive levels a model fully satisfies — is low: roughly three for frontier chat models, fewer for open models. Composed constraints are worse still (ComplexBench, NeurIPS 2024) `[S22][S23]`. |
| **Grade**            | STRONG (peer-reviewed; benchmark design verified at source).                                                                                                                                                                                                                                                                                                                                                                          |
| **Changes**          | A second budget dimension: **≤ 12 hard constraints per mode, ≤ 3 per section**. The seven-section contract is at the edge, so more sections ≠ better.                                                                                                                                                                                                                                                                                 |
| **Does not justify** | A precise cap of 12 — that is a policy number chosen to force triage. It also does not mean every constraint type is equal: format and style constraints are easier than content constraints.                                                                                                                                                                                                                                         |

### 2.7 Position matters as much as length

|                      |                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | Retrieval accuracy follows a U-shape over position (Lost in the Middle, TACL 2024) `[S20]`; across 18 frontier models, performance degrades continuously as input grows, even on simple tasks (Context Rot, 2025) `[S21]`. |
| **Grade**            | STRONG / MODERATE.                                                                                                                                                                                                         |
| **Changes**          | **Bookend the doctrine**: non-negotiables first, pre-completion checklist last. Combined with 2.3, this yields the falsifiable bookend experiment (Part V, E1).                                                            |
| **Does not justify** | "Short is always better" — a well-ordered long block can outperform a badly ordered short one.                                                                                                                             |

### 2.8 Personas do not reliably improve objective accuracy

|                      |                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | 162 personas × 26 categories × 2,410 factual questions across four model families: adding a persona does not necessarily improve — and can hurt — performance on objective tasks; no persona-selection strategy beat random `[S18]`. The same research line's earlier role-play paper reports **no improvement over the no-persona control** in its revised abstract `[S19]`. |
| **Grade**            | MODERATE (preprints; the revised abstract is decisive against the earlier claim).                                                                                                                                                                                                                                                                                             |
| **Changes**          | "Modes are charters, not characters": spend `roleDefinition` on scope, standard, refusal and handoff, and gate the content, not the length.                                                                                                                                                                                                                                   |
| **Does not justify** | Removing `roleDefinition`. Persona text reliably changes style, tone and format — which is a real function, just not the one that wins objective tasks.                                                                                                                                                                                                                       |

### 2.9 Negation is weak; positive directive plus destination is strong

|                      |                                                                                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | Models perform worse on negated versions of prompts and the gap does not close with scale `[S24]`; Microsoft's own guidance: "limit the instructions to what the agent **should** do, rather than what it should **not** do" `[S11]` (re-verified by this reviewer). |
| **Grade**            | MODERATE–STRONG / MODERATE (vendor).                                                                                                                                                                                                                                 |
| **Changes**          | Refusal sections are written as _destinations_: "Terraform changes belong to `devops`" instead of "do not touch Terraform". A `gate:doctrine` lint flags prohibitions without an alternative.                                                                        |
| **Does not justify** | Banning prohibitions. A single hard prohibition on a destructive action is still correct; it should carry its positive restatement alongside.                                                                                                                        |

### 2.10 Output contracts and checklists earn their place

|                      |                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | A zero-shot pipeline of instruction parsing → checklist → structured response → self-check improved accuracy ~10.06% on Inverse-IFEval, p < 0.05 `[S28]`. |
| **Grade**            | MODERATE (workshop paper, single origin).                                                                                                                 |
| **Changes**          | Supports the "output contract" and "quality gates" sections, and the Phase 1 output-contract assertions.                                                  |
| **Does not justify** | Assuming the checklist position is irrelevant — see 2.7, and experiment E1.                                                                               |

### 2.11 There is no per-mode popularity metric anywhere

|                      |                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | Open VSX and VS Marketplace expose **per-extension** metrics only (`downloadCount`; `install`, `updateCount`, `trending*`), verified by live calls; the Roo+ marketplace is a bundled YAML whose item schema has no count, rank or score field; the Roo Code marketplace never exposed per-mode installs and its repository was archived on 2026-05-15 `[S29][S30][S49][R2][R3]`. |
| **Grade**            | STRONG (verified by execution, and re-verified by this reviewer).                                                                                                                                                                                                                                                                                                                 |
| **Changes**          | Kills the "popularity" feature; replaces it with demand-by-failure, a local usage ledger, and coverage measurement.                                                                                                                                                                                                                                                               |
| **Does not justify** | Any ranking of modes by anything other than editorial judgement plus eval evidence.                                                                                                                                                                                                                                                                                               |

### 2.12 Where counters exist, they are contested

|                      |                                                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | A skills marketplace's install counts were shown to be inflatable via unauthenticated GETs (Orca Security) `[S47]`; one directory removed install counts as unverifiable and labelled its quality ranking editorial `[S48]`. |
| **Grade**            | MODERATE (single-origin security research); WEAK (directory self-report).                                                                                                                                                    |
| **Changes**          | A displayed popularity metric would be an attack surface and a trust liability, not a feature.                                                                                                                               |
| **Does not justify** | Concluding that _all_ marketplace metrics are fraudulent — only that they are not evidence of demand for a specific role.                                                                                                    |

### 2.13 Attention to large catalogues is real; demand for a specific role is not measured

|                      |                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | Third-party collections hold 26k and 42k stars for 154+ and 202 agents `[S31]`; developer surveys report agent adoption by _product_ (31% → 59%; 90% weekly), never by role `[S33][S34][S35]`. |
| **Grade**            | STRONG for the counts; NONE for the inference to per-role demand.                                                                                                                              |
| **Changes**          | "302 modes" is a supply fact. Catalogue size may be cited as breadth, never as proof of need.                                                                                                  |
| **Does not justify** | Either direction of the size debate. Star counts and routing evidence measure different things and must not be averaged (research report C4).                                                  |

### 2.14 The standards space converged on name + description + tags, and declined to build a selector

|                      |                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim**            | A2A v1.0 makes `skills` a required array of descriptive objects (id, name, description, tags, optional examples/modes); no protocol operation selects a skill — the consumer decides `[S46]`. agent​skills.io constrains a skill `description` to ≤ 1,024 chars stating _what + when_, name ≤ 64 matching the directory, body < 500 lines `[S7][S6]`. |
| **Grade**            | MODERATE (spec-derived) / STRONG (spec).                                                                                                                                                                                                                                                                                                              |
| **Changes**          | Tags become a routing input; skill descriptions get a spec-aligned gate; `whenToUse` stays short and tag-like rather than procedural.                                                                                                                                                                                                                 |
| **Does not justify** | Raising our description limits to 1,024 — that cap prices a _different_ surface (one skill vs every installed mode).                                                                                                                                                                                                                                  |

---

## Part III — Tensions we have not resolved (do not let the paper hide these)

| #   | Tension                                                                                                                                                                                                                                                                            | Current position                                                                 | What would settle it                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| T1  | **Charter vs character.** Evidence says persona prose is the least reliable component, yet `roleDefinition` is required and budgeted.                                                                                                                                              | Field stays; _content_ gated (scope/standard/refusal/handoff).                   | A cohort where the same mode ships with and without character prose, compared on evals.   |
| T2  | **`not-for` in the most expensive field.** It competes with the trigger for 200 chars; no source requires it.                                                                                                                                                                      | Conditional: required only where nearest-neighbour similarity is high.           | `gate:routing` calibration against real misselections.                                    |
| T3  | **Thin vs context-rich.** Stripping procedure into skills may remove context the mode needed.                                                                                                                                                                                      | Thin, with the skill name stated in the charter.                                 | Experiment E4.                                                                            |
| T4  | **Filter vs recall.** Retrieval can exclude the right mode; a static list is wasteful but complete.                                                                                                                                                                                | Proposal only; ADR required.                                                     | Experiment E3.                                                                            |
| T5  | **Staleness window.** Doctrine naming 2024–2025 tools will rot; how old is too old?                                                                                                                                                                                                | 9 months to start, as a guess.                                                   | First review cycle produces the number.                                                   |
| T6  | **Per-model variation.** Constraint tolerance differs between frontier and open models; one ceiling may be wrong.                                                                                                                                                                  | Single ceiling, flagged.                                                         | Experiment E5.                                                                            |
| T7  | **Indirection has a semantic cost.** Microsoft warns that offloading instructions into _documents_ risks runtime sanitisation and injection classifiers stripping directives — retrieved content is treated as data, not configuration `[S48]` (WEAK–MODERATE, secondary summary). | Rule files and skills are **developer-owned config**, never retrieved documents. | A test of whether `.roo/rules-*` text survives provider-side safety processing unchanged. |

T7 is the subtlest point in this whole record: the advice "move long content out of the prompt" is only
safe when the destination is a trusted configuration surface. Move it into a knowledge base and you
have converted instructions into untrusted data.

---

## Part IV — How the evidence gives form to the final catalogue

The catalogue is not being "cleaned up"; it is being **re-derived**. Each design property below exists
because a finding demanded it.

| Catalogue property         | Comes from              | Concrete shape                                                                                                                                                        |
| -------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thin modes**             | 2.6, 2.7, 2.14, T3      | Mode = routing line + charter + capability + handoff. Procedure lives in skills.                                                                                      |
| **Fat skills**             | 2.6, 2.10, 2.14         | 8–12 spine skills (evidence, verification loop, diff hygiene, test selection, release, incident, security, API contract, migration, reporting) scoped by `modeSlugs`. |
| **Bounded preload**        | 2.1, 2.4, 2.13          | **45 modes**, incl. the 16 non-coding (2026-11-19); Σ`whenToUse` ≤ 12k chars; frozen for a release cycle.                                                             |
| **Dedupe before taxonomy** | 2.4, 2.5                | One primary owner per job; retrieval turns near-duplicates into coin flips.                                                                                           |
| **Explicit capability**    | 2.2, 2.11               | `allowedMcpServers` explicit or literal `all`; least privilege per mode; capability map as the target state.                                                          |
| **Bookended doctrine**     | 2.7                     | Non-negotiables first; pre-completion checklist last.                                                                                                                 |
| **Positive refusal**       | 2.9                     | Every exclusion names its destination.                                                                                                                                |
| **Constraint budget**      | 2.6                     | ≤ 12 hard constraints, ≤ 3 per section.                                                                                                                               |
| **Dated doctrine**         | 2.3 (decay surface), T5 | `reviewed: YYYY-MM`, `gate:staleness`, time-bound claims date-stamped in text.                                                                                        |
| **Demand by failure**      | 2.11, 2.13              | No mode enters the catalogue without a failing eval behind it.                                                                                                        |
| **Measured routing**       | 2.4, 2.5                | Routing evals per sampled mode; delegation score as a ratchet.                                                                                                        |
| **No popularity**          | 2.11, 2.12              | Editorial curation + eval coverage only; no counters displayed.                                                                                                       |

### 4.1 The shape of the target catalogue (to be specified in the target-state proposal)

```
Built-in (5)                 always present, reserved slugs
   │
Preload (45)                 budgeted, owned, dated, eval-backed
   │
Marketplace (N, dynamic)     install-on-demand, no prompt cost until installed
   │
Skills (spine ~10 + tail)    procedure, loaded on demand, mode-scoped
   │
Rules (few, small)           always-on conventions
```

The number that matters is not 302; it is **how many distinct jobs have exactly one owner**, and how
much of that set the preload can afford to carry.

---

## Part V — The measurement programme (each item falsifiable)

Every experiment below names its hypothesis, method, metric and **what result would kill it**. None has
been run yet; the paper's second half is their results.

| ID     | Hypothesis                                                                                                                  | Method                                                                                 | Metric                                        | Falsified if                                   | Phase                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| **E1** | **Bookending improves compliance.** Moving the pre-completion checklist from mid-doctrine to the end raises eval pass rate. | Same mode, two variants (order-only change), same eval set, N runs each.               | pass rate, constraint-satisfaction rate       | no difference beyond noise                     | 1 — **to be added later as the first internal measurement of a doctrine-design claim** |
| E2     | Constraint _count_ predicts failure better than character count.                                                            | Cohort of modes binned by constraint count at matched length; compare eval pass rates. | pass rate vs constraint count                 | length predicts better than count              | 1                                                                                      |
| E3     | Retrieval-filtered routing beats the full index at equal task success.                                                      | Two-stage index vs full `MODES` section on the same routing eval set.                  | selection accuracy, prompt tokens, turns      | accuracy drops without a token win             | 2                                                                                      |
| E4     | Thin modes do not degrade behaviour.                                                                                        | Migration cohort (doctrine extracted to skills) vs pre-migration baseline.             | eval pass rate, doctrine chars                | pass rate falls beyond tolerance               | 3                                                                                      |
| E5     | Budgets differ by model class.                                                                                              | Same modes, frontier and open-model cohorts.                                           | pass rate per class at fixed constraint count | no class difference                            | 1–2                                                                                    |
| E6     | The delegation score predicts real routing.                                                                                 | Compare KPI rank-order with the local ledger's misfire ratio.                          | rank correlation                              | no correlation                                 | 2                                                                                      |
| E7     | `search_modes` beats a static shortlist for orchestrators.                                                                  | A/B on orchestration tasks with >40 installed modes.                                   | correct mode chosen, turns                    | no gain, or gain below the extra turn's cost   | 2                                                                                      |
| E8     | Staleness is detectable cheaply.                                                                                            | Age of dated claims vs human judgement of "still true".                                | precision/recall of `gate:staleness`          | the gate cannot separate live from dead claims | 3                                                                                      |
| E9     | Review effort scales with doctrine size.                                                                                    | Measure actual review time per mode from git history.                                  | minutes per 1k chars                          | no relationship                                | 3                                                                                      |

**E1 carries a flag for a reason.** It is the only experiment in this list that tests a _design rule we
invented from two separate findings_ (position sensitivity × length) rather than testing a borrowed
claim. It is the first time this project would measure its own doctrine design instead of importing
someone else's.

---

## Part VI — How do we count 30% versus 22%?

The coverage map (§10.7 of the architecture document) only becomes honest once the unit of counting is
defined. Mode count is the obvious unit and the worst one: it inflates with duplication, treats a
1,200-char contract and a 49,000-char one as equal, and measures supply — which we control.

**Four distinct quantities, never mixed in one number:**

| Symbol | Name                | Definition                                                                    | What it answers                           |
| ------ | ------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| **S**  | _Supply breadth_    | Distinct **jobs** with a primary owner in that axis (after dedupe), not modes | How many different things can we do here? |
| **A**  | _Allocation_        | Share of cost surfaces: Σ`whenToUse` chars (routing) and preload slots        | Where does the always-on budget go?       |
| **C**  | _Coverage evidence_ | Eval results: passing tasks / named failure modes handled, per axis           | What can we **demonstrably** do here?     |
| **N**  | _Need_              | External baseline: share of developer task-types in that axis                 | What is actually wanted?                  |

The chart then has an honest form:

```
axis        need N      coverage C           allocation A
security    ▓▓▓▓▓▓░░░░  ███░░░░░░░  ██ 22%   routing 14% · preload 3 slots
debugging   ▓▓▓▓░░░░░░  ████████░░  ██ 48%   routing 19% · preload 5 slots
```

**Rules that keep it from becoming vanity metrics:**

1. **Count jobs, not modes.** A job is "a task type that has exactly one primary owner mode". After
   dedupe the two converge — that is the point of the exercise.
2. **Call the supply number supply.** "38% of the catalogue" is a fact about the repository, not about
   developers.
3. **Coverage requires evidence.** `C` is only populated by evals; until Phase 1 lands it is blank, not
   estimated.
4. **`N` comes from outside.** Research on coding dimensions (task-type taxonomies, survey task
   breakdowns, issue triage) supplies the denominator — never our own category list.
5. **Allocation is the actionable number.** It is measured, cost-real, and directly controllable: if an
   axis holds 5% of routing cost and 40% of preload slots, that is a curation bug we can fix today.
6. **Coarse bins before percentages.** With small n per axis, publish bands — `none / thin / solid /
deep` — rather than three significant figures. 38% of eleven modes is not a percentage, it is noise.
7. **Never weight by usage.** We have no telemetry; weighting by usage would be fabrication.

**The sentence the paper can defend:** _"We do not claim to cover developers' needs. We publish what we
ship, how it is allocated, and what we can demonstrate — and we choose what to ship from an external
needs baseline."_ That is a stronger claim than a radar chart, because it is checkable.

---

## Part VII — Details worth not losing

The "hues": small observations that are easy to drop and hard to rediscover.

1. **Claude Code ships a read-only reviewer subagent** whose example _excludes_ Edit and Write — capability expressed as exclusion, shipped as documentation `[S5]`.
2. **"Use proactively"** in a description is a documented routing trick for encouraging delegation `[S5]`. Cheap, and directly applicable to `whenToUse`.
3. **Claude Code warns but still loads everything.** A budget warning is a teaching mechanism, not a cap — which is why our runtime warning (§7.6) is the right shape.
4. **M365 caps capabilities at 1–5 and conversation starters at 4** `[S10]`. Caps on _count_ are normal product design, not an insult to authors.
5. **Copilot's `tools` omission grants everything** `[S8]` — a shipped example of the exact default-maximum bug our `allowedMcpServers` has.
6. **Microsoft advises against offloading instructions into documents** because injection classifiers may strip directive language `[S48]` (weak source, strong implication): indirection is only safe into _configuration_, never into a knowledge base.
7. **Windsurf truncates silently** `[S13][S14]`; we gate at build time. The failure mode we are avoiding has a name and a vendor.
8. **agentskills.io requires "what + when"** in a description `[S7]`, which is a better rule than "be concise" because it is checkable.
9. **FollowBench's CSL metric** — "how many consecutive levels a model can satisfy" — is a more useful mental model than "instruction following is bad".
10. **Constraint types are not equal**: format and style constraints are easier than content constraints `[S22]`. A mode with twelve format rules is not the same risk as one with twelve content rules.
11. **RAG-MCP's completion tokens went up while prompt tokens halved** `[S26]`. "Cheaper" is not one number; quality per turn and cost per turn can move in opposite directions.
12. **97.1% of MCP tool descriptions have a smell; 56% never state purpose** `[S25]`. Our descriptions are auto-derived from `roleDefinition` when missing — the same disease, automated.
13. **The persona paper's authors revised their own abstract** `[S18][S19]`. A lesson for the paper: cite revisions, not first impressions.
14. **"NegativePrompt" (IJCAI 2024) is about emotional stimuli, not prohibitions** `[S48]` — a frequently misread citation; do not use it to defend "do not…" clauses.
15. **Two planes vs three.** The field converged on always-on instructions + on-demand skills; the selector-driven mode is our outlier. Claude Code's description budget shows the mature version of _any_ selector still needs an aggregate cap.
16. **A2A deliberately did not build a selector** `[S46]` — the consumer chooses. Our routing plane is the same problem with more candidates.
17. **VS Marketplace `updateCount` 24.6M vs `install` 2.1M** `[S29]` — why "downloads" is a poor adoption metric, let alone a demand metric.
18. **Open VSX counters drift by the hour** (Roo+ 18,691 → 18,739 within the same day). Every counter in the paper needs a timestamp.
19. **A skills directory removed install counts in May 2026 as unverifiable** `[S48]`; Orca demonstrated inflation via unauthenticated requests `[S47]`. Marketplaces are attack surfaces before they are metrics.
20. **Our own two live defects**: the catalogue generator hardcodes "301 items" against 302 modes; `mode.ts` accepts uppercase slugs while the published schema does not.
21. **`skill` is already a model-invocable loader** in this codebase ([`tools.ts`](../src/shared/tools.ts:318)); `switch_mode`/`new_task` already form a `modes` tool group. "Modes as tools" is a naming correction, not a new concept.
22. **Doctrine is paid per request of the task, not per catalogue.** This single asymmetry is why a 302-mode catalogue is affordable at all — and why the preload, not the catalogue, is the cost lever.
23. **283/302 modes share one grant signature; six signatures exist in total.** A capability system with six states is a label, not a policy.
24. **Arithmetic versus behaviour.** An early draft treated "the section grows linearly with installed modes" as if it proved selection quality degrades. It does not. Cost is arithmetic; quality is empirical — a distinction the paper should keep visible.

---

## Part VIII — Paper skeleton

| Section         | Content                                                                                                                                            | Source in this record         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Abstract        | The three-plane contract; filtering beats enrichment; thin modes with fat skills; measured not argued                                              | §0                            |
| 1. Introduction | The 302-mode problem: cost, unenforceable prose, silent behaviour change                                                                           | Part I                        |
| 2. Related work | Tool retrieval, instruction-following limits, long-context position effects, agent/role specifications (A2A, agentskills.io), vendor cap landscape | Part II (2.1–2.14)            |
| 3. Model        | Routing / doctrine / capability; cost equations; the enforcement asymmetry                                                                         | Part I §1.2                   |
| 4. Method       | In-repo measurement + graded external evidence + reviewer re-verification; explicit no-data register                                               | Research report §2, §9, §15.4 |
| 5. Findings     | The fourteen findings, each with grade and counter-claim                                                                                           | Part II                       |
| 6. Design       | Catalogue properties derived from findings; budgets as policy-not-derivation                                                                       | Part IV                       |
| 7. Measurement  | The nine experiments, with falsifiers; E1 as the internal doctrine experiment                                                                      | Part V                        |
| 8. Results      | Populated by Phase 1–3; the preload/target catalogue as the worked example                                                                         | pending                       |
| 9. Discussion   | The unresolved tensions T1–T7; what a vendor metric can and cannot tell you                                                                        | Part III                      |
| 10. Limitations | Analogues not measurements; no usage data; small-n axes; preprints                                                                                 | Part III, Part VI rule 6      |
| 11. Future work | Per-model budgets, retrieval for stance-changing agents, staleness economics                                                                       | Part V                        |
| Appendix A      | Source register and grades                                                                                                                         | research report §14           |
| Appendix B      | Reproduction commands                                                                                                                              | architecture doc §14          |

**Publication honesty clause:** the paper states which numbers are measured in this repository, which
are policy, and which are borrowed analogues. Three categories, labelled, throughout.

---

## Part IX — What would falsify the thesis as a whole

A doctrine that cannot lose is not a doctrine.

1. **If retrieval does not transfer to modes** (E3/E7 fail), the filtering thesis collapses for this
   domain and the preload becomes the only lever — a much smaller claim.
2. **If thin modes degrade behaviour** (E4 fails), procedure must stay in the contract, and the
   2.17M-character catalogue is not bloat but necessity — a very different conclusion.
3. **If constraint count does not predict failure** (E2 fails), the second budget dimension is noise and
   we are back to characters.
4. **If bookending does nothing** (E1 fails), position is a curiosity rather than a design rule, and the
   contract order is arbitrary.
5. **If an external needs baseline proves impossible to obtain**, the coverage map stays a supply chart
   and the catalogue is curated by judgement — defensible, but no longer "evidence-driven".

Each of these is survivable. None is refutable by argument — only by measurement, which is exactly why
Phase 1 exists and why no budget number is allowed to call itself measured before it.

---

## Part X — Maintenance of this record

- New findings enter **Part II** with a grade; if they change a design decision, the architecture
  document changes in the same commit.
- Unresolved disagreements go to **Part III** — never resolved silently in prose.
- Every experiment moves from **Part V** to results only with a recorded method and dataset.
- When the paper is drafted, it is drafted _from_ this file; this file does not become the paper.
- The **specification of the end state** lives in [`docs/modes-target-state.md`](modes-target-state.md).
  Findings here justify design properties there; if a property has no finding behind it, it is a
  preference and should be labelled as one.
