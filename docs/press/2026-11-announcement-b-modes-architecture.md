# Announcement B — the modes architecture (draft 2, 2026-11-10)

| Field                 | Value                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this file is** | Draft copy for the **Announcements** section of GitHub Discussions, plus the editorial record behind it.                                                                                  |
| **Source of claims**  | [`2026-11-modes-announcement-seeds.md`](2026-11-modes-announcement-seeds.md) §0 fact table only (Seed B).                                                                                 |
| **Series position**   | Second in a pair. Announcement A (the catalogue) is published; this one answers the question A leaves open — _will the modes behave better?_                                              |
| **Status**            | Draft 2 — revised after maintainer review, 2026-11-10 (title, tone, closing ask; see §2). Not published. Work described is **in progress**; nothing here is shipped and no date is given. |
| **Channel fit**       | Discussions announcement: same status banner and closing ask as A, so the two read as a series rather than two unrelated posts.                                                           |

---

## 1. Publishing copy (draft)

### Title

**Modes that behave: cleaner instructions, visible boundaries, and tests that check the work**

### Status line (keep — place directly under the title)

> **In progress.** This describes work underway, not a release. There is no date in this post, and no numbers about improvement, because none is measured yet.

### Body

A mode is not a personality. It is a contract with a job, a ceiling on what it may spend, and a boundary around what it may touch — and we are rebuilding ours around those three things.

Our standard is simple: a good mode stays on the task it was given, works inside limits you can see, and spends your context on the work rather than explaining itself. The changes below are how we get there.

**Cleaner instructions that hold.** Mode guidance is being cut to what actually changes behaviour. Detail that matters only for some tasks moves to material that loads when it is needed. Long is not thorough; long is unread.

**Boundaries you can see.** Each mode will state what it may read, change, run, and call. Not a general promise about safety — a list you can check before you approve.

**Behaviour we can point at.** We are building tests that ask one question of a mode: given a realistic task, does it do the job? A mode that cannot answer is a candidate for rewriting, merging, or retirement. These checks are being built; we will not call a mode verified until it is.

**Cost counts.** Tokens, context and turns are a design constraint, not an afterthought. A mode that is correct but wasteful is not finished.

None of this leaves your machine. The checks run locally, on demand, and we are adding no telemetry — we do not collect which modes you use.

Help us aim the checks at real work. Name a task you gave a mode recently: what you asked for, and whether it did the job. The ones that worked tell us what to protect; the ones that fell short tell us where to aim.

---

> **About Roo+.** Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.

---

## 2. Editorial decisions (why it reads this way)

**Length.** 293 words of body copy (measured), plus the status line and the boilerplate — 36 words longer than A, which is the upper limit of what the pair can absorb without B reading as the heavyweight. It is longer because each of B's four changes carries a qualification ("being built", "not a general promise about safety", "correct but wasteful is not finished") and the qualifications are the honest part, not padding. If it must come down to 250, cut the **Cost counts** paragraph first — the one change a reader can infer from the others — then the standard paragraph, which the four labelled changes restate in specifics. Do not cut "we will not call a mode verified until it is"; that clause is the load-bearing disclosure.

**Structure.** Title → status → definition (the hook) → the standard a mode is judged by → four labelled changes → the local-only reassurance → the ask. The hook is the seed's strongest line, so it is the second paragraph rather than a slogan above the fold: it only means something after the reader has been told what a mode is being judged on, and the standard paragraph is what supplies that judgement without dwelling on how modes have fallen short.

**Tone: improvement, not diagnosis (revision, 2026-11-10).** The first draft opened the second paragraph on a failure the reader would recognise — drifting off the task, ignoring the mode, spending a context window on prose. Cut on maintainer review: an announcement that describes the problem in the reader's own experience reads as a confession, and it invites the reader to remember the worst thing a mode ever did to them. The paragraph that replaced it states the standard instead — stays on the task, works inside visible limits, spends context on the work — which is the same three claims (F5, F6, F12) carrying a forward-looking instead of a retrospective frame. The diagnosis is not denied anywhere; it is simply not the subject of the post.

**Two deliberate refusals.**

1. **No number.** No percentage, no "fewer tokens", no "N× more reliable". None is measured, and F7 is in progress — a number here would be the first thing quoted back at us.
2. **No internal vocabulary.** No stances, axes, frames, gates, tiers, budgets as jargon, or capability maps. The word "budget" survives only as a plain-English "ceiling on what it may spend" and a sentence about tokens, context and turns.

**The tense discipline.** Every claim about the checks is "we are building", never "we test". The one sentence that explicitly names the gap — _"we will not call a mode verified until it is"_ — is doing double duty: it is the honest disclosure, and it is the line that makes the rest of the post credible. Keep it even under word pressure.

**Why the ask mirrors A.** A asked which modes you use; B asks whether a mode did the job on a real task. Both are answerable in one reply by someone who does not read our issue tracker, and both are things we cannot see ourselves. A series whose second post asks a completely different kind of favour reads as two posts by two authors.

**Why the ask accepts good news (revision, 2026-11-10).** The first draft asked only for drift: "where it went wrong". Cut for the same reason as the diagnosis paragraph — it made the thread a complaints queue, and it implied the only interesting reply is a bad one. The ask now invites either outcome, and says what each is for: what worked is what the checks must protect, what fell short is where they should aim. That is also the truthful description of the work, because a test suite built only from failures encodes only the failures.

## 3. Claim trace

| Sentence in the draft                                                                                              | Row             | Status used correctly?                                                                                |
| ------------------------------------------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------- |
| "A mode is not a personality. It is a contract with a job, a ceiling on what it may spend, and a boundary"         | F5, F6, F12     | A framing, not a shipped claim                                                                        |
| "a good mode stays on the task it was given, works inside limits you can see, and spends your context on the work" | F5, F6, F7, F12 | A standard we are building to — aspirational, not a claim that today's modes meet it                  |
| "Mode guidance is being cut to what actually changes behaviour"                                                    | F5              | IN PROGRESS — "is being cut", not "has been cut"                                                      |
| "Detail that matters only for some tasks moves to material that loads when it is needed"                           | F5              | IN PROGRESS — procedures leave the prompt                                                             |
| "Long is not thorough; long is unread"                                                                             | F5 (rationale)  | Editorial opinion, no external claim                                                                  |
| "Each mode will state what it may read, change, run, and call"                                                     | F6              | Future tense on an IN PROGRESS item                                                                   |
| "Not a general promise about safety — a list you can check"                                                        | F6              | Scopes the promise down; deliberately does **not** claim cross-tool portability                       |
| "We are building tests that ask one question of a mode … does it do the job?"                                      | F7              | IN PROGRESS — "we are building", never "every mode is tested"                                         |
| "a candidate for rewriting, merging, or retirement"                                                                | F7              | Candidate, not decision — the disposition is not taken                                                |
| "These checks are being built; we will not call a mode verified until it is"                                       | F7              | Refusal to claim, which is always safe and is the point                                               |
| "Tokens, context and turns are a design constraint, not an afterthought"                                           | F12             | IN PROGRESS, phrased as current practice, not a result                                                |
| "None of this leaves your machine. The checks run locally, on demand"                                              | F8, F7          | SHIPPED posture (local-first); no network claim beyond F8                                             |
| "we are adding no telemetry — we do not collect which modes you use"                                               | F3              | SHIPPED, present tense                                                                                |
| "what you asked for, and whether it did the job"                                                                   | F7 (input), F3  | A solicitation; it asks the reader to supply what we cannot measure, and implies no usage data exists |
| "The ones that worked tell us what to protect; the ones that fell short tell us where to aim"                      | F7 (input)      | Describes what reader input feeds — the checks — with no promise about when or how completely         |
| Boilerplate                                                                                                        | F8              | SHIPPED                                                                                               |

**Banned-claims audit — clean.** Checked against §0: no unmeasured numbers, no percentage improvement, no "every mode is tested", no future catalogue count, no superlatives ("SOTA", "elite", "best-in-class"), no named competitor, no dates, no implication of usage collection, no claim that the mode count holds or grows, no claim of a decided catalogue structure (F9), and no promise of cross-tool portability for permission rules. Nothing was cut for a banned claim. Sentences removed during drafting, all for tone rather than compliance: "so you stop reading the picker as a lottery" (glib about a real frustration), "the result is a mode you can trust" (an assertion of outcome we cannot measure), and on revision the failure-recognition paragraph and the failure-only ask described in §2.

## 4. Open items that will force a revision

| Trigger                                                     | What changes in this post                                                                                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The first behavioural checks produce results (F7)**       | The status line and the "we will not tell you a mode is verified" sentence stay, but a factual line can be added — what the checks cover, in counts we have measured, not in percentages. |
| **The capability declaration ships (F6)**                   | "will state what it may read, change, run, and call" becomes present tense; add one sentence on where the reader sees it.                                                                 |
| **The instruction budget lands in the product (F5)**        | Optional: one sentence on what the reader notices (a shorter mode description, faster first turn), still with no number.                                                                  |
| **The frame decision lands (F9 / P2)**                      | No change required — B deliberately carries no structure claims. Confirm nobody has added any.                                                                                            |
| **A retrospective on the catalogue migration is published** | If A's "more than 300" line was retracted, check B for any echo of catalogue size. There is none today; keep it that way.                                                                 |

## 5. Title alternatives

1. **Modes that behave: cleaner instructions, visible boundaries, and tests that check the work** — the seed's frame with the three changes made concrete in the subtitle; "cleaner" carries the same claim as "shorter" without inviting a word-count argument before the reader has seen one. _Approved (maintainer, 2026-11-10)._
2. **Modes that behave: measurement, budgets, and boundaries** — the seed's title, tighter, but "measurement" and "budgets" are the two words a reader is most likely to misread as telemetry and billing.
3. **A mode is a contract, not a personality** — the strongest sentence in the post, but as a headline it explains nothing to someone who has not read the body.

## 6. Series note

A and B are published as a pair, A first. A answers _which modes exist_; B answers _how they behave_. Do not merge them: the combined post runs past 500 words, and the two halves ask the reader for two different things. Each keeps its own status banner and its own closing ask.
