# Independent second reading of the adjudication packets — 2026-11-18

**Purpose.** Produce the missing blind second pass over every reply the mechanical
extractor could not classify, using the second provider's model as the reader, so
the red team's objection ("13.2% coverage, same person") can be tested by a
different model on replies it has never seen.

**Status: the second reading DISAGREES with the first, systematically.** It is
mechanically usable (619/619 judged, 0 nulls, 0 call failures) but it is not a
replication of pass 1 and must not be published as corroboration. The cause is a
single sentence of tension inside the fixed prompt (see §7).

---

## 1. Inventory and verification

| Packet                                           | Entries | Verifier | Join (used by the verifier/merge only)        |
| ------------------------------------------------ | ------: | -------- | --------------------------------------------- |
| `runs/e20-2026-11-17/adjudication/packet.jsonl`  |     246 | PASS     | `runs/e20-2026-11-17/adjudication-join.json`  |
| `runs/e20b-2026-11-16/adjudication/packet.jsonl` |     132 | PASS     | `runs/e20b-2026-11-16/adjudication-join.json` |
| `runs/e20c-2026-11-17/adjudication/packet.jsonl` |     241 | PASS     | `runs/e20c-2026-11-17/adjudication-join.json` |
| **Total**                                        | **619** |          |                                               |

Each packet was verified with its own tool before any call:

```
node scripts/build-adjudication-packet.mjs --verify <packet dir> --join <join>
```

All three printed `blindness: PASS`. No join file was opened by hand. No entry
was judged from an unverified packet.

## 2. Method

- Prompt and parser: [`scripts/lib/adjudication-classifier.mjs`](../../scripts/lib/adjudication-classifier.mjs) —
  the registered wording is fixed in one constant; the parser accepts exactly one
  of `DECLARATION`, `ASK`, `OTHER` (case-insensitive, surrounding whitespace only).
- Runner: [`scripts/adjudicate-with-model.mjs`](../../scripts/adjudicate-with-model.mjs) —
  temperature 0, `max_tokens: 8192` (not 4096, D-24), concurrency 4 with strictly
  sequential workers, exponential backoff on 429/5xx, at most 3 retries per entry,
  abort after 10 consecutive call failures or immediately on 401/403/404.
- Model: `deepseek-v4-pro` at `api.deepseek.com/v1/chat/completions` (the second
  provider). Only the key length (35) was printed.
- Outputs: `judgements-deepseek.jsonl` beside each packet, records
  `{ id, verdict, raw, attempts }`.

## 3. Per-packet results (second reading)

| Packet    | Entries | DECLARATION |    ASK | OTHER | Nulls | Call failures |
| --------- | ------: | ----------: | -----: | ----: | ----: | ------------: |
| e20       |     246 |         226 |     14 |     6 |     0 |             0 |
| e20b      |     132 |         122 |     10 |     0 |     0 |             0 |
| e20c      |     241 |         227 |     11 |     3 |     0 |             0 |
| **Total** | **619** |     **575** | **35** | **9** | **0** |         **0** |

No packet had a null rate above 10% (all were 0%). No auth or endpoint error was
returned. Every entry was judged on its first attempt (619 attempts for 619
entries).

## 4. Agreement with pass 1, and the disagreeing ids

| Packet       | Entries |  Agree | Agreement | Disagree |
| ------------ | ------: | -----: | --------: | -------: |
| e20          |     246 |     27 | **11.0%** |      219 |
| e20b         |     132 |     15 | **11.4%** |      117 |
| **Combined** | **378** | **42** | **11.1%** |  **336** |

Disagreement structure (second reading first, pass 1 second):

| Pattern                           | e20 | e20b |
| --------------------------------- | --: | ---: |
| second DECLARATION / pass 1 ASK   | 211 |  117 |
| second OTHER / pass 1 DECLARATION |   6 |    0 |
| second ASK / pass 1 DECLARATION   |   2 |    0 |

So 328 of the 336 disagreements are the same move: a reply pass 1 called an ASK,
the second reader calls a DECLARATION.

The complete list of all 378 comparisons is in
[`second-reading-disagreements.tsv`](second-reading-disagreements.tsv) and in
Appendix A below (336 disagreeing ids with both verdicts).

## 5. E20c (no first pass)

No pass-1 judgement file exists for e20c, so only the distribution is reported:

| Blind arm | Entries | DECLARATION |    ASK | OTHER | Nulls |
| --------- | ------: | ----------: | -----: | ----: | ----: |
| ARM-1     |      80 |          72 |      6 |     2 |     0 |
| ARM-2     |     105 |         101 |      3 |     1 |     0 |
| ARM-3     |      56 |          54 |      2 |     0 |     0 |
| **Total** | **241** |     **227** | **11** | **3** | **0** |

## 6. Headline numbers, second reading beside the first

Arm mapping comes from `plan.json` cycle position (pos 1 = A/X, pos 2 = B/Y,
pos 3 = C/Z); the join files were not opened by hand. Rates use the registered n.

**E20 — declared-key rate per arm**

| Arm | Blind label |   n | First reading   | Second reading       |
| --- | ----------- | --: | --------------- | -------------------- |
| A   | ARM-2       | 100 | 75/100 = 75.0%  | **97/100 = 97.0%**   |
| B   | ARM-1       | 400 | 246/400 = 61.5% | **392/400 = 98.0%**  |
| C   | ARM-3       | 400 | 356/400 = 89.0% | **391/400 = 97.75%** |

**B minus C: first −27.5 points; second +0.25 points (392 vs 391 in 400).**

**E20b — first versus last**

| Position   | Blind label |   n | First reading             | Second reading                            |
| ---------- | ----------- | --: | ------------------------- | ----------------------------------------- |
| first (P1) | ARM-2       | 100 | 16/100 = 16.0%            | **92/100 = 92.0%**                        |
| last (P45) | ARM-1       | 100 | 45/100 = 45.0% (12 wrong) | **87/100 = 87.0%** (11 wrong, mechanical) |

**First minus last: first −29.0 points; second +5.0 points.**

**E20c — X / Y / Z declared-key rates**

| Arm | Blind label |   n | First reading (mechanical) | Second reading      |
| --- | ----------- | --: | -------------------------- | ------------------- |
| X   | ARM-2       | 200 | 47.0%                      | **195/200 = 97.5%** |
| Y   | ARM-1       | 200 | 60.0%                      | **192/200 = 96.0%** |
| Z   | ARM-3       | 200 | 71.5%                      | **197/200 = 98.5%** |

Caveat on all second-reading "declared key" counts: the merge counts **every**
adjudicated DECLARATION as a declared key, because the verdict vocabulary carries
no slug. These rates are therefore upper bounds. A reply that lists
`explain`, `architecture-reviewer` and `codebase-cartographer` while asking for
the code is counted as a declared key even though it committed to none of them.

## 7. Why the readings differ (and why that matters)

The fixed prompt contains both:

> DECLARATION - the reply names a mode it will use.

and

> Tie-break rule: if the reply names a mode anywhere, it is a DECLARATION, even
> when it also asks for information afterwards.

The second reader applied the tie-break literally. Typical disputed reply:

> "To determine which mode fits this request, I need the following information:
>
> 1. The code or layout of the module … 2. whether you want to understand the
>    rationale (`explain`), the architecture (`architecture-reviewer`), or the
>    dependency map (`codebase-cartographer`)."

That names registered modes, so the reader returns DECLARATION; pass 1 treated
the absence of a commitment as ASK.

Evidence that this is a definitional difference, not hallucination: of the 226
e20 DECLARATION verdicts, 211 contain a backticked registered slug and 15 contain
a bare registered slug — every one names a real mode. Of the 211
DECLARATION-vs-ASK disagreements, 202 contain a backticked slug and 9 a bare
slug; none lacks a mode name.

The same-person partial second pass also disagrees with this reading:
e20 16/33 agree (48.5%), e20b 5/17 (29.4%). The divergence is stable across
readers and points at the prompt's two sentences, not at sampling noise.

**Consequence.** The second reading saturates the declared-key rate (96–98.5%)
and collapses the E20 B−C gap from −27.5 points to +0.25. That is not evidence
that the first reading was wrong; it is evidence that the tie-break sentence is
indeterminate between "mentions a candidate" and "commits to a mode". The
published counts are sensitive to that choice. Before any decision, the construct
must be fixed (commitment, not mention; and either a slug in the verdict or a
rule for multi-candidate replies) and the pass rerun.

## 8. Spend and deviations

| Packet    | Prompt tokens | Completion tokens (reasoning) |       Total | Attempts |      Estimated cost |
| --------- | ------------: | ----------------------------: | ----------: | -------: | ------------------: |
| e20       |        85,653 |               37,102 (35,932) |     122,755 |      246 |             $0.0702 |
| e20b      |        46,241 |               16,197 (15,567) |      62,438 |      132 |             $0.0333 |
| e20c      |        84,085 |               35,040 (33,877) |     119,125 |      241 |             $0.0673 |
| **Total** |   **215,979** |           **88,339 (85,376)** | **304,318** |  **619** | **$0.1708 ≈ €0.16** |

Cost uses the runner's upper-bound assumption of $0.30/M input and $1.20/M
output; the raw token counts are given so the figure can be recomputed at the
real tariff. The $1.20 soft budget never approached.

Deviations recorded:

1. Two smoke runs of 4 entries each (same first four e20 ids) preceded the full
   pass: 8 extra calls, 2,592 prompt and 1,316 completion tokens, ≈$0.002.
2. Existing partial second-pass files (`judgements-e20-pass2-partial.jsonl`,
   33 entries; `judgements-e20b-pass2-partial.jsonl`, 17 entries) were **not**
   used as the second pass; they were compared post hoc only (§7).
3. The report reads `plan.json` to map blind labels to A/B/C and X/Y/Z for the
   required per-arm presentation; it does not open a join file by hand.
4. No nulls, no retries, no 429/5xx, no auth/endpoint errors. `max_tokens` was
   8192 throughout (never 4096).
5. No documentation under `docs/` was edited, no commit was made, and no API key
   was printed or written.

## 9. Plain statement

The second reading is **usable as a measurement and unusable as corroboration**.
It judged all 619 replies with 0 nulls and agrees with the first pass on only
11.1% of the 378 replies both passes covered. The disagreement is systematic and
traceable to the tie-break sentence in the fixed prompt. The headline numbers
under this reading are reported above beside the first, but they should be read
as a sensitivity result, not as a replication.

## Appendix A — all 336 disagreeing ids (second reading vs pass 1)

- e20 `0200e76f2ed5` — second=DECLARATION, pass1=ASK
- e20 `0413db80afb1` — second=DECLARATION, pass1=ASK
- e20 `047e8aa5180c` — second=DECLARATION, pass1=ASK
- e20 `04940e8f3506` — second=DECLARATION, pass1=ASK
- e20 `06661cab1a7f` — second=DECLARATION, pass1=ASK
- e20 `07bf9997d929` — second=DECLARATION, pass1=ASK
- e20 `089ddaf4d8c4` — second=DECLARATION, pass1=ASK
- e20 `0abdd5274a96` — second=DECLARATION, pass1=ASK
- e20 `0b3eb02e8dcf` — second=DECLARATION, pass1=ASK
- e20 `0bbac488402b` — second=DECLARATION, pass1=ASK
- e20 `0c0628a56997` — second=DECLARATION, pass1=ASK
- e20 `0c89583c4388` — second=DECLARATION, pass1=ASK
- e20 `0cb5c01178bd` — second=DECLARATION, pass1=ASK
- e20 `0d6e74388a28` — second=DECLARATION, pass1=ASK
- e20 `0e000e4dcf96` — second=DECLARATION, pass1=ASK
- e20 `0e41fa0a3c4b` — second=DECLARATION, pass1=ASK
- e20 `100c841e8759` — second=DECLARATION, pass1=ASK
- e20 `1036770b6e22` — second=DECLARATION, pass1=ASK
- e20 `14881adc4f42` — second=DECLARATION, pass1=ASK
- e20 `150cfb0797ff` — second=DECLARATION, pass1=ASK
- e20 `1545151d86dd` — second=DECLARATION, pass1=ASK
- e20 `17efb2dc7a34` — second=OTHER, pass1=DECLARATION
- e20 `1822c54545ae` — second=DECLARATION, pass1=ASK
- e20 `1909086354db` — second=DECLARATION, pass1=ASK
- e20 `19da65500e4a` — second=DECLARATION, pass1=ASK
- e20 `1ade2e1332a4` — second=DECLARATION, pass1=ASK
- e20 `1ec8c9a7f501` — second=DECLARATION, pass1=ASK
- e20 `214e5f9125a7` — second=DECLARATION, pass1=ASK
- e20 `222d17eba62b` — second=DECLARATION, pass1=ASK
- e20 `2279bf5987ea` — second=DECLARATION, pass1=ASK
- e20 `2293e330745f` — second=DECLARATION, pass1=ASK
- e20 `23f721250d19` — second=DECLARATION, pass1=ASK
- e20 `243b0f0b51c9` — second=DECLARATION, pass1=ASK
- e20 `265aafe75ac4` — second=DECLARATION, pass1=ASK
- e20 `267b9ac3652a` — second=DECLARATION, pass1=ASK
- e20 `27e247c4e0c6` — second=DECLARATION, pass1=ASK
- e20 `29cde91a5ca2` — second=DECLARATION, pass1=ASK
- e20 `29f896a01a90` — second=DECLARATION, pass1=ASK
- e20 `2a0e3b455e22` — second=DECLARATION, pass1=ASK
- e20 `2ab86dbf8ff0` — second=DECLARATION, pass1=ASK
- e20 `2afc59bbc42f` — second=DECLARATION, pass1=ASK
- e20 `2bdec5d625cd` — second=DECLARATION, pass1=ASK
- e20 `2c654e06bb88` — second=DECLARATION, pass1=ASK
- e20 `2d3975a73a3f` — second=DECLARATION, pass1=ASK
- e20 `31e95b7ed948` — second=OTHER, pass1=DECLARATION
- e20 `31fd2f9b00c5` — second=DECLARATION, pass1=ASK
- e20 `3259379c8687` — second=DECLARATION, pass1=ASK
- e20 `327537a59c57` — second=DECLARATION, pass1=ASK
- e20 `33c6c053bca7` — second=DECLARATION, pass1=ASK
- e20 `33df7dc6093e` — second=OTHER, pass1=DECLARATION
- e20 `34cc7df0862e` — second=DECLARATION, pass1=ASK
- e20 `359ae92dfa4d` — second=DECLARATION, pass1=ASK
- e20 `36df70a97bc0` — second=DECLARATION, pass1=ASK
- e20 `36f8b1de3a59` — second=DECLARATION, pass1=ASK
- e20 `3919cc1fc1ef` — second=DECLARATION, pass1=ASK
- e20 `397c9265a216` — second=DECLARATION, pass1=ASK
- e20 `3989a146c055` — second=DECLARATION, pass1=ASK
- e20 `3a107ff4de32` — second=DECLARATION, pass1=ASK
- e20 `3a6f34056c53` — second=OTHER, pass1=DECLARATION
- e20 `3edede05fc73` — second=DECLARATION, pass1=ASK
- e20 `3ffafb3c48d8` — second=DECLARATION, pass1=ASK
- e20 `409024df7f26` — second=DECLARATION, pass1=ASK
- e20 `418cadc73cd3` — second=DECLARATION, pass1=ASK
- e20 `426d6e3c3958` — second=ASK, pass1=DECLARATION
- e20 `43858fa4c129` — second=DECLARATION, pass1=ASK
- e20 `446c58a762fa` — second=DECLARATION, pass1=ASK
- e20 `4503c0815db2` — second=DECLARATION, pass1=ASK
- e20 `46646315dcf5` — second=DECLARATION, pass1=ASK
- e20 `4706d11d892a` — second=DECLARATION, pass1=ASK
- e20 `48b1c86e2abc` — second=DECLARATION, pass1=ASK
- e20 `4d915283fa9b` — second=DECLARATION, pass1=ASK
- e20 `4e6c40d6eb91` — second=DECLARATION, pass1=ASK
- e20 `4efb4d8f4ded` — second=DECLARATION, pass1=ASK
- e20 `5009da05ef1d` — second=DECLARATION, pass1=ASK
- e20 `55026d83c49f` — second=DECLARATION, pass1=ASK
- e20 `5526e4d013a7` — second=DECLARATION, pass1=ASK
- e20 `5549f4c0e8db` — second=DECLARATION, pass1=ASK
- e20 `56e4332bb459` — second=DECLARATION, pass1=ASK
- e20 `57e4f6eb5289` — second=DECLARATION, pass1=ASK
- e20 `5802eac811c6` — second=OTHER, pass1=DECLARATION
- e20 `5afc908ce307` — second=DECLARATION, pass1=ASK
- e20 `5b6ffed746c5` — second=DECLARATION, pass1=ASK
- e20 `5d5a4dd45a44` — second=DECLARATION, pass1=ASK
- e20 `5e2b76d7aa87` — second=DECLARATION, pass1=ASK
- e20 `5fcc950871fa` — second=DECLARATION, pass1=ASK
- e20 `6011968f339e` — second=DECLARATION, pass1=ASK
- e20 `61478a26f1ea` — second=DECLARATION, pass1=ASK
- e20 `63cfd31eac8e` — second=DECLARATION, pass1=ASK
- e20 `64cd00a1931e` — second=DECLARATION, pass1=ASK
- e20 `66b64f816114` — second=DECLARATION, pass1=ASK
- e20 `677a1d07f348` — second=DECLARATION, pass1=ASK
- e20 `68a52a32099b` — second=DECLARATION, pass1=ASK
- e20 `698f36f134c1` — second=DECLARATION, pass1=ASK
- e20 `69da1d473f3d` — second=DECLARATION, pass1=ASK
- e20 `69f6831f707b` — second=DECLARATION, pass1=ASK
- e20 `6a195a2df31b` — second=DECLARATION, pass1=ASK
- e20 `6a6c5fe069ec` — second=DECLARATION, pass1=ASK
- e20 `6aad7e854dc6` — second=DECLARATION, pass1=ASK
- e20 `6b8511936a4d` — second=DECLARATION, pass1=ASK
- e20 `6f938468c341` — second=DECLARATION, pass1=ASK
- e20 `7002fa79b274` — second=DECLARATION, pass1=ASK
- e20 `7004cf9893cf` — second=DECLARATION, pass1=ASK
- e20 `7020c186be98` — second=DECLARATION, pass1=ASK
- e20 `719dd39f9ba5` — second=DECLARATION, pass1=ASK
- e20 `71d33095dcac` — second=DECLARATION, pass1=ASK
- e20 `748d95cd9164` — second=DECLARATION, pass1=ASK
- e20 `7783a9932bfe` — second=DECLARATION, pass1=ASK
- e20 `7814bd9183d4` — second=DECLARATION, pass1=ASK
- e20 `7b9fe2ca2d23` — second=DECLARATION, pass1=ASK
- e20 `7bae42164704` — second=DECLARATION, pass1=ASK
- e20 `7e6c0d0cffc1` — second=DECLARATION, pass1=ASK
- e20 `7ef7232fdba4` — second=DECLARATION, pass1=ASK
- e20 `80983dedee85` — second=DECLARATION, pass1=ASK
- e20 `80a61a53dc94` — second=DECLARATION, pass1=ASK
- e20 `8192e242d3c0` — second=DECLARATION, pass1=ASK
- e20 `823184f05289` — second=DECLARATION, pass1=ASK
- e20 `82f8d367d8bf` — second=DECLARATION, pass1=ASK
- e20 `83d0eed696d0` — second=DECLARATION, pass1=ASK
- e20 `842aad3d8808` — second=DECLARATION, pass1=ASK
- e20 `86521f91569f` — second=DECLARATION, pass1=ASK
- e20 `873033d79e55` — second=DECLARATION, pass1=ASK
- e20 `890fa8f6391a` — second=DECLARATION, pass1=ASK
- e20 `8a8b9bd03aaf` — second=DECLARATION, pass1=ASK
- e20 `8ab0f7c52c5f` — second=DECLARATION, pass1=ASK
- e20 `8ae16ac82945` — second=DECLARATION, pass1=ASK
- e20 `906fa60d01be` — second=DECLARATION, pass1=ASK
- e20 `9114f152f40a` — second=DECLARATION, pass1=ASK
- e20 `91798242e208` — second=DECLARATION, pass1=ASK
- e20 `92744a93ad9c` — second=DECLARATION, pass1=ASK
- e20 `928337575d70` — second=DECLARATION, pass1=ASK
- e20 `92864de80bba` — second=DECLARATION, pass1=ASK
- e20 `92b80306e6b1` — second=DECLARATION, pass1=ASK
- e20 `92c9483ac99c` — second=DECLARATION, pass1=ASK
- e20 `93bf4c6fa468` — second=DECLARATION, pass1=ASK
- e20 `95192a3c01fc` — second=DECLARATION, pass1=ASK
- e20 `9566515e18b0` — second=DECLARATION, pass1=ASK
- e20 `98ed77b95ee4` — second=DECLARATION, pass1=ASK
- e20 `9a04ae86a308` — second=DECLARATION, pass1=ASK
- e20 `9a47aa5b6eb0` — second=DECLARATION, pass1=ASK
- e20 `9ae4bc98d49d` — second=DECLARATION, pass1=ASK
- e20 `9bc530b7d84b` — second=DECLARATION, pass1=ASK
- e20 `9bf5ca41a16b` — second=DECLARATION, pass1=ASK
- e20 `9dcd7682c0dd` — second=DECLARATION, pass1=ASK
- e20 `9fdd6e035925` — second=DECLARATION, pass1=ASK
- e20 `a06e4663dcb5` — second=DECLARATION, pass1=ASK
- e20 `a0efcdc91dd1` — second=DECLARATION, pass1=ASK
- e20 `a116f033e028` — second=DECLARATION, pass1=ASK
- e20 `a145320c5a29` — second=DECLARATION, pass1=ASK
- e20 `a1954686e9a5` — second=DECLARATION, pass1=ASK
- e20 `a4a027054043` — second=DECLARATION, pass1=ASK
- e20 `a9221f48bde9` — second=DECLARATION, pass1=ASK
- e20 `a9fe0dd6312c` — second=DECLARATION, pass1=ASK
- e20 `aaa9b5b6b07d` — second=DECLARATION, pass1=ASK
- e20 `ab2bacbe01d6` — second=DECLARATION, pass1=ASK
- e20 `ab5d3dccd866` — second=DECLARATION, pass1=ASK
- e20 `acf153465b95` — second=DECLARATION, pass1=ASK
- e20 `b04f50f1c466` — second=DECLARATION, pass1=ASK
- e20 `b2f19f55bfaf` — second=DECLARATION, pass1=ASK
- e20 `b32ff6d56482` — second=DECLARATION, pass1=ASK
- e20 `b5236c344a61` — second=DECLARATION, pass1=ASK
- e20 `b6da1e768c01` — second=DECLARATION, pass1=ASK
- e20 `b70997647a1e` — second=DECLARATION, pass1=ASK
- e20 `b905bbaaf13c` — second=DECLARATION, pass1=ASK
- e20 `bb93653f931c` — second=DECLARATION, pass1=ASK
- e20 `bd166a30019b` — second=DECLARATION, pass1=ASK
- e20 `c00f1c8b3f1f` — second=DECLARATION, pass1=ASK
- e20 `c07d116f34ff` — second=DECLARATION, pass1=ASK
- e20 `c0bfc3487e31` — second=DECLARATION, pass1=ASK
- e20 `c2229b3d87c8` — second=DECLARATION, pass1=ASK
- e20 `c60424c9b0e3` — second=DECLARATION, pass1=ASK
- e20 `c6a4dc9af118` — second=DECLARATION, pass1=ASK
- e20 `c916b88d81c4` — second=DECLARATION, pass1=ASK
- e20 `c9ba01e21386` — second=DECLARATION, pass1=ASK
- e20 `cb8a508d62a1` — second=DECLARATION, pass1=ASK
- e20 `cb9a16f5e97b` — second=DECLARATION, pass1=ASK
- e20 `cdb6cb107895` — second=DECLARATION, pass1=ASK
- e20 `cde3c6d9480f` — second=ASK, pass1=DECLARATION
- e20 `ce405ff72575` — second=DECLARATION, pass1=ASK
- e20 `d0fd090f0b48` — second=DECLARATION, pass1=ASK
- e20 `d13ea78a657f` — second=DECLARATION, pass1=ASK
- e20 `d36ec48ddea3` — second=DECLARATION, pass1=ASK
- e20 `d3c7e9238b58` — second=DECLARATION, pass1=ASK
- e20 `d3c85e5dd1b1` — second=DECLARATION, pass1=ASK
- e20 `d408e8eac9aa` — second=DECLARATION, pass1=ASK
- e20 `d6816b82d935` — second=DECLARATION, pass1=ASK
- e20 `d6de73ea6c79` — second=DECLARATION, pass1=ASK
- e20 `d79edc9f2b4b` — second=DECLARATION, pass1=ASK
- e20 `d8f2d101d750` — second=DECLARATION, pass1=ASK
- e20 `d932f214574c` — second=DECLARATION, pass1=ASK
- e20 `dabc785f8f69` — second=DECLARATION, pass1=ASK
- e20 `db0fb4cfafd5` — second=DECLARATION, pass1=ASK
- e20 `dfc4fdd9cd8c` — second=DECLARATION, pass1=ASK
- e20 `e121f272aa59` — second=DECLARATION, pass1=ASK
- e20 `e1e322b7c394` — second=DECLARATION, pass1=ASK
- e20 `e67f04b3d22e` — second=DECLARATION, pass1=ASK
- e20 `e76e553e464b` — second=DECLARATION, pass1=ASK
- e20 `e7851bc67bcf` — second=DECLARATION, pass1=ASK
- e20 `e7f2f2bbc441` — second=OTHER, pass1=DECLARATION
- e20 `e8aff6f646b4` — second=DECLARATION, pass1=ASK
- e20 `e8e0004e6cb4` — second=DECLARATION, pass1=ASK
- e20 `ef0aa1034f0f` — second=DECLARATION, pass1=ASK
- e20 `f04f1aa59308` — second=DECLARATION, pass1=ASK
- e20 `f095f713c632` — second=DECLARATION, pass1=ASK
- e20 `f21d29a5a32d` — second=DECLARATION, pass1=ASK
- e20 `f3448bd732ec` — second=DECLARATION, pass1=ASK
- e20 `f460937d2508` — second=DECLARATION, pass1=ASK
- e20 `f4a3cb151761` — second=DECLARATION, pass1=ASK
- e20 `f6350de6e6b2` — second=DECLARATION, pass1=ASK
- e20 `f68bdaebd577` — second=DECLARATION, pass1=ASK
- e20 `f69dba37caca` — second=DECLARATION, pass1=ASK
- e20 `f7a838984d9a` — second=DECLARATION, pass1=ASK
- e20 `f7b4ef95db4e` — second=DECLARATION, pass1=ASK
- e20 `f7eca1a6e9c4` — second=DECLARATION, pass1=ASK
- e20 `fa6ef3514a0e` — second=DECLARATION, pass1=ASK
- e20 `faa5385949a3` — second=DECLARATION, pass1=ASK
- e20 `fd5825febb56` — second=DECLARATION, pass1=ASK
- e20 `fd7b19f6b9b7` — second=DECLARATION, pass1=ASK
- e20 `fe135b9484f8` — second=DECLARATION, pass1=ASK
- e20 `fe45c05663dd` — second=DECLARATION, pass1=ASK
- e20b `009c4a6ad58b` — second=DECLARATION, pass1=ASK
- e20b `04940e8f3506` — second=DECLARATION, pass1=ASK
- e20b `07bf9997d929` — second=DECLARATION, pass1=ASK
- e20b `0abdd5274a96` — second=DECLARATION, pass1=ASK
- e20b `0ba00fb59c09` — second=DECLARATION, pass1=ASK
- e20b `0bbfe910df32` — second=DECLARATION, pass1=ASK
- e20b `0c89583c4388` — second=DECLARATION, pass1=ASK
- e20b `11c9c3ec9cb5` — second=DECLARATION, pass1=ASK
- e20b `149f27e12cd0` — second=DECLARATION, pass1=ASK
- e20b `14a8ea85a8ba` — second=DECLARATION, pass1=ASK
- e20b `150cfb0797ff` — second=DECLARATION, pass1=ASK
- e20b `153808462625` — second=DECLARATION, pass1=ASK
- e20b `16bded3ad19f` — second=DECLARATION, pass1=ASK
- e20b `1b174687e1fa` — second=DECLARATION, pass1=ASK
- e20b `1b2b520f0b87` — second=DECLARATION, pass1=ASK
- e20b `1b76f47a1cbd` — second=DECLARATION, pass1=ASK
- e20b `214e5f9125a7` — second=DECLARATION, pass1=ASK
- e20b `22a661ec8f15` — second=DECLARATION, pass1=ASK
- e20b `245f2e690030` — second=DECLARATION, pass1=ASK
- e20b `27e247c4e0c6` — second=DECLARATION, pass1=ASK
- e20b `2c37d4c4cdde` — second=DECLARATION, pass1=ASK
- e20b `2d3975a73a3f` — second=DECLARATION, pass1=ASK
- e20b `313f3b50a303` — second=DECLARATION, pass1=ASK
- e20b `341c948484e3` — second=DECLARATION, pass1=ASK
- e20b `3439aa3061ba` — second=DECLARATION, pass1=ASK
- e20b `365e57deadd9` — second=DECLARATION, pass1=ASK
- e20b `3786fee977c2` — second=DECLARATION, pass1=ASK
- e20b `3919cc1fc1ef` — second=DECLARATION, pass1=ASK
- e20b `3d56188f1ff6` — second=DECLARATION, pass1=ASK
- e20b `3eee2a163a0b` — second=DECLARATION, pass1=ASK
- e20b `409024df7f26` — second=DECLARATION, pass1=ASK
- e20b `46646315dcf5` — second=DECLARATION, pass1=ASK
- e20b `475c283908f1` — second=DECLARATION, pass1=ASK
- e20b `4937aba9be42` — second=DECLARATION, pass1=ASK
- e20b `499b40746902` — second=DECLARATION, pass1=ASK
- e20b `4b6eb4b259b9` — second=DECLARATION, pass1=ASK
- e20b `4cf3f731c8db` — second=DECLARATION, pass1=ASK
- e20b `4da26c913908` — second=DECLARATION, pass1=ASK
- e20b `4f588d6a5a10` — second=DECLARATION, pass1=ASK
- e20b `5008dcfe0ef0` — second=DECLARATION, pass1=ASK
- e20b `5009da05ef1d` — second=DECLARATION, pass1=ASK
- e20b `50e7167f048d` — second=DECLARATION, pass1=ASK
- e20b `53be8159d665` — second=DECLARATION, pass1=ASK
- e20b `57e4f6eb5289` — second=DECLARATION, pass1=ASK
- e20b `5a9d38fc8c3b` — second=DECLARATION, pass1=ASK
- e20b `608dc09facd0` — second=DECLARATION, pass1=ASK
- e20b `66343e9c6128` — second=DECLARATION, pass1=ASK
- e20b `69f6831f707b` — second=DECLARATION, pass1=ASK
- e20b `6be6f8a23712` — second=DECLARATION, pass1=ASK
- e20b `73be539f7fe8` — second=DECLARATION, pass1=ASK
- e20b `7547b7fd5b6a` — second=DECLARATION, pass1=ASK
- e20b `783e3913662d` — second=DECLARATION, pass1=ASK
- e20b `7874bf767ec7` — second=DECLARATION, pass1=ASK
- e20b `7920f0752f8f` — second=DECLARATION, pass1=ASK
- e20b `7a8a30dfe5b5` — second=DECLARATION, pass1=ASK
- e20b `80a61a53dc94` — second=DECLARATION, pass1=ASK
- e20b `823184f05289` — second=DECLARATION, pass1=ASK
- e20b `8383ad1019df` — second=DECLARATION, pass1=ASK
- e20b `84143d91fd61` — second=DECLARATION, pass1=ASK
- e20b `842aad3d8808` — second=DECLARATION, pass1=ASK
- e20b `85beef88d37d` — second=DECLARATION, pass1=ASK
- e20b `85d2deb198c0` — second=DECLARATION, pass1=ASK
- e20b `86df917d9e35` — second=DECLARATION, pass1=ASK
- e20b `879fc0cb8082` — second=DECLARATION, pass1=ASK
- e20b `87f178023b3f` — second=DECLARATION, pass1=ASK
- e20b `89f2fca9640c` — second=DECLARATION, pass1=ASK
- e20b `8fbe86c7fef6` — second=DECLARATION, pass1=ASK
- e20b `906fa60d01be` — second=DECLARATION, pass1=ASK
- e20b `92483efd79ce` — second=DECLARATION, pass1=ASK
- e20b `9566515e18b0` — second=DECLARATION, pass1=ASK
- e20b `970dd5b59e38` — second=DECLARATION, pass1=ASK
- e20b `9949e0cafb22` — second=DECLARATION, pass1=ASK
- e20b `998b41a36106` — second=DECLARATION, pass1=ASK
- e20b `9cf245675570` — second=DECLARATION, pass1=ASK
- e20b `9f186e9231ed` — second=DECLARATION, pass1=ASK
- e20b `9f6d7eb9ae82` — second=DECLARATION, pass1=ASK
- e20b `a145320c5a29` — second=DECLARATION, pass1=ASK
- e20b `a988f094bc53` — second=DECLARATION, pass1=ASK
- e20b `ab2bacbe01d6` — second=DECLARATION, pass1=ASK
- e20b `ae25d8f9a2f1` — second=DECLARATION, pass1=ASK
- e20b `b0753d5fbe36` — second=DECLARATION, pass1=ASK
- e20b `b0eac5fd83ed` — second=DECLARATION, pass1=ASK
- e20b `b32ff6d56482` — second=DECLARATION, pass1=ASK
- e20b `ba86359148f8` — second=DECLARATION, pass1=ASK
- e20b `be1be6ba2435` — second=DECLARATION, pass1=ASK
- e20b `bef8d116c82a` — second=DECLARATION, pass1=ASK
- e20b `c018743879e7` — second=DECLARATION, pass1=ASK
- e20b `c01f218f7e0d` — second=DECLARATION, pass1=ASK
- e20b `c1dc081ccb7d` — second=DECLARATION, pass1=ASK
- e20b `c705c2603b5c` — second=DECLARATION, pass1=ASK
- e20b `c9091be18ec3` — second=DECLARATION, pass1=ASK
- e20b `c916b88d81c4` — second=DECLARATION, pass1=ASK
- e20b `c9ba01e21386` — second=DECLARATION, pass1=ASK
- e20b `ca4310e428b4` — second=DECLARATION, pass1=ASK
- e20b `ca9aae42a8d9` — second=DECLARATION, pass1=ASK
- e20b `cfd7e4586e02` — second=DECLARATION, pass1=ASK
- e20b `d1b3556fc385` — second=DECLARATION, pass1=ASK
- e20b `d3accf65a463` — second=DECLARATION, pass1=ASK
- e20b `d8e0030be415` — second=DECLARATION, pass1=ASK
- e20b `d919978467ad` — second=DECLARATION, pass1=ASK
- e20b `d932f214574c` — second=DECLARATION, pass1=ASK
- e20b `d9ef02d331d6` — second=DECLARATION, pass1=ASK
- e20b `dd5684bd0354` — second=DECLARATION, pass1=ASK
- e20b `e1e322b7c394` — second=DECLARATION, pass1=ASK
- e20b `e3054bfc124b` — second=DECLARATION, pass1=ASK
- e20b `e34a989de1fe` — second=DECLARATION, pass1=ASK
- e20b `e3f1a82d5c8b` — second=DECLARATION, pass1=ASK
- e20b `e41d15eff7e8` — second=DECLARATION, pass1=ASK
- e20b `e67f04b3d22e` — second=DECLARATION, pass1=ASK
- e20b `ec46b285a5a8` — second=DECLARATION, pass1=ASK
- e20b `ef0aa1034f0f` — second=DECLARATION, pass1=ASK
- e20b `f4a3cb151761` — second=DECLARATION, pass1=ASK
- e20b `f68bdaebd577` — second=DECLARATION, pass1=ASK
- e20b `f89360aa03d8` — second=DECLARATION, pass1=ASK
- e20b `f8b3c954b920` — second=DECLARATION, pass1=ASK
- e20b `faa5385949a3` — second=DECLARATION, pass1=ASK
- e20b `ff954c486eb4` — second=DECLARATION, pass1=ASK
