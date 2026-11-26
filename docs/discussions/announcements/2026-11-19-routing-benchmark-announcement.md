# 🧭 What actually changes a model's choice of mode — and one thing we got wrong

**Status:** published research summary, **revised 2026-11-23**. This describes measurements, not a release. One finding in the first version was wrong for the list our users actually see, and it is corrected below rather than quietly deleted.

---

When you send a request, something decides which mode handles it. Usually that is you. Sometimes it is the model, reading one line per mode and choosing. We spent a few thousand API calls finding out whether those lines — their wording, their place in the list, and how the line is laid out — actually decide anything.

Then we tested the test itself, found that it wobbles, and re-ran the important part the way the extension really renders a mode list. Here is what survived, and what did not.

## 🏆 What survived

- **🧩 The wording of a line moves the choice, hard.** A line saying what the answer must **not** be got the mode picked far more often than a same-length line saying what the answer must **contain**: 89% against 61.5% in our first layout, and **100% against 66.7%** in the layout the extension actually uses. Roughly a 27-to-33-point gap, in the opposite direction to our prediction.
- **✍️ Which word sits inside the quotes matters more than we knew.** Three namings of the same line, one batch: name quoted **78%**, slug quoted **45%**, slug quoted with the name in brackets **13%**. The rule that falls out: print the form the extension already prints, and keep the slug in the brackets.
- **⚠️ Commitment is not correctness.** In our first layout, the end of the list bought 30 points more commitments and **12 wrong commits per 100**. A question costs you a turn; a wrong mode costs you a task.
- **🎲 The same prompt does not get the same answer.** Two dispatches of identical prompts agreed only at chance, and **100 identical calls with nothing changed moved 24 points inside one run**.
- **🤖 Whether a model asks at all is the model's trait.** A second model, same request, same two lines: **zero questions in 91 replies**. Everything we measure here lives in that difference.

## 🔄 What we got wrong

**We told you that placing a mode at the end of the list made it far more likely to be picked.** That was true of the list our _tests_ used. It is **not true of the list your extension shows**: in the real rendering the same comparison reads 35% against 26% — nine points the other way, and indistinguishable from noise. The advice is withdrawn, not softened. The research report now says so in its own section, and the withdrawal is listed with the others.

**We also compared numbers across days more confidently than we should have.** A 24-point swing with nothing changed means two runs are two afternoons, not two conditions. Every comparison in the report that still stands was measured side by side, within one batch, and now carries a paired test: the wording result wins **238 of 288** adjacent pairs, the position result 94 of 107.

**And our test list was not your list.** The experiments rendered `- slug — Name — description`; the extension renders `* "Name" mode (slug) - description`. We only discovered this by reading our own code against our own archived prompts. Within every experiment all versions shared one layout, so the comparisons were still fair — but the sentence "we tested what your extension shows" was not true until this month.

## 🛠️ What we are changing because of it

**1. Mode lines get a clause that excludes, not just a clause that includes.** "Must not merely describe the code" outperformed "must cite evidence" in both layouts, and by more in the real one. Expect lines that tell you what the mode is _for_ and what it is not.

**2. The line format stays exactly as it is.** Name in quotes, slug in brackets. The quoted word is worth up to 65 points; the brackets cost nothing; a shorter line that drops the name saves 761 characters and loses 33 points. The product was already right here — the tests were the thing that was off.

**3. A clarifying question stays a normal outcome.** In the real layout, our best-performing line committed in **84 of 84 calls and asked nothing at all**. That looks like a great number and is the wrong thing to design in: on an ambiguous request, the assistant should be able to say "I need the file". So the wording rule ships with an ask route, not instead of one.

**4. We will not use list order as a lever.** We measured a difference in one layout, could not explain it, and then could not reproduce it in the layout that matters. There is no placement rule to follow, and we are not going to invent one.

**5. "Try again" is a real remedy, and a single bad routing is not a bug report.** Identical prompts agree only at chance. One odd result is a sample.

**6. When we compare catalogue changes, we will compare neighbours, not totals.** Alternate the versions every few calls and compare each against the one next to it. That is what turned an unreadable 400-call batch into a clear answer, and it is the most transferable thing we learned.

## 🧪 How we measured

One model, one list of 45 modes, one deliberately ambiguous request — _"explain why this module is structured the way it is"_ — and three experiments that changed one thing at a time (900, 200 and 600 calls). Then a follow-up round of 1,588 calls in the extension's own rendering, plus **one hundred calls that changed nothing at all** to measure how much the instrument moves on its own.

Predictions and thresholds were frozen before the data. Replies we could not classify automatically were judged twice, the second time blind by a different model — which reproduced the first reading on **99.7%** of them. Where the old statistics assumed each call was independent, we replaced them with comparisons between neighbouring calls, which does not.

## 🚫 What we are not claiming

- **Not about every request.** The effect holds on **one brief out of seven** we screened. It applies where _ownership is ambiguous_ — where more than one mode could reasonably take the job. On a specific request the model commits correctly almost always (598 of 600).
- **Not about you.** Every number is about one model on one brief. Nothing here is a claim about how people read the same list.
- **Not a percentage you can quote.** No absolute rate survives being compared across runs. Directions, paired comparisons and batch identity travel; bare percentages do not.
- **Not finished.** Five claims from the first version are withdrawn in the full report, and the position result is the most recent of them.

## 📖 Read more

**The full technical report** — method, pre-registered tests, the product-rendering round, the drift measurement, all ten annexes, and a table telling you which file to open to check any number yourself:

**→ [Does a mode line's wording, or its position, decide what an agent picks?](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/discussions/research-reports/2026-11-19-routing-benchmark-report.md)**

**The plain-language version of the drift story**, if you want the 24-point surprise without the statistics:

**→ [The day our ruler wobbled](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/discussions/research-reports/2026-11-20-the-ruler-wobbled.md)**

💬 If you write `whenToUse` lines, or have a request that keeps landing in the wrong place, say so in the replies. A real example is worth more than a synthetic brief, and screening one costs about twenty calls.

---

_Keywords: `agentic-coding` · `agentic-ide` · `coding` · `vscodium-extension` · `llm-evaluation` · `reproducibility`_

> **About Roo+.** Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.
