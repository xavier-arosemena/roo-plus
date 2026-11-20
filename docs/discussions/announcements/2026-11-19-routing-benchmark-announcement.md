# 🧭 We measured what actually changes a model's choice of mode

**Status:** published research summary. This describes measurements, not a release. No switch flips today.

---

When you send a request, something has to decide which mode handles it. Usually that is you, picking from a list. Sometimes it is the model, reading one line per mode and choosing. We spent 2,591 API calls finding out whether those lines — their wording, and their place in the list — actually decide anything. Here is what came back, and what we are changing as a result.

## 🏆 What we found

- **🧩 Wording moves the choice, hard.** A line saying what the answer must **not** be got the mode picked **89%** of the time. A same-length line saying what the answer must **contain** got **61.5%**. A 27.5-point gap — and it ran opposite to our prediction.
- **📍 Order moves it too: 15% at the top of the list, 45% at the bottom.** We can measure the gap. We cannot yet explain it, which is exactly why we are not building on it.
- **⚠️ Commitment is not correctness.** The bottom position bought 30 points of commits and **12 wrong commits per 100**; the top produced none. A question costs you a turn. A wrong mode costs you a task.
- **🎲 The same prompt does not get the same answer.** Identical prompts, sent twice, agreed only at chance — and never produced the same text twice.
- **🤖 Whether a model asks at all is the model's trait, not the catalogue's.** A second model, same request, same two lines: **zero questions in 91 replies**. The effect we measured lives in that difference.

## 🛠️ What we are changing because of it

Each item traces back to a measured number.

**1. Mode descriptions get sharper, not longer.** If wording beats ordering, a line that says which mode this is _not_ is worth writing. Our `whenToUse` sentences are being rewritten to be mutually exclusive — so two modes cannot both plausibly own the same request — and to name what the neighbouring mode produces instead.

**2. We will not reorder the list to quietly promote a mode.** Order shifts the choice by 30 points and we do not know why. Using position as a lever now would be guessing with your work. Placement will be weighed by **harm**, not uptake: modes that are expensive to invoke wrongly will not sit where they get picked casually.

**3. A clarifying question is a normal outcome, not a failure.** On the ambiguous request, the model never picked an unrelated mode — it either committed or asked. Asking is usually cheaper than a wrong commit, so neither the interface nor our documentation should treat a question as an error.

**4. "Try again" is a real remedy.** Identical prompts agree only at chance, so one bad routing is a sample, not proof of a bug. We will stop describing routing problems from single replies and quote a rate instead.

**5. The catalogue gets a regression test.** The most reusable output of this work is a cheap probe: send real requests at the picker, record whether the reply commits or asks, re-run it after a catalogue change. A rising ask rate on ordinary requests means the catalogue has stopped being able to decide — better in CI than in your issue tracker.

## 🧪 How we measured

One model, one list of 45 modes, one deliberately ambiguous request — _"explain why this module is structured the way it is"_ — and three experiments that changed one thing at a time: the line's wording (900 calls), its position (200), and which mode occupied the last slot (600). Predictions and thresholds were frozen **before** the data arrived. Every contrast was interleaved so drift could not masquerade as an effect. Every reply we could not classify automatically was judged twice, the second time blind by a different model — which reproduced the first reading on **99.7%** of replies.

## 🚫 What we are not claiming

- **Not about every request.** The effect holds on **one brief out of seven** we screened. It applies where _ownership is ambiguous_ — where more than one mode could reasonably take the job. On a specific request the model commits correctly almost always (598 of 600 in our closing round).
- **Not about you.** Every number is about one model on one brief. We make no claim about how humans read the same list.
- **Not a rule, and not settled.** It is one brief, one model, one list position: a strong number behind a hypothesis, not a law of mode design. Two claims from our first draft were wrong and are withdrawn in the full report — one of them our own inference about list order.

## 📖 Read the full report

The complete technical report — method, pre-registered tests, per-block stability checks, all nine annexes, the withdrawn claims, and a table telling you which file to open to check any number yourself:

**→ [Does a mode line's wording, or its position, decide what an agent picks?](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/discussions/research-reports/2026-11-19-routing-benchmark-report.md)**

Only want the two numbers that survived? §4.2 and §4.4. Want the honest limits? §6. Want to know what we got wrong? §10.

This is the first of two stages. The routing benchmark asks _how a mode is chosen_; the capability benchmark asks _what each mode does once it runs_. We will publish that the same way.

💬 If you reorder modes, write `whenToUse` lines, or have a request that keeps landing in the wrong place, say so in the replies. A real example is worth more than a synthetic brief, and screening one costs about twenty calls.

---

_Keywords: `agentic-coding` · `agentic-ide` · `coding` · `vscodium-extension` · `llm-evaluation` · `reproducibility`_

> **About Roo+.** Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.
