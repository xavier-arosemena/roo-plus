# Announcement A — the modes catalogue (draft 2, 2026-11-10)

| Field                 | Value                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this file is** | Draft copy for the **Announcements** section of GitHub Discussions, plus the editorial record behind it.                                                                                |
| **Source of claims**  | [`2026-11-modes-announcement-seeds.md`](2026-11-modes-announcement-seeds.md) §0 fact table only.                                                                                        |
| **Status**            | Draft 2 — revised after maintainer review, 2026-11-10 (closing ask rewritten; see §3). Not published. Work described is **in progress**; the catalogue structure is **undecided** (F9). |
| **Channel fit**       | Discussions announcement: readable without scrolling twice, links out to detail later.                                                                                                  |

---

## 1. Publishing copy (draft)

### Title

**A shorter list, a sharper catalogue: what is changing about modes in Roo+**

### Status line (keep — place directly under the title)

> **In progress.** This describes work underway, not a release. There is no date in this post, and no target number of modes, because neither is decided.

### Body

Roo+ currently ships more than 300 installable modes. That is a search problem, not necessarily an advantage.

The list grew, but not because each one earned its place. We are changing that, and we would rather describe the direction before it lands than announce it afterwards.

**Every mode that stays will have a stated job.** The rule is one good mode per job rather than several near-copies. A smaller set of modes installed by default is the first visible step; the whole catalogue is in scope, not only the presets.

**The catalogue will be organised by what you are doing.** The goal is a catalogue you can navigate without a manual. Helping you choose is the harder half, and the mechanism is still being worked out. Our guidance is: start with the planning mode, which works out the steps and points you at the right specialist.

**Nothing silently disappears.** Every mode we retire will keep working through an alias, so saved selections and existing project files keep resolving. We are reducing the catalogue, not the capability.

**You will be able to see what we ship.** We will publish what the catalogue covers and what it leaves out — as counts and categories.

We do not collect which modes you use, and we are not going to — which is why we are asking directly. Which modes do you use? Which would you not want to lose? Tell us in the replies, with what you use each one for. Your comment is the only signal we get.

---

> **About Roo+.** Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.

---

## 2. Editorial decisions (why it reads this way)

**Length.** 257 words of body copy (measured, including the four bold labels), plus the status line and the boilerplate. That is at the top of the seed's 150–250 target rather than inside it, deliberately: the seed's word budget assumes three changes, and this draft carries four — the fourth (the coverage view) is the only transparency the reader gets that is not a reassurance, so cutting it to hit a word count would remove the reason to believe the other three. If the post must come down to 250, drop the "The list grew, but not because each one earned its place" rationale sentence, not a labelled change. Beyond ~300 words a Discussions announcement becomes a policy document nobody finishes; the boilerplate is longer than any single section on purpose, because it is the only part that never changes.

**Structure.** Title → status → one-sentence lede → why it is changing → four labelled changes → the ask. The four labels are bold, not bullets, because they are read as sentences rather than scanned as fragments; the CTA gets its own paragraph so it is not buried in a disclosure about telemetry, and it is phrased as two questions the reader can answer without knowing anything about our internal plans.

**Three deliberate omissions.**

1. No target count. Structure is undecided (F9), and the count is an output, not a promise.
2. No milestone language ("Phase 3", "preload", "tier", "disposition"). Users do not need our vocabulary, and the vocabulary may change under them.
3. No "we will share more soon". It commits to nothing and reads as filler in a serious announcement.

**The one number.** "More than 300 installable modes" is F1, which is **time-bound**: it is true today and must be retracted — not reworded — when the migration ships. This sentence is the first line of the post and the first line to remove at that point.

## 3. Claim trace

Every sentence that asserts something maps to a §0 row.

| Sentence in the draft                                                                                             | Row                                | Status used correctly?                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "Roo+ currently ships more than 300 installable modes"                                                            | F1                                 | SHIPPED, time-bound — phrased in the present                                                              |
| "That is a search problem, not necessarily an advantage"                                                          | F2 (rationale for the restructure) | Opinion about our own list; hedged, so it makes no claim about anyone else's                              |
| "The list grew, but not because each one earned its place"                                                        | F2                                 | IN PROGRESS framing; no shipped claim, no count                                                           |
| "Every mode that stays will have a stated job … one good mode per job"                                            | F2                                 | Future tense, "will" — correct for IN PROGRESS                                                            |
| "A smaller set installed by default is the first visible step; the whole catalogue is in scope"                   | F2                                 | Matches the widened scope; does not imply breadth is preserved                                            |
| "Helping you choose … mechanism is still being worked out"                                                        | F10 (PLANNED)                      | Explicitly undecided — no mechanism claimed                                                               |
| "Our guidance is: start with the planning mode, which works out the steps and points you at the right specialist" | F10                                | Offered as current guidance, not as the answer to choosing — the mechanism stays unclaimed                |
| "Every mode we retire will keep working through an alias"                                                         | F4 (PLANNED)                       | Future tense                                                                                              |
| "We are reducing the catalogue, not the capability"                                                               | F2                                 | Capability statement, no count attached                                                                   |
| "We will publish what the catalogue covers … counts and categories"                                               | F11 (PLANNED)                      | Future tense; no format promised                                                                          |
| "We do not collect which modes you use"                                                                           | F3                                 | SHIPPED, present tense                                                                                    |
| "Which modes do you use today? Which would you not want to lose?"                                                 | F3                                 | A solicitation, not a claim — it works _because_ we collect nothing, so it cannot imply usage data exists |
| Boilerplate                                                                                                       | F8                                 | SHIPPED                                                                                                   |

**Banned-claims audit — clean.** Checked against §0: no unmeasured numbers, no "every mode is tested", no future catalogue count, no superlatives, no named competitor, no dates, no implication of usage collection, and no sentence implying the number of modes holds or grows. Nothing was deleted for a banned claim in this draft; the only sentence I removed during drafting was an earlier "fewer modes in the preload will feel like a smaller toolbox" — cut because it implies the change is preload-only.

**The closing ask (revision, 2026-11-10).** The first draft closed on "if a mode you rely on looks likely to be retired, say which one" — a maintainer's question, not a reader's. It assumed the reader already knows our retirement list and has an opinion about it, and it made the CTA conditional on a fact we have not published. The ask is now unconditional and available to everyone on first read: **which modes do you use, and which would you not want to lose?** The telemetry disclosure is not a garnish in front of the question; it is the reason the question has to be asked, and it is now written as that relationship rather than as an apology.

## 4. Open items that will force a revision

| Trigger                                            | What changes in this post                                                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The frame decision lands (F9 / P2)**             | The "organised by what you are doing" paragraph is the placeholder. Add one concrete sentence naming the organising principle once decided.                                |
| **Choosing-a-mode mechanism is chosen (F10 / P4)** | Replace "Our guidance is: start with the planning mode" with the real answer; the planning-mode line is a stopgap, not a feature announcement.                             |
| **Alias mechanism is specified**                   | Optional strengthening: one sentence on where an old slug keeps resolving (saved selection, task history, project file). Do not add it before the surfaces are enumerated. |
| **The migration ships**                            | Retract the "more than 300" line (F1) and move the status line from "in progress" to shipped.                                                                              |
| **The coverage view format is chosen (P5)**        | Name the artefact ("a coverage page in the repo", "a table in the catalogue README") instead of "we will publish".                                                         |

## 5. Title alternatives

1. **A shorter list, a sharper catalogue: what is changing about modes in Roo+** — keeps the seed's title; states the change and the product. _Recommended._
2. **Fewer modes, each with a job: the catalogue we are building** — more direct, slightly more internal ("job" is our word before it is the reader's).
3. **What is changing about modes: fewer entries, the same work done better** — leads with the concrete fear; weaker as a headline, better as a follow-up post.

## 6. Next step

Seed B (the modes architecture) is a separate announcement and is **not** merged into this one — A answers "which modes exist?", B answers "how do modes behave?". A reader who finishes A has one question left ("will they behave better?"), which is exactly where B opens.
