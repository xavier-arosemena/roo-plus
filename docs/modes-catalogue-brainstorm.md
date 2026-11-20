# Catalogue shapes — a brainstorm before the tests

| Field      | Value                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status** | Brainstorm **v2**, 2026-11-09. No decision. Every bracketed comment from the review is resolved in §3 or carried explicitly into §10.                                                                                                                                                            |
| **Why**    | We have a unit analysis ([`modes-units.md`](modes-units.md)), an accepted-but-partially-revised ADR-6, and 302 modes. Before choosing a catalogue shape we should look at several shapes — including the ones the literature already uses — and see what each would do to the current catalogue. |
| **Inputs** | [Needs baseline](research/modes-needs-baseline-2026-11.md) · [Units analysis](modes-units.md) · [Target state](modes-target-state.md) · the catalogue itself                                                                                                                                     |
| **Output** | Six frames, five candidate shapes, a ~42-owner draft catalogue, a first-pass mapping of the 302, the stranded list with dispositions, four decision drivers (including **assimilation**), the migration scorecard, and the tests to run                                                          |

---

## 1. Candidate frames (including what the literature already uses)

| #      | Frame                          | Source family                                 | Classifies by                                                                                           | Implied catalogue                                                             |
| ------ | ------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **F1** | **Lifecycle phases**           | ISO/IEC 12207, SDLC, SWEBOK KAs               | _when_ the work happens                                                                                 | One mode per phase (6–12)                                                     |
| **F2** | **Knowledge areas**            | SWEBOK v4                                     | the body of knowledge                                                                                   | completeness check, not a shape                                               |
| **F3** | **Inner / outer loop**         | developer-workflow literature, CI/CD          | edit-build-test vs commit-deploy-observe                                                                | two-ring catalogue                                                            |
| **F4** | **Flow / feedback / learning** | DevOps "three ways", DORA                     | what the work _adds_                                                                                    | health check: every mode must add flow, create feedback, or change the system |
| **F5** | **Artefact**                   | practice (spec, code, test, infra, doc, data) | what you _produce_                                                                                      | one mode per artefact class — **the rival shape to test**                     |
| **F6** | **Loop × domain**              | cognitive/SE task literature                  | stance over domain                                                                                      | the axis × stance shape ([`modes-units.md`](modes-units.md))                  |
| **F7** | **User mental model**          | UX/DX literature                              | how a user _actually_ describes their situation ("it's broken", "make it faster", "what does this do?") | — not a catalogue shape, but a **scoring lens** (§5.2)                        |

The literature's real contribution is a **decomposition**, not a taxonomy: a **domain axis** (F1/F2) and a
**loop axis** (F3/F6). Our shape is exactly (loop × domain) — which is why it felt natural. F4/F5 are
checks; F5 is the shape worth testing head-to-head; **F7 is the new one and it matters**: a shape that is
theoretically sound but does not match how users describe their problems will not be used.

## 2. The draft catalogue (~42 owners)

> **Count corrected 2026-11-19 — 45 owners, not 42.** The per-axis list has always summed to
> **24 coding + 5 meta + 16 non-coding = 45**; the "42" elsewhere in this document is left in place as
> the record of what was argued at the time. The authoritative figures are the frame's own
> ([`axis-stance §5`](modes-catalogue-axis-stance-frame.md:84)), and the preload built from them is 45.

### 2.1 Coding owners (24) — twelve axes, two stances each

| Axis                   | Mode A (stance)                    | Mode B (stance)                                  | Split justification (D1/D2)                    |
| ---------------------- | ---------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| **REQ** Requirements   | `requirements` (frame)             | `acceptance-criteria` (verify)                   | problem statement vs testable conditions       |
| **ARC** Architecture   | `architect` (design)               | `architecture-reviewer` (review)                 | writes vs must-not-write                       |
| **IMP** Implementation | `code` (construct)                 | `integration-engineer` (construct at boundaries) | different failure vocabulary                   |
| **UND** Comprehension  | `explain` (narrate)                | `codebase-cartographer` (map/trace)              | narrative vs structural map                    |
| **DBG** Debugging      | `debug` (diagnose)                 | `performance` (measure)                          | evidence from logs vs numbers from benchmarks  |
| **TST** Testing        | `test-author` (write)              | `test-strategist` (design the portfolio)         | production vs judgement                        |
| **REF** Refactoring    | `refactoring` (evolve)             | `modernisation` (staged migration)               | local change vs multi-stage plan with rollback |
| **REV** Review         | `code-reviewer` (change scope)     | `release-readiness` (system scope)               | findings vs go/no-go                           |
| **SEC** Security       | `security-reviewer` (threat model) | `vulnerability-response` (respond)               | forbids writes vs fixes live findings          |
| **OPS** Operations     | `devops` (deliver)                 | `incident-commander` (operate)                   | automation vs mitigation under pressure        |
| **DAT** Data           | `data-analyst` (analyse)           | `database-migration` (change safely)             | read-only answers vs schema change             |
| **DOC** Documentation  | `documentation` (reader-facing)    | `decision-record` (durable history)              | guide vs record                                |

### 2.2 Meta owners (5) — stances about the _work_, not the code

| Mode           | Stance              | Absorbs                                                                                                        | Note                                                                                                                                  |
| -------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `orchestrator` | Delegate            | `mode-orchestrator`, `task-distributor`, `agent-organizer`, `workflow-orchestrator`, `github-sync-coordinator` | **Yes — the coordinator is the same stance.** Distributing tasks is a _skill_, not a mode                                             |
| `planner`      | Frame the work      | `goal-planner`, `project-manager`, `product-owner`? (no — see A16)                                             | Goal → ordered plan with checkpoints                                                                                                  |
| `researcher`   | Gather evidence     | `deep-research-protocol`, `research-scientist`, `librarian-agent`, `ultron-librarian`                          | Citations, not vibes                                                                                                                  | [I like the name "Deep-research", is already positioned.] |
| `critic`       | Challenge           | `bullshit-detection-analyst`, `anti-fiction-sentinel`, `red-team`                                              | **Split into two only if D1/D2 hold** — see §3, row C3                                                                                |
| `reasoner`     | Deliberate analysis | `core-reasoning-architect`, `cognitive-multi-thinker`, `problem-solving-maestro`                               | Distinct from `planner` (sequence) and `critic` (challenge): it produces _analysis_ — hypotheses, verification, a reasoned conclusion |

### 2.3 Non-coding owners (~13, across seven axes + verticals)

| Axis                                        | Owners                                    | Status                                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A13 Legal & compliance**                  | `legal-review`, `compliance-mapping`      | Marketplace; **advisory disclaimer required**                                                                                                              |
| **A14 Marketing, content & PR**             | `marketing-strategist`, `content-writer`  | Marketplace (your PR note folded in here — PR is a communication stance, not its own axis)                                                                 |
| **A15 Finance, pricing & quant**            | `financial-analyst`, `pricing-analyst`    | Marketplace; FinOps stays under OPS and cross-links                                                                                                        |
| **A16 Product, venture & entrepreneurship** | `product-manager`, `venture-analyst`      | Marketplace                                                                                                                                                |
| **A17 Research & knowledge synthesis**      | `synthesis-writer`                        | Marketplace (`researcher` is the meta owner that gathers; this one writes the synthesis)                                                                   |
| **A18 Career & professional development**   | `career-coach`, `contract-negotiation`    | **New, from your comment**: the developer's needs _beyond_ code — getting a job, negotiating a contract, salary, CV. Legitimate and underserved            |
| **A19 Science & engineering domains**       | `science-advisor`, `engineering-physics`  | **New**: physics, chemistry, biology. Marketplace-only, advisory                                                                                           |
| **A20 Formal & quantitative reasoning**     | `logic-math`                              | **New**: logic, mathematics, proofs. Marketplace-only                                                                                                      |
| **A22 AI features & model integration**     | `ai-feature-engineer`, `ai-cost-engineer` | **New, and a genuine gap in the needs baseline** — see §11                                                                                                 |
| **A21 Medicine & health**                   | — (deferred)                              | Deliberately **not** an owner: liability exceeds what a prompt product should claim. Marketplace-only if ever, with an explicit "not medical advice" label |

**Verticals are specialisations, not axes**: blockchain/crypto, fintech, healthcare-IT, game dev, embedded.
They specialise an owner (blockchain → `code` + `security-reviewer` + `database-migration`), and they live
in the marketplace.

**Total = 24 coding + 5 meta + 16 non-coding = 45 owners** (A22 added — see §11). _(Corrected from 44: the per-axis non-coding list has always summed to 16. The drafted frame is [`modes-catalogue-axis-stance-frame.md`](modes-catalogue-axis-stance-frame.md).)_

## 3. Comment resolutions

| #       | Comment                                                                           | Resolution                                                                                                                                                                                                                                                                                                                             |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1**  | _"Orchestrator absorbs the coordinator too?"_                                     | **Yes.** Delegate is one stance; task distribution, agent assignment and workflows are its skills. `mode-orchestrator`, `task-distributor`, `agent-organizer`, `workflow-orchestrator` all fold in                                                                                                                                     |
| **C2**  | _"I may be missing core-reasoning-architect"_                                     | **Correct — added as `reasoner`.** Its stance (produce a defensible analysis) is distinct from `planner` (sequence work) and `critic` (attack a claim). Meta is now 5                                                                                                                                                                  |
| **C3**  | _"Critics: maybe split into 2–3 variations if we can back it up"_                 | **Two at most, and only on D1/D2.** `critic` (claims and plans, read-only) is justified. A second (`red-team`) is justified **only** if its grant differs — attacking a system's security posture is already `security-reviewer`. Proposal: **one `critic`**, with `red-team` as a skill; revisit if evals show the generalist failing |
| **C4**  | _"Style personas can be eliminated"_                                              | **Agreed, with a migration path.** Tone is not a stance. Delete the `style-*` modes; offer a **`voice` option** on writing skills so the underlying need is still served                                                                                                                                                               |
| **C5**  | _"Swarm family can be deleted"_                                                   | **Agreed.** Distributed-consensus vocabulary applied to a single-agent extension. Retire the eight swarm/flow-nexus slugs with aliases to `orchestrator`                                                                                                                                                                               |
| **C6**  | _"`claude-code-native-agent-system` → stack specialisation?"_                     | **Yes.** It is an _agent-platform_ variant, not a stance. Move to specialisations                                                                                                                                                                                                                                                      |
| **C7**  | _"`ultron-librarian`, `silent-coder` = delete-candidates"_                        | **Agreed.** Behaviour folds into `researcher` and `code`; names retire with aliases                                                                                                                                                                                                                                                    |
| **C8**  | _"Curiosities probably retire"_                                                   | **Agreed** — `formula-cascade-oracle`, `flow-nexus-challenges/sandbox/app-store` retire. `problem-solving-maestro` folds into `reasoner`                                                                                                                                                                                               |
| **C9**  | _"Developer needs beyond coding (job, contract, salary) — needs conceptualising"_ | **New axis A18**, two owners, marketplace-only. It is a real adjacent need and it costs no preload slot                                                                                                                                                                                                                                |
| **C10** | _"Missing crypto/blockchain specialists"_                                         | **Present, but as verticals** — `blockchain-developer` and friends become specialisations under `code`, `security-reviewer` and `database-migration`. A vertical is not an axis                                                                                                                                                        |
| **C11** | _"Stack specialisations: maybe dedup a bit"_                                      | **Agreed, with a rule:** one specialisation per (stack family × owner), no version variants, and synonyms merged (`react`/`react-specialist`). 45 → target ~25                                                                                                                                                                         |
| **C12** | _"T-F with 2–3 sub-tasks instead of 3 persons"_                                   | **Adopted** — see §5.2. The bake-off runs as sub-tasks (each a realistic job handed to an agent), not a panel of humans                                                                                                                                                                                                                |

## 4. First-pass mapping of today's 302 (heuristic, slug-based)

| Bucket                | Count                                                         | Disposition                                                          |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Coding-functional     | **154**                                                       | Merge into the 24 owners or become specialisations/skills            |
| Non-coding            | **59** (≈50 after removing `*auditor`/`contract` mis-buckets) | Feed A13–A19; no preload slot                                        |
| Agent-process / meta  | **44**                                                        | Collapse into 5 meta owners; the rest is process novelty (§3, C5–C8) |
| Stack specialisations | **45**                                                        | Declared variants; dedup to ~25 (§3, C11)                            |

**Three denominators, one per definition** — cite **121/302 (40.1%)** in decisions, because it is the only figure computed by an explicit rule:

| Definition                                          | Count                                       |
| --------------------------------------------------- | ------------------------------------------- |
| Jobless by the needs baseline boundary rule         | **121 / 302 (40.1%)**                       |
| Not coding-functional by the slug-bucket classifier | 103 / 302 (34.1%) = 59 non-coding + 44 meta |
| Genuinely non-coding after removing mis-buckets     | ~50 / 302 (16.6%)                           |

Known mis-buckets to fix by hand: `api-contract-first-developer`, `*auditor` slugs, `ai-prompt-security-specialist`.

## 5. Decision drivers and the two shapes to test

### 5.1 The four drivers

| #      | Driver                   | Question                                                            | How it is measured                                                                         |
| ------ | ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **D1** | Grant                    | Does the mode touch different things?                               | Capability map comparison                                                                  |
| **D2** | Stance                   | Does "done" mean something structurally different?                  | Charter comparison; eval separation (T-D)                                                  |
| **D3** | Routability              | Can a chooser separate it from its neighbour in ≤200 chars?         | T-C coin-flip test                                                                         |
| **D4** | **Assimilation** _(new)_ | Can the user **find, understand and remember** it without a manual? | See the rubric below — **weighted heavily**, because an unusable shape loses to a used one |

**D4 rubric (0–2 per criterion, six criteria):**

1. **Describable** — a user can name the situation in the words the mode uses ("my tests fail", "make it faster").
2. **Findable** — reachable in ≤ 2 clicks or one search term from the mode selector.
3. **Explainable** — a one-sentence difference from its nearest neighbour, in the user's vocabulary.
4. **Memorable** — a user who used it once can recognise it again without reading descriptions.
5. **Recoverable** — choosing wrong costs one switch, not a wasted task.
6. **Teach-in rate** — how many examples a newcomer needs before picking correctly (target ≤ 2).

D4 is scored for the _shape_, not for each mode: 24 owners that users cannot navigate score worse than 20
that they can.

### 5.2 The two shapes to test — axis×stance (T-F1) vs artefact (T-F2)

|                    | **Axis × stance**                              | **Artefact-oriented**                                                                             |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mental question    | "What kind of work am I doing, in which area?" | "What am I producing?"                                                                            |
| Example names      | `debug`, `explain`, `architect`, `test-author` | `bug-report-fixer`? no — `code-change`, `test-suite`, `design-doc`, `schema-migration`, `release` |
| Predicted strength | Matches how the field is taught (F1 × F6)      | Matches how users describe _deliverables_; strongest on D4 criterion 1                            |
| Predicted weakness | Users must map their problem to a stance       | Diagnose/measure fit badly ("what artefact does debugging produce?")                              |

**T-F protocol (2–3 sub-tasks, not a human panel):**

1. Write **three realistic task briefs** from three different users: (a) a failing CI with no local repro,
   (b) "make this endpoint 3× faster", (c) "explain why this module is like this".
2. Materialise **both catalogues** as `.roomodes` files — same modes, different names/grouping — and load
   each into a clean workspace.
3. For each brief, run the agent **three times per catalogue** with the same model and the same prompt
   prefix ("pick the best mode and say why in one line").
4. Record: chosen mode, one-line rationale, whether it matches the intended owner, and the number of
   description reads before choosing (proxy for D4 criteria 3–4).
5. Score both catalogues on **routability** (T-C) and on **D4**; the winner is the shape that wins on
   _both_, or the one that wins D4 when routability ties.

`ar·ti·fact` — the rival shape is worth a real test because "what are you producing?" is an easier user
question than "which stance are you in?", and D4 is where the axis shape is weakest.

## 6. Migration scorecard (measure the savings)

When the structure is decided, the migration must be **measured, not asserted**. Add to the release notes
and the coverage map:

| Metric                             | Today                 | After                    | Delta                            |
| ---------------------------------- | --------------------- | ------------------------ | -------------------------------- |
| Modes in the catalogue             | 302                   | owners + specialisations | −N                               |
| Preloaded modes                    | 90                    | P                        | −N                               |
| Σ`whenToUse`, preload              | **13,306**            | ?                        | ?                                |
| Rendered `MODES` section           | **18,648**            | ?                        | ?                                |
| Median / max doctrine chars        | 7,179 / 49,299        | ?                        | ?                                |
| Skills in the spine                | 0                     | ≥ 8                      | +8                               |
| Distinct `groups` signatures       | 6                     | ≥ 15                     | +9                               |
| Jobs with exactly one owner        | unknown (≈62 of 119?) | ≥ 100                    | +?                               |
| Aliases published                  | 0                     | one per retired slug     | —                                |
| **Modes a new user sees on day 1** | 90                    | P                        | **the number that matters most** |

The last row is the product-level saving: the preload is what a user meets, and 90 → ~30 is the change
they feel. It belongs in [`docs/architecture.md`](architecture.md) numbers only if computed.

## 7. User-facing migration (do not leave this to the changelog)

**Release note, plain language:**

> **The modes catalogue has changed.** 302 modes became **~42 owners** plus stack specialisations, so the
> list you see is shorter and each entry is broader. Nothing you installed disappears: every retired mode
> has an alias and still resolves.
>
> **Not sure which mode to use? Start with `planner`.** Describe the job in your own words; it will work
> out the steps and tell you which mode to switch to for each one. `orchestrator` does the same when the
> work spans several modes.

**Three affordances that carry the catalogue for users:**

| Affordance               | What it does                                                          | Where                             |
| ------------------------ | --------------------------------------------------------------------- | --------------------------------- |
| **"Which mode?" helper** | Plain-language question → 2–3 suggested modes with one-line reasons   | Mode selector + first-run surface |
| **Start-here default**   | The preload's default is `planner`-adjacent: plan first, switch later | Onboarding (DEBT #29 sixth step)  |
| **Alias map**            | Every retired slug resolves; the UI says "renamed from X"             | Settings → Modes                  |

This is the assimilation debt made concrete: the catalogue can shrink only if the _navigation_ gets
better at the same time.

## 8. Preload: a decision for later, with its sizing rule

> `preload slots = owners we insist every user gets` + `specialisations justified per axis`.

**Skills are part of the budget, not free.** A skill costs roughly its description plus 150 chars of markup and path; a mode may carry **at most 6**, and the per-mode skills index is capped at **1,200 chars**. Thin modes are only affordable because skills _merge_ — 119 separate skills would recreate the problem one layer down (red-team O-01).

Owners ≈ 42 (24 coding). Everything above needs a documented user segment. The question becomes
**"42 owners + how many specialisations?"** — a better question than "60, 90, or 302".

## 9. Tests

| Test                                                  | Question                                                                       | Status                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **T-G** stranded triage                               | For each stranded slug: job, style, or neither?                                | Do first — cheap, and defines what the shape must hold |
| **T-C** coin-flip                                     | Can two neighbours be told apart from `whenToUse` alone?                       | On the 42-owner draft                                  |
| **T-B** routing capacity                              | Σ`whenToUse` for owners + specialisations                                      | On the draft                                           |
| **T-F1 / T-F2** shape bake-off                        | Axis×stance vs artefact, per §5.2                                              | After T-G                                              |
| **T-H** assimilation                                  | D4 rubric scored for both shapes, plus the three affordances in §7             | Alongside T-F                                          |
| **T-A / T-D / T-E**                                   | Discriminator audit, eval separation, skill sufficiency                        | Once the harness exists                                |
| **T-I** skills accounting (adopted from the red team) | For each owner, Σ(description + ~150 chars markup) against the per-mode budget | Draft arithmetic, before T-G                           |
| **T-J** alias behaviour diff                          | For every retired slug, what capability does the alias _not_ preserve?         | With T-G                                               |
| **T-K** plan reconciliation                           | Do the owner sets in every document agree, job by job?                         | First — a diff script                                  |
| **T-L** non-coding scope review                       | Are A13–A17 defensible on liability, quality and positioning?                  | Before A13–A17 ship                                    |
| **T-M** pre-registration                              | Every test states hypothesis, metric and falsifier _before_ it runs            | Applies to all tests                                   |

**Order (revised after the red-team review):** **T-K** reconcile the plans → **T-I** skills arithmetic → **T-G** stranded triage → **T-B/T-C** → **T-F/T-H** → **T-A/T-D/T-E**. The earlier order assumed the arithmetic was settled; it was not.

## 10. Open questions

1. **Does tone deserve first-class treatment?** The `style-*` cluster suggests yes — but as a `voice`
   setting or skill option, not a mode.
2. **How many non-coding axes before the preload promise breaks?** A13–A19 is seven; is 21 too many?
3. **Do non-coding axes need their own stance vocabulary?** Compliance review is not code review, and
   venture analysis is not architecture design.
4. **Is `reasoner` a real owner or a skill of every mode?** Its grant is read-only and its output is
   analysis; if every mode can reason, it may be a skill.
5. **Should the catalogue publish its own shape** (`axes → owners → specialisations → skills`) so the
   selector, marketplace and coverage map all render from one source?
6. **Red-team review pending** — see the analysis sub-task; its findings enter here before any test runs.

---

## 11. The missing axis: AI features and token efficiency

The question exposed a blind spot rather than a missing mode. **The needs baseline has no AI axis at all**,
because every source it draws on (O*NET, SWEBOK, LaToza & Myers, ISO 12207) predates LLM-powered features.
Yet the catalogue ships five AI modes, and users increasingly build *with\* models, not only consume one.

"AI/API/token efficiency" also names three different jobs:

| Meaning                                                                                                                | The work                                              | Owner                                                              | Skill                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| **(a) The agent's own spend** — context trimming, prompt caching, model routing, tool-call batching, budget guardrails | reduce tokens and latency of _this_ agent             | `performance` (measure stance), with `devops` for cost attribution | `token-efficiency`                                              |
| **(b) Building an AI feature** — prompts, RAG, tool calling, evals, guardrails, token budgets, model selection         | ship a model-powered capability in the user's product | **`ai-feature-engineer`** (new axis A22)                           | per-technique skills: retrieval, eval design, injection defence |
| **(c) Third-party API efficiency** — rate limits, quotas, pagination, batching, retries                                | use an external API without waste or bans             | `integration-engineer` (IMP)                                       | `api-efficiency`                                                |

**Why (a) needs no new mode.** Its grant is read + command; its stance is _measure_ — and `performance`
already owns "a number before and after, on a named workload". Tokens are a workload. A separate
`token-optimizer` mode would fail D1 and D2 and would collide with `performance` on routing (D3).

**Why (b) does need an axis.** It has a different **artefact** (a working model-powered feature with an
eval suite), a different **failure vocabulary** (hallucination, retrieval miss, prompt injection, cost
blow-out), and a distinct **capability profile** (model-provider network access, secret handling, MCP
tools). No coding axis owns it honestly: `code` would bury it, `security-reviewer` covers only the threat
half, `data-analyst` only the data half.

| Owner                 | Stance                   | Owns                                                                                              | Does not own                      |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------- |
| `ai-feature-engineer` | Construct (model-facing) | prompt/RAG/tool-call design, model-behaviour eval suites, model selection, latency budgets        | pricing policy, security sign-off |
| `ai-cost-engineer`    | Measure                  | token accounting, caching strategy, routing between models, cost guardrails, regression detection | feature design                    |

**Catalogue count: 42 → 44 owners.** This is where an external need (building AI features) and our own
product experience coincide — and it is also where the sources are weakest, so it is marked **derived**,
not adopted, and goes to T-L review first.

---

## 12. How the tests apply to each frame

T-K and T-I do run on both frames, but they answer different questions and T-K only applies to one today.

| Test                                  | Axis × stance frame                        | Artefact frame                                    | Purpose                             |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------- | ----------------------------------- |
| **T-K** plan reconciliation           | applies — two documents currently disagree | no artefact-frame catalogue exists yet            | make the plan internally consistent |
| **T-I** skills accounting             | per owner                                  | per artefact-mode                                 | compare **affordability**           |
| **T-B** routing budget                | yes                                        | yes                                               | compare **cost**                    |
| **T-C** coin-flip                     | yes                                        | yes                                               | compare **routability**             |
| **T-G** stranded triage               | yes (feeds the owner set)                  | partial — artefact classes absorb different slugs | decide what the frame must hold     |
| **T-F / T-H** bake-off + assimilation | yes                                        | yes                                               | the head-to-head                    |

**Prerequisite (now met):** the artefact frame exists as [`modes-catalogue-artefact-frame.md`](modes-catalogue-artefact-frame.md) — 47 classes, pruned to 37, same instruments. It must be read before it is tested — one page, ~20
artefact classes with one line each. Writing it is part of T-K, not a separate project.

**Sequence:** (1) write the artefact-frame catalogue; (2) T-K on the axis × stance plan; (3) T-I and T-B on

**Bake-off result and its red team (2026-11-09).** 18/18 trials executed; both frames chose the intended owner 3/3 on every brief. The red team then showed the design could only confirm that the author recognises his own vocabulary — ownership was tested by word overlap in the briefs, the key, the rubric and the proposed remedy. **Verdict: HARDEN; the honest statement is not tested, not neither frame is better.** The run did produce two real corrections: twelve artefact lines were unwritten (now drafted, measured Sum 3,836 vs stance 4,208) and the fixture was regenerated, so the run hashes are stale. Next test is a **behavioural outcome arm** (place the agent, check the job is done) plus a first-run observation — not more briefs. See [`reviews/2026-11-09-frame-bakeoff-red-team.md`](reviews/2026-11-09-frame-bakeoff-red-team.md) and [`reviews/2026-11-09-frame-bakeoff-response.md`](reviews/2026-11-09-frame-bakeoff-response.md).
**both**; (4) T-C on both; (5) T-G; (6) T-F / T-H.
