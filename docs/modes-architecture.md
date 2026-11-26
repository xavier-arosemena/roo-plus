# Modes Architecture — The Durable Basics

| Field              | Value                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**         | Living architectural reference — **v2.1, 2026-11-04**. v1 (2026-10-26): internal measurement only. v2: evidence pass + re-conceptualisation. v2.1: adds the position×length argument (§4), modes as retrievable candidates for orchestrators (§7.8), the catalogue coverage map (§10.7), the target-catalogue workstream (§12 Phase 3.10–3.13) and the ADR queue (§12) |
| **Owner**          | Repository maintainer                                                                                                                                                                                                                                                                                                                                                  |
| **Audience**       | Mode authors, catalogue curators, reviewers, maintainers of the sync/release pipeline                                                                                                                                                                                                                                                                                  |
| **Classification** | Public (repository documentation)                                                                                                                                                                                                                                                                                                                                      |
| **Scope**          | The **framework** for designing, budgeting, gating and governing modes: what a mode is, what it may contain, what limits it must respect, and how the catalogue is organised. Per-mode authoring is deliberately out of scope.                                                                                                                                         |
| **Evidence base**  | [`docs/research/modes-research-2026-11.md`](research/modes-research-2026-11.md) — external best-practice, demand-proxy and competitor research, evidence-graded. §15 records the review verdict: what was accepted, reworded, rejected and added.                                                                                                                      |
| **Companions**     | [Architecture §10](architecture.md), [Architecture §14](architecture.md), [Canonical catalog ADR](adr/adr-custom-modes-canonical-catalog.md), [Bulk install ADR](adr/adr-bulk-install-modes.md), [Mode description pipeline](../scripts/DESCRIPTIONS.md), [Custom modes (help)](help/features/custom-modes.md), [Skills (help)](help/features/skills.md)               |

---

## 0. Context — why this document exists

Roo+ ships modes at three scales at once: **5 built-in modes** in the extension core, a **90-mode
curated preload** committed as `.roomodes` and `pre-installed-modes.yml`, and a **302-mode
canonical catalogue** published to the mode marketplace. Every mode is a prompt artefact, a
policy statement, and a maintenance liability simultaneously.

Before v1 there was no shared answer to four questions:

1. _What belongs in a mode_ versus in a rule file, a skill, a slash command, or the core prompt?
2. _How large may a mode be_ — and what is the cost of getting that wrong?
3. _What is enforced_ versus merely written down?
4. _How is the catalogue organised_ so that selection stays possible at 302 entries?

v1 answered those from measurement and reasoning alone. **v2 answers them from measurement _plus_ an
evidence pass**, and the evidence changed the conclusion in three places worth stating up front:

- The per-field ceilings are **policy**, not derived. The aggregate (`ΣwhenToUse`) is cost-derived;
  the per-field numbers are benchmarked against published vendor caps — and every published cap is
  **looser** than ours, which makes our ceiling the strictest in the industry rather than the obvious
  one.
- **Filtering the candidate set beats enriching descriptions.** The single largest measured effect in
  the adjacent literature is retrieval filtering of tools (13.62% → 43.13% selection accuracy, >50%
  token cut), not better prose. That reframes the preload, and the whole routing plane, as a
  retrieval problem.
- **The industry converged on two planes, not three.** An always-on instruction file plus an
  on-demand skill. Roo's _mode_ is the outlier: a third, selector-driven plane with its own routing
  text. The mature version of this pattern — Claude Code subagents — still needs an explicit aggregate
  description budget, which validates the model and, simultaneously, argues for making doctrine
  thinner (§15.3).

**How to read it.** §1–§3 establish the model and the measured baseline. §4–§6 define budgets, limits
and the authoring contract. §7 is resource efficiency. §8–§10 cover the neighbouring systems that most
affect modes: skills, the MCP allow-list, and catalogue grouping. §11–§12 are governance and the
roadmap. §13–§14 are open questions and reproduction. **§15 is the evidence review and the v1→v2
change log.** The full reasoning record — every finding with its grade, the unresolved tensions, the
experiment programme and a paper skeleton — is preserved in
[**Modes Doctrine — the full record**](modes-doctrine.md). The specification of the end state, and the
staged migration to it, is the [**Modes Target State (proposal)**](modes-target-state.md).

---

## 1. What a mode actually is

A mode is a **three-plane artefact**. The planes are separated because they have different cost
models, different readers and different enforcement.

| Plane          | Fields (runtime contract)                                                                      | Read when                                                                             | Mechanically enforced?              | Cost surface                |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------- |
| **Routing**    | `slug`, `name`, `whenToUse` (model-facing) · `description` (human-facing, _not_ in the prompt) | `whenToUse`: every request, for **every installed mode**. `description`: pickers only | No — advisory text for the selector | × number of installed modes |
| **Doctrine**   | `roleDefinition` (charter), `customInstructions`, `.roo/rules-<slug>/`, `.roo/rules/`          | Only while that mode is active                                                        | No — advisory text                  | × 1 per request of the task |
| **Capability** | `groups` (+`fileRegex`), `allowedMcpServers`, `rulesFiles` (export only)                       | Every tool call and every prompt build                                                | **Yes** — filtering and rejection   | × 1 per call                |

The runtime contract is [`modeConfigSchema`](../packages/types/src/mode.ts) with exactly these keys:
`slug`, `name`, `roleDefinition`, `whenToUse`, `description`, `customInstructions`, `groups`,
`source`, `allowedMcpServers`, plus the transport-only `bounded` marker that must never be persisted.
`.roomodes` is validated against a **strict** schema ([`roomodes-schema.ts`](../packages/types/src/roomodes-schema.ts)),
so unknown keys fail rather than being ignored.

### 1.1 The compile path

```
.roomodes / custom_modes.yaml ──► CustomModesManager ──► getModeBySlug()
                                        │
                    ┌───────────────────┼────────────────────┐
                    ▼                   ▼                    ▼
        getModesSection()      roleDefinition +            groups → tool
      (one line per mode,      customInstructions +        allow-list →
       whenToUse only)         rules-<slug> files          fileRegex / MCP
        EVERY request           ACTIVE mode only           EVERY call
```

Three consequences follow directly, and most mode-design mistakes are a failure to internalise them:

1. **Routing cost is multiplied by catalogue size.** [`getModesSection()`](../src/core/prompts/sections/modes.ts)
   emits `* "<name>" mode (<slug>) - <whenToUse>` for every installed mode, on every request. It is a
   permanent tax, not a one-off.
2. **Doctrine cost is paid only when the mode is active** — which is what makes a large catalogue
   affordable at all, and what makes `switch_mode` a cost lever, not just a UX affordance.
3. **Capability is the only plane the model cannot talk its way around.** A restriction that exists
   only in prose is a preference; a restriction expressed in `groups` is a rule.

### 1.2 Industry corroboration of the model

The routing/doctrine split is not our invention; it is the mature form of a pattern that other
products arrived at independently, and their published constraints are the closest thing to external
validation we have:

| Product                                        | Routing surface (always-on, costed) | Doctrine surface (loaded on use)                         | Published constraint                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (subagents)                    | `description` for every subagent    | Subagent system prompt                                   | **15,000-token combined description budget**, surfaced as a startup warning; guidance: "move detail into each subagent's system prompt, which only loads when that subagent runs" |
| **Microsoft 365 Copilot** (declarative agents) | `description` (≤1,000)              | `instructions`                                           | **8,000-char schema-enforced cap**; 1–5 capabilities; guidance: describe what the agent _should_ do, not what it should not                                                       |
| **GitHub Copilot** (custom agents)             | picker + `description`              | Agent prompt                                             | **30,000-char** prompt cap; `tools` list restricts capability; omitting it grants all                                                                                             |
| **Roo+ (this document)**                       | `whenToUse` per installed mode      | `roleDefinition` + `customInstructions` + `rules-<slug>` | none enforced; proposed in §4                                                                                                                                                     |

The Claude Code guidance is also the best external statement of _why_ the split exists: descriptions
are paid always, system prompts are paid on use. Roo+ is the only one of these where the routing
surface is a **third**, selector-driven plane with a user-facing taxonomy — which is precisely why it
needs a budget the others do not.

### 1.3 What a mode is _not_

- **Not a plugin.** It cannot add tools, only select among existing ones.
- **Not isolated.** Modes share one task history, one workspace, one approval model.
- **Not a permission system on its own.** Every capability still passes through the user's approval
  ladder (see [Architecture §13](architecture.md)); a mode narrows, it never grants.
- **Not a knowledge store.** Time-bound doctrine rots (§11.3); a mode is a contract, not a snapshot of
  what was true in 2025.
- **Not free text with a title.** Three of its fields are structurally load-bearing (see §4).

---

## 2. Measured baseline (2026-10-26)

These are facts read out of the working tree, not estimates. Reproduction commands are in §14.

| Metric                                                                     | Value                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Canonical catalogue files / modes                                          | 302 / 302                                               |
| Curated preload (`manifest.json` → `.roomodes`, `pre-installed-modes.yml`) | 90 modes                                                |
| Built-in modes in core                                                     | 5 (`architect`, `code`, `ask`, `debug`, `orchestrator`) |
| `.roomodes` on disk                                                        | 853,257 bytes                                           |
| Marketplace catalogue `modes.yml`                                          | 2,964,932 bytes                                         |
| Σ `whenToUse`, 90 preloaded modes — **the budgeted quantity**              | **13,306 chars**                                        |
| `MODES` section as rendered, 90 modes (adds the per-line wrapper)          | **18,648 chars** (≈ 4.7k tokens)                        |
| Σ `whenToUse` if all 302 modes were installed                              | 57,824 chars                                            |
| `MODES` section as rendered, all 302 modes                                 | 76,423 chars (≈ 19.1k tokens)                           |
| Total `customInstructions` across catalogue                                | **2,168,029 chars** (mean 7,179)                        |
| Largest single `customInstructions`                                        | **49,299 chars** (`website-builder`, ≈ 12k tokens)      |
| Modes with `customInstructions` > 4,000 chars                              | 170 / 302                                               |
| Modes with `customInstructions` > 6,000 chars                              | 160 / 302                                               |
| Modes whose `groups` are exactly `read+edit+command+mcp+browser`           | **283 / 302**                                           |
| Modes declaring the **deprecated** `browser` group                         | **289 / 302**                                           |
| Group usage (read / edit / command / mcp / browser)                        | 302 / 300 / 299 / 291 / 289                             |
| Distinct `groups` signatures                                               | 6                                                       |
| Exact duplicate `customInstructions` blocks                                | 0                                                       |

**Three measures, never conflated.** The budget is written against one of them; the prompt cost is another:

| Measure                         | 90 preload | 302 catalogue | Used for                                                            |
| ------------------------------- | ---------- | ------------- | ------------------------------------------------------------------- |
| Σ `whenToUse`                   | **13,306** | 57,824        | **the 12k budget** — the field multiplied by installed modes        |
| Σ `whenToUse` + `slug` + `name` | 17,028     | 70,987        | cross-document comparison; includes identifier text                 |
| Rendered `MODES` section        | **18,648** | 76,423        | actual prompt cost (adds the `* "<name>" mode (<slug>) - ` wrapper) |

**Consequence, stated plainly:** the preload is already **1,306 chars over its own routing budget
(+10.9%)** before a single mode is added. Earlier drafts mixed these measures, which understated the gap.

### 2.1 What the numbers say

- **Capability is decorative today.** 283 of 302 modes hold the identical maximum grant, and the
  grant includes a group the core silently strips. Restriction that applies to 94% of the population
  is not a restriction.
- **Deprecated-group drift is systemic, not incidental.** `browser` is listed in
  [`deprecatedToolGroups`](../packages/types/src/tool.ts) and removed by a `z.preprocess` step in
  [`mode.ts`](../packages/types/src/mode.ts) before validation. The catalogue therefore _declares_
  a capability on disk that _never exists_ at runtime, and nothing fails.
- **Doctrine is oversized.** 160 modes exceed the 6,000-char ceiling proposed in §4; one mode is 8×
  that. That the largest mode is a poor trade is a _judgement consistent with_ the long-context and
  constraint-count findings in §15.2 — not a measurement of a 6,000-char threshold, which does not
  exist in the literature. The measured inventory is the evidence; the threshold is policy.
- **Duplication is paraphrase-level, not verbatim.** Zero exact duplicate blocks means a naive
  copy-paste detector would report success while 160 modes carry near-identical structure. Dedupe
  needs similarity measurement, not string equality.
- **Routing is the only cost that scales with the catalogue** — and the catalogue grew 60× from the
  built-ins without a corresponding budget decision.

### 2.2 Contract inconsistencies found

| Issue                                                        | Evidence                                                                                                                                                                                         | Consequence                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Slug case rule differs between core and published schema     | [`mode.ts`](../packages/types/src/mode.ts) accepts `^[a-zA-Z0-9-]+$`; [`custom_modes.schema.json`](../custom-modes/schemas/custom_modes.schema.json) requires `^[a-z0-9-]+$` and `maxLength: 50` | Uppercase slugs validate in one path and fail in another           |
| `name` length limit exists only in the published schema      | `maxLength: 100` in the JSON schema, absent from the zod schema                                                                                                                                  | Long names accepted at runtime, rejected by marketplace validation |
| `description` is optional in zod but mandatory in practice   | Load-time normalisation in `CustomModesManager` + [`ensure_descriptions.py`](../scripts/DESCRIPTIONS.md)                                                                                         | A missing description is invisible until normalisation runs        |
| Deprecated groups tolerated everywhere                       | `z.preprocess` strip + `allToolGroups` superset in [`roomodes-schema.ts`](../packages/types/src/roomodes-schema.ts)                                                                              | Catalogue drift is silently accepted instead of failing the build  |
| No instruction-length guard anywhere                         | No limit in the zod schema, the JSON schema, or [`getModesSection()`](../src/core/prompts/sections/modes.ts)                                                                                     | The 49k-char mode is legal by construction                         |
| A generated document hardcodes a count that is already wrong | [`generate-catalog.mjs`](../scripts/generate-catalog.mjs) emits "301 items"; the catalogue is 302 (§15.2)                                                                                        | Generated prose drifts from the data it describes                  |

**Recommendation:** make the published JSON schema the _generated_ artefact of the zod schema rather
than a hand-maintained parallel definition, and add the missing constraints to the zod side so both
cannot diverge. Treat `lowercase, no double dashes, ≤ 50 chars` as the authoring rule until then.
**Compute every count** in generated artefacts; never type one.

---

## 3. Design principles

1. **Discriminability before depth.** A mode must be separable from its neighbours by one sentence.
   If `whenToUse` cannot answer _"why this mode and not that one?"_, the mode is not yet an entity.
2. **Routing is a retrieval problem, not a writing problem.** The measured lever is filtering the
   candidate set (13.62% → 43.13% selection accuracy, >50% token cut), not enriching descriptions
   (which buys ~5.85 pp at +67% execution steps). Prefer fewer candidates over better adjectives.
3. **Doctrine is a constraint budget, not a word count.** Instruction-following degrades with the
   _number_ of constraints (~3 consecutive constraints reliably satisfied for frontier models). Count
   imperatives, not characters alone.
4. **Bookend the doctrine.** Long-context recall is position-sensitive (U-shape): put non-negotiables
   first and the pre-completion checklist last. The middle of a long block is a dead zone.
5. **Positive directive plus named alternative.** Models handle negation poorly and vendors advise
   positive framing. "Only edit `*.md`; route code changes to `code` mode" beats "do not edit code".
6. **Thin modes, fat skills.** A mode is routing + charter + capability + handoff; procedures live in
   skills that load only when relevant. This is where the industry converged (§1.2) and it is the only
   way to keep 302 contracts maintainable.
7. **Anti-scope is a feature.** Every mode states where its excluded work belongs — expressed as a
   _destination_, not a prohibition.
8. **Modes are charters, not characters.** Persona prose does not reliably improve objective accuracy
   and can hurt; it reliably changes style and format. Spend the charter on scope, standard, refusal
   and handoff.
9. **One owner per capability.** Overlapping modes (`devops` / `devops-engineer` / `devops-architect`)
   are not redundancy insurance — they are routing noise with three maintenance costs.
10. **Least privilege is only real when it excludes something.** A grant identical to every other
    mode's grant communicates nothing and constrains nothing.
11. **Temporal validity is a quality attribute.** Doctrine that names versions, tools or standards
    decays. A mode without a review date is an assertion of unknown age.
12. **Enforce by structure, not by discipline.** Any rule that depends on an author remembering it will
    be violated within one catalogue generation. Put it in the schema or a gate.

---

## 4. Field budgets

Two kinds of number live in this table, and conflating them was a v1 error:

- **Cost-derived** — the aggregate routing budget, because it is arithmetic over installed modes.
- **Policy, benchmarked** — the per-field ceilings, because no source measures a compliance optimum.
  They are deliberately _stricter_ than every published vendor cap (§1.2): M365 8,000;
  Windsurf 12,000/file; Copilot 30,000; Codex 32 KiB. Ours is the tightest published-style ceiling in
  the industry, which is a defensible position but must be labelled as a choice.

| Field                          | Target                                                                       | Hard ceiling                                          | Basis                                                                                                          | Gate                            |
| ------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `slug`                         | kebab, lowercase, ≤ 40                                                       | 50 (schema), no built-in collision                    | identity                                                                                                       | schema + sync                   |
| `name`                         | ≤ 40 chars + one emoji                                                       | 100 (M365 uses the same 100)                          | UI only                                                                                                        | soft                            |
| `description`                  | 60–120 chars, states **what + when**                                         | 1 line                                                | agentskills.io requires what+when for descriptions; unclear purpose is the dominant description smell          | `gate:description`              |
| `whenToUse`                    | 100–200 chars: **trigger + domain noun**                                     | 250                                                   | _Policy_, on a surface multiplied by installed modes; nearest published description caps are 1,000–1,024 chars | `gate:budget`                   |
| `whenToUse` (disambiguator)    | ≤ 40 chars ("not for X"), **only when nearest-neighbour similarity is high** | —                                                     | ambiguity degrades selection; generic `not-for` wastes the most expensive field                                | `gate:routing`                  |
| `roleDefinition` (**charter**) | 300–700 chars of scope + standard + refusal + handoff                        | 1,000                                                 | persona text is the least reliable component; content matters, not length                                      | `gate:doctrine`                 |
| `customInstructions`           | ≤ 4,000 chars **and ≤ 12 hard constraints**                                  | 6,000 chars → move to `.roo/rules-<slug>/` or a skill | _Policy_ + constraint-count evidence (~3 reliable consecutive constraints)                                     | `gate:budget` + `gate:doctrine` |
| `groups`                       | ≤ 2–3, each justified                                                        | contract allows more; M365 caps capabilities at 5     | least privilege                                                                                                | `gate:capability`               |
| `allowedMcpServers`            | explicit list, or explicit "all"                                             | —                                                     | silent "all servers" is an unstated capability (§9)                                                            | `gate:capability`               |
| **Preload total**              | **Σ `whenToUse` ≤ 12,000 chars**                                             | 15,000                                                | **Cost-derived**; ≈3k tokens, ~5× tighter than Claude Code's 15,000-token analogue                             | `gate:budget`                   |

**Two independent justifications — and only one of them is about accuracy.** The ceilings are defended
on **engineering grounds**, which need no external study: doctrine is paid on every request of a task,
read line by line by humans in review, and competing with the task for attention. A shorter contract is
cheaper, faster to review, easier to diff and less likely to rot — all measurable in this repository
today (§2, §7). A sixth argument is structural rather than economic: **length converts directly into
unattended text.** Attention peaks at the beginning and end of a block and sags in the middle, so every
extra hundred characters lands disproportionately in the least-read zone. Brevity therefore does not
merely cost less — it relocates content _into_ the two positions that are actually attended to. The
**behavioural** claim ("shorter improves compliance") is only directionally
supported, and must never be used to justify the number. Conflating the two is how a cost decision gets
mistaken for a finding. A vendor's looser cap is therefore not an argument to raise ours: the burden
falls on whoever wants the extra characters to show the engineering cost is repaid.

**Why `whenToUse` is the most expensive field per character.** It is the only field repeated for every
installed mode, in every request, for every user — including users who never invoke the mode. Claude
Code reached the same conclusion and shipped a _startup warning_ when its 15,000-token description
budget is exceeded; §7.6 proposes the same visible mechanism for Roo+.

### 4.1 The budget arithmetic

```
C_turn = Σ over installed modes ( |whenToUse| + |slug| + |name| )
       + |roleDefinition_active| + |customInstructions_active| + |rules_active|
       + Σ over available skills ( |skill.description| )
```

Fixed overhead per request at today's preload ≈ 4.3k tokens for modes plus the skills index, tool
descriptions and the core prompt. A 10-request task pays that overhead ten times; a task delegated
into four subtasks pays it fourteen times (§7.2).

---

## 5. Hard versus soft limits — what is enforced today

| Limit                                                            | Status                              | Where                                                                             |
| ---------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| `slug` characters, uniqueness, no built-in collision             | **Enforced**                        | [`mode.ts`](../packages/types/src/mode.ts), sync script guard                     |
| `groups` membership and duplicate-group rejection                | **Enforced**                        | [`mode.ts`](../packages/types/src/mode.ts)                                        |
| `fileRegex` must compile                                         | **Enforced**                        | [`mode.ts`](../packages/types/src/mode.ts)                                        |
| Unknown top-level keys in `.roomodes`                            | **Enforced**                        | strict schema in [`roomodes-schema.ts`](../packages/types/src/roomodes-schema.ts) |
| MCP server allow-list (prompt, tool list, execution)             | **Enforced**                        | `allowedMcpServers` path (§9)                                                     |
| Description present and not a `roleDefinition` clone             | **Enforced**                        | [`ensure_descriptions.py`](../scripts/DESCRIPTIONS.md)                            |
| `customInstructions` size                                        | **Absent**                          | nowhere — proposed `gate:budget`                                                  |
| Constraint count, negation density, critical-rule position       | **Absent**                          | nowhere — proposed `gate:doctrine`                                                |
| `whenToUse` quality / distinctness / total budget                | **Absent**                          | nowhere — proposed `gate:routing` + `gate:budget`                                 |
| Deprecated group rejection                                       | **Absent** (tolerated and stripped) | [`mode.ts`](../packages/types/src/mode.ts)                                        |
| Doctrine ↔ capability consistency (e.g. review-only ⇒ no `edit`) | **Absent**                          | nowhere — proposed `gate:capability`                                              |
| Doctrine staleness (undated time-bound claims)                   | **Absent**                          | nowhere — proposed `gate:staleness`                                               |
| Any behavioural or routing test of a mode                        | **Absent**                          | nowhere — proposed `gate:behaviour`                                               |

The pattern is stark: **everything about identity and permissions is enforced; everything about
behaviour, size and age is not.**

---

## 6. The mode contract template

Standardise these sections in `customInstructions`, **in this order** (the order is load-bearing —
see principle 4):

1. **Non-negotiables** — at most three, stated as positive directives. This is the highest-attention
   position in the block; do not spend it on pleasantries.
2. **Charter** (`roleDefinition`) — one sentence of scope, one of standard, one of refusal with a
   destination ("Terraform changes belong to `devops`").
3. **Procedure** — numbered workflow with the tool mapped at each step (`read_file` for X,
   `apply_diff` for Y). "Use tools as needed" is not a procedure. Keep it ≤ 6 steps; longer
   procedures belong in a skill.
4. **Output contract** — the exact deliverable shape: files, findings format, severity scale,
   required sections, what must be cited.
5. **Handoff** — when to `switch_mode` or `new_task`, and the payload those calls must carry. Prefer
   naming the destination slug; §11.4 proposes making this machine-readable.
6. **Refusal & routing** — written as destinations, not prohibitions.
7. **Quality gates** — the checklist the mode runs _before_ `attempt_completion`. **Last, by design:**
   the end of the block is the second-best-attended position, and a checklist is the thing you want
   attended to immediately before the model acts.

**Constraint budget:** ≤ 12 hard constraints across the whole mode, ≤ 3 per section. If a mode needs
more, it needs a skill, not a longer prompt.

Two cross-cutting mandates worth standardising catalogue-wide:

- **Evidence rule** — every claim about the codebase cites `path:line`; no claim from memory.
- **Stop rule** — a bounded number of tool calls or steps before reporting progress instead of
  looping. Unbounded loops are the dominant turn-cost failure.

---

## 7. Resource efficiency — time, tokens, turns

Modes are the largest user-controlled lever on inference cost. Optimise in this order: **preload size
→ active doctrine size → turns → wall-clock tooling**.

### 7.1 Where the tokens go

| Artefact                             | Loaded                      | Measured / budget                                            | Notes                                                                        |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `MODES` section                      | Every request               | 13.3k chars of `whenToUse` (18.6k rendered) → **budget 12k** | Scales linearly with installed modes, so the budget is already exceeded (§2) |
| Active mode doctrine                 | Every request of that task  | mean 7.2k chars in catalogue; 1–2k built-in → **budget 4k**  | Scales with authoring discipline only                                        |
| Skills index (`<available_skills>`)  | Every request               | Σ **per mode**: ≤ 1,200 chars incl. markup (≤ 6 skills)      | See §8                                                                       |
| Activated skill body                 | Only when the skill is used | **budget 6k** (spec: < 500 lines)                            | On-demand by design                                                          |
| Rules (`.roo/rules`, `rules-<slug>`) | Every request of the task   | keep < 4k                                                    | Both generic and mode-specific are included, never replaced                  |
| `.roomodes` on disk                  | Startup parse               | 853 KB                                                       | **Never** into the prompt as a whole                                         |
| `modes.yml` (marketplace)            | Never                       | 2.96 MB                                                      | Bundle asset only                                                            |

**Practical rules**

1. **Keep the preload small and stable.** Installing a mode is a permanent per-request cost, not a
   one-time download. Target ≤ 90 preloaded and ≤ 12k chars of routing text.
2. **Never load the whole catalogue into a task.** `modes.yml` is a distribution asset; a 2.96 MB read
   costs more tokens than most tasks. Add `.roomodes`, `custom-modes/` and
   `src/assets/marketplace/modes.yml` to the agent ignore list so they are not opened by accident.
3. **Prompt caching rewards stability.** The mode section sits in the system prompt; installing or
   editing a mode invalidates the cache for every task. Batch catalogue changes; do not edit modes
   mid-task.
4. **Deterministic ordering.** `getModesSection()` iterates whatever `getAllModesWithPrompts()`
   returns. Sort by category then slug so the same set produces the same prefix and the cache holds.
5. **Verbose descriptions buy accuracy and cost turns.** The measured trade-off is ~+5.85 pp success
   for ~+67% execution steps. Write for discriminability, not completeness.

### 7.2 Turn economics

- **Each turn re-pays the system prompt.** Rough working figure: 4.3k (modes) + skills index + tool
  descriptions + core prompt ≈ **8–10k tokens of fixed overhead per request**. A 10-request task
  therefore carries 80–100k tokens of overhead before any work.
- **Delegation multiplies it.** Every `new_task` subtask rebuilds the full system prompt _and_ a fresh
  history. Delegate only when work is genuinely separable and the subtask can be given a complete,
  self-contained brief; otherwise finish in-mode.
- **`switch_mode` is cheaper than a new task** — same history, new doctrine. Prefer switching over
  delegating for a change of _stance_ (plan → implement → review).

### 7.3 Turn discipline (what the doctrine should mandate)

| Practice                                                 | Effect                                        |
| -------------------------------------------------------- | --------------------------------------------- |
| `codebase_search` / `search_files` before `read_file`    | Avoids reading files that turn out irrelevant |
| Read only the needed ranges (`offset`/`limit`)           | Linear saving on large files                  |
| One `apply_diff` with multiple blocks                    | Avoids one round trip per edit                |
| Batch independent tool calls in one message              | Collapses N turns into 1                      |
| Narrow test command (single spec path) before full suite | Minutes, not tens of minutes                  |
| Check the todo list rather than restating the plan       | Saves a turn per checkpoint                   |
| Stop rule with an explicit budget                        | Prevents the unbounded loop failure class     |

### 7.4 Time (wall clock)

- Prefer the narrowest gate locally; let CI run the full suite. A mode edit should be gated in
  seconds (schema + budget + routing + doctrine), not minutes.
- Cache-friendly gating: run the cheap textual gates on changed files only, the behavioural gate on
  the affected mode only.
- Never make a mode edit require a packaging run.
- **Sample behavioural evals.** 90 modes × 3 evals is not maintainable by a small team; start with the
  cohort carrying most of the routing cost (§12 Phase 1) and expand as the harness proves stable.

### 7.5 Skills and rules as cost instruments

| Requirement                           | Cheapest correct mechanism | Why                                               |
| ------------------------------------- | -------------------------- | ------------------------------------------------- |
| "Always do this, everywhere"          | `.roo/rules/`              | Paid once, small, applies to all modes            |
| "Do this only in this mode"           | `.roo/rules-<slug>/`       | Paid only while the mode is active                |
| "Do this workflow when the task fits" | **Skill** (`.roo/skills/`) | Description indexed always; body loaded on demand |
| "Do this now, exactly this prompt"    | Slash command              | Zero cost until invoked                           |
| "Be this kind of agent"               | Mode                       | Defines stance, tools and handoff                 |

The failure mode to avoid: a mode whose `customInstructions` contains three skills and two rules
inline. That converts on-demand content into always-on cost — which is what 2.17M characters of
catalogue doctrine already is.

### 7.6 Make the routing budget visible at runtime, not only in CI

Claude Code surfaces its 15,000-token description budget as a **startup warning** rather than a hard
failure. Roo+ should copy the mechanism (not the number): when the installed set pushes the `MODES`
section past its budget, tell the user in the mode selector/settings ("modes section: 14.2k / 12k
chars — 3 modes exceed the 250-char `whenToUse` limit") and let them act. A gate alone protects the
repository; a
warning also protects the user who installs 40 marketplace modes.

### 7.7 The routing plane as a retrieval problem (proposal)

The measured effect of filtering candidates is an order of magnitude larger than enriching their
descriptions. Applied to modes, that suggests **two-stage routing**:

```
Stage 1 (always on):  slug + name + ≤ 60-char gist        → 90 modes ≈ 5.4k chars (vs 13.3k of whenToUse)
Stage 2 (per task):   full whenToUse for k retrieved modes (k ≈ 8–12), selected by tags,
                      file types, task keywords from the user's first message
```

Cost: `O(N × 60) + O(k × 250)` instead of `O(N × 250)`. Risks: a relevant mode excluded by the
retriever; mitigation is additive expansion, a "show all modes" escape hatch, and never a silent
drop. This is a **proposal with an ADR required**, not a decision — it changes model behaviour and
needs routing evals (§12 Phase 2.7). It is listed here because it is the single highest-leverage
change the evidence suggests, and it is invisible from inside the current design.

### 7.8 Modes as retrievable candidates — the orchestrator's version of the same fix

An orchestrator or architect mode chooses _modes_ the way an agent chooses tools: it holds a candidate
set and calls `switch_mode` or `new_task` with a slug. [`tools.ts`](../src/shared/tools.ts) already
groups those two calls under `modes`, and both are always available to every mode. So the
tool-retrieval finding transfers with one correction: the candidates are already tool-like, they are
simply never _retrieved_ — an orchestrator sees the same full `MODES` list as everyone else.

Three ways to filter, in increasing invasiveness:

| Option                         | Mechanism                                                                                                                                                       | Cost                                                                                                    | Risk                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **A. Static shortlist** (§7.7) | Only a retrieved subset of modes appears in the `MODES` section for that task                                                                                   | Prompt assembly only                                                                                    | A miss is invisible to the model                       |
| **B. Model-invocable search**  | A `search_modes(query, k)` tool returns slug, name, one-line `whenToUse`, capability summary and a match score; the model then calls `switch_mode` / `new_task` | New tool in the `modes` group; follows the existing `skill` tool pattern — an index the model can query | One extra turn; retrieval quality becomes a dependency |
| **C. Hybrid**                  | Compact always-on index plus `search_modes` for refinement and as the escape hatch                                                                              | Both of the above                                                                                       | Two mechanisms to maintain                             |

**B is the more interesting one for orchestrators**, for three reasons: the retrieval is _auditable_ (the
model shows its query and the shortlist before committing); a miss is _visible_ (it can re-query with
different words instead of silently choosing from a truncated list); and no fixed _k_ has to be chosen
at prompt-assembly time.

**This is the strongest argument for deduplication (§10.6).** Retrieval turns two near-identical modes
into a non-deterministic coin flip — whichever wins depends on embedding noise rather than fitness.
Dedupe first, then retrieve.

**Non-trivial differences from tool calling**, which any ADR must address: a mode carries a capability
grant, so choosing one changes the blast radius mid-task; `switch_mode` is user-facing and may be
approved interactively; and a mode replaces the agent's stance rather than returning a value. Selection
is single-choice per step, not a call that returns and continues.

**Not recommended below ~15 candidates.** The evidence on candidate-set size only points this way once
the set is large; with five built-in modes and no preload, the index is already cheap and filtering adds
a failure mode without buying accuracy.

---

## 8. Skills in the mode architecture

### 8.1 What a skill is, mechanically

A skill is a folder containing `SKILL.md` with YAML frontmatter (`name`, `description`, optional
`modeSlugs`) plus a markdown body. Discovery, precedence and scoping live in
[`SkillsManager`](../src/services/skills/SkillsManager.ts); name validation follows the
agentskills.io rules in [`skills.ts`](../packages/types/src/skills.ts) (1–64 chars,
`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

Two things matter architecturally:

1. **The index is always-on; the body is on-demand.** [`getSkillsSection()`](../src/core/prompts/sections/skills.ts)
   emits `<available_skills>` with name, description and location into the system prompt for the
   current mode. The body is read only when the model decides to load it. **The description is the
   entire routing signal** — exactly like `whenToUse` for modes.
2. **A skill can be scoped to modes.** `modeSlugs: [...]` in frontmatter restricts availability;
   an empty or absent list means _any mode_. Directory scoping (`.roo/skills-<mode>/`) is the
   file-level equivalent and is the fallback when frontmatter is silent.

Precedence: **project beats global**; within a scope **`.roo` beats `.agents`**; a mode-scoped skill
beats a generic skill of the same name (documented in [Architecture §14.1](architecture.md)).

### 8.2 The division of labour

| Question                                             | Mechanism     |
| ---------------------------------------------------- | ------------- |
| _Who am I, what may I touch, when am I used?_        | Mode          |
| _What is always true in this scope?_                 | Rules         |
| _What procedure applies when the situation matches?_ | Skill         |
| _What must happen right now, verbatim?_              | Slash command |

Modes and skills are **orthogonal, not competing**: a mode is a charter with capability boundaries; a
skill is a procedure that can be attached to any stance. The catalogue's current failure is that modes
absorb procedures (2.17M chars of doctrine), which makes procedural knowledge unshareable and
always-on. That content belongs in skills.

### 8.3 The strategic consequence: thin modes, fat skills

If procedures move out, the mode converges on what Claude Code calls a subagent — a description, a
tool allow-list, and a short system prompt — and the v2 position becomes:

| Layer                                      | Owns                                    | Budget        | Changes                     |
| ------------------------------------------ | --------------------------------------- | ------------- | --------------------------- |
| Routing line (`whenToUse`)                 | Selection                               | 100–200 chars | Rarely — it is an interface |
| Charter (`roleDefinition`)                 | Scope, standard, refusal, handoff       | 300–700 chars | Rarely                      |
| Capability (`groups`, `allowedMcpServers`) | Blast radius                            | ≤ 2–3 groups  | Rarely                      |
| **Skills** (mode-scoped)                   | Procedure, checklists, domain playbooks | ≤ 6k each     | Often, independently        |
| Rules                                      | Always-on conventions                   | < 4k          | Occasionally                |

The migration is mechanical and reviewable: extract any block > 800 chars that appears in ≥ 2 modes,
ship it as a skill, replace it with a one-line pointer. It reduces the prompt (doctrine leaves the
always-on path), removes duplication, and isolates staleness to the skill that owns the dated claim.

### 8.4 How skills change mode design

1. **Modes get shorter and more stable.** The mode becomes a contract that rarely changes while skills
   evolve independently.
2. **Procedures become reusable across modes.** One `release-checklist` skill serves `devops`,
   `release-governance-lead` and `build-engineer` instead of three paraphrased copies.
3. **Scoping replaces duplication.** `modeSlugs: [code-reviewer, code-skeptic]` keeps a review
   protocol out of every other mode's index.
4. **Skills need the same gates as modes.** A skill description is a routing signal with the same
   failure modes as `whenToUse`.

### 8.5 Recommended approach (phased)

| Phase | Action                                                                                                                                         | Acceptance criterion                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| S1    | **Inventory**: list every procedural block that is (a) > 800 chars and (b) present in ≥ 2 modes                                                | A ranked list of candidate skills with an owner per candidate            |
| S2    | **Extract the spine**: 8–12 _cross-cutting_ skills into `.roo/skills/` with `modeSlugs` scoping                                                | Each spine skill is referenced by ≥ 3 modes; those modes shrink by ≥ 30% |
| S3    | **Shrink doctrine**: replace extracted blocks with a one-line pointer                                                                          | No mode exceeds the 6,000-char ceiling; median ≤ 4,000                   |
| S4    | **Gate skills** against the published spec: `description` ≤ 1,024 chars stating _what + when_; body < 500 lines; valid `modeSlugs`; no orphans | A `gate:skill` check runs in CI                                          |
| S5    | **Evals**: one happy-path task and one refusal task per spine skill                                                                            | Behavioural regression is detectable                                     |
| S6    | **Staleness**: `reviewed:` date per skill; time-bound claims dated                                                                             | No skill older than the review window (§11.3)                            |

### 8.6 Which skills to consider

Aim for a small **spine** of cross-cutting skills plus a long tail of domain skills.

**Spine (cross-cutting, mode-scoped):**

1. `evidence-and-citations` — cite `path:line`, never assert from memory.
2. `verification-loop` — search → read narrow range → edit once → narrow test → report.
3. `diff-hygiene` — minimal diffs, no drive-by refactors, respect suppression/debt rules.
4. `test-selection` — which test layer proves this behaviour (unit / integration / webview / e2e).
5. `release-and-versioning` — the iterate-then-stabilize policy and the announcement asset chain.
6. `incident-triage` — symptom → blast radius → mitigation → postmortem reference.
7. `security-review` — secrets, injection surfaces, trust boundaries, least privilege.
8. `api-contract-change` — typed message protocol, boundary validation, ratchet rules.
9. `data-migration` — reversible steps, dry run, verification query.
10. `structured-reporting` — the output contract for findings, severities and follow-ups.

**Domain tail (one per capability cluster, only where a mode genuinely needs it):** language-specific
idioms, framework conventions, cloud/observability playbooks, compliance checklists, document
templates.

**Anti-patterns to avoid:** a skill per mode (re-creates the duplication), a skill that is really a
rule (belongs in `.roo/rules/`), a skill whose body exceeds 500 lines (split it), and skills with
descriptions that could match any task.

### 8.7 Open question

Skills currently have **no dependency mechanism**: a skill cannot declare "requires the
`verification-loop` skill". Until it does, spine skills must be self-contained and the mode's charter
must name the skills it expects, so the handoff is explicit in the prompt.

---

## 9. MCP allow-list — make "all servers" an explicit choice

### 9.1 Current behaviour

`allowedMcpServers` is **opt-in restriction**:

- `undefined` → **unrestricted**: every connected MCP server is exposed to the mode.
- `[]` → deny everything.
- `[a, b]` → only those servers.

Enforcement is genuinely layered — prompt advertisement
([`getCapabilitiesSection()`](../src/core/prompts/sections/capabilities.ts)), tool filtering
([`filter-tools-for-mode.ts`](../src/core/prompts/tools/filter-tools-for-mode.ts),
[`effective-tool-policy.ts`](../src/core/prompts/tools/effective-tool-policy.ts)), and execution-time
rejection ([`UseMcpToolTool`](../src/core/tools/UseMcpToolTool.ts),
[`accessMcpResourceTool`](../src/core/tools/accessMcpResourceTool.ts),
[`isMcpServerAllowed()`](../src/core/tools/mcpServerRestriction.ts)). The UI control exists:
`McpServerRestriction` toggle plus `McpServerChecklist` in the mode editor.

The gap is not enforcement — it is **explicitness**. Default-unrestricted means a mode silently gains
access to any server the user connects _later_, and nothing in the UI ever says so. This is the same
failure class as GitHub Copilot's "omit `tools` ⇒ all tools", which is a real, shipped example of the
default-grants-maximum anti-pattern.

### 9.2 Recommendation

**Make the choice explicit; do not silently change the default.**

1. **State the effective policy in the editor.** Replace the bare toggle label with an explicit
   statement of the current state: `All connected MCP servers (unrestricted)` versus
   `Only 3 selected servers`.
2. **Show it where modes are chosen.** The mode card / selector tooltip should carry a capability line
   — e.g. `read · edit · command · MCP: all servers` or `MCP: docs, git`. This is the single change
   that makes the policy visible at decision time rather than configuration time.
3. **Warn on unrestricted modes with side-effecting servers.** When creating or importing a mode with
   no allow-list and ≥ 1 connected server, show a one-line advisory: _"This mode can call any MCP
   server you connect in future."_ Advisory, not blocking.
4. **Authoring convention: unrestricted must be written down.** Omit the field and say in the charter
   that MCP servers are unrestricted. `gate:capability` warns when a mode mentions MCP in its doctrine
   but declares no allow-list.
5. **New-mode default: restrict.** For modes created through the UI, default the toggle to _restricted
   with no servers selected_ and require one click to grant "all". Existing modes are untouched.
6. **Publish the policy, not just the field.** Document `undefined` as "all servers" in the marketplace
   schema (already done) **and** render it on the marketplace card, so installing a third-party mode
   shows exactly what is being granted.

**Migration note:** items 1–3 and 6 are UI/documentation; item 5 is a create-flow default; item 4 is a
gate. Visibility first, defaults second, enforcement never — narrowing existing modes silently would
break live workflows.

---

## 10. Catalogue recommendations — size, preload, grouping, demand

### 10.1 Three tiers, three contracts

| Tier                | Size today | Where                                  | Guarantee                                                                                                                          |
| ------------------- | ---------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Built-in**        | 5          | Core (`DEFAULT_MODES`)                 | Always present; slug reserved; never shipped from the catalogue                                                                    |
| **Curated preload** | 90         | `.roomodes`, `pre-installed-modes.yml` | Budgeted: Σ `whenToUse` ≤ 12k chars; every slug curated by name                                                                    |
| **Marketplace**     | 302        | `modes.yml`                            | Install-on-demand; **target-bearing** after the 2026-11-10 scope widening: declared specialisations plus labelled non-coding modes |

**The preload may not be large — and the catalogue's size is now an output too.** Filtering the candidate
set is the highest-leverage routing intervention in the tool-selection literature, and the preload _is_ that
filter. The 2026-11-10 scope correction extends the same reasoning by one tier: a mode nobody can name a job
for is a defect in the marketplace as well. Breadth becomes a consequence of declared specialisations and
labelled non-coding modes rather than a quantity to defend. See [`ADR-6`](adr/adr-target-catalogue.md) and
the [programme state review](reviews/2026-11-10-programme-state-review.md).

### 10.2 Preload selection criteria

State the policy in [`manifest.json`](../custom-modes/manifest.json) rather than leaving it implicit:

1. **Covers the built-in workflow** (plan → build → review → debug → orchestrate) with one alternative
   per stage, no more.
2. **No two preloaded modes collide on `whenToUse` triggers** (`gate:routing`).
3. **Every preloaded mode carries a different `groups` signature** from its nearest neighbour, or a
   documented reason why not.
4. **Instructions within budget** (§4). A 49k-char mode should not be preloaded by default.
5. **Owned and dated.** Each preloaded mode has an owner and a `reviewed` date.
6. **Justified by a failing eval** — see §10.5.

### 10.3 Demand: there is no popularity metric, so stop looking for one

Bookkeeping fact, verified: no surveyed surface exposes per-mode usage. The Roo+/marketplace pipeline
reads a bundled YAML with no count, rank or score field; the Roo Code marketplace never exposed
per-mode installs and its repository was archived on 2026-05-15; extension-level counts exist
(Open VSX ≈18.7k downloads for Roo+; VS Marketplace 2.12M installs for `roo-cline`) but cannot be
disaggregated to a mode. Where per-item counts do exist in adjacent ecosystems, they have been shown
to be inflatable and were removed by one directory as unverifiable.

**Policy, therefore:**

1. **Never display install counts as mode popularity.** Not on cards, not in the marketplace, not in
   docs. If market context is ever shown, label it "extension installs", with source and date.
2. **Do not use catalogue size as a quality claim.** "302 modes" is a supply fact.
3. **Rank by editorial curation and eval coverage, never by a counter.**

### 10.4 Target shape

| Metric                             | Today                                 | Target                                 |
| ---------------------------------- | ------------------------------------- | -------------------------------------- |
| Preloaded modes                    | 90                                    | **45**, incl. 16 non-coding (§10.8)    |
| Σ `whenToUse` in preload           | **13,306 chars — already 10.9% over** | ≤ 12,000 chars                         |
| Modes over 6,000 instruction chars | 160 / 302                             | 0                                      |
| Max `customInstructions`           | 49,299                                | ≤ 6,000 (body); larger content → skill |
| Hard constraints per mode          | unmeasured (est. 20+)                 | ≤ 12                                   |
| Distinct `groups` signatures       | 6                                     | ≥ 15 in the preload; each justified    |
| Modes using deprecated `browser`   | 289                                   | 0                                      |
| Modes with identical max grant     | 283                                   | < 50% of catalogue                     |
| Modes with `reviewed` date + owner | 0                                     | 302                                    |

### 10.5 Demand by failure — the ingestion rule

Replace "which modes are popular?" with **"which failure does this mode prevent?"**:

> A mode is justified when a named, reproducible task fails without it — a routing eval that selects
> the wrong mode, or a behavioural eval that produces the wrong artifact. A mode with no failing eval
> behind it is a candidate for merge or retirement.

This is the only demand signal that is (a) obtainable without telemetry, (b) falsifiable per mode, and
(c) aligned with the Phase 1 work already committed. It also makes the catalogue _contract_ rather than
_accumulation_: new modes enter through a failing eval, not through enthusiasm.

Complementary signals, in descending validity (§11.1 of the research report): a **local usage ledger**
(opt-in, exportable, no network); **issue triage** by missing capability; extension-level context;
GitHub attention metrics — the last as context only, never as justification.

### 10.6 Grouping recommendation

Two different groupings are being conflated today: **directory layout** (a submodule concern, pinned by
the [canonical catalog ADR](adr/adr-custom-modes-canonical-catalog.md)) and **conceptual taxonomy**
(a catalogue concern). Change only the second one:

- **Do not restructure the submodule** (`custom_modes.d/<slug>/<slug>.yaml`) — externally pinned and
  verified. Layout churn buys nothing and breaks the pin.
- **Add taxonomy metadata to [`manifest.json`](../custom-modes/manifest.json)** — `categories`
  (slug → one primary domain), optional `tags`, plus `owner` and `reviewed`. Manifest-side metadata
  never enters the runtime contract, so no schema migration is needed.
- **Tags are also a routing input.** The A2A agent-card standard settled on name + description + tags
  as the durable discovery surface; tags cost nothing in the prompt and are the natural key for the
  two-stage routing proposal (§7.7).
- **Sort by category then slug** wherever modes are listed or compiled, so the prompt prefix and the
  picker are stable and cache-friendly.
- **One primary category per mode.** Secondary tags allowed; the primary category drives grouping and
  the "one owner per capability" rule.

Proposed domain set (10 primaries — enough to navigate 302 modes, few enough to remember):

| #   | Category                     | Contains (examples)                                                                                                                        |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Reasoning & meta**         | `core-reasoning-architect`, `problem-solving-maestro`, `cognitive-multi-thinker`, `red-team`, `anti-fiction-sentinel`, `code-skeptic`      |
| 2   | **Planning & orchestration** | `orchestrator`, `agent-organizer`, `multi-agent-coordinator`, `agentic-swarm-conductor`, `goal-planner`, `task-distributor`                |
| 3   | **Build & languages**        | `code`, `frontend-developer`, `backend-developer`, `fullstack-developer`, `rust-developer`, `golang-developer`, `python`, `java-developer` |
| 4   | **Platform & operations**    | `devops`, `devops-architect`, `cloud-architect`, `kubernetes`, `network-engineer`, `observability-architect`, `incident`                   |
| 5   | **Data & AI**                | `data-engineer`, `data-analyst`, `machine-learning-engineer`, `llm-architect`, `rag-evaluator`, `nlp`, `prompt-engineer`                   |
| 6   | **Quality & security**       | `qa-expert`, `test-automator`, `code-reviewer`, `security-auditor`, `penetration-tester`, `compliance-specialist`                          |
| 7   | **Product & business**       | `product-manager`, `business-analyst`, `market-researcher`, `competitive-analyst`, `sales-engineer`, `finops-optimizer`                    |
| 8   | **Content & docs**           | `documentation-engineer`, `technical-writer`, `content-strategist`, `copywriter`, `i18n-l10n-reviewer`                                     |
| 9   | **Legal, risk & compliance** | `corporate-law`, `litigation`, `intellectual-property`, `risk-manager`, `oss-license-auditor`, `compliance`                                |
| 10  | **Domain verticals**         | `blockchain-developer`, `fintech-engineer`, `iot-engineer`, `embedded-firmware-developer`, `game-engine-developer`, `quant`                |

**Dedupe first, group second.** Grouping 302 modes that contain three devops modes and three legal
modes only organises the duplication.

### 10.7 Catalogue coverage map — where the catalogue is deep, and where the preload is thin

A **coverage map** is a portfolio view of the catalogue, not a capability claim: for each axis of _coder
need_, how much of the catalogue sits there, and how much of that is preloaded.

```
axis                 catalogue share        preloaded share
security             ████████████░░░░  38%   ██████░░░░░░░░░░  22%
debugging            ██████████░░░░░░  31%   ████████████░░░░  48%
refactoring          ██████░░░░░░░░░░  19%   ████████░░░░░░░░  32%
…                    generated from manifest metadata — never hand-drawn
```

Design rules:

1. **Two series, one axis set.** "Catalogue" (all 302) and "preloaded" (the curated 90). The _gap_
   between them is the interesting number: it shows where the preload under-serves what the catalogue
   already offers.
2. **Axes must be externally defined** (§13 open question 11). A house-only taxonomy makes the figure
   incomparable to anything outside this repository.
3. **Label the value as supply.** Counts per axis measure what we _ship_, not what developers _need_.
   Do not present it as demand coverage until a needs baseline exists (Phase 3.10).
4. **Generate, never draw.** The figure is produced by a script from manifest data; a hand-made radar is
   marketing that drifts within one catalogue change.
5. **The map drives preload selection.** If an axis carries 5% of the catalogue and 40% of the preload,
   that is a finding about curation, not about coverage.

What it is _not_: a quality score, a popularity chart, or evidence of demand. It is a way to see the
shape of our own portfolio at a glance and to argue about allocation with data instead of taste.

**What to count is not obvious, and mode count is the worst option** — it inflates with duplication and
treats a 1.2k-char contract like a 49k one. Count **jobs with a primary owner**, and report four
separate quantities that must never be blended: _supply breadth_ (distinct jobs per axis), _cost
allocation_ (routing chars and preload slots), _eval coverage_ (evidence per axis) and _external need_
(the research baseline). Definitions, the small-n rules (coarse bins before percentages) and the honest
sentence the project can defend are in [`docs/modes-doctrine.md`](modes-doctrine.md) Part VI.

### 10.8 The frame question, the preload it settles, and what it leaves open

**Why there are two benchmarks.** The catalogue was proposed as two rival frames, written so both
could be measured on identical instruments: an **axis × stance** frame
([`modes-catalogue-axis-stance-frame.md`](modes-catalogue-axis-stance-frame.md:1), **45** entries —
24 coding, 5 meta, 16 non-coding) and an **artefact** frame
([`modes-catalogue-artefact-frame.md`](modes-catalogue-artefact-frame.md:1), **47** entries — 24
coding, 6 operations and data, 5 meta, 12 non-coding). The routing benchmark began as the test that
would choose between them. The capability benchmark exists because the frame turned out not to be
where the difference is.

**What the test returned — and what it cannot license.** E11 scored both frames blind —
`CATALOGUE-1` = axis × stance, `CATALOGUE-2` = artefact — and found **10/10 against 10/10**, a
**0-point difference** ([`modes-experiment-log.md`](research/modes-experiment-log.md:271)). The
registered rule's row 2 applies and returns **H3 — one catalogue, two views**. Two qualifications
travel with it: the confirmatory cells were at **ceiling in both arms** (20 of 20), so H3 is _the
default the rule returns_, not an equivalence demonstrated; and the only discriminating cell was
excluded by Amendment 6, an exclusion D-8 records as mistaken.

**The presentation switch is therefore not a decision, and this document does not carry one.** The
test could see _names_: it asked whether a reader picks the same entry from two lists of slugs and
lines. It could not see that the two frames define a mode differently — "a stance applied to a
domain" in one, "an artefact produced" in the other — with different counts (45 against 47),
different slugs (`explain` against `explanation`), and different coverage. If the sets differ in
kind and not only in wording, then 0 points on selection is evidence that **both lists are
readable**, not that they are **one list**. A view toggle implemented before the reconciliation
would render two catalogues and call it one. **Status: withdrawn pending settlement by the builder
of the catalogue.**

**Three items the builder must settle, none of them arithmetic.**

1. **45 against 47 — count, slugs, and the definition behind both.** The frames differ by two
   entries and by almost every slug, and the disagreement is about what a mode _is_. This is an
   argument to be made and recorded, not an intersection to be computed.
2. **Coverage — and the possibility that 45 is too few.** The frames disagree on what is covered:
   axis × stance leaves **13 jobs uncovered** and double-assigns 2, the artefact frame leaves **4
   uncovered** and double-assigns 4 ([`axis-stance §6`](modes-catalogue-axis-stance-frame.md:90)).
   Neither covers the inventory, so the reconciled catalogue may need **more modes than 45** —
   possibly by adding owners for uncovered jobs. That makes **45 a floor, not a target**, and if it
   moves, the preload figure below has to be re-costed. This is unsettled and must be settled with
   the job inventory open beside it.
3. **The presentation switch itself** — conditional on 1 and 2.

**Preload size is 45 — decided 2026-11-19, superseding 60–90.** The curated preload is the
**45-entry catalogue**, not the range this document carried while the target was still argued. The
arithmetic supports it: the 45 drafted lines total **4,208 `whenToUse` characters** (113.42 per
entry, measured on the generated selection block —
[`frame bake-off §2.1`](reviews/2026-11-09-frame-bakeoff-run.md:54)), about a third of the
12,000-character budget. So the decision is affordable, not merely aspirational. **The 45 are not
built**: construction waits for both benchmarks, because each mode's contract is meant to carry the
routing findings (§6, [`routing report`](reviews/2026-11-17-routing-report-e17-draft.md:1)) and the
capability findings together.

**The preload includes the 16 non-coding modes — decided 2026-11-19.** This reverses
[`ADR-6`](adr/adr-target-catalogue.md:82) §6 and rule 2 of [`modes-units`](modes-units.md:145), both of
which gave non-coding modes no preload slot. The reason is budget, and it is arithmetic rather than
judgement: 45 lines at 113.42 characters is **4,208 of the 12,000 `whenToUse` characters**, leaving
7,792 unspent. A rule written to protect a budget that is not under pressure is protecting nothing.
What survives is the reason the rule existed: non-coding modes stay **labelled**, they hold no
preload slot beyond these 16, and their presence is not an argument for growing the preload further.

**Language and framework modes are installables, never preload.** The 43 stack-specific slugs in the
implementation axis ([`needs baseline §7.2`](research/modes-needs-baseline-2026-11.md:519)) are
**declared specialisations**: marketplace, install-on-demand, no preload slot and no routing
characters until a user installs one. The rule already exists in
[`ADR-6`](adr/adr-target-catalogue.md:52) §1 and §5 and in the tier table above; what was missing is
the sentence that ties it to this decision — **the preload is the 45; the languages are the
installables**.

**The lines the 45 will carry are now evidence-based, and the evidence is a candidate list.** E24 put
476 probes over the 119 jobs through two instruments — a lexical matcher and a model — and found two
distinct defects: six axes lack the words users type, and three contain them and lose anyway because
neighbours do too (log §34). The per-owner word proposals and the nine recommendations they generate
(**C1–C9**) live in [`test-fixtures/reach/triggers-candidates.json`](../test-fixtures/reach/triggers-candidates.json:1).
**They are untested**: the round that would test them has not run, and no word from that file may
enter a `whenToUse` without a reachability check and one model call per job.

---

## 11. Governance — gates, lifecycle, time

### 11.1 Gates

| Gate          | Catches                                                                                                  | Cost    | Reuse point                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| `schema`      | invalid shape, unknown keys, slug collision with built-ins                                               | seconds | existing sync + `verify-roomodes-sync`                         |
| `description` | missing, cloned, or "what-less" descriptions                                                             | seconds | [`ensure_descriptions.py --check`](../scripts/DESCRIPTIONS.md) |
| `budget`      | per-field ceilings, preload Σ `whenToUse`                                                                | seconds | new, textual                                                   |
| `routing`     | `whenToUse` nearest-neighbour ambiguity, missing disambiguator where similarity is high, duplicate slugs | seconds | new, highest leverage                                          |
| `doctrine`    | constraint count > 12, negation without an alternative, non-negotiables not first, checklist not last    | seconds | new, textual                                                   |
| `capability`  | deprecated group, review-only with `edit`, maximised grants, unrestricted MCP with side effects          | seconds | new                                                            |
| `staleness`   | `reviewed` older than the window, undated time-bound claims                                              | seconds | new                                                            |
| `behaviour`   | routing eval (right mode selected) + golden task + refusal + handoff                                     | minutes | new, slowest                                                   |

All eight attach to paths that already run at packaging time. The last one is the only expensive gate,
which is why it is sampled (§7.4).

### 11.2 Lifecycle rules

1. **Alias, never silent rename.** A renamed slug breaks users' settings. Add an alias entry and keep
   the old slug resolving for at least one minor.
2. **Deprecate before deleting.** Mark hidden in the manifest, keep the file for one cycle, then remove.
3. **Per-mode changelog in the manifest.** `changed: 2026-11-04 — removed browser group` is enough to
   make behaviour changes auditable.
4. **Owner per mode.** Un-owned modes rot silently; ownership is the only mechanism that survives
   contributor turnover.
5. **Metadata lives catalogue-side.** `.roomodes` is strict and `bounded` cannot persist, so version,
   owner, category, `reviewed` and eval references belong in `manifest.json`, not `ModeConfig`.
6. **One change per PR.** A mode edit and a catalogue regeneration in the same PR make behavioural
   review impossible.

### 11.3 Temporal validity — the risk nobody else gates

The catalogue was enriched from dated sources (2024–2025 trends, vendor tool releases, standards
editions). That content is **time-bound advice presented as standing truth**, and it decays silently:
a mode that names a superseded tool, an outdated standard, or a deprecated API is confidently wrong.
Nothing in the pipeline notices.

Rules:

1. **Every mode and skill carries `reviewed: YYYY-MM`** in the manifest.
2. **`gate:staleness`** fails a mode whose `reviewed` date exceeds the window (start at 9 months;
   tune with evidence) and warns when doctrine names a version without a date nearby.
3. **Time-bound content is date-stamped in the text** — "as of 2025-11, X is current" — so a reader
   can judge it without trusting the author.
4. **Prefer durable doctrine**: principles and procedures over tool inventories. A tool list belongs
   in a skill, where it can be updated without touching the mode's contract.

---

## 12. Roadmap

Priority order is fixed by product decision: **behavioural reliability → routing & cost → catalogue
governance → capability safety**. Each step names its evidence grade; `S/M/L` is maintainer effort
(≤1 day / ≤1 week / >1 week).

### Phase 0 — Foundations (started 2026-11-06)

_Rationale: topology and gates must land before schema or catalogue work, or every later change moves
twice. This is [ADR-7](adr/adr-modes-catalogue-vendored.md) migrating, not a proposal._

| Step | Deliverable                                                                                                                                                                                                                                                                                             | Gate               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 0.1  | **Vendor the catalogue**: `git subtree add` at the current gitlink `78a2010`, with a **byte-for-byte tree comparison** against the submodule checkout (`git diff --stat` must be empty)                                                                                                                 | —                  |
| 0.2  | **Split the gates**: move the description assertions out of the pin verifier into `gate:catalogue` (content) — existing spec cases moved, not rewritten                                                                                                                                                 | `gate:catalogue`   |
| 0.3  | **Rewire the 14 coupling points**: `sync-custom-modes`, `verify-roomodes-sync`, `generate-catalog`, `ensure_descriptions`/`add_descriptions`, `verify-docs-no-public-ip`, both CI workflows, and the `prevsix`/`prebundle`/`prevscode:prepublish` chains; `ROO_SUBMODULE_PATH` → `MODES_CATALOGUE_PATH` | build              |
| 0.4  | **Delete** `.gitmodules`, the `git rm --cached custom-modes` entry, the `.git/config` submodule stanza, `verify-submodule-pin.mjs` and its spec                                                                                                                                                         | —                  |
| 0.5  | **Add `verify:catalogue-integrity`**: manifest ↔ files bijection, computed counts, no orphan files; wire into `gate:sync` and the packaging hooks                                                                                                                                                       | `gate:sync`        |
| 0.6  | **Correct every document that quotes a pin** (the canonical-catalog ADR is already corrected, with its supersession recorded) and close the related DEBT item                                                                                                                                           | `verify-adr-index` |

**Acceptance:** a fresh clone builds with no `--recurse-submodules` and no SSH key; no pin exists to
drift; `gate:catalogue` and `verify:catalogue-integrity` are green; the imported tree is identical to
what was validated.

### Phase 1 — Behavioural reliability (highest priority)

_Rationale: without this, every later change is unverifiable — and every budget number is an
unfalsifiable assertion._

| Step | Deliverable                                                                                                                                                                                                                                                                                                                                                                                             | Grade                                 | Effort |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------ |
| 1.1  | Charter conversion (§6) for the 5 built-ins and the **20 preloaded modes carrying most routing cost** — not all 90                                                                                                                                                                                                                                                                                      | MODERATE (contract)                   | M      |
| 1.2  | **Routing evals**: given ~20 realistic prompts, does the right mode get selected? Precedent exists (`claude plugin eval` measures delegation reliability across realistic prompts)                                                                                                                                                                                                                      | MODERATE                              | L      |
| 1.3  | **Behavioural evals** per sampled mode: happy path, refusal, handoff                                                                                                                                                                                                                                                                                                                                    | MODERATE                              | L      |
| 1.4  | **Output-contract assertions**: the deliverable shape is checked, not just "task completed"                                                                                                                                                                                                                                                                                                             | MODERATE (checklist prompting ≈ +10%) | M      |
| 1.5  | Regression trigger: editing a mode's doctrine runs that mode's evals                                                                                                                                                                                                                                                                                                                                    | MODERATE                              | M      |
| 1.6  | Mark every §4 number **provisional** until 1.2–1.5 pass; record the re-baselined values                                                                                                                                                                                                                                                                                                                 | —                                     | S      |
| 1.7  | **Delegation-score KPI, closed loop:** each sampled mode carries a recorded score (correct selections ÷ times offered) recomputed on every change to its `whenToUse` or doctrine, with a regression blocking the merge. Precedent: Claude Code's `claude plugin eval`. This is the mechanism by which the repository — and each user's own installation — measures itself instead of relying on opinion | MODERATE (precedent)                  | M      |

**Acceptance:** a change to a sampled mode cannot merge without a routing _and_ a behavioural check
that would have caught a regression; failing eval output names the failing task and the mode.

**Experiment E1 — the bookend test (planned).** One mode, one order-only change: move its
pre-completion checklist from mid-doctrine to the end, keep the eval set and run count identical, compare
pass rates. This is **to be added later as the first internal measurement of a doctrine-design claim**,
rather than another borrowed one. Specification, falsifier and metric:
[`docs/modes-doctrine.md`](modes-doctrine.md) Part V.

### Phase 2 — Routing & cost

| Step | Deliverable                                                                                                                                                                                                                            | Grade                            | Effort |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| 2.1  | Rewrite `whenToUse` for the preload to the trigger + domain-noun template; disambiguator only where `gate:routing` demands one                                                                                                         | MODERATE                         | M      |
| 2.2  | `gate:budget` — `whenToUse` 250 hard, instructions 4k target / 6k hard, **≤ 12 constraints**, preload Σ ≤ 12k; error text cites the vendor ceilings for context                                                                        | MODERATE (caps) / NONE (numbers) | S      |
| 2.3  | `gate:routing` — nearest-neighbour distinctness + conditional disambiguator                                                                                                                                                            | MODERATE                         | S–M    |
| 2.4  | `gate:description` — "what + when" rule, aligned to the agentskills.io requirement                                                                                                                                                     | STRONG (spec)                    | S      |
| 2.5  | **Runtime budget warning** in the mode selector when the `MODES` section exceeds budget (§7.6)                                                                                                                                         | MODERATE (mechanism)             | S      |
| 2.6  | **Local mode-usage ledger**: per-mode activations, completions, immediate switch-aways; local storage only; opt-in export; surfaced in Settings → Modes                                                                                | NONE (design)                    | M      |
| 2.7  | **ADR + flag: two-stage routing** (§7.7); measure against the full-index baseline from Phase 1.2                                                                                                                                       | MODERATE (analogue)              | M      |
| 2.8  | Deterministic sort (category → slug); freeze the preload for a release cycle                                                                                                                                                           | MODERATE                         | S      |
| 2.9  | **ADR + spike: `search_modes` tool** (§7.8) — model-invocable retrieval for orchestrator/architect returning slug, one-line `whenToUse`, capability summary and score; compared against the static shortlist on the same routing evals | MODERATE (analogue)              | M      |
| 2.10 | **`gate:skills`** — per-mode skills index ≤ 1,200 chars including markup and ≤ 6 skills per mode; forces skills to merge rather than multiply (red-team O-01)                                                                          | NONE (policy; arithmetic)        | S      |

**Acceptance:** preload routing text ≤ 12,000 chars; no preloaded mode fails distinctness; the warning
is visible to users who over-install; the ledger ships with an export path and no network code; the
two-stage routing ADR compares accuracy against the full-index baseline.

### Phase 3 — Catalogue governance

| Step | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Grade                                 | Effort     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ---------- |
| 3.1  | Manifest metadata: `categories`, `tags`, `owner`, `reviewed`, `changed`                                                                                                                                                                                                                                                                                                                                                                                                        | STRONG (no metric exists)             | S–M        |
| 3.2  | `gate:staleness` (§11.3) with a 9-month window to start                                                                                                                                                                                                                                                                                                                                                                                                                        | NONE (policy)                         | S          |
| 3.3  | Near-duplicate clusters → merge/deprecate decisions, before the taxonomy                                                                                                                                                                                                                                                                                                                                                                                                       | MODERATE                              | M–L        |
| 3.4  | **Demand-by-failure ingestion rule** (§10.5): no new mode without a failing eval                                                                                                                                                                                                                                                                                                                                                                                               | NONE (proposal)                       | S (policy) |
| 3.5  | **Thin-modes migration** (§8.3): extract shared procedures to skills, shrink doctrine                                                                                                                                                                                                                                                                                                                                                                                          | MODERATE                              | M          |
| 3.6  | Preload selection policy applied (§10.2)                                                                                                                                                                                                                                                                                                                                                                                                                                       | MODERATE                              | M          |
| 3.7  | Compute every count in generated artefacts (replace the hardcoded "301" in [`generate-catalog.mjs`](../scripts/generate-catalog.mjs))                                                                                                                                                                                                                                                                                                                                          | STRONG (repo fact)                    | S          |
| 3.8  | **Doctrine publication**: a cited long-form white paper derived from the research and this document (problem → model → evidence → gates → measured results), published from the project site, versioned in-repo, treated as the **citable theory of record** the catalogue is built on                                                                                                                                                                                         | MODERATE (synthesis)                  | M          |
| 3.9  | **J1–J2 — Axis research and job inventory** (target-state §5.5): research the recognised dimensions of coding work from _external_ standards, define 6–12 axes with sources, then inventory the **jobs** per axis (trigger + definition of done). This is research work, not a taxonomy preference — it is the needs baseline the catalogue is planned against                                                                                                                 | NONE until chosen (research required) | L          |
| 3.10 | **Coverage baseline + a worked example** (§10.7): map the catalogue onto the axes, publish supply and allocation for both series, leave `C`/`N` blank, and publish one worked S/A/C/N example for a single axis                                                                                                                                                                                                                                                                | STRONG (repo data)                    | S–M        |
| 3.11 | **Target catalogue plan**: from the job inventory — the named mode list, the 45-mode preload selection (§10.8), a capability profile per mode, one primary owner per job family, naming conventions, and the merge / absorb / split / retire rules; includes superseding the built-in five into the preload, with a 1–3 mode bootstrap baseline left in core                                                                                                                   | MODERATE (derived)                    | M          |
| 3.12 | **Target-catalogue migration plan and execution**: per-mode disposition (keep / merge into X / thin to skill / retire / create) applied under the demand-by-failure admission test; the catalogue is refactored to the target, not merely re-wrapped in new categories                                                                                                                                                                                                         | MODERATE                              | L          |
| 3.13 | **Coverage gate**: the map regenerates on every catalogue change; an axis that grows past its target count, or a preload share that drifts, fails the build                                                                                                                                                                                                                                                                                                                    | MODERATE                              | S          |
| 3.14 | **Migration scorecard — measure the savings, do not assert them** ([`modes-catalogue-brainstorm.md`](modes-catalogue-brainstorm.md) §6): before/after for modes, preload slots, Σ`whenToUse` (13,306 today), rendered `MODES` section (18,648), median/max doctrine chars, skills shipped, distinct `groups` signatures, jobs with exactly one owner, and aliases published — plus the product-level number, **modes a new user sees on day 1**. Published in the release note | STRONG (measured)                     | S          |

**Acceptance:** every mode has category, owner and a `reviewed` date; duplicate clusters resolved; no
mode over the instruction ceiling; ≥ 8 spine skills live and referenced; generated artefacts compute
their own counts; the catalogue is defined by a needs-based target spec and its coverage is regenerated
per release rather than asserted.

### Phase 4 — Capability safety

| Step | Deliverable                                                                                                                                                                                                                                                                                                                                                  | Grade                                        | Effort                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------- |
| 4.0  | **Interoperability fixture corpus** ([`test-fixtures/modes/`](../test-fixtures/modes/README.md)): 10 versioned `.roomodes` fixtures, executed against our loader and published schema, then against each fork's loader (Roo Code at its final commit, Zoo Code current, Cline/Kilo only if they import `.roomodes`), plus round-trip diffs. **Blocks ADR-3** | STRONG (ours, executed) / unverified (forks) | S–M                                                                                                                                                        |
| 4.1  | `gate:capability` — deprecated groups fail, max-grant modes warn, doctrine↔grant consistency checked                                                                                                                                                                                                                                                         | STRONG (repo fact)                           | S                                                                                                                                                          |
| 4.2  | Retire the deprecated `browser` group from the catalogue (289 modes) and fail on re-introduction                                                                                                                                                                                                                                                             | STRONG                                       | S                                                                                                                                                          |
| 4.3  | Explicit MCP visibility (§9.2 items 1, 2, 3, 6) + restrict-by-default for new modes                                                                                                                                                                                                                                                                          | MODERATE                                     | M                                                                                                                                                          |
| 4.4  | `fileRegex` justified on every `edit` grant in the preload                                                                                                                                                                                                                                                                                                   | MODERATE                                     | S                                                                                                                                                          |
| 4.5  | **ADR: capability map** — path/command → `allow                                                                                                                                                                                                                                                                                                              | ask                                          | deny`, default-deny, with `groups`kept as sugar and an explicit`all`. Precedent: Kilo `permission:`globs, Copilot`tools`, Claude `tools`/`disallowedTools` | MODERATE (direction) | M (ADR) + L (migration) |
| 4.6  | Policy: never display install counts as mode popularity (§10.3)                                                                                                                                                                                                                                                                                              | STRONG                                       | S                                                                                                                                                          |

**Acceptance:** zero `browser` groups; no review-only mode holds `edit`; every preloaded mode's MCP
policy is stated in the UI; the capability-map ADR is accepted with a migration plan.

### Workstream P — Repository topology (submodule → in-repo) — **DECIDED**

> [ADR: Vendor the modes catalogue into the repository](adr/adr-modes-catalogue-vendored.md) (2026-11-06).
> The steps below are now a migration checklist, not options: `git subtree` import, gates split by
> concern (content vs reproducibility), pin verifier retired in favour of `verify:catalogue-integrity`.

`custom-modes/` is an **independently gitted submodule** inherited from the fork origin: the canonical
catalogue lives there, the parent pins a commit, and every packaging path verifies the pin
([`verify-submodule-pin.mjs`](../scripts/verify-submodule-pin.mjs)). The catalogue _work_ is done; what
remains is re-wiring it as part of this repository. The upstream PRs have been pushed and are unmerged,
and the strategic goal is to stop operating as a fork.

**Sequencing matters: move the furniture before redecorating.** Topology must be settled _after_ the
target-state proposal and _before_ Phase 2/3 implementation, because the catalogue refactor (3.12) would
otherwise land in one home and then move.

| Step | Deliverable                                                                                                                                                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | **Coupling inventory**: everything that assumes a submodule — pin verification, sync-script paths, CI checkouts, packaging hooks, ADR references, docs links — with an owner per item                                                                                                                                                           |
| P2   | **ADR: topology.** Vendored directory vs submodule, with explicit criteria: do we need an independent release cadence for the catalogue? does anything fetch it by git? does a submodule actually help publishing to a marketplace that ingests a _bundled YAML_ (it does not today)? what replaces the hermeticity the pin currently provides? |
| P3   | **Mechanics if vendored**: history-preserving import (subtree/`git filter-repo`), authorship intact, `.gitmodules` cleanup, pin verification replaced by a content hash + the existing roomodes-sync guard, CI no longer downloading a second repo                                                                                              |
| P4   | **Gates after the move**: `verify-roomodes-sync` becomes the sole reproducibility guard; add a catalogue-integrity check (manifest ↔ files bijection, computed counts, no orphans)                                                                                                                                                              |
| P5   | **Re-evaluate on evidence, not preference**: if third-party consumption or marketplace ingestion of the catalogue becomes real, the honest answer may be a _split repo with a published artefact_ rather than a submodule inside the app repo. Record the criteria either way                                                                   |

The submodule is not a defect to be ashamed of — it was a fork-era necessity that also bought hermetic
packaging. The question is whether it still buys anything now that the catalogue ships only inside the
VSIX.

### Workstream Q — Catalogue distribution (publish the artefact, not a repo)

Users of other tools should be able to take the catalogue without cloning anything. The answer is a
**release artefact generated from this repository** — not a second repository.

| Option                                                                                                                       | Verdict                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Release assets from this repo** — `modes.yml`, `modes.json`, a per-mode YAML tarball, `roomodes.schema.json`, `SHA256SUMS` | ✅ **Recommended.** Immutable per tag, no second history, no sync step, usable by any consumer |
| `raw.githubusercontent.com/…/modes.yml` as a "latest" pointer                                                                | ✅ Useful, but document it as a _moving pointer_, never as a contract                          |
| Second repository (the retired submodule pattern)                                                                            | ❌ Duplicates history and reintroduces exactly the drift ADR-7 removes                         |
| GitHub Pages catalogue browser                                                                                               | ⏳ Later; the JSON endpoints come first                                                        |

| Step | Deliverable                                                                                                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1   | Generation script + manifest: `schemaVersion`, computed counts, per-axis tags — extending the existing pipeline rather than adding one                                                                   |
| Q2   | Release workflow attaches the assets on tag, with SHA-256 per file and a LICENCE + NOTICE for the catalogue artefact itself                                                                              |
| Q3   | Document the contract: what **travels** (`groups` + `fileRegex`) and what **does not** (`allow`/`deny`, `command`/`mcp` policy — Roo+-only enforcement, [ADR-3](adr/adr-mode-capability-enforcement.md)) |
| Q4   | A per-version compatibility note naming the readers actually tested against the F1–F10 corpus                                                                                                            |

**Acceptance:** a consumer with no git access downloads one file, validates it against the published
schema, and knows exactly what is and is not enforced.

### ADR queue — the six decisions that cannot be made by editing a document

| #   | ADR                                                                                                                       | Decides                                                                                                                                                                                                                                      | Unblocks                      |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | **Retrieval-filtered mode routing**                                                                                       | Whether the always-on index becomes a shortlist, and how a miss is surfaced                                                                                                                                                                  | Phase 2.7                     |
| 2   | **`search_modes` tool**                                                                                                   | Whether mode selection becomes a model-invocable retrieval step (§7.8), and for which modes                                                                                                                                                  | Phase 2.9                     |
| 3   | ~~**Capability map**~~ **DECIDED** — [ADR: capability policy is fail-closed](adr/adr-mode-capability-enforcement.md)      | `legacyGrant ⊆ policy`; `edit` refinements ride inside group options (bounded by `fileRegex`); `command`/`mcp` policy uses the loader/manifest route or the empty-groups fail-closed form; versioned-file route rejected on interop evidence | Phase 4.5                     |
| 4   | **Thin-modes migration**                                                                                                  | The mode/skill boundary, extraction rules, review cadence                                                                                                                                                                                    | Phase 3.5                     |
| 5   | **Per-model-class budgets**                                                                                               | Whether one ceiling applies to every model or a profile per model class                                                                                                                                                                      | after Phase 1.5               |
| 6   | ~~**Target catalogue**~~ **DECIDED** — [ADR: target catalogue](adr/adr-target-catalogue.md)                               | Jobs (119) are the unit; one owner per job; preload = deep-band coverage first, ≤40 specialisations; built-ins absorbed with a 2-mode core baseline; size is an output                                                                       | Phase 3.11                    |
| 7   | ~~**Repository topology** (Workstream P)~~ **DECIDED** — [ADR: vendor the catalogue](adr/adr-modes-catalogue-vendored.md) | Vendored via `git subtree`; gates split by concern; pin verifier retired                                                                                                                                                                     | before Phase 2 implementation |

Each ADR must name the measurement that would falsify it. An ADR without a falsifier is an opinion with
a letterhead.

### Deliberately rejected, and why

| Idea                                                                     | Verdict      | Reason                                                                                                  |
| ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| Display "most popular modes"                                             | **Rejected** | No per-mode metric exists; where counts exist they are inflatable; a counter would be a trust liability |
| Behavioural evals for all 90 preloaded modes immediately                 | **Deferred** | Not maintainable at current staffing; sampled cohort first, expansion gated on harness stability        |
| Runtime truncation of oversized doctrine                                 | **Rejected** | Silent dropping is worse than a build-time gate (Windsurf truncates; we gate)                           |
| Raising the `whenToUse` budget to match vendor description caps (1,000+) | **Rejected** | The routing surface is multiplied by installed modes; vendor caps price a different surface             |
| Persona-shaped `roleDefinition` budgets                                  | **Rejected** | Persona prose does not reliably improve objective accuracy                                              |
| Search-volume / star-count demand proxies                                | **Rejected** | Measures attention, not use                                                                             |

---

## 13. Open questions

1. **Does selection accuracy degrade between 90 and 302 installed modes?** Cost is arithmetic; the
   quality effect is unmeasured. Phase 1.2 produces the baseline.
2. **Does a retrieval-filtered (two-stage) index beat the full index** on routing accuracy at equal
   task success? Phase 2.7 answers it.
3. **What is the near-duplicate rate** across 302 doctrine bodies? Zero exact duplicates ≠ zero
   duplication; a similarity pass sizes the extraction opportunity.
4. **Does the ledger's misfire ratio** (install → immediate switch-away) correlate with
   `whenToUse` quality as judged by `gate:routing`? If it does, the gate has a real-world calibration.
5. **How thin can a mode get before behaviour degrades?** The thin-modes thesis (§8.3) predicts no
   degradation; Phase 3.5 measures it.
6. **What is the right staleness window?** 9 months is a guess; the first review cycle should produce
   the number.
7. **Do constraint-count caps improve eval pass rates**, or only shorten prompts? Testable in Phase 1
   by comparing cohorts.
8. **Should `.roomodes` remain 853 KB in the workspace root?** Parsed at startup, and a tempting
   accidental agent read. Consider generation on demand or a split preload.
9. **Do built-in slugs need a manifest-level reservation mechanism** rather than the duplicated
   `BUILT_IN_SLUGS` list (DEBT #14)?
10. **Does the model family change the doctrine budget?** Constraint-count tolerance differs between
    frontier and open models, which suggests a single global ceiling may be wrong and that budgets
    should be per-model-class profiles. Untested here; Phase 1 can compare two cohorts.
11. **Which external taxonomy should the coverage radar use?** A competency/skills framework, an
    occupation-style role map, our own 10 categories, or an industry dev-skills taxonomy. The choice
    decides whether the figure is comparable to anything outside this repository.
12. **Does the local delegation score predict real selection behaviour?** A KPI is only useful if its
    offline rank-order matches in-the-wild routing; that correlation is unmeasured and is the first
    thing the Phase 2.6 ledger could test.
13. **Does retrieval transfer from tools to modes?** Tool selection is a per-call choice among stateless
    candidates; a mode changes the agent's stance and capability set. Plausible, untested — Phase 2.7
    and 2.9 exist to test it.
14. **What is the needs baseline for the coverage map?** Without an external task-type distribution the
    map shows supply only (§10.7 rule 3). Candidate sources: survey task categories, issue triage, or
    the eval corpus once Phase 1 lands.

---

## 14. Reproducing every number in this document

Run from the repository root.

```bash
# Catalogue size and per-field measurements
node -e '
const fs=require("fs"),path=require("path"),yaml=require("yaml");
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
if(e.isDirectory())walk(p,o);else if(e.name.endsWith(".yaml"))o.push(p);}return o;}
const m=[];for(const f of walk("custom-modes/custom_modes.d")){const d=yaml.parse(fs.readFileSync(f,"utf8"));
for(const x of (d.customModes||[]))m.push(x);}
const w=m.map(x=>({s:x.slug,w:(x.whenToUse||"").length,c:(x.customInstructions||"").length,
g:(x.groups||[]).map(y=>Array.isArray(y)?y[0]:y).sort().join("+")}));
console.log({modes:w.length,
  routingCharsLowerBound:w.reduce((a,x)=>a+x.w+x.s.length,0),
  meanInstructions:Math.round(w.reduce((a,x)=>a+x.c,0)/w.length),
  maxInstructions:Math.max(...w.map(x=>x.c)),
  over4k:w.filter(x=>x.c>4000).length, over6k:w.filter(x=>x.c>6000).length,
  browserModes:w.filter(x=>x.g.includes("browser")).length,
  maxGrantSignature:w.filter(x=>x.g==="browser+command+edit+mcp+read").length});'

# Shipped artefacts
wc -c .roomodes src/assets/marketplace/pre-installed-modes.yml src/assets/marketplace/modes.yml
node -e 'console.log(require("./custom-modes/manifest.json").includeSlugs.length)'
```

> The script prints three different quantities; compare like with like:
> `routingCharsLowerBound` is Σ(`whenToUse` + `slug`), §2 also reports Σ`whenToUse` alone (13,306 at 90
> modes, 57,824 at 302), the identifiers-included sum (17,028 / 70,987) and the rendered section
> (18,648 / 76,423). **The budget applies only to Σ`whenToUse`.** Re-derive rather than trusting the
> quoted figures once the catalogue changes.

External facts cited in this document and independently re-verified by the reviewer on **2026-11-04**
(see §15.4): the Claude Code 15,000-token description budget; the M365 8,000-char `instructions` cap
and its "should, not should not" guidance; the Copilot 30,000-char agent prompt cap; Open VSX
`downloadCount` for `xavier-arosemena/roo-plus`; the VS Marketplace `install` statistic for
`RooVeterinaryInc.roo-cline`; and the archived state of `RooCodeInc/Roo-Code`.

Compile path and contract references: [`modes.ts`](../src/core/prompts/sections/modes.ts),
[`skills.ts`](../src/core/prompts/sections/skills.ts), [`system.ts`](../src/core/prompts/system.ts),
[`mode.ts`](../packages/types/src/mode.ts), [`tool.ts`](../packages/types/src/tool.ts),
[`roomodes-schema.ts`](../packages/types/src/roomodes-schema.ts),
[`SkillsManager.ts`](../src/services/skills/SkillsManager.ts),
[`mcpServerRestriction.ts`](../src/core/tools/mcpServerRestriction.ts).

> Links in this document are symbol-anchored rather than line-anchored, following the convention in
> [Architecture](architecture.md): symbols and paths survive refactors, line numbers do not.

---

## 15. Evidence review and v1 → v2 change log

This section is the review of [`docs/research/modes-research-2026-11.md`](research/modes-research-2026-11.md).
It records what the evidence supports, what it does not, and exactly what changed in this document.

### 15.1 What the research settles

| Question                                                  | Answer                                                                                                                                | Grade                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Is there evidence for the 4,000/6,000-char ceilings?      | **No.** No source varies role-prompt length against compliance; six vendors publish caps and all are looser (8k / 12k / 30k / 32 KiB) | NONE for the numbers; MODERATE for the direction   |
| Is there evidence for the 100–200-char `whenToUse` band?  | **No.** Only looser description caps (1,000–1,024 chars) and one aggregate token budget exist                                         | NONE for the number; MODERATE for discriminability |
| Does a per-mode popularity metric exist?                  | **No**, on any surveyed surface                                                                                                       | STRONG                                             |
| Do personas improve objective accuracy?                   | **No reliable gain**, some harm; they do change style/format                                                                          | MODERATE                                           |
| Are negative instructions effective?                      | **No** — weak at scale; positive directives plus a named alternative are stronger                                                     | MODERATE                                           |
| Do checklists/output contracts help?                      | **Yes**, ~10% on counterintuitive instruction tasks                                                                                   | MODERATE                                           |
| Does filtering candidates beat enriching them?            | **Yes** — 13.62% → 43.13% selection accuracy, >50% token cut, vs ~+5.85 pp for richer descriptions at +67% steps                      | MODERATE                                           |
| Do long contexts degrade recall by position?              | **Yes**, U-shaped; degradation continuous with length                                                                                 | STRONG / MODERATE                                  |
| Does instruction-following degrade with constraint count? | **Yes**; ~3 consecutive constraints reliable                                                                                          | STRONG                                             |
| Could we compare against a competitor's mode limits?      | **No** — no competitor publishes a per-role doctrine budget below 6,000 chars; nobody ships 302 roles                                 | MODERATE                                           |

### 15.2 New findings that changed the analysis

1. **The ceilings are policy, not derivation.** v1 said "derived from the measured baseline and the
   cost model". True only for the aggregate. Reworded in §4.
2. **`not-for` inside `whenToUse` was over-specified.** It competes with the trigger for the most
   expensive 200 characters, and no source requires it. Now **conditional**: required only where the
   nearest neighbour is genuinely ambiguous (§4, `gate:routing`).
3. **The industry is at two planes; we are at three.** That is not a defect — it is why the routing
   budget matters — but it means doctrine should shrink, not grow. Hence "thin modes, fat skills"
   (§3.6, §8.3).
4. **Filtering is the big lever.** Reframed the preload as a retrieval filter and produced the
   two-stage routing proposal (§7.7) — the only genuinely new architectural idea in v2.
5. **Turn cost of verbosity is measurable** (+67% execution steps), which is an argument the
   efficiency section previously lacked.
6. **Staleness is a first-class risk in this catalogue.** The submodule's own research log shows dated
   enrichment (2024–2025 tools, editions, trends) baked into doctrine. Hence `gate:staleness` and the
   `reviewed` field (§11.3) — a gate class no competitor has.
7. **Delegation evals are an industry practice**, not a research fantasy: Claude Code ships tooling to
   measure how reliably an agent is delegated to. That is what makes Phase 1.2 credible.
8. **Two live defects of our own** surfaced by the evidence pass: [`generate-catalog.mjs`](../scripts/generate-catalog.mjs)
   hardcodes "301 items" against a 302-mode catalogue, and `allowedMcpServers: undefined` grants all —
   the same default-maximum mistake GitHub Copilot ships with `tools`.

### 15.3 What was kept, changed, dropped, added

**Kept (now externally supported):** the three-plane model; capability as the only enforced plane;
least privilege; MCP explicitness; the preload cap and the reasoning behind it; the gate family;
owner/category/changelog metadata in the manifest; the 10-category taxonomy (after dedupe); the
efficiency model.

**Changed:** budget framing (policy vs derived); `not-for` made conditional; `roleDefinition` reframed
as a **charter** with a content gate; the contract template **reordered** so non-negotiables come
first and the pre-completion checklist last; refusal rewritten as routing; constraint **count** added
as a second budget dimension; Phase 1 scope reduced from 90 modes to a **sampled cohort** with routing
evals added.

**Dropped:** the implication that per-field numbers are measured; any notion of displaying popularity;
the ambition of full-catalogue behavioural evals at current staffing; `roleDefinition` as a place for
character prose.

**Added:** `gate:doctrine`, `gate:staleness`, `gate:skill`; the `reviewed` metadata field; demand-by-
failure ingestion; the local usage ledger; the two-stage routing ADR; the capability-map ADR; the
runtime budget warning; tags as a routing input; the "thin modes, fat skills" migration.

### 15.4 Reviewer verification (what I checked myself, 2026-11-04)

| Claim                                                                                                       | Result                                                                                                                |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Claude Code 15,000-token combined description budget + "move detail into the system prompt" guidance        | **Confirmed** verbatim in the vendor docs                                                                             |
| M365 declarative agent `instructions` ≤ 8,000 chars; "should do, not should not" guidance; capabilities 1–5 | **Confirmed** (schema v1.5 limits and best-practice page)                                                             |
| GitHub Copilot custom agent prompt ≤ 30,000 chars; `tools` omitted ⇒ all                                    | **Confirmed** on GitHub Docs                                                                                          |
| Roo Code repository archived, last push 2026-05-15, 24,250 stars, 1,031 open issues                         | **Confirmed** via GitHub API                                                                                          |
| VS Marketplace `install` = 2,120,774 for `RooVeterinaryInc.roo-cline`                                       | **Confirmed** via Gallery API                                                                                         |
| Open VSX `downloadCount` for Roo+                                                                           | **Confirmed**, 18,739 at review time (report recorded 18,691 the same day — a live counter, so figures must be dated) |
| Marketplace item schema has no count/rank/score                                                             | **Confirmed** in [`marketplace.ts`](../packages/types/src/marketplace.ts)                                             |
| `generate-catalog.mjs` hardcodes "301 items"                                                                | **Confirmed** at line 99                                                                                              |
| arXiv/ACL findings (personas, negation, lost-in-the-middle, FollowBench, RAG-MCP, MCP description smells)   | **Accepted as reported**, graded MODERATE/STRONG; not re-run here — they are preprints/papers, not executable claims  |

**Residual uncertainty:** the numbers in §4 remain policy. They are now _defensible_ policy — stricter
than every published cap, aligned with the direction of the evidence, and falsifiable by the Phase 1
harness — but they are not measured, and this document no longer pretends otherwise.

## 16. Document history

| Version | Date       | Change                                                                                                                                                                                                                                                     |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1      | 2026-10-26 | Internal measurement only: three-plane model, budgets, gates, catalogue grouping, roadmap                                                                                                                                                                  |
| v2      | 2026-11-04 | Evidence pass absorbed: budgets reframed as policy, contract reordered, `gate:doctrine` + `gate:staleness` added, thin-modes thesis, two-stage routing proposal, sampled Phase 1                                                                           |
| v2.1    | 2026-11-04 | Position×length argument (§4), modes as retrievable candidates (§7.8), coverage map and its counting rules (§10.7), target-catalogue workstream (Phase 3.10–3.13), Workstream P repository topology, ADR queue (7 entries), bookend experiment (Phase 1.8) |

**Known residual weaknesses, stated rather than buried:** the per-field budgets are policy, not
measurement; two-stage routing and the constraint cap are analogues, not measurements of modes; the
Phase 1 cohort is sampled, so most preloaded modes stay unverified longer than is comfortable; and the
staleness window is a guess. Each has a corresponding experiment in
[`docs/modes-doctrine.md`](modes-doctrine.md) Part V.
