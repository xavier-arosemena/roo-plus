# The day our ruler wobbled

_A plain-language note on a measurement problem we found in our own testing. Written for readers who do not work on language models._

**Status:** published 2026-11-23. Third of three posts on the mode-routing work; the evidence behind every number here — the experiments, the raw records and the corrections — is in the [technical report](2026-11-19-routing-benchmark-report.md:1). Nothing in this note is a product announcement.

## The short version

We spent a week asking one question: **does the wording of a list change which item a model picks?** We built careful tests, spent real money, and got clean-looking answers.

Then we ran the same question **100 times without changing anything** — same list, same request, same model, same settings. The answer moved by 24 points.

Nothing about our list changed. The model simply answered differently depending on **when** we asked.

## What we were doing

Our product lets you pick a "mode" — a working style for the assistant. There are 45 of them, each with a one-line description. When the assistant sees your request it also sees that list, and it decides whether to commit to one mode or ask you a question first.

We wanted to know whether the _description lines_ affect that decision. So we wrote three versions of one line, ran hundreds of conversations, and counted how often the assistant committed.

Simple experiment. Same list, same request, one line changed.

## The first surprise, a week earlier

One early screen gave **one answer in five** for one condition and **four in five** for another. Clean, striking, and we reported it as a finding.

It did not survive. Five conversations per side is almost nothing: those counts were never beyond what chance produces at that size, and when the same comparison was repeated at a hundred conversations per side the gap had shrunk to about fourteen points — which, as the rest of this note explains, is inside the range an unchanged condition wanders on its own.

So the first surprise was not a discovery. It was a small sample read as a large effect. It stays in the record rather than being tidied away, because a programme that only publishes what survived is publishing a highlight reel.

## The second surprise: the same thing, twice, disagreed

Later we ran 600 conversations. One batch of identical prompts scored 59.3%. Another batch of the same identical prompts scored 47.0%.

Same prompts. Same model. Twelve points apart.

We did not have an explanation, so we made a rule: **never compare numbers from two different batches.** Compare only within one batch, side by side. That rule saved the next two rounds — their effects held their sign quarter by quarter, so we trusted the direction even though the exact numbers wobbled.

**Is this just language models being non-deterministic, and is it a Gemini thing?** Both, in different proportions. _Non-determinism_ is general: identical input giving different output at "randomness off" is documented behaviour, reported across providers, not a quirk of one vendor. What is _measured_ is narrower: every number here comes from one model, on one provider. The size of the movement — a quarter of the answers — is our measurement on that model; whether another provider moves as much is untested. So read this as "the instrument moves", not "vendor X is bad".

## The third surprise: an arm that kept climbing

Next we ran a 100-minute test with three conditions that alternated. One of them started at 36% and ended at 60% — while the others did not move. That it is **not always present** is part of the finding: most runs were flat, which is exactly why the moving ones were mistaken for results and not for weather.

A condition that climbs during a test is not a result, it is a moving target. We threw that round out and wrote it down as inconclusive.

Still no explanation. Just a pattern: **later calls look different from earlier calls.**

## The fourth surprise: the same thing happened again

Our most recent test had four conditions, alternating every four calls. One of them fell from 32% to 8% over the run, while the others stayed flat. By our own rule, that round could not be read.

**Why some conditions and not others?** We do not know, and that is the honest answer. Two readings fit: either the drift attaches to _moments in time_ and lands on whichever condition occupies them — which a balanced rotation should even out, but this one did not — or it attaches to _what a condition's text triggers on the provider side_, for instance whether that particular prompt was being served from a cache. Either way the practical rule is the same: never rely on an individual condition being stable.

We had now seen this three times. So we spent fifty cents to test it directly.

## The fifty-cent test

**One hundred conversations. Nothing varied at all.** Same list, same line, same position, same request, same settings. Identical, down to the last character.

| Quarter of the run | How often it committed |
| ------------------ | ---------------------- |
| First              | **40%**                |
| Second             | 28%                    |
| Third              | **16%**                |
| Fourth             | 24%                    |

A 24-point swing with nothing changed. Two in five, then one in six, for the same question.

## Why this happens

**We do not know, and we are not going to guess in public.** What follows are three explanations that are documented for commercial language-model services and are _consistent_ with what we measured. None of them is a cause we established: all three happen on the provider's side, none is visible from where we sit, and the measurements cannot separate them.

1. **The same input is not guaranteed to give the same output.** At least one major provider documents that a fixed random seed is "best effort" and that identical input may still produce different output, even with randomness switched off.
2. **Caching.** Providers cache content automatically to save money and time, and whether a given request is served from cache can vary within a session. Cached and uncached, the model is not reading quite the same context.
3. **Grouping.** Providers bundle requests together for efficiency, and the arithmetic depends on what else is in the bundle. What else is in flight depends on other people's traffic, not on us. This one is not vendor-specific: it is an industry-wide technique.

    So: **the model on the other end is a slightly different machine every few minutes.** Not broken — just not the measuring instrument we assumed.

The technical report treats these as candidates that fit the size and shape of the movement, and states plainly that separating them needs a design that varies batch conditions deliberately. Anyone quoting this post as evidence that a particular provider caches or batches in a particular way is quoting more than we measured.

**Should we just run the tests on the other model, then?** For this particular question, no — and that is the trap. The second model we have access to **never asks for clarification**: in 91 replies it committed to a mode every single time. The thing we are measuring is _whether the assistant commits or asks_, and on that model the answer is always "commits", so there is nothing to compare. The drift is a reason to measure more carefully, not a reason to change instruments to one that cannot see the phenomenon.

## How this fooled us, in order

| When              | What we saw                                  | What we concluded then                      | What it looks like now                                                                |
| ----------------- | -------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Early, 5 runs     | 1 in 5 versus 4 in 5                         | a real effect                               | luck — never beyond chance at that size; the gap shrank to ~14 points at 100 per side |
| 600 conversations | 59.3% then 47.0% for identical prompts       | batch variation, ban cross-batch comparison | the same drift, twelve points of it                                                   |
| 900 conversations | effect held its sign in all four quarters    | trust it                                    | still right — the quarterly check is what protected it                                |
| 200 conversations | 15% versus 45%, quarters +44/+20/+24/+20     | trust it                                    | still right, same reason                                                              |
| 600 conversations | one condition climbed 36% → 60%              | inconclusive, stop                          | the drift, caught in the act                                                          |
| 20 conversations  | the channel opens for hidden-intent requests | fine                                        | fine, but the numbers were never significant                                          |
| 400 conversations | one condition fell 32% → 8%                  | cannot read this round                      | the drift again, then confirmed by the fifty-cent test                                |

## What actually changes

**The directions survive. Some of the certificates do not.**

Every comparison we made was done side by side, in the same batch, with conditions alternating. That was the right instinct, and it is why the two results we care about still stand:

- A line that says what the answer must _not_ be made the assistant commit far more often than one stating an evidence standard.
- In the older list format, a mode placed last was picked far more often than the same mode placed first.

What does **not** survive is the statistical confidence we attached to them, because those calculations assumed that each conversation was independent of the next. When the whole run drifts, they are not — and the honest replacement is a comparison of neighbouring calls, which we then ran: the wording result won 238 of 288 adjacent pairs and the position result 94 of 107. The effects are real; the error bars were too tight.

**So does this mean the work only matters for "Gemini-like" models?** In part, yes — and it is worth being precise about which part. Three separate statements:

1. **The measurement** needs a model that asks. On a model that never asks, "does it commit or ask" has one possible answer and cannot be studied. That is a limit of the instrument, not of the catalogue.
2. **The finding** is model-specific by construction, and we said so before the drift appeared: the effect lives in the model's willingness to ask. A model that never asks does not get this advice.
3. **The catalogue advice** that survives is the part about _which_ mode gets chosen — and that is measurable on either kind of model, because it does not need an ask channel.

So: our wording advice applies where a model is willing to say "I need more information". That is a product-level statement as much as a statistical one, and it is the honest boundary of what a week of testing buys.

And one reading changes outright: **in the format our extension actually shows, the "last is better" effect disappears.** Same batch, same lines, side by side — 44% at the last position in the old format, 26% in the product's format. The advantage was in how the old test list was laid out, not in lists as such.

**And yes — every future round should carry a second model.** Not to average the two, which would be meaningless, but to report each model on the outcome _it can produce_: on the asking model, commit-versus-ask; on the non-asking model, which mode gets chosen. Two parallel readings, never pooled. The capability benchmark's own plan already flags model-specificity; this makes it a standing requirement rather than a caveat.

## The fix, in one line

**Compare things measured next to each other, never one after the other.** That is exactly the reason: if the machine on the other end changes from minute to minute, then two measurements taken together describe the same machine and two measurements taken an hour apart describe two different ones. We cannot freeze the machine; we can only make sure both sides of a comparison meet it at the same moment.

Concretely: alternate the conditions every few calls, and compare each pair of neighbours instead of comparing two grand totals. When we did that, the drift cancelled: the same 400 conversations that looked unreadable gave a clear answer — the old format's effect at +23 points, the product format at −9, and the difference between formats at −18.

## If you are doing this yourself

- Running version A today and version B tomorrow mostly measures **the hour**, not the versions.
- Running A and B alternately, minute by minute, is worth ten times more.
- Before trusting any comparison, run **the same thing twice** and see how much it moves. It costs fifty cents and it will change how you read everything else.

## What we are not saying

We are not saying the model is bad, or the provider is at fault, or that our earlier results were wrong. We are saying that a tool which varies by a quarter between calls cannot be used to detect a change of a tenth. That is a fact about the ruler, and it took a week to see because every test in the week looked, individually, fine.

The measurements are still ours. The error bars are now honest.

---

## Where these numbers come from

Every figure in this note is one batch's measurement of one model on one request, and is quoted from the programme's own record:

- **The five-and-five screen and its collapse** — the persona screen's deviation record (D-10) and the closing round's correction, log §6 and §13.
- **14–17 points on the closing round's ruler** — log §11 (the statistical decisions fixed before that round).
- **59.3% against 47.0%, and the 24-point drift** — log §§22, 27 and 36.
- **The arm that climbed 36% → 60% and the arm that fell 32% → 8%** — log §§23–24, 35.
- **238 of 288 and 94 of 107 adjacent pairs** — log §38.
- **+23, −9 and −18 points in the two layouts** — log §§35–36, re-derived in §44.

The full account, including the claims we withdrew and the defects we recorded, is the **[routing benchmark report](2026-11-19-routing-benchmark-report.md:1)**. Its §4.9 is this note in technical form; its §10 is what we got wrong.

_Keywords: `agentic-coding` · `agentic-ide` · `coding` · `vscodium-extension` · `llm-evaluation` · `reproducibility`_
