# Research brief — label form and routing (2026-11-12)

| Field        | Value                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Find prior art for one narrow empirical lead, so the programme knows whether it has rediscovered something known or found something unrecorded.                                         |
| **Audience** | A research sub-task, or a human researcher. Output is one document.                                                                                                                     |
| **Status**   | Brief only. No research has been performed.                                                                                                                                             |
| **Related**  | [`modes-experiment-log.md`](modes-experiment-log.md) entries E11, E12, F-1, F-2; [`2026-11-11-b3-isolation-preregistration.md`](../reviews/2026-11-11-b3-isolation-preregistration.md). |

---

## 1. The lead

A language model was asked to choose exactly one entry from a list of 45 or 47 entries, each rendered as `slug — Name — routing line`. Four briefs produced no observed difference between the two lists. One produced a large difference.

|        | List A                                                                                                                 | List B                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Entry  | `explain — Explain — Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.` | `explanation — Explanation — Use when someone asks why the code behaves as it does and evidence must be cited.` |
| Chosen | **1 of 5**, with **3 abstentions**                                                                                     | **4 of 5**                                                                                                      |

Brief: `Explain why this module is structured the way it is.`

A three-repeat probe of the List A prompt produced **1 correct and 2 abstentions**. That probe also established that the model is non-deterministic at temperature 0, and that the instability sits on the _pick-versus-ask_ decision rather than on which entry is chosen.

## 2. What is NOT being claimed

Two corrections that must survive into any write-up:

1. **Not "nouns beat verbs".** A second pair compared `debug` (a verb) with `bug-report` (a noun) on a debugging brief and showed **no observed difference**. That cell rests on five single draws, which cannot exclude a moderate rate — so it neither supports nor refutes a general form effect.
2. **Not a measured effect size.** The 1-of-5 versus 4-of-5 contrast is two small samples. Its Fisher p is 0.206. Nothing here is established.

## 3. The hypothesis under test

> **Label form matters only when the brief is ambiguous about what kind of answer it wants** — perform the activity, or hand back the artefact.

Supporting observation: the only brief admitting both readings is the only brief with a gap; the debugging brief, where the wanted outcome is unambiguous, shows none. Abstention is the predicted symptom, because an unresolved reading produces a question instead of a choice.

This refinement was formed _after_ seeing all five cells, so it is post-hoc and needs a prediction it did not have when formed.

## 4. What to search

Three literatures, in priority order. For each: what is established, what is merely claimed, what is untested.

### 4.1 HCI menu, command and button labelling

Verbs versus nouns in menu items, toolbar labels, command names — classic and modern findings. Specifically:

- Is there evidence that action labels and object labels produce different selection behaviour, error rates, or hesitation?
- Anything on label form and _user_ uncertainty, clarification-seeking, or abandonment?
- Does any of it distinguish "do the thing" from "give me the thing"?

### 4.2 LLM tool and function selection

- Tool **name** versus tool **description** as variables in choice; measured effects where they exist.
- Description quality, description "smell", near-duplicate or competing tools.
- Selection-accuracy benchmarks and their failure taxonomies.
- **Is abstention, refusal to choose, or asking a clarifying question documented as a failure mode distinct from wrong selection?** What predicts it?

### 4.3 Nominalisation and task framing

- Activity phrasing ("explain X") versus deliverable phrasing ("give me an explanation of X") and whether it changes behaviour.
- Outcome-versus-process framing.
- Any evidence on instructions that are **ambiguous about the expected answer type**, and whether that produces clarification questions.

## 5. Questions the report must answer directly

1. Is there prior art for the claim that a **verb-named entry routes differently from a noun-named entry** in a list of options? If yes: measured effect, population, and whether it supports, contradicts, or leaves open the conditional-ambiguity refinement.
2. Is **abstention / clarification-seeking** documented as a selection failure mode, distinct from mis-selection? What predicts it?
3. Does any literature tie **ambiguity about answer type** to clarifying questions?
4. Are there published **naming rules or guidelines** for tool or menu entries — length, verb-first or noun-first, one condition per line — that are backed by measurement rather than style opinion?

## 6. Conditions

- Cite a URL for every claim. Prefer primary sources: papers, vendor documentation, standards.
- **Grade every finding**: `verified` (measured and reproduced, or directly documented), `reported` (credible claim without measurement), `speculative` (analysis or opinion). Never present a reported claim as verified.
- Keep a **no-data register**: what could not be answered, and why.
- Keep a **contradictions section**: disagreements stated as disagreements, not resolved by preference.
- If the literature says nothing about this lead, say so plainly. "No prior art found" is a valuable result and must not be padded.
- Do not overstate effect sizes. Do not transfer human menu findings to language models without saying so explicitly.

## 7. Output

One file: `docs/research/modes-label-form-2026-11.md`.

Sections: executive answer (≤ 200 words) · method and what was searched · graded findings per literature · the four questions answered · contradictions · no-data register · what this means for our lead (corroborated, contradicted, or unattested) and what the next measurement should be · suggested naming rules, each with its evidence and its falsifier · source register · what could not be checked.

Nothing else is to be modified.
