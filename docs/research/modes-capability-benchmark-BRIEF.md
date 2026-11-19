# Research brief — the capability benchmark (2026-11-13)

| Field        | Value                                                                                                                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Find prior art and established practice for measuring whether a mode's **doctrine** makes the work succeed — before we design that benchmark.                                                                                                                        |
| **Audience** | A research sub-task, or a human researcher. Output is one document.                                                                                                                                                                                                  |
| **Status**   | Brief only. No research performed.                                                                                                                                                                                                                                   |
| **Related**  | [`modes-experiment-log.md`](modes-experiment-log.md) (current state, §12–14) · [`modes-label-form-2026-11.md`](modes-label-form-2026-11.md) (the routing round's literature) · [`modes-research-2026-11.md`](modes-research-2026-11.md) (the original evidence base) |

---

## 1. Why this brief exists

The routing benchmark is closed. It established that **brief clarity** governs routing (98–99% of unambiguous briefs get a committed mode; 30–50% of ambiguous ones do) and that **label form is second-order**. What remains untouched is the question the product actually sells: **does a mode's instruction text make the work succeed?**

We cannot answer it with what we have. The two candidate catalogues in `test-fixtures/frames/` carry **templated doctrine** — `"You are the {Name} mode. Your charter: {the routing sentence}…"` — so any behavioural difference between them is a labelling effect wearing a doctrine costume.

This brief exists because our own guesses have been wrong four times in this programme, and because the last literature review found that the effect we were chasing was **unattested** while a variable we had ignored (position) decided the choice. We would rather learn that now than after building an instrument.

## 2. What is already established — do not re-derive

| Finding                                                                                                          | Source                                        |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Brief clarity dominates routing; label form is second-order                                                      | E13-R, 600 calls, log §12–14                  |
| Persona directives change wording, not which mode is chosen                                                      | E11, log F-1                                  |
| Temperature 0 is not deterministic; instability sits on pick-versus-ask                                          | log E12                                       |
| Abstention is the _appropriate_ response to an ambiguous brief, and benchmarks systematically mismeasure it      | label-form research                           |
| Tool **names** are the weakest of four metadata levers; when names are the only difference, **position** decides | label-form research                           |
| Description quality matters more for under-specified queries than specific ones                                  | label-form research                           |
| Our frame fixtures cannot support a capability claim, because their doctrine is a template                       | log §A5                                       |
| Three task snapshots exist with objective pass/fail: `b1` failing CI, `b2` slow path, `b3` confusing module      | `test-fixtures/frames/outcome-arm/snapshots/` |

## 3. The question

> Given two modes that differ **only in doctrine** — same model, same tools, same grants, same brief, same repository — does one make the task succeed more often than the other? And what is the smallest design that could detect such a difference if it exists?

"Smallest" is the operative word. We can afford hundreds of model calls, not millions, and we would rather have a defensible small result than an underpowered large one.

## 4. Literatures to search, in priority order

**4.1 Agent and coding-agent benchmarks, and their harnesses.** SWE-bench and its variants (Verified, Lite, Multimodal), Defects4J, RepoBench, BigCodeBench, Terminal-Bench, τ-bench, AgentBench, WebArena, OSWorld, GAIA. For each: _what_ is graded (patch application? hidden tests? rubric? trajectory?), _how_ it is graded, what it costs, and whether it can run **offline on a small local fixture**.

**4.2 Attribution: model versus scaffold versus prompt.** How much of a published agent score is attributable to the model and how much to the harness, prompt and configuration? Look for ablation studies, framework-comparison papers, and work on the reproducibility of agent results (harness version effects, retry and attempt counts, timeout policies).

**4.3 Measurement validity and reliability.** Construct validity for LLM evaluations; benchmark-quality audits; `pass@k` versus `pass^k`; run-to-run variance; how many runs per task are standard; contamination and reward hacking; cost- or turn-normalised success.

**4.4 Instruction and configuration effects on task success.** System-prompt sensitivity, instruction ablations, checklists and output contracts, constraint counts, tool budgets. Note what is _already_ known here (personas do not improve objective accuracy; constraint count binds before character count) and extend into: does _doctrine structure_ — bookended contract, stated refusal path, explicit definition of done — measurably change task success?

**4.5 Judging trajectories.** Execution-based grading versus rubric versus LLM-as-judge; judge reliability and known biases; inter-rater agreement conventions; when a rubric is legitimate evidence and when it is a vibe with a number attached.

## 5. Direct questions the report must answer

1. What is the **established statistic** for agent task success, and what number of runs per task is standard practice? Is a single run per task acceptable **anywhere** in the literature, and under what justification?
2. What is the **measured share of variance** attributable to scaffold, prompt or configuration rather than the model? Give effect sizes where they exist.
3. Which benchmark families can be run **offline on a small fixture repository with deterministic tests**, and what do they cost per task?
4. What is published on **doctrine-level ablations** — identical model, identical tools, different instruction text — and what effect sizes were found?
5. How do published evaluations **control for contamination and reward hacking** when the fixture is private?
6. What is the evidence on **rubric and LLM-judge reliability** for agent trajectories, and what agreement level is treated as acceptable?
7. Is **cost- or turn-normalised success** an accepted metric? What forms does it take, and what are its known failure modes?

## 6. Constraints the answer must respect

- We have **three snapshots** with objective pass/fail and no hidden-test infrastructure yet.
- Budget: **hundreds of calls**, not millions.
- Single local repository, **offline-capable**, one model at a time.
- The effect we are chasing is a _doctrine_ effect, which past evidence suggests may be **small** — the label round's largest effect came from the brief, not the configuration.

**If a doctrine effect is not detectable at that scale, say so plainly and give the minimum honest claim instead.** That is the most useful answer this brief can receive.

## 7. Conditions on the work

- Cite a URL for every claim; prefer primary sources and the benchmark's own documentation.
- **Grade every finding**: `verified` (measured and reproduced, or directly documented), `reported` (credible claim without measurement), `speculative`. Mark single-study findings explicitly, even peer-reviewed ones.
- Keep a **no-data register** and a **contradictions section**.
- Do not import a finding from one benchmark to another, or from human studies to models, without saying so.
- If the literature is silent on doctrine-level ablations, say that rather than assembling adjacent evidence into an implied answer.

## 8. Output

One file: `docs/research/modes-capability-benchmark-2026-11.md`.

Sections: executive answer (≤ 200 words) · method and what was searched · graded findings by literature · the seven questions answered · contradictions · no-data register · **a shortlist of what is runnable offline at low cost, with per-task cost** · **a recommended minimal design**, with its sample size and the smallest doctrine effect it could detect · what it would take to detect an effect smaller than that · source register · what could not be checked.

Modify no other file.
