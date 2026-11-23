# The day our ruler wobbled

_A plain-language note on a measurement problem we found in our own testing. Written for readers who do not work on language models._

## The short version

We spent a week asking one question: **does the wording of a list change which item a model picks?** We built careful tests, spent real money, and got clean-looking answers.

Then we ran the same question **100 times without changing anything** — same list, same request, same model, same settings. The answer moved by 24 points.

Nothing about our list changed. The model simply answered differently depending on **when** we asked.

## What we were doing

Our product lets you pick a "mode" — a working style for the assistant. There are 45 of them, each with a one-line description. When the assistant sees your request it also sees that list, and it decides whether to commit to one mode or ask you a question first.

We wanted to know whether the _description lines_ affect that decision. So we wrote three versions of one line, ran hundreds of conversations, and counted how often the assistant committed.

Simple experiment. Same list, same request, one line changed.

## The first surprise, a week earlier

One early test gave **one answer in five** for one condition and **four in five** for another. A big, clean result. We ran it again with more conversations and it **reversed**.
[examples here]

We decided it had been luck: five conversations is almost nothing.

## The second surprise: the same thing, twice, disagreed

Later we ran 600 conversations. One batch of identical prompts scored 59.3%. Another batch of the same identical prompts scored 47.0%.

Same prompts. Same model. Twelve points apart.

We did not have an explanation, so we made a rule: **never compare numbers from two different batches.** Compare only within one batch, side by side. That rule saved the next two rounds — their effects held their sign quarter by quarter, so we trusted the direction even though the exact numbers wobbled.
[Is this whole thing a testament of LLM models non-deterministic behaviour? And is this common to all models or is a Gemini thing?]

## The third surprise: an arm that kept climbing

Next we ran a 100-minute test with three conditions that alternated. One of them started at 36% and ended at 60% — while the others did not move. [this makes it more interesting... It is not always present.]

A condition that climbs during a test is not a result, it is a moving target. We threw that round out and wrote it down as inconclusive.

Still no explanation. Just a pattern: **later calls look different from earlier calls.**

## The fourth surprise: the same thing happened again

Our most recent test had four conditions, alternating every four calls. One of them fell from 32% to 8% over the run, while the others stayed flat. By our own rule, that round could not be read.
[Why some, and not the others?]

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

We cannot see inside the provider, but three explanations are documented and all fit:

1. **The same input is not guaranteed to give the same output.** Google's own documentation says a fixed random seed is "best effort" and deterministic output is not guaranteed. The developer forums are full of the same complaint, even with randomness switched off.
2. **Caching.** Google caches common content automatically to save money and time. A help-page thread shows the same request being served from cache three times out of five, then not, then from cache again. Cached and uncached, the model is not reading quite the same context.
3. **Grouping.** Providers bundle requests together for efficiency, and the arithmetic depends on what else is in the bundle. What else is in flight depends on strangers' traffic, not on us. [this is the only one non-gemini?]
   [If gemini is the problem, we should run the tests with deepseek?]
   So: **the model on the other end is a slightly different machine every few minutes.** Not broken — just not the measuring instrument we assumed.

## How this fooled us, in order

| When              | What we saw                                  | What we concluded then                      | What it looks like now                                 |
| ----------------- | -------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| Early, 5 runs     | 1 in 5 versus 4 in 5                         | a real effect                               | luck, later reversed                                   |
| 600 conversations | 59.3% then 47.0% for identical prompts       | batch variation, ban cross-batch comparison | the same drift, twelve points of it                    |
| 900 conversations | effect held its sign in all four quarters    | trust it                                    | still right — the quarterly check is what protected it |
| 200 conversations | 15% versus 45%, quarters +44/+20/+24/+20     | trust it                                    | still right, same reason                               |
| 600 conversations | one condition climbed 36% → 60%              | inconclusive, stop                          | the drift, caught in the act                           |
| 20 conversations  | the channel opens for hidden-intent requests | fine                                        | fine, but the numbers were never significant           |
| 400 conversations | one condition fell 32% → 8%                  | cannot read this round                      | the drift again, then confirmed by the fifty-cent test |

## What actually changes

**The directions survive. Some of the certificates do not.**

Every comparison we made was done side by side, in the same batch, with conditions alternating. That was the right instinct, and it is why the two results we care about still stand:

- A line that says what the answer must _not_ be made the assistant commit far more often than one stating an evidence standard.
- In the older list format, a mode placed last was picked far more often than the same mode placed first.

What does **not** survive is the statistical confidence we attached to them, because those calculations assumed that each conversation was independent of the next. When the whole run drifts, they are not.

[So in short: if we use gemini we can not get statistical, because there is a drift introduced by the model. If we use deepseek we do not have anything to measure at all, because deepseek never asks. So all the fine-tuning we are doing for our modes is only relevant if the user is useing a model "gemini-like", and not relevant if is using a "deepseek-like¨?]

And one reading changes outright: **in the format our extension actually shows, the "last is better" effect disappears.** Same batch, same lines, side by side — 44% at the last position in the old format, 25% in the product's format. The advantage was in how the old test list was laid out, not in lists as such.

[Also seems like an argument for in the test round in the capability benchmar, and any other we may do, to do compare between models gemini/deepseek, as the results will get tainted by the model's weaknesses...]

## The fix, in one line

**Compare things measured next to each other, never one after the other.** [because the model's machine evolves per minute, we can only compare things done in the same machine, meaning at the same time?]

Concretely: alternate the conditions every few calls, and compare each pair of neighbours instead of comparing two grand totals. When we did that, the drift cancelled: the same 400 conversations that looked unreadable gave a clear answer — the old format's effect at +23 points, the product format at −9, and the difference between formats at −19.
[very interesting]

## If you are doing this yourself

- Running version A today and version B tomorrow mostly measures **the hour**, not the versions.
- Running A and B alternately, minute by minute, is worth ten times more.
- Before trusting any comparison, run **the same thing twice** and see how much it moves. It costs fifty cents and it will change how you read everything else.

## What we are not saying

We are not saying the model is bad, or the provider is at fault, or that our earlier results were wrong. We are saying that a tool which varies by a quarter between calls cannot be used to detect a change of a tenth. That is a fact about the ruler, and it took a week to see because every test in the week looked, individually, fine.

The measurements are still ours. The error bars are now honest.
