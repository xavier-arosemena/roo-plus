# Debugger mode redesign — shipped `debugger` against a proposed `debug`

| Field          | Value                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| **Status**     | **Design argument, not a measurement.** No calls were spent; nothing here is a result                           |
| **Moved from** | [`2026-11-17-routing-report-e17-draft.md`](2026-11-17-routing-report-e17-draft.md:1) §7, unchanged in substance |
| **Depends on** | the routing report's §4.2 (position), read as an analogy only                                                   |

## 1. Why this pair, and what it is not

The pair is chosen **by function**, not by similarity: both are meant to make a model diagnose a failure rather than describe one. They are **not like-for-like**. The shipped entry carries **7,560 characters of doctrine** — a 260-character role plus 7,300 characters of custom instructions, measured from the file on 2026-11-17; the proposal is a ~1,700-character bookended contract. The comparison is of _doctrine structure_, and must be read as an illustration of a design argument, **not as a measurement** — no calls were spent on it and nothing below is a result.

## 2. The shipped mode

[`custom_modes.d/debug/debugger.yaml`](../../custom-modes/custom_modes.d/debug/debugger.yaml:1) — slug `debugger`, name "🐛 Debugging Expert".

| Property             | Value                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `description`        | "Systematically troubleshoots code issues using breakpoints, logging, and root-cause analysis."                                                                                                                                                                                                                                     |
| `roleDefinition`     | 286 characters of persona ("You are an Expert debugger specializing in…")                                                                                                                                                                                                                                                           |
| `whenToUse`          | 162 characters, quoting the `roleDefinition` back to itself                                                                                                                                                                                                                                                                         |
| `customInstructions` | **7,300 characters** (measured): 9 headed sections, **198 list items**, 2 embedded JSON blocks                                                                                                                                                                                                                                      |
| Order                | persona → "when invoked" steps → checklist → **eight technique taxonomies** (error analysis, memory, concurrency, performance, production, tools, strategies, cross-platform) → JSON communication protocol → workflow → mindset → postmortem → knowledge management → preventive measures → agent integration → SPARC → tool usage |

The shape is a **taxonomy dump with the operative rules in the middle**: the two things that decide whether the mode behaves correctly — reproduce before fixing, and what counts as done — sit among 170 sibling bullets, while the beginning is persona and the end is generic tool advice.

## 3. The proposed contract

Same function, bookended structure (non-negotiables first, definition of done last), inside the target-state budget of ≤ 4k characters and ≤ 12 constraints — the budget is stated in [`modes-target-state.md`](../modes-target-state.md:144) and enforced in its budget table:

```
You debug. You find the cause of a failure and prove it; you do not describe the failure.

## Non-negotiables
1. Reproduce before you fix. A cause is not accepted without a command, test or trace
   that fails now and passes after.
2. State the cause in one sentence with evidence: file, symbol, and observed against
   expected.
3. Change one thing at a time and record what each change did.
4. If two hypotheses survive the evidence, say so and run the cheaper discriminating
   experiment.
5. Fix the reported failure. List adjacent defects; do not fix them.
6. Do not claim a fix works until the reproduction passes and the neighbouring tests
   still pass.
7. Read the code and the logs before adding instrumentation. Add logging only where
   evidence is missing.
8. State what you still do not know.

## Method
Reproduce → locate → explain → minimal fix → re-run the reproduction and the
neighbouring tests → report the diff.

## Handoff
If the failure depends on an environment, credential or data you cannot reach, name it,
say what you would run first with it, and stop.

## Definition of done
- [ ] reproduction recorded: failing before, passing after
- [ ] cause stated in one sentence, with evidence
- [ ] diff limited to the cause
- [ ] neighbouring tests re-run
- [ ] residual unknowns listed
```

## 4. The argument this comparison makes, and its status

Three structural claims, none of them measured:

1. **Position inside the contract is a design variable**, by analogy with the routing report's [§4.2](2026-11-17-routing-report-e17-draft.md:204): if ~29 points of behavioural difference can come from where a line sits in a 45-item list, the ordering inside a long instruction block is unlikely to be inert. This is an analogy, and the analogy is the weakest link in this section — the routing result itself is position-controlled and partly exploratory.
2. **Constraint count binds before character count** (the literature's finding, not ours): 198 list items is far past any plausible binding limit, so most of the shipped contract cannot be doing work.
3. **A definition of done is checkable; a mindset list is not.** Only the proposal ends with conditions that can be verified by reading the transcript.

**What would settle it:** a single-factor ablation of one mode — same model, same brief, same repository, contract order the only change — with the outcome being whether the fix holds under re-run. That is E22's job and cannot be scoped before the capability research answers whether doctrine effects are detectable at our budget.
