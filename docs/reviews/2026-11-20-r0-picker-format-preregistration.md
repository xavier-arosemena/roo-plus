# Pre-registration — R0: the picker format (template × field order) — revision 2

| Field          | Value                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Registered** | 2026-11-20, revised the same day **before any call**; revision 2 changes the sample plan and adds a second-model arm                                                                             |
| **Question**   | Does the rendered picker form — template and field order — change the **position** contrast (P45 − P1) or the **wording** contrast (C − B) that this report calls its results?                   |
| **Why**        | Every experiment rendered `- <slug> — <Name> — <whenToUse>`; the extension renders `* "<Name>" mode (<slug>) - <whenToUse>` under a `MODES` heading (log §32). No arm has used the product form. |
| **Status**     | Registered, **not run**                                                                                                                                                                          |

## 1. Hypotheses

| #                    | Hypothesis                                                                                                                                    | Predicts                                             | Falsified by                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| **H-format-null**    | The form changes nothing in direction or size                                                                                                 | both contrasts survive intact                        | either contrast changing sign, or moving ≥ 20 points         |
| **H-leading-token**  | Part of the position result is a **leading-token** effect: the fixture leads every line with the slug, the exact string the reply must return | P45 − P1 shrinks or reverses when the **name** leads | P45 − P1 ≥ 20 points with the same sign in a name-first form |
| **H-template-eased** | The slug-first line made the `whenToUse` sentence do less work                                                                                | C − B is **larger** on the product form              | C − B smaller on the product form                            |

The two are not symmetric, and both can hold at once. The order variants exist so a change in either cannot be blamed on the other.

## 2. Two looks, not three stages — and why that is cheaper

Revision 1 staged 100/arm, then 100/arm, then 400/arm: €2 + €2 + up to €8 = **€12** to resolve a band that only matters if the first look lands in it. That pays for fine resolution _everywhere_ in order to have it _somewhere_.

Instead: **look 1 at the resolution that answered the question the first time, and extension only where the estimate lands in the undecided band.**

The anchor is E20b itself: at **100 draws per arm** it resolved a 30-point difference. So 100/arm is sufficient to see the position effect survive roughly intact, or collapse. It is _not_ sufficient to separate 12 from 20 points — and that mid-band is precisely the band in which H-leading-token becomes interesting, so it is resolved only when the data say it is live.

| #                | Piece                                                           | Arms |  Calls | ≈ Cost | What it decides                                             |
| ---------------- | --------------------------------------------------------------- | ---- | -----: | -----: | ----------------------------------------------------------- |
| **Look 1**       | Position, the two real forms (1 vs 4), 100/arm                  | 2    |    200 |   €1.0 | does the 30-point gap survive the product form, or collapse |
| **Look 1**       | Wording, the two real forms (1 vs 4), 100/arm                   | 2    |    200 |   €1.0 | does 27.5 survive, grow, or collapse                        |
| **Extension**    | only the arms whose estimate lands in **[10, 20]**, to 300/arm  | ≤2   |   ≤400 |  ≤€2.0 | the undecided band, when it exists                          |
| **Attribution**  | arms 2 and 3 at 100/arm — **only if look 1 moved**              | 2    |    200 |   €1.0 | order or template — which one did it                        |
| **Second model** | DeepSeek, formats 1 vs 4, 100/arm, **mode-choice outcome only** | 2    |    200 |   €1.0 | whether the format moves _which_ mode is chosen             |
| **Ceiling**      | everything extended                                             | —    | ≤1,600 |  ≤€8.0 |                                                             |

**Expected spend ≈ €3. Worst case €8.** Attribution runs last, because attributing a null is worthless.

### 2a. Revision 3 — DeepSeek goes back into look 1, and both formats were never optional

Revision 2's first look ran **one model and one contrast**, on the reasoning that the product form is what users see so the fixture form had become uninteresting. That was wrong twice over, and both errors are worth recording rather than quietly fixed.

1. **The fixture arms are mandatory, not optional.** A format effect is a contrast _between_ the two forms, and M-9 forbids reading it across batches. Dropping the fixture arm would have left the product arm comparable to nothing — a cross-batch subtraction, which is the specific error §4.2 of the routing report was written to retract. The arm that makes the design legal is the one I had proposed to delete.
2. **DeepSeek is not a replication, so it is not redundant.** It cannot speak to commit-versus-ask — no reply asked in 91 draws — but it can speak to **which mode gets chosen**, and that is a different outcome measured in the same batch for the same money. Leaving it out saved nothing and lost the one model-level contrast the programme has never run.

Look 1 is therefore **six arms, 600 calls, ≈ €3**:

| Arm set | Model    | Contrast            |                 Outcome | Calls |
| ------- | -------- | ------------------- | ----------------------: | ----: |
| 1 vs 4  | Gemini   | position (P45 − P1) |           commit vs ask |   200 |
| 1 vs 4  | Gemini   | wording (C − B)     |           commit vs ask |   200 |
| 1 vs 4  | DeepSeek | format, same lines  | **declared owner** only |   200 |

Attribution (arms 2 and 3) stays conditional and runs only if look 1 moves, because a factor that explains a difference is only worth buying after a difference exists. Ceiling unchanged at **€8**.

## 3. The sequential rule, fixed now

- Look 1 is read **only** to decide whether to extend. Its estimates are not used for inference, and no result is quoted from it.
- Extension triggers mechanically: point estimate in **[10, 20] percentage points** for that specific contrast, whatever the sign. The rule does not consult anything else.
- Inference is read **once**, at the final n, with the confidence interval required to exclude zero. No optional stopping beyond this single pre-registered rule.
- A contrast whose arms fail stationarity (M-10) is reported **inconclusive** and its rule is not applied — the discipline E20c was held to.

## 4. Two models: primary and secondary, with different outcomes

Splitting the full design across Gemini and DeepSeek would double every arm to answer a question we can already partly answer. The log records why: on the second provider **no reply asked in 91 draws** (§4.8, §25). The commit-versus-ask channel — where both headline results live — **does not exist there**, so a cross-model arm cannot replicate either contrast. It would spend €4 to measure a degenerate outcome.

What DeepSeek _can_ measure is the other outcome: it always declares, so **which owner it declares** is observable. The report's own finding is that the wording lever "did not change which mode was chosen". A format arm on DeepSeek tests whether the _form_ changes it, at 200 calls.

| Model                | Arm set                         | Outcome                           | Role                                                                   |
| -------------------- | ------------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| **Gemini 3.5 Flash** | looks 1, extension, attribution | commit vs ask, and declared owner | **Primary.** The only model with an ask channel                        |
| **DeepSeek**         | formats 1 vs 4, 100/arm         | declared owner agreement only     | **Secondary**, a different outcome, never a replication of the primary |

The two are never pooled and never subtracted (M-9). If the format moves the mode-choice outcome on DeepSeek while leaving ask unchanged on Gemini, that is a coherent pair of findings, not a contradiction.

## 5. Instrument work that must land before the first call

1. **A new echo reference per format** — `echoLineFor(format)` exists for all four ([`framing-pretest.mjs`](../../scripts/lib/framing-pretest.mjs:242)).
2. **The product-form extractor validated for free against R2.** Twenty product-form replies with a hand adjudication already exist, and a v3 rule that agrees on 19 of 20 ([`runs/hidden-intent-screen-2026-11-20`](../../runs/hidden-intent-screen-2026-11-20)). The extractor must reproduce those 20 verdicts before any call. The one residual — an ask left `UNRESOLVED` — must be resolved by rule, not by hand.
3. **A digest-bound registration**: corpus, rendered picker text and extractor hashed into the registration, so a changed renderer is a new experiment by construction.

## 6. What this does not test

- **Not a new hypothesis** about wording or position; it is a construct check on two existing results.
- **Not the `MODES` heading as a separate factor.** Arms 3 and 4 both carry it. If the template effect is large, the heading is the next split.
- **Not human selection.**
- **Not the catalogue's content.** No line changes between arms.

## 7. What voids this registration

Changing a `whenToUse` line or the brief between arms; reading a contrast across batches; reading look 1 as a result; adding an arm after the data; scoring product-form replies with the fixture echo reference; extending an arm that was not in the pre-declared band.
