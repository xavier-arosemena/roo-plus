# Supplementary materials

**Manuscript:** Wording and layout of a mode list steer an autonomous coding agent's choice

**Contents:** S1 reporting checklist · S2 batches, cost and deviations · S3 gate tables · S4 complete outcome counts · S5 registered readings and their status · S6 stationarity and dispersion · S7 runs tests · S8 cross-dispatch concordance · S9 adjudication protocol and defects · S10 slot-occupant experiment · S11 second-model pilot · S12 data dictionary

Items are referred to in the main text as Table S1 to Table S12. No references are cited in the supplementary materials other than those already cited in the main text, and they are cited by the same numbers.

---

## S1. Reporting checklist

No reporting standard exists for menu-selection or list-rendering benchmarks. The items below follow the structure of established reproducibility checklists and of the journal's requirements for a Research Article.

**Table S1.** Reporting items.

| Item                                                           | Status                              | Location in main text       |
| -------------------------------------------------------------- | ----------------------------------- | --------------------------- |
| Design specified before results                                | Yes                                 | 2.1                         |
| Estimand defined formally                                      | Yes                                 | 2.1                         |
| Unit of analysis stated                                        | Yes                                 | 2.1                         |
| Sample size and resolution justified before the run            | Yes                                 | 2.7                         |
| Registration deposited before data, with third-party timestamp | No                                  | 2.6, 4.6                    |
| All arms and allocation reported                               | Yes                                 | Table 1                     |
| Allocation verified from response timestamps                   | Yes                                 | 2.3                         |
| Exclusions reported                                            | Yes, zero in the E20 family         | 3.1                         |
| Deviations from registration reported                          | Yes, five                           | 2.6                         |
| Multiplicity controlled                                        | Yes, within experiment              | 2.7                         |
| Interval method named                                          | Yes, Newcombe                       | 2.7                         |
| Time-aware statistic reported beside exact tests               | Yes                                 | 2.7, 3.2 to 3.7             |
| Stationarity tested                                            | Yes, on contrasts                   | 3.5, S6                     |
| Overdispersion assessed                                        | Yes                                 | 3.7, S6                     |
| Construct sensitivity reported                                 | Yes                                 | 3.8                         |
| Negative and ceiling results reported                          | Yes                                 | 3.4, 3.5, 3.9               |
| Presentation layout reported as part of the stimulus           | Yes                                 | 2.2                         |
| Data available                                                 | Yes, with the burned-fixture caveat | Data availability statement |
| Code available                                                 | Yes                                 | Data availability statement |
| Cost and wall-clock reported                                   | Yes                                 | S2                          |
| Figures reproducible from published records                    | Yes                                 | Figure captions             |

## S2. Batches, cost and deviations

**Table S2.** Batches, calls and cost. Costs are derived from a measured rate of €5.1 per 1,000 calls and are not read from billing.

| Family | Batch                      | Calls                | Records published | Cost, EUR |
| ------ | -------------------------- | -------------------- | ----------------- | --------- |
| E20    | Gate                       | 90                   | 90                | 0.46      |
| E20    | Aborted batch, excluded    | 741 paid of 781      | 781               | 3.78      |
| E20    | Wording                    | 900                  | 900               | 4.59      |
| E20    | Position                   | 200                  | 200               | 1.02      |
| E20    | Slot-occupant gate         | 60                   | 60                | 0.31      |
| E20    | Slot occupant              | 600                  | 600               | 3.06      |
| R0     | Position                   | 400                  | 400               | 2.04      |
| R0     | Drift                      | 100                  | 100               | 0.51      |
| R0     | Attribution                | 251                  | 250 usable        | 1.28      |
| R0     | Wording                    | 337                  | 337               | 1.72      |
| R0     | Slug-lead                  | 200                  | 200               | 1.02      |
| R0     | Naming                     | 300                  | 300               | 1.53      |
| R0     | Failed attribution attempt | 176 completed of 400 | 176               | 0.90      |

Output-producing calls in the E20 family: 2,591. In the R0 family: 1,588. Total for the two families: 4,179, at approximately €22.2. The closing round of 600 calls, an earlier 9-call smoke test and the screens reported in S10 and S11 are additional and are not included in that total.

**Deviations.**

1. The first E20 batch aborted at 781 of 900 calls after exhaustion of pre-paid credit, leaving 40 unrun records. The batch was preserved untouched and a replacement batch dispatched into a new directory. Pooling was declined: the batches are independent samples, so pooling would legitimately add information, but it would move the primary contrast from 27.5 to 25.7 points, leave the verdict unchanged, and require 223 further adjudications.
2. Cost overran the combined estimate for the E20 wording and slot-occupant batches, for two reasons: the discarded partial batch and the long slot-occupant batch.
3. Two R0 batches are short of plan: attribution stopped at 251 of 400 calls on a failed call with a quota signature, and wording was cut at 337 of 400 by a process timeout. Both remained balanced across arms, which is what makes the paired analysis legitimate.
4. One call of 400 in the R0 position batch failed and was initially scored; it is excluded, and that arm reports 99 calls.
5. A batch-runner defect recorded failed calls as rows until it was corrected; every failure is now flagged and excluded rather than scored.

## S3. Gate tables

**Table S3.** Mid-run gate on the first 90 E20 draws.

| Arm | Draws | Excluded | Longest identical transcript run | Declared | Unresolved |
| --- | ----- | -------- | -------------------------------- | -------- | ---------- |
| B   | 40    | 0        | 1                                | 19       | 21         |
| A   | 10    | 0        | 1                                | 7        | 3          |
| C   | 40    | 0        | 1                                | 32       | 8          |

Pre-set stop thresholds were an exclusion rate above 5% in any arm, or a longest verbatim run above 5. Neither fired.

The 60-draw slot-occupant gate produced rates of 0.650, 0.450 and 0.650 for its three arms, an ordering that inverts two arms against the full run. That gate is registered for exclusion and clustering only; its rates are 20-draw noise and are not interpretable.

## S4. Complete outcome counts

**Table S4.** E20, mechanical and adjudicated counts. Request: "Explain why this module is structured the way it is."

| Arm | Line length, characters | n   | Mechanical declarations | Adjudicated | Final       | Asks | Wrong selections | Appropriate |
| --- | ----------------------- | --- | ----------------------- | ----------- | ----------- | ---- | ---------------- | ----------- |
| B   | 96                      | 400 | 237                     | +9          | 246 (0.615) | 154  | 0                | 1.00        |
| A   | 50                      | 100 | 73                      | +2          | 75 (0.750)  | 25   | 0                | 1.00        |
| C   | 99                      | 400 | 344                     | +12         | 356 (0.890) | 44   | 0                | 1.00        |

**Table S5.** E20b, same request, line held at B.

| Position    | n   | Mechanical          | Adjudicated | Final      | Asks | Wrong selections | Appropriate |
| ----------- | --- | ------------------- | ----------- | ---------- | ---- | ---------------- | ----------- |
| First entry | 100 | 15                  | 0           | 15 (0.150) | 85   | 0                | 1.00        |
| Last entry  | 100 | 42 target, 11 other | +3          | 45 (0.450) | 43   | 12               | 0.88        |

The last arm's declared total is 45, not 46. The arm produced 53 mechanical declarations, of which 42 named the target and 11 named another mode; the blind pass returned four declarations, of which three named the target and one was the bare slug of a competing mode. Counting all four adjudicated declarations as declarations of the target yields 46 and double-counts a commitment to a different mode. The three categories sum to 100.

**Table S6.** Re-derivation under extractor version 4 for the six R0 batches, all arms.

| Batch       | Arm                      | First scored | Re-derived |
| ----------- | ------------------------ | ------------ | ---------- |
| Position    | Experimental first       | 0.210        | 0.210      |
| Position    | Experimental last        | 0.440        | 0.440      |
| Position    | Shipping first           | 0.340        | 0.350      |
| Position    | Shipping last            | 0.250        | 0.260      |
| Attribution | Experimental             | 0.500        | 0.500      |
| Attribution | Experimental, name first | 0.452        | 0.468      |
| Attribution | Shipping, slug quoted    | 0.190        | 0.190      |
| Attribution | Shipping, name quoted    | 0.714        | 0.778      |
| Wording     | Experimental B           | 0.647        | 0.659      |
| Wording     | Experimental C           | 0.869        | 0.869      |
| Wording     | Shipping B               | 0.667        | 0.667      |
| Wording     | Shipping C               | 0.988        | 1.000      |
| Slug-lead   | Slug only                | 0.440        | 0.450      |
| Slug-lead   | Slug and name            | 0.190        | 0.190      |
| Naming      | Name quoted              | 0.780        | 0.780      |
| Naming      | Slug only                | 0.450        | 0.450      |
| Naming      | Slug and name            | 0.130        | 0.130      |

## S5. Registered readings and their status

**Table S7.** Registered predictions, the observations, and the verdict applied.

| Test                         | Registered reading                                                                  | Observation                           | Verdict applied                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Wording, primary             | A requirement clause moves commitment more than a prohibition, at 20 points or more | 27.5 points in the opposite direction | Effect confirmed; prediction refuted; no registered reading for the sign |
| Wording, secondary           | Descriptive only; can never falsify                                                 | 13.5 points, length-confounded        | Reported as description                                                  |
| Position                     | A difference of 10 points or less is read as no effect                              | 30.0 points                           | Confirmatory contrast; mechanism unidentified                            |
| Harm                         | Secondary                                                                           | 12 wrong selections against 0         | Reported; tolerates variance inflation of 2.9                            |
| Slot occupant, rival capture | 10 points or less means the slot is not a magnet                                    | 2 selections in 600                   | Reading not applied; arm not stationary                                  |
| Slot occupant, fillers       | 10 to 20 points is indecisive                                                       | +16.5 corrected                       | Reading not applied; arm not stationary                                  |

Two readings were not applied because the batch they belong to was not stationary. The opposite of a registered reading is never claimed in this paper.

## S6. Stationarity and dispersion

**Table S8.** Declarations per block and shape, all batches used in the main text.

| Batch       | Arm                | Per block              | Shape                                     |
| ----------- | ------------------ | ---------------------- | ----------------------------------------- |
| E20         | B                  | 61, 58, 63, 55 per 100 | Flat                                      |
| E20         | C                  | 83, 87, 84, 90 per 100 | Flat                                      |
| E20         | A                  | 17, 17, 23, 16 per 25  | Flat                                      |
| E20b        | First              | 2, 3, 6, 4 per 25      | Flat, low                                 |
| E20b        | Last               | 13, 8, 12, 9 per 25    | Flat, higher                              |
| E20c        | Control            | 18, 19, 27, 30 per 50  | Rises 36% to 60%, Cochran-Armitage z 2.72 |
| E20c        | Filler             | 32, 31, 27, 30 per 50  | Flat, z −0.65                             |
| E20c        | Rival              | 38, 37, 35, 33 per 50  | Declines, z −0.99                         |
| R0-position | Experimental first | 0.32, 0.32, 0.13, 0.08 | Falls, range 0.24                         |
| R0-drift    | One condition      | 0.40, 0.28, 0.16, 0.24 | Moves 24 points, nothing varied           |

**Table S9.** Block-level dispersion ratios on three degrees of freedom, where φ is observed between-block variance divided by binomial variance at the block size.

| Batch | Arm     | Mean rate | Block size | φ    |
| ----- | ------- | --------- | ---------- | ---- |
| E20   | B       | 0.5925    | 100        | 0.51 |
| E20   | C       | 0.8600    | 100        | 0.83 |
| E20   | A       | 0.7300    | 25         | 2.08 |
| E20b  | First   | 0.1500    | 25         | 0.92 |
| E20b  | Last    | 0.4200    | 25         | 0.93 |
| E20c  | Control | 0.4700    | 50         | 2.81 |
| E20c  | Filler  | 0.6000    | 50         | 0.39 |
| E20c  | Rival   | 0.7150    | 50         | 0.48 |

Both confirmatory contrasts have φ at or below 1.0 in both arms. The arm that invalidated the slot-occupant experiment has φ of 2.81, and the two arms that alternated more than chance are underdispersed. The ratio is a low-powered diagnostic on three degrees of freedom and cannot detect dependence finer than block resolution.

**Table S10.** Robustness to unmodelled clustering: the variance-inflation factor at which each 95% interval would cease to exclude zero.

| Contrast                              | Difference, points | Half-width | Inflation tolerated |
| ------------------------------------- | ------------------ | ---------- | ------------------- |
| Wording, primary                      | 27.5               | 5.7        | 23.3                |
| Position                              | 30.0               | 11.9       | 6.4                 |
| Harm, wrong selections                | 12.0               | 7.0        | 2.9                 |
| Wording, secondary, length-confounded | 13.5               | 9.65       | 2.0                 |

## S7. Runs tests

**Table S11.** Wald-Wolfowitz runs tests on each arm's outcome sequence.

| Arm          | Observed runs | Expected | z     | p    |
| ------------ | ------------- | -------- | ----- | ---- |
| E20 B        | 193           | 190.42   | 0.27  | .79  |
| E20 A        | 37            | 38.50    | −0.40 | .69  |
| E20 C        | 81            | 79.32    | 0.43  | .67  |
| E20b first   | 31            | 27.88    | 1.18  | .24  |
| E20b last    | 52            | 50.50    | 0.30  | .76  |
| E20c control | 101           | 100.64   | 0.05  | .96  |
| E20c filler  | 114           | 97.00    | 2.51  | .012 |
| E20c rival   | 81            | 82.51    | −0.26 | .79  |

No arm in the wording or position experiments shows sequence dependence. The slot-occupant filler arm alternates more often than chance, which would pass both the verbatim check and the exclusion check and is detected only here. A runs test detects dependence, not trend; the block decomposition, not this table, is what demoted that experiment.

## S8. Cross-dispatch concordance

**Table S12.** Two dispatches of identical prompts.

| Arm | Overlapping draws | Same outcome | Chance-level agreement | Identical transcripts |
| --- | ----------------- | ------------ | ---------------------- | --------------------- |
| B   | 329               | 175 (0.532)  | 0.517                  | 0                     |
| A   | 83                | 45 (0.542)   | 0.553                  | 0                     |
| C   | 329               | 234 (0.711)  | 0.735                  | 0                     |

Agreement at chance together with zero verbatim repetition establishes that individual calls are independent samples. Together with the drift measurement in section 3.7 it also establishes that consecutive calls are not independent in time. Both statements are required to interpret any rate in this paper.

## S9. Adjudication protocol and defects

**Table S13.** Adjudication protocol.

| Item                         | Value                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Replies adjudicated          | 378 (246 of 900 in the wording batch; 132 of 200 in the position batch)                                              |
| First pass                   | 23 declarations and 223 asks; 5 declarations and 127 asks                                                            |
| Initial second-pass coverage | 50 of 378 (13.2%), agreement 100%                                                                                    |
| Full independent second pass | 378 of 378, different model, blind packet: 11.1% agreement under the registered rule, 99.7% under the selection rule |
| Blindness assertion          | Passed on both packets: no arm label, run identifier, timestamp or registered line text                              |
| Join discipline              | Mapping stored outside the packet directory and opened only after all verdicts were recorded                         |

**Table S14.** Recorded defects and their status.

| Defect                                                                                                             | Status                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Extractor missed commitments written as bare slugs, bold label-and-slug spans, unbolded labels and slug-plus-prose | Closed by extractor version 4                                                                                           |
| Extractor committed when exactly one slug appeared anywhere, defeated by the slug `code`                           | Closed by the vocabulary anchor in version 4                                                                            |
| Merge step counted every adjudicated declaration as a declaration of the target                                    | Open; every published table carries the corrected split (S4)                                                            |
| Registration sign-blind in thresholds and sign-specific in readings                                                | Closed for future work; rule adopted in 2.7                                                                             |
| Gate rates quotable out of context                                                                                 | Documented; rates marked non-interpretable                                                                              |
| Records stamped a parser version the analysis did not call                                                         | Closed for the R0 batches, which stamp the extractor on every row; the E20 family remains as published and is annotated |
| Experiments rendered a layout the product does not emit                                                            | Recorded, not repaired; closed by measurement in 3.3, 3.5 and 3.6                                                       |
| Arm-level stationarity test voided a batch whose contrasts were stationary                                         | Closed by rule: stationarity is tested on the contrast                                                                  |
| Batches scored by different rule versions with no record of which                                                  | Closed by per-row extractor stamping and full re-derivation                                                             |

Blindness is a property of the procedure, not of the published artefact set: the join file is published beside the packet, so any reader can reconstruct the mapping, and the blinding seed is published with the plan. The seed must not be reused for a packet that is still open.

## S10. Slot-occupant experiment in full

**Table S15.** Three arms, one slot. The target remained at the seventh entry with line B in every arm; only the last entry's occupant changed, by swap.

| Arm     | Last entry holds   | Mechanical      | Adjudicated | Corrected       | Unresolved |
| ------- | ------------------ | --------------- | ----------- | --------------- | ---------- |
| Control | Original mode      | 94/200 (0.470)  | +4          | 98/200 (0.490)  | 105        |
| Filler  | Non-competing mode | 120/200 (0.600) | +11         | 131/200 (0.655) | 80         |
| Rival   | Plausible rival    | 143/200 (0.715) | +9          | 152/200 (0.760) | 56         |

The rival placed in the last slot was selected twice in 600 replies, so it does not capture the slot. The contrasts against control nevertheless decay across the run, to 0 points for the filler arm and 6 for the rival arm, while the control arm rises from 36% to 60%. The experiment is therefore inconclusive and no contrast from it is reported as an effect. A 200-call re-run of the control arm on byte-identical prompts failed to reproduce the rise (z −0.06) while reproducing the instability, at 47.0% and 54.0% in two runs.

## S11. Second-model pilot

Stopped after 109 of 800 calls. All 91 output-producing replies: 43 in the requirement arm, of which 41 selected the target (95.3%) and 2 selected a competing mode; 48 in the prohibition arm, all 48 selecting the target. Zero questions in either arm, across five distinct reply strings, all bare mode names. Six failures, all in the requirement arm: five replies truncated to empty content at the 4,096-token cap because the model spent the output budget on hidden reasoning, and one empty completion. Dropping those failures rather than raising the cap would have biased the comparison. Cost approximately €0.60; the 709 unspent calls would have measured a ceiling.

## S12. Data dictionary

**Table S16.** Fields in the per-call records.

| File                             | Field                      | Meaning                                                 |
| -------------------------------- | -------------------------- | ------------------------------------------------------- |
| results.jsonl                    | index                      | Position of the call in the batch                       |
| results.jsonl                    | runId                      | Unique call identifier                                  |
| results.jsonl                    | label                      | Arm                                                     |
| results.jsonl                    | draw                       | Draw number within the arm                              |
| results.jsonl                    | briefId                    | Request identifier                                      |
| results.jsonl                    | promptSha256               | Hash of the exact prompt sent                           |
| results.jsonl                    | model                      | Model identifier                                        |
| results.jsonl                    | temperature                | Decoding temperature                                    |
| results.jsonl                    | status                     | Run status                                              |
| results.jsonl                    | startedAt, endedAt         | Response timestamps, used to verify interleaving        |
| results.jsonl                    | transcript, response       | Full request and full reply                             |
| results.jsonl                    | finishReason               | Termination reason                                      |
| results.jsonl                    | maxOutputTokens            | Output cap                                              |
| results.jsonl                    | parserVersion, extractor   | Scoring rule version stamped at run time                |
| plan.json                        | entries                    | The 45-entry menu, including the expected key per arm   |
| plan.json                        | cycle, cycles, drawsPerArm | Allocation sequence and arm sizes                       |
| plan.json                        | blindSeed                  | Seed used to order the blind packet                     |
| adjudication/packet.jsonl        | id, brief, reply           | Hashed blind packet                                     |
| adjudication/judgements-\*.jsonl | id, verdict                | Adjudication verdicts                                   |
| adjudication-join.json           | id, runId                  | Mapping, published after adjudication closed            |
| reclass-\*.json                  | verdicts                   | Re-derivation sidecars; raw records are never rewritten |

No credentials, request headers, endpoints, account identifiers or personal data appear in any published record.
