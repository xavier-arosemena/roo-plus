# Consolidated Hardening Plan — Upstream Sync Strategy

**Status**: 🟢 REVIEWED & RECONCILED — 7-lens review registered (§6), owner pass executed (§7/§10)
**Date**: 2026-09-23 · **Reviewed**: 2026-09-24 · **Evidence date**: 2026-09-23/24 (checkout `ceeb9181b`, shallow)
**Correction policy**: every superseded claim is replaced **in place** and listed in §10.1 with the lens that falsified it. Nothing is silently edited — a row that changed says so.
**Author**: Core Reasoning Architect (independent review of the sync strategy)
**Scope**: reviews **both** the original strategy artefacts ([`ADR`](../adr/adr-upstream-sync-triage-strategy.md), [register](pending-upstream-commits.md), [manual](README.md), [runbook](../runbooks/upstream-sync.md)) **and** this plan. All lens input is registered in §6 of **this** file — no lens writes a separate document.

---

## 0. Method and assumptions

- Findings are separated into **VERIFIED** (reproduced in this checkout with a command whose output is quoted), **FALSIFIED** (hypothesis tested and withdrawn), **STALE** (contradicted by the artefacts on disk), and **UNVERIFIABLE** (needs a deep clone / network).
- Environment: `git rev-parse --is-shallow-repository` → `true`; default shell is `/bin/sh` (dash), so multi-line analyses are wrapped in `bash -c '…'`.
- **Reviewer contract (§6):** each lens reviews the original plan *and* this plan, verifies at least two load-bearing claims itself, and returns a **registry block only** (no file writes). The architect registers it verbatim, then applies the reconciliation pass (§7).
- Priority: **P0 = trust-blocking**, **P1 = acceleration**, **P2 = steady-state**.

---

## 1. Verdict

The strategy's **mechanism is sound and should be kept** — intent-based conflict resolution, `-x` provenance, a categorised register, a mandatory gate chain, and documented rejected alternatives are all correct. Three defects make it unsafe to scale: **S1** the measurement layer can silently under-report and then erase the evidence; **S2** the central class invariant is violated by the stored data and enforced only by prose; **S3** the queue is ordered against its own economics and carries no capacity model. Accepted as a *hybrid*: keep batching, add mechanical guards, and give the structural-convergence lever real capacity.

**Post-review verdict (lens G, systemic):** as scoped, the system does **not** converge — marginal drain since the baseline is **0 rows in 8 days** while the same team shipped 6 merges and 3 version bumps, so the queue is *unowned work*, not merely slow work; and no item in §4 changes arrival or the tracked unit. The convergent configuration is narrower: **track P0/P1 + the divergence program only** (27 rows, rate ≈ 1.15/day), one accountable queue owner, **WIP = 1 batch/week**, and per-batch publishes. See the convergence clause (**H-21**) and the 30/60/90 in §12.

---

## 2. Evidence ledger

| # | Claim (source) | Status | Reproduction / observed |
| --- | --- | --- | --- |
| E1 | Register completeness: 102 rows, 0 duplicate, 0 unexpected, counts match Summary | ✅ VERIFIED | class A18/B25/C19/D12/E27/X1 = 102; priority P0 5/P1 26/P2 14/P3 24/P4 33 = 102; status ☐63/☑6/✖33 = 102; 0 non-canonical SHAs |
| E2 | Fork handler is a 131-line router with per-domain modules | ✅ VERIFIED (corrected) | `wc -l src/core/webview/webviewMessageHandler.ts` → 131; **16** modules — `git ls-files src/core/webview/handlers \| wc -l` → 16 (**not 17**; the original figure was wrong — lenses A/F-A-5, D/D-12) |
| E3 | Verifier exists, fails closed on a shallow clone, correct remediation | ✅ VERIFIED | `node scripts/upstream-sync-triage.mjs --verify` → exit 1, message names [`DEPTHEN_COMMAND`](../../scripts/upstream-sync-triage.mjs:109) |
| E4 | "Script is specified but not implemented" (hand-off report) | ❌ FALSIFIED | 1,585-line implementation + 42 KB spec; wired at [`package.json`](../../package.json:33); spec runs in CI ([`code-qa.yml`](../../.github/workflows/code-qa.yml:87)); executed successfully |
| E5 | "Nine Δ 0 provider quick-wins, starting with `500152b78`" (hand-off report) | ❌ STALE | six moved to [`SYNC-13`](pending-upstream-commits.md:363); `500152b78` still `☐` ([line 379](pending-upstream-commits.md:379)) |
| E6 | "Shallow ref reports 22 instead of 102" ([manual](README.md:20), [R1](../runbooks/upstream-sync.md:15), tool diagnostic) | ❌ STALE | `git rev-list --count master..upstream/main` → **3** |
| E7 | Verifier reports **six** checks ([runbook](../runbooks/upstream-sync.md:162)) vs **seven** ([manual](README.md:272)) | ❌ CONTRADICTION | [`checks`](../../scripts/upstream-sync-triage.mjs:552) has 7; runbook is the agent-facing file |
| E8 | `A-CLEAN ⇔ Δ=0 ∧ no unsynced predecessor` (ADR amendment) | ❌ VIOLATED IN DATA | open `A-CLEAN` rows with Δ>0: `4e8fa09f2` (4), `c4574ffef` (2), `147147cda` (1), `745656a50` (2); six `A-CLEAN` rows blocked |
| E9 | Refresh can isolate new commits from the recorded tip | ❌ UNSOUND AS-IS (evidence relabelled) | **This observation is about this clone, not about `runRefresh()`** (lenses A/B/C/D/F/G): `git rev-list --count upstream/main` → 3 and `.git/shallow` names `78b74ec1c…`, so the 3-commit delta is a graft artefact. S1's mechanism is therefore proven **by code reading**: `requireMergeBase` ([`:1336`](../../scripts/upstream-sync-triage.mjs:1336)) precedes the sole write ([`:1410`](../../scripts/upstream-sync-triage.mjs:1410)), no `merge-base --is-ancestor` exists, and the header count written at [`:1398`](../../scripts/upstream-sync-triage.mjs:1398) is the same possibly-saturated formula |
| E10 | ADR migration phase 1: "the `A-CLEAN` slice of `SYNC-3`/`SYNC-4`" | ❌ STALE | both batches contain zero `A-CLEAN` rows ([ADR](../adr/adr-upstream-sync-triage-strategy.md:136)) |
| E11a | Overlap buckets 25 / 33 / 20 / 24 | ✅ VERIFIED | Δ histogram from the register: `0:25`, `1–2:33`, `3–5:20`, `>5:24`; **Δ max is 53, not 43** (`1ad8f528d`) — lenses C/D |
| E11b | Upstream handler = 4206 lines | ✅ VERIFIED (at the tip) | `git show upstream/main:src/core/webview/webviewMessageHandler.ts \| wc -l` → 4206 — reproducible today, but from the **current tip** (lens D/F-D-4) |
| E11c | 180 fork-only / 977 / 689 / 272 files | ⚠️ UNVERIFIABLE HERE | needs `git fetch --unshallow`; `git rev-list --count upstream/main..master` reads **3089** (saturated), so it cannot corroborate 180; no artefact pins the fork-side method |
| E11d | "131 telemetry files upstream" | ❌ CONTRADICTED (at tip) | `git grep -Il -i telemetry upstream/main \| wc -l` → **243** at the current tip; the 131 has no recorded scope or SHA — lens D (D-9). Cannot be called *false* for the 2026-09-16 baseline; it can be called **unreproducible** |
| E12 | "0 telemetry references in `src/` and `webview-ui/src/`" | ⚠️ OVERBROAD (figures withdrawn) | **The 68/30 figures are withdrawn** (unreproducible — lens A/F-A-6, D/D-14, F/F-F-4). Reproducible today: `git grep -Il "captureEvent(" -- "src/**"` → **0** (no transport) and `git grep -Il -i "telemetry" -- "src/**" \| wc -l` → **34** tracked files of inert scaffolding (e.g. [`MarketplaceManager.ts`](../../src/services/marketplace/MarketplaceManager.ts:116)). The invariant must name its pattern and scope; the claim becomes "0 transport call sites" |
| E13 | Telemetry leak via committed build output (review hypothesis) | ❌ FALSIFIED (withdrawn) | `git ls-files src/webview-ui` → 0; the match was minified `captureEvents`; path is gitignored ([`src/.gitignore`](../../src/.gitignore:4)) |
| E14 | Register end-of-file text integrity | ❌ DEFECT | orphaned duplicate fragment "doing any work." at [line 414](pending-upstream-commits.md:414) |

**Ready-set arithmetic (verified by lenses A, C, D, F, G):** 18 `A-CLEAN` rows = 6 `☑` + 6 blocked (`SYNC-13`) + 3 open with Δ>0 ⇒ only **3 clean, unblocked rows** remain (`97265fd8e` P2, `ae6c1a876` P3, `87d41aa4f` P3), plus `500152b78` re-attemptable now that its prerequisite `5e8fcc846` is `☑`. The headline "~15 immediate low-risk value" ([ADR](../adr/adr-upstream-sync-triage-strategy.md:151)) is therefore materially optimistic — **at most 1 row is an immediately pickable P0–P2 clean win**.

**Rate arithmetic (corrected by lenses A, D, G).** Arrival ≈ **3.8 commits/day** (102 stored rows ÷ 27 days, over 2026-08-20 → 2026-09-16) — arithmetic on a stored count, not a measured flow (3.8 all rows, **2.56 actionable**). Drain: all six `☑` rows landed in **one same-day merge** `6c4e9df5c` (2026-09-16, PR #345), so the claimed "0.86/day for the following week" is **false**; the register's only post-baseline change is six `◐→☑` bookkeeping flips (10 lines, PR #348) ⇒ **marginal drain = 0 rows/day since 2026-09-17**. Counter-evidence on capacity: **6 first-parent merges and 3 version bumps in 8 days** — one of which (`d1ad83202`) fixed 48 source paths in the *same theme* as three open `P0` rows. Extrapolations (net ≈ +3/day, ≈ +88/month) are scenarios, not measurements.

**Convergence condition (new, lens G/F-G-2).** The queue converges iff `drain ≥ arrival`: `D ≥ R`. Today `D ≈ 0/day`, `R ≈ 3.78/day` **over the whole 102-row register** ⇒ non-convergent at any capacity. Scope cut: track **P0/P1 + the divergence program** (27 rows) ⇒ `R_tracked ≈ 1.15/day` ⇒ **2 sync slots/week converges**. See **H-21**.

---

## 3. Findings

| ID | Sev | Finding | Evidence | Fix (plan item) |
| --- | --- | --- | --- | --- |
| **S1** | Severe | **Silent refresh under-reporting.** [`runRefresh()`](../../scripts/upstream-sync-triage.mjs:1310) deepens via hardcoded [`--deepen=400`](../../scripts/upstream-sync-triage.mjs:1048) then diffs `OLD..upstream/main` **without asserting `OLD` is an ancestor**; a saturated count (equal to the shallow window) is indistinguishable from a real one, and `--write` advances the header tip past the unmeasured commits, erasing them from all future windows | E9 | **H-01** |
| **S2** | Severe | **Class invariant is a claim, not an invariant.** `blocked_by` exists only as prose/batch placement; four `A-CLEAN` rows carry Δ>0 and six carry unsynced predecessors; `--verify` does not check class/Δ/blocked-by relations | E8 | **H-02** |
| **S3** | Severe | **Queue ordered against its own economics.** The enabler that permanently lowers per-row cost (SYNC-7) is ranked 8th of 9; no capacity model, batch cap, or P0 SLA exists | E1, rate arithmetic | **H-08, H-09, H-13, H-16** |
| **M1** | Major | **Δ decays.** Never recomputed for unresolved rows while the fork-touched set grows each batch, so the strongest clean-pick signal weakens toward "everything overlaps" | E8; `--refresh` "never reclassifies" | **H-06** |
| **M2** | Major | **Headline metric cannot improve.** Cherry-picks never move the merge base, so "Pending upstream commits" rises with upstream and never falls with work | [manual §1](README.md:18) | **H-12** |
| **M3** | Major | **Status vocabulary overloading.** `D-LOCAL` rows sit at `☐` forever although unpickable; `✖` means "never"; one word is doing three jobs | [register legend](pending-upstream-commits.md:48) | **H-02, H-12** |
| **M4** | Major | **Release coupling unaddressed (evidence corrected).** [`pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:20) triggers on **every push to `master`**, with **no `paths` filter** — so batch merges *and bookkeeping merges* publish (3 of the last 6 first-parent merges are `docs/*`), and an unbumped batch merge ends in a **red fail-closed run**, after which its content rides along in the next bump. **Corrected:** the cited abort was `Open VSX API returned HTTP 503`, labelled *infrastructure, not a version error*, and the note lives in [`README.md` §9](../upstream-sync/README.md:331) — **not** in the register (`pending-upstream-commits.md:331` is a `SYNC-12` row). The coupling is verified; the "already failed from this coupling" causality is **rejected** | workflow `on:` block (no paths filter); `README.md` §9; lenses A/B/C/D/E/F/G | **H-04**, **F-E-1**, **F-E-2** |
| **M5** | Major | **Register verification is not in CI.** `pnpm test:scripts` runs in CI, but `verify:upstream-sync` is wired nowhere; `--verify` exits 1 when the merge base is unusable (the normal CI state) | grep of `.github/workflows/`; E3 | **H-03, H-07** |
| **M6** | Major | **Gates prove invariant preservation, not fix equivalence.** No gate verifies that a hand-ported `C-REIMPLEMENT` row re-expressed the upstream intent; a port dropping half the intent passes all seven checks | [ADR R10 rationale](../adr/adr-upstream-sync-triage-strategy.md:122) | **H-17** |
| **L1** | Low | Orphan fragment at register [line 414](pending-upstream-commits.md:414) (Prettier reflow artefact) | E14 | **H-05** |
| **L2** | Low | Six-vs-seven check-count contradiction; runbook (agent-facing) is the wrong one | E7 | **H-05** |
| **L3** | Low | "22 instead of 102" appears in **≥6 places** (the plan originally understated this as "three"): [`scripts/upstream-sync-triage.mjs:1207`](../../scripts/upstream-sync-triage.mjs:1207), [`…:1533`](../../scripts/upstream-sync-triage.mjs:1533), [`README.md:20`](README.md:20), [`README.md:319`](README.md:319), [`upstream-sync.md:15`](../runbooks/upstream-sync.md:15), [`pending-upstream-commits.md:29`](pending-upstream-commits.md:29), plus [`upstream-sync-triage.spec.mjs:267`](../../scripts/upstream-sync-triage.spec.mjs:267) carries the stale "six": every literal must be parameterised, not re-numbered | E6; lenses A, D, G | **H-05** |
| **L4** | Low | ADR migration phase 1 references a batch slice that no longer exists | E10 | **H-05** |
| **L5** | Low | [`full-rebrand.sh`](../../scripts/full-rebrand.sh:41) rewrites **all** of `src/**/*.ts` after every batch, with no diff-scoping assertion and no idempotence check | script body; [runbook TASK 5](../runbooks/upstream-sync.md:102) | **H-18** |
| **L6** | Low → **Medium** | "0 telemetry references" is an absolute a naive grep refutes (**34** tracked `src/**` files keep the token; 0 keep a transport call site), and the fork's own CI still uploads coverage to a third-party SaaS (Codecov) — an ungoverned egress the rejected upstream commit partly addressed. Inert scaffolding is a reattachment surface for future picks | E12 (corrected); lens F/F-F-4 | **H-10**, **H-25** |
| **L7** | Low | "verified 2026-09-16" claims quote no command output; hand-off summaries drift from the register within a week | E4, E5, E10 | **H-20** |
| **L8** | Low | No advisory channel or fast lane: a P0 security commit is classified on the weekly pass and queues behind batches | [runbook §3](../runbooks/upstream-sync.md:50) | **H-09** |
| **L9** | Low | **R5 is path-based** ("never take `.github/**`") where the risk is concern-based; supply-chain hardening (action pinning, least-privilege `permissions`) is exactly what the fork should not blanket-refuse — cf. the node24 Actions row nobody owns ([`SYNC-9`](pending-upstream-commits.md:269)) | [R5](../runbooks/upstream-sync.md:19) | **H-19** |
| **L10** | Low | Fork-only measurements (180 commits) are cited but no tool computes them; only the upstream side is checked | E11 | **H-12** |

---

## 4. Hardening plan

| ID | P | Change | Files / surface | Acceptance test |
| --- | --- | --- | --- | --- |
| **H-01** | P0 | **Refresh post-conditions + refusal.** After deepening: require (i) a real merge base, (ii) `git merge-base --is-ancestor <recorded-tip> upstream/main` true, (iii) `count(OLD..upstream/main) < shallow-window size`; otherwise abort and print `--unshallow`. Prefer `--shallow-since=<date>` over fixed `--deepen=400` | [`runRefresh()`](../../scripts/upstream-sync-triage.mjs:1310) | In this shallow checkout, `--refresh --write` exits non-zero and writes nothing |
| **H-02** | P0 | **Register schema `+ Blocked-by` + enforced invariants:** `A-CLEAN ⇒ Δ=0 ∧ Blocked-by=∅`; `Blocked-by=X ⇒ X` is `☑`. Reclassify or except the four Δ>0 `A-CLEAN` rows. Give `D-LOCAL` an owner/local-task field | register, `--verify` | The check names each violating row; a seeded violation fails |
| **H-03** | P0 | **`--verify --repo-only` profile in PR CI:** row format, duplicates, `synced-fork-sha`, `stale-in-progress`, header counts (all merge-base-free) | new CI step in `code-qa.yml`, verifier | A deliberately corrupted row fails a PR |
| **H-04** | P0 | **Release clause in the batch DoD** + a pre-merge copy of the duplicate/monotonic version guard | [runbook §7](../runbooks/upstream-sync.md:186), CI | Two consecutive batch merges → two green publish runs |
| **H-05** | P0 | **Documentation truth sweep:** runbook 6→7; parameterise the "22" diagnostic; ADR migration phase 1; register orphan fragment; scope the telemetry claim to tracked source | runbook, manual, ADR, register, verifier strings | `grep -rn "six independent" docs/` → 0; register has no orphan line |
| **H-06** | P1 | **Δ recomputation + evidence-drift warnings** for unresolved rows; promote `git cherry` patch-id equivalence from "hint" to a first-class already-ported signal | verifier `--refresh` | Refresh reports Δ deltas; a re-picked row is flagged, not silently re-added |
| **H-07** | P1 | **Scheduled watch job:** deepen → `--verify --strict` → `--refresh` → open/update a register PR with the proposal diff | new workflow + `pnpm upstream:preflight` | One PR per upstream advance, with a human-only merge gate |
| **H-08** | P1 | **`--plan` parallel-safe planner + batch cap.** Reuse the per-commit file sets already computed to emit disjoint batch groups (greedy colouring); cap a batch at ≤ 10 files / ≤ 400 changed lines | verifier | Planner output pairs two disjoint batches; an oversized batch is refused |
| **H-09** | P1 | **P0 security lane:** advisory subscription, auto-promote on `security|CVE|vulnerab`, own branch, weekly response target | classifier + workflow | A security commit produces a P0 row and a branch within one refresh |
| **H-10** | P1 | **`verify-no-telemetry.mjs`** over tracked source (excluding gitignored build/coverage) + a cleanup batch for inert scaffolding | new gate; [`MarketplaceManager.ts`](../../src/services/marketplace/MarketplaceManager.ts:117) | Gate fails on a re-introduced transport symbol |
| **H-11** | P1 | **Divergence ledger for the alignment allow-list:** each extension cites the upstream SHA that forced it, the fork SHA that implemented it, and the disposition (upstream-it / divergent-forever) | [`verify-upstream-code-index-alignment.mjs`](../../scripts/verify-upstream-code-index-alignment.mjs:92) + ledger | An allow-list entry without a ledger row fails |
| **H-12** | P1 | **Progress metrics:** headline = resolved/total + ready-set size; keep the pending-range count as raw backlog; add arrival/day, drain/day, oldest-unresolved-P0 age; have the tool compute and verify the fork-only figures | verifier, register header | Header shows a metric that moves when work lands |
| **H-13** | P2 | **Fund SYNC-7 first** — divergence reduction is the only lever that lowers per-row cost permanently; stop treating it as "background" | register execution order | SYNC-7 has allocated capacity in the next cycle |
| **H-14** | P2 | **Pair every `C-REIMPLEMENT` port with an upstream PR** (or a recorded divergent-forever decision) so the divergence stock stops growing | register row field | Every closed `C-REIMPLEMENT` row has a disposition |
| **H-15** | P2 | **Schedule the catch-up merge** — one deliberate whole-history merge per release cycle, own branch, gate chain green, repair window budgeted | [manual §7](README.md:234) | A dated slot exists in the cycle plan |
| **H-16** | P2 | **Capacity model + forced-decision rule:** two consecutive refreshes with drain < arrival force a decision (converge, merge, or add capacity) | register changelog | The rule is written where the refresh is executed |
| **H-17** | P2 | **`C-REIMPLEMENT` equivalence criteria:** name the ported upstream test, the fork test that fails before/passes after, and the acceptance criterion | runbook TASK 4 | No `C-REIMPLEMENT` row closes without all three |
| **H-18** | P2 | **Rebrand safety:** assert the post-rebrand diff ⊆ (batch files ∪ expected branding files); add an idempotence check (second run = empty diff) | [`full-rebrand.sh`](../../scripts/full-rebrand.sh:1), runbook TASK 5 | Rebrand on a no-op batch produces no diff |
| **H-19** | P2 | **R5 becomes concern-based:** default-drop with per-hunk intent review, plus an explicit allow for supply-chain hunks (pinning, workflow `permissions`) | [R5](../runbooks/upstream-sync.md:19) | A supply-chain hunk has a documented intake path |
| **H-20** | P2 | **Evidence discipline for claims:** "verified" must quote its command output; hand-off summaries must be re-derived from the register before publication | runbook, review template | A summary contradicting the register fails review |

---

## 5. Target workflow (fast path)

1. `pnpm upstream:preflight` (H-01 + H-07 + H-12) → deepen, assert, then print: backlog, arrival/drain, **ready set** (`Δ=0 ∧ Blocked-by=∅ ∧ class ∈ {A-CLEAN, B-CAREFUL}`), blockers ranked, and a **parallel plan** of disjoint batches (H-08).
2. Per batch: branch → pick/hand-port (H-17) → **scoped** rebrand (H-18) → gate chain → register rows written from `-x` provenance → patch bump + announcements (H-04) → PR.
3. Weekly: the watch job refreshes and opens the register PR (H-07).
4. P0 security: bypasses the queue via the security lane (H-09).
5. Every cycle: paid-down divergence (H-13, H-14) and, if drain < arrival, the forced decision (H-16).

---

## 6. Reviewer registry — 7-lens review (input registered here, no separate documents)

**Contract for every lens:** read the original artefacts *and* this plan; independently verify ≥ 2 load-bearing claims with commands and quote the output; return a registry block with **verdict**, **per-ID decision** (`ACCEPT` / `REVISE` / `REJECT` + reason), **new findings** (`F-<lens>-<n>`, severity, evidence + observed output, proposed fix, acceptance test), **dissents/uncertainties**, and **ordering advice**. No file writes.

| Lens | Mode | Status |
| --- | --- | --- |
| A — 🧐 Code Skeptic | `code-skeptic` | ✅ registered 2026-09-23 · 9 findings (3 High) · **reclassified E2/E12/L3, contradicted M4** |
| B — 👁️ Code Review Expert | `code-reviewer` | ✅ registered 2026-09-23 · 5 findings (2 High) · **contests A on H-05/H-18** |
| C — 🔀 Merge Resolver | `merge-resolver` | ✅ registered 2026-09-23 · 10 findings (5 High) · **rejects H-15; adds the resolution record** |
| D — 🛡️ Anti-Fiction Sentinel | `anti-fiction-sentinel` | ✅ registered 2026-09-23 · 7 findings (2 High) · **downgrade list + claim register** |
| E — 🚀 Release Governance Lead | `release-governance-lead` | ✅ registered 2026-09-23 · 7 findings (4 High) · **publish-on-every-push; no rollback** |
| F — 🔒 Security Auditor | `security-auditor` | ✅ registered 2026-09-24 · 7 findings (3 High) · **unused PGP provenance; rebrand rewrites security constants** |
| G — 🧩 Problem-Solving Maestro | `problem-solving-maestro` | ✅ registered 2026-09-24 · 8 findings (3 High) · **non-convergence; binding constraint = unowned queue** |

<!-- REGISTER-A -->
### A — 🧐 Code Skeptic (`code-skeptic`)

*Registered 2026-09-23 · mode `code-skeptic` · returned as a registry block; no files written by the lens.*

**Verdict:** The *mechanism* holds up — batching, `-x` provenance, and the gate chain are real (all eight named gate scripts exist) — but the *measurement layer* does not: the two headline economics numbers reproduce arithmetically yet rest on one merge event dated the baseline day, the register stores no resolution date, S1's evidence is a shallow-graft artefact (its mechanism survives only by code reading), and two of the plan's own "✅ VERIFIED" rows overstate (17 modules = 16; telemetry 68/30 not reproducible). Of the load-bearing claims I attacked, E1/E2(partial)/E3/E4/E6/E7/E8/E9/E10/E13/E14 and M2/M3/M5 reproduce exactly; M4's causal claim is misattributed and the H-01/H-03 acceptance tests are not discriminating.

**Claims verified by me (claim → exact command → observed output):**
- **E1 register completeness → `grep -cE '^\| \`[0-9a-f]{9}\` \|' docs/upstream-sync/pending-upstream-commits.md` → `102`**; class `18 A-CLEAN / 25 B-CAREFUL / 19 C-REIMPLEMENT / 12 D-LOCAL / 27 E-SKIP / 1 X-REJECT`; priority `5/26/14/24/33`; status `63 ☐ / 6 ☑ / 33 ✖`; duplicate row SHAs `0`; 10+-char row SHAs `0`. E1 is exactly right.
- **E8 class invariant violated → `… | grep A-CLEAN | awk Δ>0`** → ``a5f4192bf 2 ☑``, ``4e8fa09f2 4 ☐``, ``c4574ffef 2 ☐``, ``147147cda 1 ☐``, ``745656a50 2 ☐``. Four *open* rows as stated — plus a **fifth violation the plan omits**: an already-`☑` row (`a5f4192bf`, Δ 2).
- **Ready-set arithmetic → 18 `A-CLEAN` = 6 `☑` + 6 (SYNC-13) + 4 Δ>0 (one of which, `745656a50`, is inside SYNC-13) ⇒ 3 clean rows** = `97265fd8e` (P2), `ae6c1a876` (P3), `87d41aa4f` (P3). Reproduced exactly; and `awk` over `B-CAREFUL` with Δ=0 → **empty** (0 rows).
- **Rate arithmetic → `node -e "…"` → `window days 27 arrival all 3.78 arrival actionable 2.56 drain claimed 0.857 net claimed 2.92 monthly 88`** — 3.8 / 0.86 / +3 / +88 reproduce **arithmetically**. But `git log -1 --format='%h %ad %s' --date=short 6c4e9df5c` → `6c4e9df5c 2026-09-16 Merge pull request #345 from xavier-arosemena/sync/sync-1-5-quick-wins` → **all six `☑` rows landed in one merge dated the baseline day itself**, so "6 `☑` in the following week" is false; marginal drain since 2026-09-17 is **0 rows/day**.
- **E3 verifier fail-closed → `node scripts/upstream-sync-triage.mjs --verify` → exit 1**: `❌ upstream/main has no merge base with origin/master (this checkout is shallow) … the pending count would read 22 instead of 102. Deepen first: git fetch --deepen=400 upstream main`. Fail-closed confirmed **and the stale `22` literal is live in the tool output**.
- **E6 / L3 → `git rev-list --count master..upstream/main` → `3`.** The "22 instead of 102" string appears in **six** places, not three: [`scripts/upstream-sync-triage.mjs:1207`](scripts/upstream-sync-triage.mjs:1207), [`…:1533`](scripts/upstream-sync-triage.mjs:1533), [`README.md:20`](docs/upstream-sync/README.md:20), [`README.md:319`](docs/upstream-sync/README.md:319), [`upstream-sync.md:15`](docs/runbooks/upstream-sync.md:15), [`pending-upstream-commits.md:29`](docs/upstream-sync/pending-upstream-commits.md:29).
- **E7 check-count contradiction → `sed -n 552p` → `const checks = [formatCheck, resolveCheck, coverageCheck, duplicateCheck, syncedCheck, staleCheck, headerCheck]`** (7); [`upstream-sync.md:162`](docs/runbooks/upstream-sync.md:162) "It reports **six** independent checks"; [`README.md:272`](docs/upstream-sync/README.md:272) "**seven** independent checks". Confirmed — and [`upstream-sync-triage.spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267) carries the stale "six" too.
- **E9 + S1 mechanism → `git merge-base --is-ancestor 500152b78 upstream/main` → exit 1; `git rev-list --count 500152b78..upstream/main` → `3`; `cat .git/shallow` → `78b74ec1c…`, `bfe014fd8…`; `git rev-list --count upstream/main` → `3`.** Code reading of [`runRefresh()`](scripts/upstream-sync-triage.mjs:1310): the recorded tip is only checked for *resolution* (`rev-parse --verify`, [`:1354`](scripts/upstream-sync-triage.mjs:1354)); there is **no `merge-base --is-ancestor`**, and the header count written is `rev-list --count fork..upstream` ([`:1398`](scripts/upstream-sync-triage.mjs:1398)) which reads **3** here, with the write at [`:1410`](scripts/upstream-sync-triage.mjs:1410) applying `applyRefreshWrite`. S1's mechanism is verified **by code**; E9's observed output is a graft artefact, not a demonstration.
- **H-01's acceptance test is already green pre-H-01 →** `requireMergeBase` ([`:1336`](scripts/upstream-sync-triage.mjs:1336)) returns before the only `writeFile` ([`:1410`](scripts/upstream-sync-triage.mjs:1410)), and `--verify` exits 1 in this checkout (observed). "In this shallow checkout, `--refresh --write` exits non-zero and writes nothing" therefore proves nothing about H-01's new post-conditions.
- **E2 → `wc -l src/core/webview/webviewMessageHandler.ts` → `131`** ✓, but `git ls-files src/core/webview/handlers | wc -l` → **`16`** (also `find … -maxdepth 1 -type f | wc -l` → `16`), **not the 17 claimed**.
- **E13 → `git ls-files src/webview-ui` → `0`**; `sed -n 4p src/.gitignore` → `webview-ui`. Withdrawn telemetry-leak hypothesis correctly withdrawn.
- **E14 → `sed -n '413,414p'`** → `9. **SYNC-6** — … before doing any work.` / `   doing any work.` Orphan confirmed.
- **M5 → `grep -rn "verify:upstream-sync" .github/workflows/` → no match**; [`code-qa.yml:87`](.github/workflows/code-qa.yml:87) runs `pnpm run test:scripts`, which executes [`upstream-sync-triage.spec.mjs`](scripts/upstream-sync-triage.spec.mjs:1) with **injected probes** ([`:411`](scripts/upstream-sync-triage.mjs:411)) — i.e. the live 102-row register has **zero** machine verification today.
- **M4 → `sed -n '20,24p' .github/workflows/pre-release-publish.yml` → `on: push: branches: [master]`** ✓ coupling real; but [`pending-upstream-commits.md:331`](docs/upstream-sync/pending-upstream-commits.md:331) states the abort was `Open VSX API returned HTTP 503` — "an **infrastructure** failure, not a version error". The plan's "already failed once from this exact coupling" is misattributed.
- **E10 → SYNC-3 rows: 4 `C-REIMPLEMENT` + 1 `B-CAREFUL`; SYNC-4 rows: 4 + 2 ⇒ 0 `A-CLEAN`** ✓; [`adr-upstream-sync-triage-strategy.md:136`](docs/adr/adr-upstream-sync-triage-strategy.md:136) does say "the `A-CLEAN` slice of `SYNC-3`/`SYNC-4`".
- **E4 → `wc -l scripts/upstream-sync-triage.mjs` → `1585`; spec `42212` bytes; `sed -n 33p package.json` → `"verify:upstream-sync": "node scripts/upstream-sync-triage.mjs --verify"`** ✓ (hand-off "not implemented" correctly falsified).
- **Gate chain is real (not in the plan, in its favour):** `verify-message-schemas / upstream-code-index-alignment / announcement-version / submodule-pin / roomodes-sync / locale-readmes / semble-checksums / semble-release-coupling` all **EXISTS**; `verify-no-telemetry.mjs` and `pnpm upstream:preflight` **MISSING** (both are *proposed* by H-07/H-10 — but §5 presents `pnpm upstream:preflight` as the fast path).
- **M3 + no-dwell-data → class×status cross-tab: `7 D-LOCAL ☐` / `5 D-LOCAL ✖`; and the row schema ([`upstream-sync.md:173`](docs/runbooks/upstream-sync.md:173)) is `| sha | date | subject | CLASS | P# | Δ | ☑ fork-sha |`** — a grep for a per-row resolution date returns `0`.
- **L5 → [`full-rebrand.sh`](scripts/full-rebrand.sh:1) is 98 lines, `find src -name "*.ts" -exec sed -i`, and `grep -n "git diff|git status|exit 1|return"` → no matches.** No diff-scope guard, no idempotence check, no failure handling.
- **M2 →** header `Pending upstream commits **102**` ([`:19`](docs/upstream-sync/pending-upstream-commits.md:19)) coexists with `6 ☑`, and `header-counts` ([`:531`](scripts/upstream-sync-triage.mjs:531)) *certifies* that figure (it compares the header to `merge-base..upstream/main`, which cherry-picks never shrink). Metric verified-but-meaningless.
- **M5b/S3 order →** register "Recommended execution order" has 9 items; SYNC-7 is item **8**. ✓

**Claims I could not reproduce:**
- **E11 baselines (180 fork-only / 977 / 689 / 272 / overlap 25-33-20-24 / 4206-line upstream handler / 131 telemetry files)** — needs `git fetch --unshallow` + network. `git rev-parse --is-shallow-repository` → `true`; this clone's fork-only count is `git rev-list --count upstream/main..master` → **`3089`** (saturated), so it cannot corroborate 180. UNVERIFIED.
- **E12's "68 files, incl. 30 tracked `.ts`"** — `grep -rIl -E "captureEvent|telemetry" src --include=*.ts --include=*.tsx | grep -v src/coverage/ | wc -l` → **`25`**; `git grep -Il "captureEvent(" -- "src/**/*.ts"` → **`0`**. The qualitative claim (inert scaffolding, no live transport) holds; the quoted numbers do not. Would need the author's exact command and scope.
- **S1 end-to-end (header rewritten to a 3-row baseline)** — I refused to run `--refresh`/`--refresh --write` (fetch writes into `.git`; the mandate forbids writes). What it would take: a fixture repo with a grafted `upstream/main`, a *resolvable* merge base (so `requireMergeBase` passes), and a recorded tip outside the window → assert abort. I did reproduce every ingredient: the 3-commit window, the `pendingCount` formula reading 3, and those three SHAs having `0` register rows.
- **R9 reachability of the six `☑` fork SHAs from `origin/master`** — I verified only that each `☑` row records a fork SHA; reachability needs `--verify` to run in a state where the merge base resolves.
- **H-04's acceptance test ("two consecutive batch merges → two green publish runs")** — needs CI + network.
- **Snapshot integrity of `triage-raw.tsv` (38,377 B) / `raw-upstream-commits.txt` (9,749 B)** — files present, not independently recomputed.

**Decisions on H-01…H-20:**

| ID | Decision | Reason (≤20 words) |
| --- | --- | --- |
| H-01 | REVISE | Ancestry assertion genuinely absent (runRefresh :1354 only checks resolution); but acceptance test already passes via the pre-existing merge-base gate. |
| H-02 | ACCEPT | Invariant violated 5× in stored data (including synced `a5f4192bf`); names the four open rows correctly; needs the extra cases decided. |
| H-03 | REVISE | Not all merge-base-free: header-counts compares pending count against merge-base-derived expected set (:531); CLI aborts before checks when absent. |
| H-04 | REVISE | Coupling verified; "already failed from this coupling" misreads the register — that abort was an Open VSX 503, labelled infrastructure. |
| H-05 | ACCEPT | Correct and cheap; acceptance test misses the stale "six" comment in the spec (:267) and the register's "~15 quick-wins" note. |
| H-06 | ACCEPT | Necessary, and a prerequisite of H-08: refresh retains no file sets for existing rows (:1364-1375) and never recomputes Δ. |
| H-07 | REVISE | Feasible, but §5's `pnpm upstream:preflight` does not exist and each PR still needs manual Summary/changelog edits. |
| H-08 | REVISE | Premise false: evidence is computed for new commits only (:1370) and discarded; depends on H-06. |
| H-09 | ACCEPT | Sound; subject-regex ("security\|CVE\|vulnerab") misses unlabelled advisories — pair it with a real advisory feed. |
| H-10 | ACCEPT | Real gap (`verify-no-telemetry.mjs` absent); the gate catches symbol re-introduction, not reattachment intent. |
| H-11 | REVISE | Ill-defined for branding-mode entries, which have no single forcing SHA; define the ledger key per allow-list mode first. |
| H-12 | REVISE | Metrics lack inputs: no resolution date in the row schema (:173) and fork-only counts unverifiable here (saturated 3089). |
| H-13 | ACCEPT | Verified 8th of 9; the only lever that lowers per-row cost, itself six Δ 3–36 re-implementations. |
| H-14 | ACCEPT | Divergence stock is the root cause; a per-row disposition makes it countable and stops silent growth. |
| H-15 | REVISE | Contradicts ADR §5 and manual §7 preconditions; a dated slot pre-commits to the mode that produced three repair commits. |
| H-16 | REVISE | Trigger rests on uncomputable metrics; the 0.86/day drain came from one merge dated the baseline day (6c4e9df5c). |
| H-17 | ACCEPT | Addresses M6 directly; naming the ported test is the only fix-equivalence evidence the gate chain can host. |
| H-18 | ACCEPT | Verified: 98-line script, no diff or exit guard, rewrites every `src/**/*.ts`; assertion plus idempotence is the right fix. |
| H-19 | ACCEPT | Right: supply-chain hunks (pinning, permissions) are trivially portable and currently blanket-refused by path. |
| H-20 | ACCEPT | Right rule, and the plan breaks it itself (E2 "17 modules" = 16); make it machine-checked, not prose. |

**Decisions on findings S1–S3, M1–M6:**

| ID | Decision | Reason |
| --- | --- | --- |
| S1 | AGREE (with caveat) | Mechanism reproduced in code (no ancestry assertion; count written at :1398 from a saturated window). Caveat: severity is gated by `requireMergeBase` (:1336) and E9's output is a graft artefact (`78b74ec1c` is the shallow boundary), so the under-report is latent, not demonstrated. S1 also omits the mirror case: a force-pushed tip makes `rev-list OLD..upstream/main` **over**-report and re-propose registered rows. |
| S2 | AGREE | Reproduced: 4 open `A-CLEAN` rows with Δ>0, 6 blocked rows, no class/Δ/blocked-by relation in `--verify`. Plan undercounts the stored violations by one (synced `a5f4192bf`, Δ 2). |
| S3 | AGREE | Reproduced: SYNC-7 is item 8 of 9; no capacity model, cap, or P0 SLA anywhere in the artefacts. |
| M1 | AGREE | `--refresh` reads only `baselineFull..upstream/main` (:1364) and the manual states it "never reclassifies"; stored Δ is a 2026-09-16 snapshot against a fork-touched set that grows each batch. |
| M2 | AGREE | Verified concretely: header says 102 pending while 6 rows are `☑`, and check 7 (:531) certifies exactly that figure; cherry-picks cannot move the merge base. |
| M3 | DISAGREE (narrower) | Overloading is real (`7 D-LOCAL ☐`; `✖` carrying three meanings), but "one word doing three jobs" overstates it — every `✖` row has a recorded rationale, and the fix belongs to H-02's schema, not a new vocabulary. |
| M4 | DISAGREE | Coupling verified (`on: push: branches: [master]`), but the cited "already failed" evidence contradicts itself: register §9 attributes that abort to an Open VSX 503 and calls it infrastructure, explicitly *not* a version/coupling error. |
| M5 | AGREE | `grep -rn "verify:upstream-sync" .github/workflows/` → no match; `test:scripts` exercises the spec with injected probes only, so the live register is unverified in CI. |
| M6 | AGREE | Logically sound and unmeasured: no gate inspects intent equivalence, and the gate chain itself contains no port-fidelity check. |

**New findings:**

| ID | Sev | Finding | Evidence (command + observed output) | Proposed fix | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| F-A-1 | High | **H-01's acceptance test is already green on unmodified code**, so it cannot detect a regression in the new post-conditions. | `node scripts/upstream-sync-triage.mjs --verify` → exit 1; [`runRefresh()`](scripts/upstream-sync-triage.mjs:1310) aborts at `requireMergeBase` ([:1336](scripts/upstream-sync-triage.mjs:1336)) **before** the only write ([:1410](scripts/upstream-sync-triage.mjs:1410)). | Add a fixture-based test: grafted `upstream/main` + *resolvable* merge base + recorded tip outside the window; unit-test `runRefresh` through an injected probe (pattern already present at [:411](scripts/upstream-sync-triage.mjs:411)). | The fixture exits non-zero and leaves the register byte-identical; deleting the new `--is-ancestor` assertion makes the fixture fail. |
| F-A-2 | High | **Rate arithmetic's drain is one same-day event, mis-stated as a week.** | `git log -1 --format='%h %ad %s' --date=short 6c4e9df5c` → `6c4e9df5c 2026-09-16 Merge pull request #345 …`; register [:192](docs/upstream-sync/pending-upstream-commits.md:192)/[:402-405](docs/upstream-sync/pending-upstream-commits.md:402) attribute **all six** `☑` rows to PR #345; status still `6 ☑ / 63 ☐` on 2026-09-23. | Define drain as resolved-rows-per-week from dated events, excluding baseline-day merges; report marginal (last-7-day) drain separately. | The metric changes when a row resolves on a different day, and reads 0 rows/day for 2026-09-17→2026-09-23. |
| F-A-3 | High | **H-12's metrics have no input data: the register stores no resolution date and no dwell time.** | Row schema [`upstream-sync.md:173`](docs/runbooks/upstream-sync.md:173) = `sha | date(upstream) | subject | CLASS | P# | Δ | status`; grep for a resolved-date column → `0`. | Add `Resolved: <date>` (or a changelog-keyed resolution log) in H-02's schema change and derive ages from it. | From the register alone, the age of the oldest unresolved P0 is computable and non-zero. |
| F-A-4 | Medium | **§5's ready-set predicate contradicts §2's and is not computable**: it includes `B-CAREFUL`, which is *defined* by Δ≥1, and `Blocked-by` does not exist yet. | `awk` over `B-CAREFUL` rows with Δ=0 → **empty** (0 rows) against 25 `B-CAREFUL` rows; no `Blocked-by` column anywhere in the register. | Ready set = `A-CLEAN ∧ Δ=0 ∧ prerequisite ☑`; land `Blocked-by` (H-02) before implementing §5 (H-08). | The planner refuses to emit a `B-CAREFUL` row as ready and names every row with a non-`☑` `Blocked-by`. |
| F-A-5 | Medium | **A "✅ VERIFIED" ledger row is wrong**: E2 claims 17 handler modules; there are 16. | `git ls-files src/core/webview/handlers \| wc -l` → `16`; `find … -maxdepth 1 -type f \| wc -l` → `16` (same 16 `.ts` files listed). | Correct E2 to 16 and apply H-20 to the ledger itself: every `✅ VERIFIED` row must carry its reproducing command. | Every §2 `✅ VERIFIED` row contains a command whose output matches the stated figure. |
| F-A-6 | Medium | **E12's telemetry numbers do not reproduce**, so the "tested and killed on evidence" narrative rests on an unquoted count. | `grep -rIl -E "captureEvent\|telemetry" src --include=*.ts --include=*.tsx \| grep -v src/coverage/ \| wc -l` → `25` (not 68/30); `git grep -Il "captureEvent(" -- "src/**/*.ts"` → `0`. | Quote the exact grep and scope in E12 and H-10; agree one canonical pattern for `verify-no-telemetry.mjs`. | A second reviewer reproduces the stated count with the documented command; the gate fails on a seeded `captureEvent(` call site. |
| F-A-7 | Medium | **H-03's "all merge-base-free" profile is false for `header-counts`**, which needs the merge-base-derived commit set. | [`validateRegister()`](scripts/upstream-sync-triage.mjs:426) check 7: `baseline.pendingCount !== cross.expected.length` ([:531](scripts/upstream-sync-triage.mjs:531)), where `cross.expected` derives from `merge-base..upstream/main`; the CLI also aborts before any check when the merge base is unusable (observed exit 1). | Split into `header-tip` (merge-base-free) and `header-pending-count` (deep-clone-only); the repo-only profile then enforces 5–6 checks. | In a shallow CI clone, `--verify --repo-only` exits 0 and reports only merge-base-free checks as enforced. |
| F-A-8 | Medium | **H-05's acceptance test is too narrow**: stale check counts live outside `docs/`. | `grep -rn "six independent" docs/ scripts/` → [`upstream-sync.md:162`](docs/runbooks/upstream-sync.md:162) **and** [`upstream-sync-triage.spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267). | Extend the sweep and its test to `scripts/`; the register's "~15 immediate low-risk value" note ([:79-82](docs/upstream-sync/pending-upstream-commits.md:79)) belongs in the same sweep. | `grep -rn "six independent" docs/ scripts/` → 0; the register's reading note matches the computed ready set. |
| F-A-9 | Medium | **The two gate chains disagree**, and the agent-facing one is the weaker: the runbook drops `pnpm test:scripts` and the `pnpm verify:*` re-run. | [`README.md:141-152`](docs/upstream-sync/README.md:141) lists eight node gates + `pnpm test:scripts`; [`upstream-sync.md:104-116`](docs/runbooks/upstream-sync.md:104) substitutes `pnpm lint` and omits `test:scripts`/`verify:*`. | Single source of truth: one script (or `pnpm` aggregate) that both files reference; a docs test asserts they agree. | A docs/scripts test fails if the two gate lists diverge. |

**Dissent / uncertainty:**
- I cannot separate "the recorded tip is unreachable" from "the clone is grafted" here: `git rev-parse --is-shallow-repository` → `true`, and `.git/shallow` names `78b74ec1c` (2026-09-22) as the boundary, which is why `upstream/main` holds exactly 3 commits. E9's `--is-ancestor → false` is **evidence about the clone, not about `runRefresh()`**; S1 stands on the code reading, not on E9.
- The "22" figure was presumably the window size when the docs were written; L3 is about a *hardcoded literal*, not about count logic. My reading of that window is 3, so the docs are wrong *today* in a way that would be wrong again with a different number tomorrow — parameterising is the fix, but no single replacement number is correct.
- The register currently has **zero `◐` rows**, so `stale-in-progress` (the check the tool's comment says closed "issue #342") has no live subject; neither the register nor the plan demonstrates it works on real data.
- The plan's "+3 rows/day (~+88/month)" counts *all* arrivals including the 33 `✖` rows. On actionable rows only (69 of 102), arrival is 2.56/day — the queue economics are ~18% less alarming than stated, while "the 19 `C-REIMPLEMENT` rows dominate the actionable remainder" (19/69 = 28%) is directionally right but not dominant.
- H-04 is a release-governance concern the sync DoD is being asked to carry; whether it belongs in this ADR at all is a scope question, and I did not verify the pre-merge version-guard duplication is implementable.
- H-11's "the upstream SHA that forced it" is undecidable for branding-mode allow-list entries (per [`adr-upstream-alignment-fork-strategy.md:34`](docs/adr/adr-upstream-alignment-fork-strategy.md:34)); I did not read [`verify-upstream-code-index-alignment.mjs`](scripts/verify-upstream-code-index-alignment.mjs:92), so this is assumption-based.
- I made **no file writes** and did not run `--refresh` (it fetches and would perturb the evidence the plan's own ledger depends on), so H-01/H-07 remain fixture-unverified.

**Ordering advice:**
1. **H-02 first** (schema: `Blocked-by` + `Resolved`, plus enforced invariants). Every other item's arithmetic, ready set and metrics read from this schema, and the data is currently self-inconsistent (six `☑` rows inside a "102 pending" header) — no metric is trustworthy before this lands.
2. **H-06 immediately after H-02, and before H-08/H-12.** Δ is a 2026-09-16 snapshot; the planner cannot "reuse" file sets that refresh computes for new rows only and discards, and a ready-set number built on stale Δ is not actionable.
3. **H-01 with a *discriminating* acceptance test (F-A-1) before H-07.** Automating a refresh that can advance the baseline tip past unmeasured commits is the worst single failure mode in the plan, and the current test would not catch it.
4. **H-05 + F-A-8/F-A-9 early and cheap**, because the misleading literals ("22", "six", "~15 quick-wins") are exactly what the next agent will act on — and the runbook is the file an agent obeys.
5. **H-03 only after splitting `header-counts` (F-A-7)**, otherwise the new CI job is red by construction in every shallow checkout.
6. **H-12/H-16 after F-A-3** (resolution dates) and after F-A-2's drain redefinition; a forced-decision rule wired to an uncomputable metric will fire on noise.
7. **H-13 capacity decision now, execution after the three clean rows land** — `97265fd8e`, `ae6c1a876`, `87d41aa4f` are nearly free, and SYNC-7 is itself six Δ 3–36 re-implementations fighting the R6 suppression ratchet.
8. **H-15 last, and re-scoped**: as written it pre-commits to the whole-history merge that ADR §5 and manual §7 gate behind unmet preconditions, and that produced the three repair commits this strategy exists to prevent.

<!-- /REGISTER-A -->

<!-- REGISTER-B -->
### B — 👁️ Code Review Expert (`code-reviewer`)

*Registered 2026-09-23 · mode `code-reviewer` · returned as a registry block; no files written by the lens. Assumptions: I did not run `--refresh` (it fetches into `.git` and would perturb the ledger the plan's own evidence depends on), so every `--refresh` claim is verified **by code reading + component reproduction**, and flagged as such.*

**Verdict:** The verifier is genuinely well-built — pure seams, an injected `probe`, a row-scoped matcher, `TAG`/`--help`/explicit exit codes — and lens A's H-01 refutation is correct and reproduces exactly. But the plan is **not implementation-ready as written**: its two schema items (H-02/F-A-3) are silently incompatible with the register parser (which reads the status cell by hard-coded index [`cells[6]`](scripts/upstream-sync-triage.mjs:327)), its acceptance tests are largely non-discriminating or unhostable (the spec's only live-register test is *vacuous in the CI shape*), and H-18's stated idempotence test is **red before any new code** because [`full-rebrand.sh`](scripts/full-rebrand.sh:27) is provably non-idempotent. Recommend: land H-02+H-06 behind the parser change (F-B-1) and rewrite 6 of the 8 audited acceptance tests before any of them is treated as a gate.

**Claims verified by me (claim → command → observed output):**
- **Lens A F-A-1 / H-01 test already green →** `bash -c 'node scripts/upstream-sync-triage.mjs --verify; echo "---EXIT=$?"'` → `❌ [SYNC:TRIAGE] upstream/main has no merge base with origin/master (this checkout is shallow). … the pending count would read 22 instead of 102. Deepen first: git fetch --deepen=400 upstream main` / `---EXIT=1`. **CONFIRMED.** Code confirms the reason: [`requireMergeBase`](scripts/upstream-sync-triage.mjs:1336) returns before the sole write at [`applyRefreshWrite`](scripts/upstream-sync-triage.mjs:1410), so "`--refresh --write` exits non-zero and writes nothing" passes on unmodified code.
- **Register parser is index-coupled (new) →** `node --input-type=module -e "…parseRegister(8-col row)…"` → `cells(8): ["\`c747c024b\`","2026-09-01","fix: x","\`A-CLEAN\`","P1","0","\`5e8fcc846\`","☐"]` / `parsed status: "\`5e8fcc846\`"  delta: "0"  synced: false`. Code: [`ROW_SHA_RE`](scripts/upstream-sync-triage.mjs:127), `statusCell = cells[6]` [`(:327)`](scripts/upstream-sync-triage.mjs:327), `delta: cells[5]` [`(:336)`](scripts/upstream-sync-triage.mjs:336). **CONFIRMED: inserting a `Blocked-by`/`Resolved` column shifts the status cell → `synced` reads as false.**
- **Spec's live-register test is vacuous in CI →** `node scripts/upstream-sync-triage.mjs --verify --json` → `{ "mode":"verify","ok":false,"shallow":true,"error":"upstream/main has no merge base…" }` (exit 1, **no `checks` key**). Spec's only live read is gated on `if (!Array.isArray(parsed.checks)) { … return }` at [`upstream-sync-triage.spec.mjs:1087`](scripts/upstream-sync-triage.spec.mjs:1087). **CONFIRMED: the 102-row register is never asserted in the CI shape.**
- **Spec scope vs live register →** `node --test scripts/upstream-sync-triage.spec.mjs` → `# tests 83 / # suites 18 / # pass 83 / # fail 0` — all injected-fixture tests; the one real-register block is conditionally skipped.
- **Gate lists disagree →** `sed -n "137,153p" docs/upstream-sync/README.md` lists 8 node gates + `pnpm verify:roomodes && pnpm verify:submodule-pin && pnpm verify:announcement-version` + `pnpm test:scripts`; `sed -n "104,117p" docs/runbooks/upstream-sync.md` lists the same 8 node gates, then `pnpm lint` (no `test:scripts`, no `pnpm verify:*`). **CONFIRMED — the agent-facing file is the weaker one.**
- **H-18 idempotence is already broken (new) →** twice-piped Phase-1 substitution: `printf "\42zoocode\42\n" | sed "s/…/" | sed "s/…/"` → `"zoocode",  "roo-plus",  "rooplus",  "roo-plus",  "rooplus"`. Source: [`full-rebrand.sh:27`](scripts/full-rebrand.sh:27). **CONFIRMED: re-running the rebrand duplicates keywords; "second run = empty diff" is red today.**
- **CI wiring (M5) →** `grep -rn "verify:upstream-sync" .github/workflows` → no match; [`code-qa.yml:87`](.github/workflows/code-qa.yml:87) runs `pnpm run test:scripts`, whose spec list includes [`upstream-sync-triage.spec.mjs`](package.json:29) — i.e. only the vacuous path runs. Also `--repo-only` is unknown today: `node scripts/upstream-sync-triage.mjs --verify --repo-only` → `❌ unknown argument(s): --repo-only` / `exit=1`.
- **Blast-radius figures →** `git ls-files "src/**/*.ts" | wc -l` → **987** (rebrand `find` target); `git ls-files "locales/*/README.md" | wc -l` → **17**; `git ls-files "webview-ui/src/i18n/locales/**/*.json" | wc -l` → **162**; `wc -l src/eslint-suppressions.json` → **1707**; `git ls-files src/core/webview/handlers | wc -l` → **16** (E2's "17" is wrong, as A said).
- **`pnpm lint` does not cover `scripts/**` (new) →** `grep -rn "scripts" eslint.config.mjs src/eslint.config.mjs` → no match; root `"lint": "turbo lint …"` [`package.json:12`](package.json:12) with `turbo.json` `"lint": {}` [`(turbo.json:4)`](turbo.json:4) — so the surface the plan grows is outside static analysis.
- **No changed-line accounting (new) →** `grep -n "numstat\|shortstat\|--stat\|changedLines" scripts/upstream-sync-triage.mjs` → `NONE`; file lists come from `--name-only`.

**Claims I could not reproduce:**
- **E11 baselines** (180 fork-only / 977 / 689 / 272 / overlap buckets / 4206-line upstream handler / 131 telemetry files) — needs `git fetch --unshallow` + network. `git rev-parse --is-shallow-repository` → `true`. UNVERIFIED.
- **E12 exact telemetry counts** (68 files / 30 tracked `.ts`) — no quoting command in the ledger; I did not re-run the grep, so I neither confirm nor refute (lens A read 25). UNVERIFIED here.
- **`--refresh --write` end-to-end** (S1) — I refused to run it (fetch writes into `.git`). The *ingredients* are verified by code reading (no `merge-base --is-ancestor`; count written at [`(:1398)`](scripts/upstream-sync-triage.mjs:1398)); the demonstration needs a fixture with a grafted `upstream/main` and a resolvable merge base.
- **H-04's CI acceptance test** ("two consecutive batch merges → two green publish runs") — needs CI + network. UNVERIFIED.
- **E9's `--is-ancestor → false` as evidence about `runRefresh`** — I concur with lens A: `cat .git/shallow` → `78b74ec1c…`, `bfe014fd8…`, so the observation is about the graft, not the function.

**Decisions on H-01…H-20:**

| ID | Decision | Reason (≤20 words) |
| --- | --- | --- |
| H-01 | REVISE | Assertion genuinely absent; test already green pre-change (confirmed). Make it an injected-probe unit test. |
| H-02 | REVISE | Invariant real; new columns silently break `cells[6]` status parsing (F-B-1). Land schema+parser together. |
| H-03 | REVISE | `--repo-only` needs `runVerify` restructured; `header-counts` not merge-base-free (F-A-7). Test must target 5 checks. |
| H-04 | REVISE | Coupling verified; "already failed from this coupling" misreads a 503 infra abort. Also duplicates CI logic. |
| H-05 | REVISE | Contest A's ACCEPT: `docs/`-only test misses [`spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267). Sweep `scripts/` too. |
| H-06 | REVISE | Needed, but `runRefresh` is impure (direct git) — not unit-testable until the probe pattern is extended. |
| H-07 | REVISE | `pnpm upstream:preflight` does not exist; acceptance is e2e-only, unhostable in `node:test`. |
| H-08 | REVISE | File sets exist for new commits only; no line counts computed (NONE). §5's ready set contradicts §2. |
| H-09 | ACCEPT | Sound; pair the subject regex with a real advisory feed (A's caveat stands). |
| H-10 | ACCEPT | Real absent gate; must ship with its own fail-closed test since `scripts/**` is unlinted. |
| H-11 | REVISE | Ledger key undefined for branding-mode entries (no single forcing SHA). |
| H-12 | REVISE | No resolution date (F-A-3) and "metric moves" is non-discriminating as written. |
| H-13 | ACCEPT | Only lever that lowers per-row cost; SYNC-7 confirmed 8th of 9. |
| H-14 | ACCEPT | Countable divergence stock; correct root cause. |
| H-15 | REVISE | Pre-commits the mode ADR §5/manual §7 gate behind unmet preconditions. |
| H-16 | REVISE | Trigger reads uncomputable metrics; drain rests on one same-day merge (F-A-2). |
| H-17 | ACCEPT | Names the only evidence the gate chain can host; direct M6 fix. |
| H-18 | REVISE | Contest A's ACCEPT: script is provably non-idempotent; fix must include the Phase-1 sed. |
| H-19 | ACCEPT | Correct: supply-chain hunks are trivially portable and wrongly blanket-refused by path. |
| H-20 | ACCEPT | Right rule, self-violated by the ledger; make it machine-checked, not prose. |

**Decisions on findings S1–S3, M1–M6:**

| ID | Decision | Reason |
| --- | --- | --- |
| S1 | AGREE | Confirmed by code: no ancestry assertion; count from a possibly-saturated window. Latent behind `requireMergeBase`. Add the force-push over-report mirror case (A's caveat). |
| S2 | AGREE | Four open Δ>0 `A-CLEAN` rows plus one synced (`a5f4192bf`); no class/Δ relation in `--verify`. |
| S3 | AGREE | SYNC-7 is item 8 of 9; no capacity model, cap, or P0 SLA anywhere. |
| M1 | AGREE | Δ is a 2026-09-16 snapshot; refresh reads only `baselineFull..upstream/main` and never reclassifies. |
| M2 | AGREE | Header `**102**` coexists with 6 `☑`, and check 7 certifies exactly that merge-base-derived figure. |
| M3 | AGREE (narrower) | Overloading real (7 `D-LOCAL ☐`), but the fix is H-02's schema, not a new vocabulary — concurring with A. |
| M4 | DISAGREE (evidence) | Coupling stands (`on: push: branches: [master]`), but the cited abort is an Open VSX 503 labelled infrastructure. |
| M5 | AGREE | `verify:upstream-sync` wired nowhere; `test:scripts` exercises only injected probes — live register unverified. |
| M6 | AGREE | No gate inspects port intent equivalence; a half-ported `C-REIMPLEMENT` passes all seven checks. |

**Acceptance-test audit:**

| Plan item | Test as written | Discriminating? | Why | Improved test |
| --- | --- | --- | --- | --- |
| H-01 | "Shallow checkout: `--refresh --write` exits non-zero, writes nothing" | **N** | Passes today: `requireMergeBase` aborts before [`applyRefreshWrite`](scripts/upstream-sync-triage.mjs:1410). Confirmed by `--verify` exit 1. | Fixture repo: grafted `upstream/main`, *resolvable* merge base, recorded tip outside window. Unit-test `runRefresh` via an injected git accessor (extend the [`probe`](scripts/upstream-sync-triage.mjs:426) pattern); assert register byte-identical and that deleting the `--is-ancestor` assertion makes the fixture fail. |
| H-02 | "Check names each violating row; a seeded violation fails" | **Y (fragile)** | A seeded violation would pass pre-change, so it discriminates — but only if the parser is fixed first; with new columns [`cells[6]`](scripts/upstream-sync-triage.mjs:327) reads the wrong cell. | Assert `report.ok===false` **and** the named-row list contains all five live violations; add `splitRowCells` regression asserting the header order (`sha,date,subject,class,pri,Δ,blocked-by,status`) and that `status` still parses. |
| H-03 | "A deliberately corrupted row fails a PR" | **N** | Today a corrupted SHA fails via `formatCheck` *given a merge base*; in the CI shape `--verify` returns 1 before reading the register, so it is red-for-the-wrong-reason. `--repo-only` is an unknown flag today (`exit=1`). | Add `--repo-only` as a parsed profile; test that in a merge-base-free fixture the profile runs exactly `[row-sha-format, row-sha-resolves, duplicates, synced-fork-sha, stale-in-progress]` and that a seeded 10-char row fails *that* check id. |
| H-06 | "Refresh reports Δ deltas; a re-picked row is flagged, not silently re-added" | **Y (unhostable)** | Directionally discriminating, but `runRefresh` calls git directly (no seam), so it cannot be exercised in `node:test` without a refactor. | Extract evidence computation behind an injected accessor; fixture: one existing row patch-equivalent (`git cherry` '-') to a new upstream tip → assert a flag and no duplicate row. |
| H-07 | "One PR per upstream advance, human-only merge gate" | **N** | Not a code-level assertion; nothing in `node:test` can observe a workflow PR. `pnpm upstream:preflight` does not exist. | Ship `pnpm upstream:preflight` first; test its *dry-run* JSON contract (`--json`: `{backlog, arrivalPerDay, drainPerDay, readySet[], plan[]}`), then assert the workflow file invokes it and that its `permissions:`/merge gate are present. |
| H-08 | "Planner pairs two disjoint batches; an oversized batch is refused" | **Y (premise false)** | Would discriminate, but refresh retains file sets for new commits only [`(:1369-1370)`](scripts/upstream-sync-triage.mjs:1369), and no line counts are computed (`grep … → NONE`), so "≤400 changed lines" is unmeasurable. | Change the cap to inputs the tool can compute (files, hot-file hits) or compute `git diff --numstat`; test greedy colouring on a fixture with a shared file → assert two disjoint groups, and that an 11-file batch is refused with a named row. |
| H-12 | "Header shows a metric that moves when work lands" | **N** | Today's header already shows a metric (`**102**`); the assertion would pass unchanged, and no resolution date exists to compute drain/dwell. | Fixture register with two dated resolutions → assert `resolved/total` and `oldestUnresolvedP0Age` change and that a row lacking `Resolved:` fails; assert the pending-count check is reported separately from the progress metric. |

*Enforcement mechanics (mandate 3):* conventions are followed — [`TAG = "SYNC:TRIAGE"`](scripts/upstream-sync-triage.mjs:88), `printHelp()` [`(:1482)`](scripts/upstream-sync-triage.mjs:1482), explicit `0`/`1` codes, unknown flags fail loudly [`(:1555)`](scripts/upstream-sync-triage.mjs:1555), `--write` gated to `--refresh` [`(:1560)`](scripts/upstream-sync-triage.mjs:1560). The blockers to the proposed extensions are: `--repo-only` must be added to [`parseArgs`](scripts/upstream-sync-triage.mjs:941) *and* `runVerify` must stop hard-returning 1 at [`(:1202-1212)`](scripts/upstream-sync-triage.mjs:1202); `Blocked-by`/`Resolved` must be added *without* shifting [`cells[6]`](scripts/upstream-sync-triage.mjs:327) (F-B-1); `--plan` is parser-safe (it consumes `klass/delta/status`) but any write must respect `nextSectionNumber`/`applyRefreshWrite` insert-before-`## Recommended execution order` [`(:862)`](scripts/upstream-sync-triage.mjs:862).

*Atomicity / blast radius (mandate 4):* each batch runs [`full-rebrand.sh`](scripts/full-rebrand.sh:1) which `sed -i`s **987** tracked `src/**/*.ts` plus `src/package.json` [`(:41-92)`](scripts/full-rebrand.sh:41) — a batch diff is therefore bounded by the *repo*, not the batch, so H-18's "diff ⊆ batch ∪ branding files" is the only thing standing between a review and an unbounded diff. Locale fan-out is **17** `locales/*/README.md` + **162** locale JSONs (R5 forbids the readmes), and the ratchet file is **1707** lines — R6's "suppressions may never increase" is the real per-row cost driver for H-13's six Δ 3–36 re-implementations.

**New findings:**

| ID | Sev | Finding | Evidence (command + observed output) | Proposed fix | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| F-B-1 | **High** | **H-02/F-A-3's new register columns silently corrupt parsing.** `parseRegister` reads `status` by hard-coded index; adding `Blocked-by`/`Resolved` before `Status` makes the parser read the *Blocked-by* cell as status, so `synced` becomes `false` for genuinely-`☑` rows and `synced-fork-sha`/`stale-in-progress` go quiet (false negatives), and `buildBatchRollup`'s pending count drifts. | `node --input-type=module -e "…"` → `cells(8): […,"\`5e8fcc846\`","☐"]`; `parsed status: "\`5e8fcc846\`"  synced: false`. Source [`cells[6]`](scripts/upstream-sync-triage.mjs:327), [`delta: cells[5]`](scripts/upstream-sync-triage.mjs:336). | Make column resolution name-based (map header cells → indices once per table) or append new columns *after* `Status` and keep `cells[6]`; do the parser change in the same commit as H-02. | A `splitRowCells`/`parseRegister` regression asserts the new header order parses `status:"☑ \`abc1234\`"`, `synced:true`, `blockedBy:"5e8fcc846"`; a `☑` row with a `Blocked-by` value still fails `synced-fork-sha` when unreachable. |
| F-B-2 | **High** | **The plan's "corrupted row fails a PR" has no host, and the spec's only live-register test is vacuous.** In the CI shape (`--verify --json`) the payload has **no** `checks` key, so the spec's real-register block early-returns; and `runVerify` returns 1 *before reading the register* when the merge base is unusable. 83/83 spec tests pass while the 102-row register is never asserted. | `node scripts/upstream-sync-triage.mjs --verify --json` → `{"mode":"verify","ok":false,"shallow":true,"error":"…no merge base…"}` (no `checks`); gate at [`spec.mjs:1087`](scripts/upstream-sync-triage.spec.mjs:1087); `node --test …spec.mjs` → `# tests 83 … # pass 83`. | Add a register-only fixture test (reads the real file, injects a synthetic probe) that runs the 5 merge-base-free checks unconditionally, and a CI step that runs `--verify --repo-only` (H-03) so the live register is asserted at depth 1. | The new spec case asserts `parseRegister(realRegister).rows.length === 102` and that the 5 repo-only checks are present and `ok` — and fails if the register file is missing/empty. |
| F-B-3 | **Medium** | **H-18's idempotence acceptance test is red before any new code.** Phase 1's keyword `sed` re-inserts the roo-plus/rooplus keywords on every run, so "rebrand on a no-op batch produces no diff" cannot pass until the `sed` itself is fixed. | `printf "\42zoocode\42\n" | sed "s/…/" | sed "s/…/"` → `"zoocode", "roo-plus", "rooplus", "roo-plus", "rooplus"`. Source [`full-rebrand.sh:27`](scripts/full-rebrand.sh:27), `set -e` but no trap. | Guard the insertion (e.g. conditional on absence) and add the diff-scope assertion **plus** the second-run-empty-diff check in the same change; wrap in a temp worktree so the assertion is testable offline. | Running the script twice on a fixture `package.json` leaves it byte-identical to the single-run result, and a batch touching one file yields a diff confined to (batch ∪ branding) files. |
| F-B-4 | **Medium** | **H-08's batch cap is unmeasurable and its inputs are discarded.** The tool computes `fileCount` only (never changed *lines*), and computes file sets for *new* commits only — so a planner cannot cap "≤400 changed lines" nor reuse per-commit file sets for existing rows. | `grep -n "numstat\|shortstat\|--stat\|changedLines" scripts/upstream-sync-triage.mjs` → `NONE`; `sed -n 1369,1370p` → `const conflictSurface = newShas.length > 0 ? computeConflictSurface(…) : new Set()` / `const proposals = newShas.map(…)`. | Either compute `git diff --numstat <sha>^ <sha>` inside `computeCommitEvidence` and persist it, or express the cap in files/hot-file hits; land H-06 before H-08. | Planner refuses a batch whose measured size exceeds the cap and names the offending row; a fixture with two commits sharing one file yields two disjoint groups. |
| F-B-5 | **Medium** | **The surface the plan grows is outside static analysis.** `pnpm lint` is `turbo lint` over workspace packages and no ESLint config references `scripts/`, so AGENTS.md R7 (no `as any`, no floating promises) is unenforceable on the new verifier/planner code — and a broken gate can ship green. | `grep -rn "scripts" eslint.config.mjs src/eslint.config.mjs` → no match; [`package.json:12`](package.json:12) `"lint": "turbo lint …"`; [`turbo.json:4`](turbo.json:4) `"lint": {}`. | Add an ESLint pass over `scripts/**/*.mjs` (root flat config) and wire it into the gate chain / `pnpm lint`, so H-02/H-06/H-08/H-10's new code is linted. | CI fails on a seeded `as any` / floating promise in `scripts/upstream-sync-triage.mjs`; the new `verify-no-telemetry.mjs` is linted and has a spec. |

*Docs-as-code (mandate 5):* the disagreement is confirmed (README §4.4 vs runbook TASK 6, line ranges quoted above): the runbook substitutes `pnpm lint` for the README's `pnpm verify:*` aggregate **and** drops `pnpm test:scripts`. Proposed single source of truth: a machine-readable manifest (e.g. `scripts/upstream-sync-gates.json` with `{id, command, requiresMergeBase}`) plus a `pnpm gate:sync` aggregate that executes it; both docs then reference `pnpm gate:sync` and a generator-check rewrites the fenced block. Its test lives in `scripts/` (no Vitest runner there): assert the README fenced block and the runbook fenced block are byte-identical to the rendered manifest, and that every listed command resolves to an existing file in `git ls-files`. This also fixes L2 (six/seven) by deriving the check count from [`validateRegister`](scripts/upstream-sync-triage.mjs:426) rather than prose.

*Lint / suppression / rule survival (mandate 6):* the plan's script-side changes are **not** covered by `pnpm lint` (F-B-5) — that is the main "will not survive" risk in the *opposite* direction (silent regressions, not lint failures). No proposal introduces `as any` or floating promises in `src/`; H-10's scaffolding cleanup and H-13's SYNC-7 work are the only `src/`-touching items and must respect R6 ([`src/eslint-suppressions.json`](src/eslint-suppressions.json:1), 1707 lines) and R7. H-04's version guard, if duplicated into `code-qa.yml`, must call the existing script rather than re-implement the check (else two sources of truth for a fail-closed gate).

**Dissent / uncertainty:**
- **Contesting lens A on H-05 and H-18:** A accepted both. I hold H-05 → **REVISE** (the `docs/`-only grep misses [`spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267)) and H-18 → **REVISE** (the rebrand is non-idempotent today, so the stated test cannot pass). If the architect applies A's `ACCEPT` verbatim, both items keep a test that does not discriminate.
- I did **not** run `--refresh`/`--refresh --write`; S1/H-06/H-08 remain fixture-unverified by execution. A fixture repo (grafted `upstream/main`, resolvable merge base, recorded tip outside the window) is the prerequisite for closing them.
- E11/E12 figures, H-04's CI test, and E9-as-evidence-for-`runRefresh` are UNVERIFIED here (shallow clone / network / CI). I concur with A that E9's observed `--is-ancestor → false` is about the graft.
- The `--repo-only` check set (5 checks) is my inference from which checks consume merge-base data; it should be confirmed against the intent of H-03 before implementation.
- Risk that F-B-1 is "priced in": if the implementer appends new columns after `Status`, `cells[6]` survives — but the plan does not say where the columns go, so the finding stands as an unspecified hazard.

**Ordering advice:**
1. **F-B-1 (parser/column contract) + H-02, then H-06** — every downstream metric, ready set and invariant reads from this schema, and the status-cell mapping must be fixed in the same change or the verifier goes quiet rather than red.
2. **H-05 + F-A-8/F-A-9 + the docs manifest (SSoT)** — cheap, and these are the literals an agent will act on; the runbook is the file agents obey.
3. **H-01 with a fixture-based test (F-A-1/F-B-2) before H-07** — automating a refresh that can advance the tip past unmeasured commits is the worst failure mode, and today's test would not catch it.
4. **H-03 only after `runVerify` is split and `header-counts` is separated (F-A-7/F-B-2)** — otherwise the new CI step is red by construction at depth 1.
5. **H-18 with the rebrand `sed` fix (F-B-3) before any batch is reviewed under the new scope assertion**; add the `scripts/**` ESLint pass (F-B-5) alongside H-10 so the new gates are themselves gated.
6. **H-08/H-12/H-16 after H-06 and the metric inputs (F-A-3/F-B-4)**; H-11/H-15 last, re-scoped per lens A.

<!-- /REGISTER-B -->

<!-- REGISTER-C -->
### C — 🔀 Merge Resolver (`merge-resolver`)

*Registered 2026-09-23 · mode `merge-resolver` · returned as a registry block; no files written by the lens. Assumption: no pick, merge or `--refresh` was executed (both would write into `.git`/worktree), so every resolution claim is verified from artefact text plus read-only git.*

**Verdict:** R4's "never pick a side, re-express upstream's fix in the fork's structure" is the correct doctrine and matches the skill's two strongest rules (intent-based resolution, preserve both sides) — but it is stated *only* at file granularity and *only* against a frozen merge base, so it degrades exactly as the fork does its work (rebrand rewrites, `-x` imports, decomposition), and it records nothing about how a conflict was resolved. The strategy is sufficient for `A-CLEAN` picks on files the fork never reorganised; it is under-specified for the `C-REIMPLEMENT`-heavy reality, has no hunk-level predictor for either conflicts or prerequisites, and has no dedupe or resolution-record mechanism at all — three of the four gaps are cheap to close.

**Doctrine vs skill:**

*Where it matches (and exceeds) the skill:*
- Skill "never blindly choose a side; apply the bugfix logic **within** the refactored structure" ≡ R4 ([`upstream-sync.md:18`](docs/runbooks/upstream-sync.md:18)) and TASK 3(c) ([`:90`](docs/runbooks/upstream-sync.md:90)), manual §4.2 ([`README.md:113`](docs/upstream-sync/README.md:113)–[`:124`](docs/upstream-sync/README.md:124)).
- Skill "escape conflict markers with `\`" ≡ manual §4.2 verbatim: `Escape conflict markers with \`\\\` when writing diffs (\`\\<<<<<<<\`)` ([`README.md:124`](docs/upstream-sync/README.md:124)). (Note: the escaping rule lives in the *reference* manual only; the runbook — the file agents must obey — never mentions it.)
- Beyond the skill: the runbook adds a stop condition the skill lacks — ambiguous handler-batch intent ⇒ stop and ask ([`:33`](docs/runbooks/upstream-sync.md:33)) — and upstream-vs-upstream conflicts ⇒ human decides ([`:37`](docs/runbooks/upstream-sync.md:37)).

*Where it is weaker than the skill (cited lines):*
1. **No hunk-level intent attribution.** Skill phase 1.3 mandates `git blame` on *both sides of the conflict*; the doctrine's fork-intent query is R4 ([`:18`](docs/runbooks/upstream-sync.md:18)) = `git log --oneline <merge-base>..master -- <file>`. `grep -rn 'blame\|log -L'` over all three sync artefacts returns **no match** (exit 1). No `git log -L`, no blame, no line-range scoping anywhere in the doctrine.
2. **The fork-intent query is polluted by the strategy's own outputs.** Every batch (a) cherry-picks with `-x` (R3, [`:17`](docs/runbooks/upstream-sync.md:17)) — so `<merge-base>..master` contains *upstream* commits re-badged as fork history — and (b) runs `full-rebrand.sh` ([TASK 5, `:102`](docs/runbooks/upstream-sync.md:102)) which `sed -i`s **987** tracked `src/**/*.ts`. A file's recent `--oneline` history is therefore rebrand/import churn, not intent. Blame + `--ignore-revs` + `-L` are precisely the tools that survive this; the doctrine uses neither.
3. **Structural conflicts have no declared fork-intent locus.** `git log … -- <file>` cannot express fork intent when the fork moved the behaviour (`handlers/*.ts`, typed registry). TASK 4 ([`:97`](docs/runbooks/upstream-sync.md:97)) correctly forbids the pick for `C-REIMPLEMENT`, but a `B-CAREFUL` row can still hit a decomposed/renamed hunk, and the doctrine never says "locate the fork's equivalent code and record the mapping" — the *path map* is missing from R4.
4. **No validation of the resolution itself.** Skill phase 4 requires "no conflict markers remain" and "check for compilation/syntax errors". The gate chain ([`:104`](docs/runbooks/upstream-sync.md:104)–[`:116`](docs/runbooks/upstream-sync.md:116)) runs seven invariant gates, `pnpm lint`, and package Vitest: no `git diff --check`, no marker grep (`grep -rn '<\{7\}'` over the runbook/manual/tool finds only the escaping note), and **no `pnpm check-types`** although [`src/package.json:456`](src/package.json:456) defines it (`tsc --noEmit`).
5. **No decision record.** Skill completion criteria include "resolution decisions are documented". The register row schema ([`:173`](docs/runbooks/upstream-sync.md:173)) has no resolution field; TASK 8's report is ephemeral.
6. **No precedence heuristic for the irreducible case.** Skill offers bugfix>feature, recency, test-updates, logic>formatting. The doctrine has "satisfy both" and a stop condition for *upstream-vs-upstream*, but no rule for fork-behaviour vs upstream-fix when both cannot hold (telemetry, cloud, branding, protocol) — the fork's most frequent real conflict.

**Claims verified by me (claim → command → observed output):**
1. **Δ distribution and range (mandate 2).** `awk -F'|' '/^\| `[0-9a-f]{9}` \|/ {d=$7; gsub(/ /,"",d); print d}' docs/upstream-sync/pending-upstream-commits.md | sort -n | uniq -c` → `25 0 / 17 1 / 16 2 / 8 3 / 7 4 / 5 5 / 3 6 / 1 7 / 2 8 / 3 9 / 3 10 / 1 12 / 2 13 / 1 14 / 1 27 / 1 28 / 1 30 / 1 36 / 2 41 / 1 43 / 1 53`; `grep -cE '^\| `[0-9a-f]{9}` \|'` → **102**. Buckets = 0:25 / 1–2:33 / 3–5:20 / >5:24, exactly the ADR's `25 · 33 · 20 · 24` ([ADR:29](docs/adr/adr-upstream-sync-triage-strategy.md:29)), so the field mapping is right. **The brief's "Δ values run 0–43" is wrong: the maximum is 53** (`1ad8f528d`, the telemetry opt-out commit).
2. **The Δ↔class ladder is violated in stored data and checked nowhere.** `awk` rows with Δ≥6 whose class is not C-REIMPLEMENT/D-LOCAL/E-SKIP → `6 | B-CAREFUL | 78c712ac4`, `6 | B-CAREFUL | 8c9662966`, `10 | B-CAREFUL | a3e31e14b`, `6 | B-CAREFUL | 0d937c050`, `8 | B-CAREFUL | f424bbbe4` (+ `53 | X-REJECT | 1ad8f528d`). The runbook's own stop condition reads ``| `Δ > 5` and the commit's register class is **not** `C-REIMPLEMENT` | The classification is probably wrong…`` ([`:32`](docs/runbooks/upstream-sync.md:32)), and the tool's classifier encodes the same ladder — `if (evidence.delta <= 5) { … klass: "B-CAREFUL" }` else `klass: "C-REIMPLEMENT", reason: "Δ … — large overlap; runbook §2 stop condition"` ([`proposeClass`](scripts/upstream-sync-triage.mjs:691), [`:698`](scripts/upstream-sync-triage.mjs:698)). `--verify` has no class/Δ relation.
3. **No resolution record exists anywhere.** `grep -rn 'Resolved:\|Resolution:\|Blocked-by\|blocked_by' docs/upstream-sync docs/runbooks/upstream-sync.md docs/adr/adr-upstream-sync-triage-strategy.md` → matches **only inside the plan itself** (S2/H-02/F-A-3/F-B-1). The register has no `Blocked-by`, no `Resolved`, no `Supersedes`, no disposition column.
4. **Doctrine never attributes the hunk.** `grep -rn 'blame\|log -L' docs/upstream-sync docs/runbooks/upstream-sync.md docs/adr/adr-upstream-sync-triage-strategy.md` → **exit 1, no output**.
5. **No resolution-integrity gate.** `grep -rn '<\{7\}' docs/runbooks docs/upstream-sync scripts/upstream-sync-triage.mjs` → only `docs/upstream-sync/README.md:124` (the escaping instruction). `grep -n 'check-types\|tsc' docs/runbooks/upstream-sync.md docs/upstream-sync/README.md` → **no match**, while [`src/package.json:456`](src/package.json:456) = `"check-types": "tsc --noEmit"` and root [`package.json:13`](package.json:13) = `turbo check-types`.
6. **Patch-id decides dedupe — and is exactly what the re-land case defeats.** `for s in 5e8fcc846 567b94bd9 c4574ffef; do printf "%s  " $s; git show $s | git patch-id --stable | head -1; done` → `5e8fcc846  6de7f52ba735871aa5f04dcd19448f72b9779501`, `567b94bd9  6de7f52ba735871aa5f04dcd19448f72b9779501` (**identical** — the recorded fork SHA is a faithful `-x` cherry-pick), `c4574ffef  1f3901a271320cb4345ee1b32b6eef9cd47ab431` (**different**). So `git cherry -v` cannot flag the re-land the register calls "likely subsumed" ([`pending-upstream-commits.md:196`](docs/upstream-sync/pending-upstream-commits.md:196)) — a false negative on precisely the case TASK 3(e) ([`upstream-sync.md:93`](docs/runbooks/upstream-sync.md:93)) was written for.
7. **H-15's preconditions are unmet today.** `sed -n '221,241p' docs/upstream-sync/pending-upstream-commits.md` → SYNC-7 has **7 rows, all `☐`** (0 synced), and the register ranks it "8. **SYNC-7** — background enabler" ([`:412`](docs/upstream-sync/pending-upstream-commits.md:412)). Manual §7 precondition 2 ([`README.md:234`](docs/upstream-sync/README.md:234)) requires that debt "paid down enough that handler conflicts are mechanical"; 19 `C-REIMPLEMENT` rows are still pending.
8. **The escape hatch's damage is on the record, and so is its silence.** `git log -1 --format='%h %ad %s' --date=short <sha>` → `47d864776 2026-08-20 Merge remote-tracking branch 'upstream/main'`, `e86706d85 2026-08-21 fix(merge): repair upstream alignment regressions from wiring verification (Closes: #256)`, `189f7b640 2026-08-25 chore(code-index): align scanner.ts with upstream/main`, `096bbfea4 2026-08-21 ci: fix Dependabot auto-merge on non-Dependabot PRs; align service-factory.ts with upstream`. A merge on 2026-08-20 was being repaired the next day; **none of the three repair commits records which conflict it repaired or why**.
9. **Rebrand erases the intent signal, and the counter-measure is half-installed.** `grep -n 'find src' scripts/full-rebrand.sh` → 20+ lines of `find src -name "*.ts" -exec sed -i …`; `git ls-files 'src/**/*.ts' | wc -l` → **987**. `.git-blame-ignore-revs` **exists** but contains only two upstream Prettier revs (`cat` → `# Ran Prettier on all files - https://github.com/RooCodeInc/Roo-Code/pull/404`, `60a0a824b…`, `579bdd9db…`) and `git config --get blame.ignoreRevsFile` → **rc=1** (unset).
10. **Doctrine text, exactly.** `sed -n '18p' docs/runbooks/upstream-sync.md` → R4 … `Read git show <sha> -- <file> (upstream intent) **and** git log --oneline <merge-base>..master -- <file> (fork intent), then satisfy both`; manual §2 per-commit overlap is a **file-list intersection** with no content comparison: `comm -12 /tmp/c.txt /tmp/both.txt | wc -l` ([`README.md:51`](docs/upstream-sync/README.md:51)).

**Claims I could not reproduce:**
- **E11 baselines** (180 fork-only / 977 / 689 / 272 / overlap buckets / 4206-line upstream handler / 131 telemetry files) — needs `git fetch --unshallow` + network. `git rev-parse --is-shallow-repository` → `true`; `git log --oneline master..upstream/main` shows exactly 3 commits. UNVERIFIED.
- **E9's `--is-ancestor → false` as evidence about `runRefresh()`** — I concur with A and B: it is evidence about the graft boundary, not the function.
- **`--refresh --write` end-to-end** — refused (fetch writes into `.git`, and it would perturb the evidence the plan's ledger rests on). Would need a fixture repo with a grafted `upstream/main` and a *resolvable* merge base.
- **Whether all six SYNC-13 rows are still empty-fork-side today** — the empty-fork-side test compares fork content with `merge-base:<file>`, and there is no merge base in this clone. My *predictor* design (F-C-4/F-C-5) is therefore reproducible in principle but unexercised here. UNVERIFIED.
- **Whether `c4574ffef` is behaviourally redundant with `5e8fcc846`** — I verified only that they are **not** patch-equivalent (claim 6); semantic equivalence needs both provider diffs read against the fork's model registry. UNVERIFIED.

**Decisions on H-01…H-20:**

| ID | Decision | Reason (≤20 words) |
| --- | --- | --- |
| H-01 | REVISE | Needed and correct; add that the recorded tip is also Δ's and the prerequisite test's base. Test still non-discriminating (F-A-1). |
| H-02 | REVISE | Invariant too narrow: enforce the whole ladder (B-CAREFUL ⇒ Δ 1–5) and prerequisite *closure*; five live rows violate it today. |
| H-03 | ACCEPT | Repo-only CI profile is the only way the live register is ever asserted; keep it merge-base-free. |
| H-04 | ACCEPT | Version clause belongs in the DoD; evidence misattribution is a docs fix (H-05), not a reason to drop it. |
| H-05 | ACCEPT | Endorse B: sweep `scripts/` and the register's "~15 quick-wins" note, not just `docs/`. |
| H-06 | REVISE | Δ recomputation still file-level; pair it with the hunk-level apply verdict (F-C-4) and patch-id/symbol dedupe (F-C-6). |
| H-07 | REVISE | Watch job must never advance the tip past unmeasured commits; needs H-01's post-conditions plus the resolution-record template. |
| H-08 | REVISE | Disjoint *files* ≠ disjoint hunks in a decomposed-handler fork; planner must emit prerequisite topological order and a conflict estimate. |
| H-09 | ACCEPT | Sound; pair the subject regex with an advisory feed (A's caveat stands). |
| H-10 | ACCEPT | Real gap; must ship with its own fail-closed test since `scripts/**` is unlinted (F-B-5). |
| H-11 | REVISE | Concur with A/B: key undefined for branding-mode entries; define per allow-list mode first. |
| H-12 | REVISE | Needs resolution dates (F-A-3) and a resolution-completeness metric, not only arrival/drain. |
| H-13 | ACCEPT | Verified 0/7 SYNC-7 rows synced; it is the only lever that lowers conflict mass — and it needs a suppression-ratchet policy. |
| H-14 | ACCEPT | This is the "no silent drop" rule a merge needs; make it a per-row disposition field. |
| H-15 | REJECT | Preconditions unmet (SYNC-7 0/7; 19 C-REIMPLEMENT pending) and a whole-history merge cannot be resolved under R4 as written. |
| H-16 | REVISE | Trigger reads metrics that do not exist yet; land F-A-3/H-12 inputs first or it fires on noise. |
| H-17 | ACCEPT | The seed of the resolution record; extend to require the pre-image check and the fork locus mapping. |
| H-18 | ACCEPT | Concur with B on non-idempotence; add blame-ignore-revs so scoping also preserves intent attribution. |
| H-19 | ACCEPT | Correct; also log every dropped R5 hunk, else blanket refusals hide divergence. |
| H-20 | ACCEPT | Right rule, self-violated; make it machine-checked (the resolution record is its host). |

**Decisions on findings S1–S3, M1–M6:**

| ID | Decision | Reason |
| --- | --- | --- |
| S1 | AGREE | Confirmed by code and concurrency with A/B; it also corrupts the prerequisite/Δ base, which is my mandate 3. |
| S2 | AGREE (wider) | A/B logged A-CLEAN∧Δ=0 and the parser; I add five `B-CAREFUL` rows at Δ 6–10 contradicting the ladder the tool itself encodes. |
| S3 | AGREE | SYNC-7 is 7 rows, all `☐`, ranked 8th of 9 — and it is the batch that lowers resolution cost. |
| M1 | AGREE | Plus: `-x` imports grow the fork-touched set, so Δ inflates from the sync itself, not only from local work. |
| M2 | AGREE | Cherry-picks cannot move the merge base; the certified figure can only rise. |
| M3 | AGREE (narrower) | Concur with A and B: real overload, fix belongs in H-02's schema, not a new vocabulary. |
| M4 | DISAGREE | Evidence misattributed (Open VSX 503 labelled infrastructure) — concur with A and B. |
| M5 | AGREE | Live register unverified in CI; the repo-only profile plus a resolution-record gate is the fix. |
| M6 | AGREE (strongest) | This is the resolution-layer finding: no gate can see a half-ported intent. H-17 plus the record below is the only host. |

**New findings:**

| ID | Sev | Finding | Evidence (command + observed output) | Proposed fix | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| F-C-1 | High | **The doctrine never attributes the conflicted hunk.** Fork intent is queried by file and subject only, so a resolution can be justified by the wrong commit — and after rebrand/`-x` the file view *is* the wrong commit. | `grep -rn 'blame\|log -L' docs/upstream-sync docs/runbooks/upstream-sync.md docs/adr/adr-upstream-sync-triage-strategy.md` → exit 1, no output; R4 [`:18`](docs/runbooks/upstream-sync.md:18) and TASK 3(c) [`:90`](docs/runbooks/upstream-sync.md:90) specify only `git log --oneline <merge-base>..master -- <file>`. | R4 becomes: upstream intent = `git show <sha> -- <file>` + the upstream PR body/issue; fork intent = `git blame -L <s>,<e> HEAD -- <file>` **and** `git log -L <s>,<e>:<file>`, with the file-scoped log as fallback only for brand-new hunks; both excerpts go into the resolution record. | A `verify-resolutions` check fails any record whose `fork_intent` SHA touches no line in the resolved range (`git blame -L` cross-check), or whose `fork_intent` SHA is a rebrand commit. |
| F-C-2 | High | **The Δ↔class ladder contradicts stored data and is unenforced.** Five `B-CAREFUL` rows carry Δ 6–10 while the runbook's stop condition and the tool's own classifier both say Δ>5 ⇒ inspect/re-class as `C-REIMPLEMENT`; `--verify` cannot see class/Δ relations. | `awk` rows Δ≥6 non-C/D/E → `6 B-CAREFUL 78c712ac4`, `6 B-CAREFUL 8c9662966`, `10 B-CAREFUL a3e31e14b`, `6 B-CAREFUL 0d937c050`, `8 B-CAREFUL f424bbbe4`; runbook [`:32`](docs/runbooks/upstream-sync.md:32); [`proposeClass`](scripts/upstream-sync-triage.mjs:691). | Extend H-02's invariant to the full ladder (`A-CLEAN ⇒ Δ=0 ∧ Blocked-by=∅`, `B-CAREFUL ⇒ 1 ≤ Δ ≤ 5`, `C-REIMPLEMENT ⇒ Δ>5 ∨ structural ∨ telemetry`); add check `class-delta-consistency`; re-triage the five rows. | A seeded `B-CAREFUL` row with Δ=6 fails with the row SHA named; the five live rows are resolved or `⏸` with a reason. |
| F-C-3 | High | **Nothing validates the resolution: no marker check, no type check.** A pick resolved with a leftover `<<<<<<<` or a type-invalid merge passes the whole gate chain (`eslint` is not `tsc`, and `check-types` is not in the chain). | `grep -rn '<\{7\}' docs/runbooks docs/upstream-sync scripts/upstream-sync-triage.mjs` → only [`README.md:124`](docs/upstream-sync/README.md:124); `grep -n 'check-types\|tsc' docs/runbooks/upstream-sync.md docs/upstream-sync/README.md` → no match; [`src/package.json:456`](src/package.json:456) defines `check-types`. | TASK 6 adds `git diff --check <merge-base>` + an unmerged-marker grep over the batch diff, and `pnpm check-types` (or scoped `tsc --noEmit`). | A fixture file containing `<<<<<<<` fails the new gate id; a pick that breaks a type in a touched package fails the batch. |
| F-C-4 | High | **Δ predicts file-set coincidence, not conflict — the wrong unit for a decomposed-handler fork.** Δ maxes at 53 on a *telemetry* commit and counts release/lint commits that touch many fork-touched files as maximal risk, while an upstream hunk on the 4206→131-line rewrite can have **no** counterpart line at all despite Δ≥1. | Manual §2 computes per-commit overlap as `comm -12 /tmp/c.txt /tmp/both.txt \| wc -l` ([`README.md:51`](docs/upstream-sync/README.md:51)) — pure file lists, no `-M`/`--no-renames`, no content step; `grep -n 'numstat\|patch-id\|hash-object\|cherry'` over [`scripts/upstream-sync-triage.mjs`](scripts/upstream-sync-triage.mjs:1) shows no content or line-count computation. | Keep Δ as screening; add a per-row read-only **apply verdict**: (a) *blocked* if for any changed file `git show <sha>^:<f>` ≠ `git show <merge-base>:<f>` while the fork's `<f>` == merge base (predicts SYNC-13 before the pick); (b) else overlap the commit's changed line ranges with the fork's ranges in `<f>` (`git diff -U0`) to get hunk-level `Δh`; (c) `A-CLEAN` requires *apply == clean*, i.e. `Δh = 0` with matching pre-images. Rule to adopt: **class by apply-verdict, order by Δh, never by file count.** | A fixture with Δ=0 but differing pre-images is classified `Blocked-by`, never `A-CLEAN`; a Δ=6 row whose hunks do not overlap is *not* re-implement-heavy; the register records `apply:` and `Δh` per row. |
| F-C-5 | High | **SYNC-13's detection is reactive, not predictive.** The trigger is the *pick failing*; the pre-pick step (TASK 3(a2)) asks a human to eyeball `git show` for "a delta on content the fork lacks", and no tool computes precedence. | Runbook §2: "**If a pick conflicts with an empty fork side** … move the row to a prerequisite batch" ([`:39`](docs/runbooks/upstream-sync.md:39)–[`:44`](docs/runbooks/upstream-sync.md:44)); §8 symptom "Pick conflicts against an **empty fork side**" ([`:205`](docs/runbooks/upstream-sync.md:205)); `grep -rn 'is-ancestor' scripts/` → only fork-reachability uses ([`:1033`](scripts/upstream-sync-triage.mjs:1033), [`:1117`](scripts/upstream-sync-triage.mjs:1117)). | Add `--preflight <batch>`: per row, compute F-C-4(a) for every changed file, resolve candidate predecessors, assert `git merge-base --is-ancestor <pred> <sha>`, and **write `Blocked-by` from the computed result**; the planner emits prerequisite edges in topological order (closure, not just one hop). | `--preflight` names all six SYNC-13 rows and exits non-zero *before* any cherry-pick; a fixture with a two-hop chain is planned in the correct order. |
| F-C-6 | Medium | **Supersession/dedupe is prose plus a patch-id hint that provably fails on re-lands.** Equivalence is checkable offline once `-x` is used (fork copy ≡ upstream patch-id) — but a semantic re-land is *not* patch-equivalent, so the only tool gives a false negative on the exact case the register flags by hand. | `git patch-id --stable`: `5e8fcc846` and `567b94bd9` both `6de7f52ba735871aa5f04dcd19448f72b9779501`; `c4574ffef` → `1f3901a271320cb4345ee1b32b6eef9cd47ab431`; register calls it "likely subsumed" ([`:196`](docs/upstream-sync/pending-upstream-commits.md:196)); TASK 3(e) admits "only a hint for A/B classes" ([`:93`](docs/runbooks/upstream-sync.md:93)); `8d296deef`/`2ecbf35a8` "same defect fixed twice" ([`:142`](docs/upstream-sync/pending-upstream-commits.md:142)). | (i) Row/record fields `Supersedes:`/`Superseded-by:` + `Disposition: ported \| divergent-forever \| duplicate-of <sha>`; (ii) computed signals — patch-id equality **between candidate and every already-`☑` upstream commit** (their fork copies carry the same patch-id), plus shared touched-file/symbol sets and `git log -S<symbol>`; (iii) `--verify` flags patch-equivalent or near-identical-subject rows. | `--verify` names `c4574ffef` as superseded candidate for `5e8fcc846` (or records why not) with no human reading the notes; the two "fixed twice" rows get one disposition. |
| F-C-7 | Medium | **A conflict leaves no auditable trail — and the three repair commits prove the cost.** Nothing records the two intents, the decision, or what was dropped, so the only way to audit judgement is to re-derive it from code. | `grep -rn 'Resolved:\|Resolution:'` over the artefacts → only the plan's proposals; row schema [`:173`](docs/runbooks/upstream-sync.md:173); `git log -1` for `e86706d85`/`189f7b640`/`096bbfea4` (subjects quoted above) — none states which conflict it repaired or why. | See the resolution-record proposal below. | `verify-resolutions` fails a batch whose conflicted-file count ≠ record count, or whose record lacks intent/resolution/evidence fields. |
| F-C-8 | Medium | **H-15's scheduled merge cannot be executed under R4, and its preconditions are unmet.** Manual §7 gates the escape hatch on three conditions; SYNC-7 has 0/7 rows synced and 19 `C-REIMPLEMENT` rows remain, and R4 forbids resolving by picking a side — which is what an unplanned merge does at 272-file scale. | Preconditions [`:234`](docs/upstream-sync/README.md:234)–[`:246`](docs/upstream-sync/README.md:246); `sed -n '221,241p'` → SYNC-7 rows all `☐`; class mix from the register (19 `C-REIMPLEMENT` pending); R4 [`:18`](docs/runbooks/upstream-sync.md:18). | Re-scope H-15 to *conditional* and pre-declare the merge resolution policy in R4: authority order (fork structure wins on structure; upstream wins on fixes but must be re-expressed), one resolution record per conflicted file, **no silent drop** (every unported upstream hunk becomes `divergent-forever` or a register row), an explicit list of fork-only behaviours that must survive (with tests), a repair budget, and an abort threshold (repairs > N ⇒ revert to batches). | H-15 stays closed until SYNC-7 is materially drained; any merge PR carries the declared policy, a per-file record set, and a repair-budget line. |
| F-C-9 | Medium | **Rebrand destroys the intent signal the doctrine depends on.** TASK 5 rewrites 987 tracked files per batch, so `git log --oneline … -- <file>` returns rebrand churn; the repo already ships the counter-measure but it is unconfigured and does not list any fork rebrand commit. | `grep -n 'find src' scripts/full-rebrand.sh` → 20+ `find src -name "*.ts" -exec sed -i`; `git ls-files 'src/**/*.ts' | wc -l` → 987; `cat .git-blame-ignore-revs` → 2 upstream Prettier revs only; `git config --get blame.ignoreRevsFile` → rc=1. | Make the rebrand a single commit with a fixed subject (e.g. `chore(rebrand): normalise upstream tokens`), append its SHA to `.git-blame-ignore-revs` automatically, set `blame.ignoreRevsFile`, and have R4's fork-intent query exclude that subject (`--invert-grep`). | After a batch, `git blame -L` on a rebranded-but-unchanged line attributes the substantive commit; no resolution record cites a rebrand commit as fork intent. |
| F-C-10 | Low | **R5's path refusals silently truncate imported patches.** Dropping R5 hunks from a `-x` pick leaves an upstream commit in fork history whose patch is incomplete, unrecorded; `eslint-suppressions.json` is the most-diverged conflict file yet is governed by a different (recompute) policy that no instruction states. | R5 [`:19`](docs/runbooks/upstream-sync.md:19) + TASK 3(d) "Drop hunks that touch the files listed in R5" ([`:92`](docs/runbooks/upstream-sync.md:92)); nothing records the drop; manual [`:172`](docs/upstream-sync/README.md:172) names `eslint-suppressions.json` as most-diverged, R6 ([`:20`](docs/runbooks/upstream-sync.md:20)) governs it, and it is absent from R5's list. | H-19's concern-based intake plus a `dropped:` field in the resolution record; state the suppression-ratchet policy explicitly (never take upstream counts; prune and re-derive). | A pick that drops an R5 hunk without a record fails `verify-resolutions`; SYNC-7's suppression work follows the stated policy. |

**Resolution-record proposal:**

Minimal, auditable, and deliberately **outside the register table** — H-02's new columns already break the parser's `cells[6]` status mapping (F-B-1), and the tool's writer inserts sections before `## Recommended execution order`; a sidecar avoids both hazards.

Location: [`docs/upstream-sync/resolutions/SYNC-<n>.md`](docs/upstream-sync/resolutions/SYNC-1.md:1) — one append-only file per batch, linked from the PR body and from each conflicted row's Notes. (Per the workspace listing, no `resolutions/` directory exists today.) Per conflicted file:

```
### <path>   [shape: add/add | modify/modify | delete/modify | empty-fork-side | rename]
- upstream:  <upstream sha> — <what upstream changed and why>            (from `git show` + PR body)
- fork:      <commit sha + subject> — <fork behaviour that must survive> (from `git blame -L` / `git log -L`)
- fork_locus: <where the surviving behaviour lives, when the file moved>  (handlers/chat.ts, typed registry, …)
- resolution: both-re-expressed | upstream-adapted | fork-wins-forever | upstream-wins
- rationale:  ≤2 sentences — why this and not the other side
- dropped:    none | <R5 path + hunk summary>
- evidence:   <test that fails before / passes after> + <gate ids run>
- divergence: none | divergent-forever:<reason> | promoted-to-row:<sha>
```

Machine-checkable properties (the difference between auditable and decorative): record count equals conflicted-file count in the batch diff; every `upstream:`/`fork:` SHA resolves (`git cat-file -e`); the `fork:` SHA touches a line in the resolved range and is **not** a rebrand commit (F-C-9); every `C-REIMPLEMENT` row carries a `divergence:` value (F-C-6/M6); every `dropped:` entry names a path in R5. That is the only place the existing gate chain can host fix-equivalence evidence (H-17).

**Dissent / uncertainty:**
- No pick, merge or `--refresh` was run and no file was written; all resolution claims are artefact text plus read-only git. `--refresh`/`--refresh --write` remain fixture-unverified (concurring with A and B).
- E11-class baselines (977/689/272/4206/131, and the fork-only 180) are UNVERIFIED here; my Δ verdict is derived from the register's own Δ column, which reconciles exactly with the ADR's buckets (25/33/20/24) but not with the brief's "0–43" (observed max **53**).
- The hunk-level predictor (F-C-4/F-C-5) is a *design*, validated only in the arithmetic of its inputs; `git merge-tree --write-tree` is the natural implementation but writes objects, so I did not exercise it. It needs a fixture repo with a resolvable merge base.
- `c4574ffef` vs `5e8fcc846`: I proved patch-*in*equivalence, which is the load-bearing half of F-C-6 (the hint's false negative); I did **not** prove semantic redundancy.
- Deliberate non-overlap with A and B: F-C-2 is the *ladder* (their S2/E8 is the A-CLEAN∧Δ=0 corner); F-C-3 (no marker/type validation) and F-C-9 (blame erasure) appear in neither register; F-C-4/F-C-5 attack the metric and the detection mechanism rather than the stored data.
- Assumption: `pnpm lint` does not type-check (root [`package.json:12`](package.json:12) is `turbo lint`; `check-types` is a separate script) — so a type-broken resolution is invisible to TASK 6 as written.

**Ordering advice:**
1. **F-C-9 (blame-ignore-revs + a single rebrand commit per batch) first** — one line of config, and every batch that lands without it degrades the intent signal that R4, F-C-1 and the resolution records all depend on.
2. **F-C-3 (marker + `check-types` gate) second** — the cheapest possible protection against the worst resolution defect, independent of every schema decision.
3. **F-C-2 + H-02 (with the F-B-1 parser fix in the same commit) third** — the stored data contradicts the doctrine in five rows today, and every downstream metric reads from that schema.
4. **F-C-7/F-C-1 + H-17 (resolution records and blame-based intent) before the first `C-REIMPLEMENT`-heavy batch** — that is when resolution judgement is most fallible and least recorded, and the record is the only place H-17's equivalence evidence can live.
5. **F-C-4/F-C-5 with H-01/H-06/H-07** — they share one evidence computation; landing Δ-recomputation alone merely refreshes the wrong number, and the preflight is what makes the prerequisite model predictive instead of reactive.
6. **F-C-6 (dedupe/supersession fields + patch-id and symbol signals) with H-12** — the register's own re-land and "fixed twice" notes are currently only readable by a human.
7. **H-13/SYNC-7 capacity now; execution after the three clean rows** — and SYNC-7 must carry the suppression-ratchet policy (F-C-10), since R6 is the per-row cost driver.
8. **H-15 last and conditional (F-C-8)** — never as a scheduled event; only after SYNC-7 is materially drained and with the merge resolution policy declared in R4 first.

<!-- /REGISTER-C -->

<!-- REGISTER-D -->
### D — 🛡️ Anti-Fiction Sentinel (`anti-fiction-sentinel`)

*Registered 2026-09-23 · mode `anti-fiction-sentinel` · returned as a registry block; no files written by the lens.*

**Verdict:** The **mechanism** of the strategy (batching, `-x` provenance, category register, gate chain, stop conditions) survives every attack I ran, and the plan's *structural* findings (S1–S3, M1–M6) reproduce. What does **not** survive is the **evidence layer**: "measured", "verified" and "machine-checked" are load-bearing words attached to figures that are one 2026-09-16 observation in a grafted clone, and the plan's own ledger is not clean (E2 says 17 handler modules — there are 16; E12's "68 / 30" does not reproduce under any grep I tried; L3 says "three places" where the "22" literal appears ≥5). Net: treat both documents as **PLAUSIBLE-until-requoted**, not as trusted; the hard numbers I could reproduce (102 rows, `Δ` buckets 25·33·20·24, 4206-line upstream handler) are the only ones I would defend today.

**Assumptions (stated, not asked):** checkout [`ceeb9181b`](docs/upstream-sync/consolidated-hardening-plan.md:4), `2026-09-23`, shallow; I ran **no** `--refresh`/`--refresh --write` (fetch writes into `.git` and would perturb the state the ledger rests on) and made **no** file writes; every "unverifiable" below is unverifiable *in this clone today*, not in principle.

**Claim register**

| # | Claim (source) | Status | Evidence (command → observed) or why unverifiable |
|---|---|---|---|
| D-1 | Register = 102 rows, one per pending commit | **PROVEN** | `grep -cE '^\| \`[0-9a-f]{9}\` \|' docs/upstream-sync/pending-upstream-commits.md` → `102` |
| D-2 | Class counts A18/B25/C19/D12/E27/X1 = 102 | **PROVEN** | `awk -F'|' … print $5` → `18 A-CLEAN / 25 B-CAREFUL / 19 C-REIMPLEMENT / 12 D-LOCAL / 27 E-SKIP / 1 X-REJECT` |
| D-3 | Priority 5/26/14/24/33 = 102; status 63☐/6☑/33✖; 0 dupes; 0 non-canonical SHAs | **PROVEN** | same `awk` → `5 P0 / 26 P1 / 14 P2 / 24 P3 / 33 P4`; `63 ☐ / 33 ✖ /` six distinct `☑<sha>`; `uniq -d \| wc -l` → `0`; 10+-char rows → `0` |
| D-4 | Overlap buckets 25·33·20·24 ([ADR:29](docs/adr/adr-upstream-sync-triage-strategy.md:29)) | **PROVEN** | `Δ` histogram → `0:25`, `1–2:33`, `3–5:20`, `>5:24` (sum 102) |
| D-5 | Brief/ADR `Δ` range | **PROVEN (max 53)** | `Δ max` → `53` (`1ad8f528d`); any "0–43" is **FALSE** |
| D-6 | Baseline merge base `252c69b5` (2026-08-20, LM-Studio subject) | **PROVEN** | `git log -1 --date=short 252c69b5` → `252c69b52 2026-08-20 fix: stream reasoning_content in LM Studio provider (#1175)` |
| D-7 | Upstream tip `500152b78` (2026-09-16) / fork tip `77a670196` | **PROVEN** | `git log -1` → subject/date match the [header](docs/upstream-sync/pending-upstream-commits.md:17) |
| D-8 | "Measured baseline": 180 fork-only / 977 / 689 / 272 | **UNSUPPORTED** | `git rev-list --count upstream/main..master` → **`3089`** (saturated graft); needs `git fetch --unshallow` |
| D-9 | "131 telemetry files" upstream | **CONTRADICTED/UNSUPPORTED** | `git grep -Il -i telemetry upstream/main \| wc -l` → **`243`** at the current tip (≠131); scope/date undocumented |
| D-10 | Upstream handler = 4206 lines | **PROVEN** | `git show upstream/main:src/core/webview/webviewMessageHandler.ts \| wc -l` → **`4206`** (tip, not baseline) |
| D-11 | Fork handler = 131-line router | **PROVEN** | `wc -l src/core/webview/webviewMessageHandler.ts` → `131` |
| D-12 | Plan E2: "**17** modules under `handlers/`" (status ✅ VERIFIED) | **FALSE** | `git ls-files src/core/webview/handlers \| wc -l` → **`16`** |
| D-13 | "0 telemetry references in `src/` and `webview-ui/src/`" ([ADR:46](docs/adr/adr-upstream-sync-triage-strategy.md:46)) | **FALSE as worded** | token grep → 65 files (`src`+`webview-ui/src`), 74 all-tracked, 25 tracked `src/**/*.ts`; substance holds: `git grep -Il "captureEvent(" -- "src/**/*.ts"` → **`0`** |
| D-14 | Plan E12: "naive grep matches 68 files, incl. 30 tracked `.ts`" | **UNSUPPORTED** | Not reproduced by any of three scopes (`74` / `65` / `25`); command not quoted in the ledger |
| D-15 | Verifier exists + wired | **PROVEN** | `wc -l scripts/upstream-sync-triage.mjs` → `1585`; spec `42212` B; [`package.json:33`](package.json:33) `"verify:upstream-sync": "node scripts/upstream-sync-triage.mjs --verify"`; [`code-qa.yml:87`](.github/workflows/code-qa.yml:87) `pnpm run test:scripts` (spec listed at [`package.json:29`](package.json:29)) |
| D-16 | Verifier fails closed, exit 1 (E3) | **PROVEN** | `node scripts/upstream-sync-triage.mjs --verify` → `❌ … no merge base … pending count would read 22 instead of 102. Deepen first: git fetch --deepen=400 upstream main`, `EXIT=1` |
| D-17 | "seven checks" (manual) vs "six" (runbook) (E7) | **PROVEN contradiction** | [`scripts/upstream-sync-triage.mjs:552`](scripts/upstream-sync-triage.mjs:552) → 7 names; [`upstream-sync.md:162`](docs/runbooks/upstream-sync.md:162) "six independent checks"; [`README.md:272`](docs/upstream-sync/README.md:272) "seven independent checks" |
| D-18 | `--verify --repo-only` profile (H-03) | **FALSE (does not exist)** | `node … --verify --repo-only` → `❌ [SYNC:TRIAGE] unknown argument(s): --repo-only — run with --help`, `EXIT=1` |
| D-19 | `verify:upstream-sync` wired in CI (M5) | **PROVEN absent** | `grep -rn "verify:upstream-sync" .github/workflows/` → no match |
| D-20 | Live 102-row register machine-verified in CI | **FALSE** | CI shape `--verify --json` → `{"mode":"verify","ok":false,"shallow":true,"error":"…no merge base…"}` with **no `checks` key**; the live-register spec block is gated on `Array.isArray(parsed.checks)` ([`spec.mjs:1087`](scripts/upstream-sync-triage.spec.mjs:1087)) |
| D-21 | E8 invariant violated (open `A-CLEAN` rows with Δ>0) | **PROVEN (5, not 4)** | `awk` → `a5f4192bf Δ2 ☑3c44a7d5a`, `4e8fa09f2 Δ4 ☐`, `c4574ffef Δ2 ☐`, `147147cda Δ1 ☐`, `745656a50 Δ2 ☐` — five rows, one already `☑` |
| D-22 | Ready set ≈ 3 | **PROVEN** | `A-CLEAN ∧ Δ=0 ∧ not in SYNC-13` → `97265fd8e`, `ae6c1a876`, `87d41aa4f`; 18 = 6 ☑ + 6 blocked + 3 open-Δ>0 + 3 clean |
| D-23 | §5 ready-set includes `B-CAREFUL` ∧ Δ=0 | **FALSE (vacuous)** | `B-CAREFUL ∧ Δ=0` → **`0` rows** of 25; `B-CAREFUL` is defined by Δ≥1 |
| D-24 | "15 immediate `A-CLEAN` quick wins" ([ADR:151](docs/adr/adr-upstream-sync-triage-strategy.md:151), [register:63](docs/upstream-sync/pending-upstream-commits.md:63)) | **PLAUSIBLE count / FALSE attribution** | `A-CLEAN ∧ P0–P2` → `15` exactly, but they are 6 ☑ + 6 SYNC-13-blocked + 3 open (2 of which Δ>0); "immediate" = 3 rows, 1 of them P0–P2 |
| D-25 | "~19 re-implement / ~39 local-or-out-of-scope" ([ADR:152](docs/adr/adr-upstream-sync-triage-strategy.md:152)) | **PROVEN** | `19 C-REIMPLEMENT`; `12 D-LOCAL + 27 E-SKIP = 39` (the `X-REJECT` row is uncounted in the "102 behind" sentence) |
| D-26 | Arrival ≈ 3.8/day | **ARITHMETIC ONLY** | `python3` → `102/27 = 3.778`; the 102 is a *stored* count, not a measured flow |
| D-27 | Drain ≈ 0.86/day ("6 ☑ in the following week") | **FALSE** | `git log -1 --date=short 6c4e9df5c` → `6c4e9df5c 2026-09-16 Merge pull request #345 …`; `6/7 = 0.857` is arithmetically true but all six landed on the **baseline day**; marginal drain 2026-09-17→23 = **0 rows/day** |
| D-28 | Net ≈ +3/day, ≈ +88/month | **PLAUSIBLE-at-best** | `2.92/day × 30 ≈ 88` reproduces, but it inherits D-27's non-rate; direction holds, magnitude unsupported |
| D-29 | SYNC-13 chains "verified 2026-09-16" | **PROVEN (ancestry only)** | `git merge-base --is-ancestor` → `5e8fcc846→500152b78 exit=0`, `c4574ffef→500152b78 exit=0`, `a80b3b3ab→7bb14e44e exit=0`, `a80b3b3ab→cc9c0afe9 exit=0`. The quoted **conflict line ranges** are UNSUPPORTED (no merge base) |
| D-30 | SYNC-13 = "six moved" (E5); `500152b78` still ☐ | **PROVEN** | 6 rows at [register:376–381](docs/upstream-sync/pending-upstream-commits.md:376); `500152b78 … ☐` at [register:379](docs/upstream-sync/pending-upstream-commits.md:379) |
| D-31 | ADR phase-1 "the `A-CLEAN` slice of `SYNC-3`/`SYNC-4`" (E10) | **FALSE** | SYNC-3 = 4 `C-REIMPLEMENT` + 1 `B-CAREFUL`; SYNC-4 = 4 + 2 ⇒ **0 `A-CLEAN`** |
| D-32 | Register orphan fragment (E14) | **PROVEN** | `sed -n 414p` → `   doing any work.` ([register:414](docs/upstream-sync/pending-upstream-commits.md:414)) |
| D-33 | M4: publish fires on every push to `master` | **PROVEN** | [`pre-release-publish.yml:20`](.github/workflows/pre-release-publish.yml:20) → `on: push: branches: [master]` |
| D-34 | M4: "already failed once **from this exact coupling**" | **FALSE (misattributed)** | [register:331](docs/upstream-sync/pending-upstream-commits.md:331) → `Open VSX API returned HTTP 503` … "That is an **infrastructure** failure, not a version error" |
| D-35 | "22 instead of 102" appears in **three** places (plan L3) | **FALSE (≥5)** | [`scripts/upstream-sync-triage.mjs:1207`](scripts/upstream-sync-triage.mjs:1207), [`…:1533`](scripts/upstream-sync-triage.mjs:1533), [`upstream-sync.md:15`](docs/runbooks/upstream-sync.md:15), [`README.md:319`](docs/upstream-sync/README.md:319), [`pending-upstream-commits.md:29`](docs/upstream-sync/pending-upstream-commits.md:29) (+ [`README.md:20`](docs/upstream-sync/README.md:20) variant) |
| D-36 | Plan E9: `500152b78` not an ancestor / window = 3 | **PROVEN — but it is the graft** | `git merge-base --is-ancestor 500152b78 upstream/main` → `exit=1`; `git rev-list --count 500152b78..upstream/main` → `3`; **discriminator:** `git rev-list --count upstream/main` → `3`; `.git/shallow` → `78b74ec1c…`, `bfe014fd8…` |
| D-37 | `runRefresh()` has no `--is-ancestor` guard; writes count at `:1398` after `requireMergeBase` `:1336` | **PROVEN (code read)** | `grep -n "is-ancestor" scripts/upstream-sync-triage.mjs` → only `:1033`, `:1117`; [`…:1336`](scripts/upstream-sync-triage.mjs:1336) precedes [`…:1410`](scripts/upstream-sync-triage.mjs:1410) write; [`…:1048`](scripts/upstream-sync-triage.mjs:1048) `--deepen=400` |
| D-38 | H-01's acceptance test already green pre-H-01 | **PROVEN** | `--verify` `EXIT=1`; write path at `:1410` unreached — "exits non-zero and writes nothing" passes on unmodified code |
| D-39 | E13 withdrawn (telemetry leak via committed build output) | **PROVEN withdrawn** | `git ls-files src/webview-ui` → `0` |
| D-40 | `pnpm upstream:preflight` used as the §5 fast path | **FALSE (does not exist)** | `grep -n "upstream" package.json` → only `test:scripts`, `verify:upstream-sync`, `refresh:upstream-sync` |
| D-41 | Snapshot integrity sizes 38,377 B / 9,749 B | **PROVEN** | `ls -l` → `38377 triage-raw.tsv`, `9749 raw-upstream-commits.txt` |
| D-42 | Lens-C anchor `proposeClass(...:691)` | **FALSE anchor** | `grep -n "function proposeClass"` → `:670`; ladder `delta <= 5` → `:692`; `:691` = `}` |
| D-43 | "Classification is never automated / `--refresh` never reclassifies" | **PLAUSIBLE (unverified by me)** | doc-consistent and matches a `runRefresh` reading; not executed (forbidden), so not PROVEN |

**Downgrade list**

| Claim | Required re-wording (verbatim replacement text) | Where it appears |
|---|---|---|
| "A measurement of the current backlog (2026-09-16) establishes the size of the problem rather than estimating it" | "A single observation on 2026-09-16 in a shallow clone establishes these figures. They are **not** reproducible here: `git merge-base` returns nothing and `git rev-list --count upstream/main..master` reads 3089 (saturated). Reproduce only after `git fetch --unshallow`." | [ADR:18](docs/adr/adr-upstream-sync-triage-strategy.md:18) |
| "~15 commits of immediate `A-CLEAN` quick wins" | "15 `A-CLEAN` rows carry P0–P2 priority; 6 are already ☑, 6 are blocked in SYNC-13, 3 are open (2 with Δ>0). **At most 1 row is an immediately pickable P0–P2 clean win** (`97265fd8e`)." | [ADR:151](docs/adr/adr-upstream-sync-triage-strategy.md:151), [register:79](docs/upstream-sync/pending-upstream-commits.md:79) |
| "~39 that are either locally-owned or permanently out of scope" | "39 rows (12 `D-LOCAL` + 27 `E-SKIP`); the 1 `X-REJECT` row is additional." | [ADR:152](docs/adr/adr-upstream-sync-triage-strategy.md:152) |
| "upstream has **131 files** referencing it" | "Upstream's telemetry surface was counted at 131 files in an unrecorded checkout; at the 2026-09-22 tip a token grep reads 243. The figure requires its scope and SHA or must be deleted." | [ADR:46](docs/adr/adr-upstream-sync-triage-strategy.md:46), [register:317](docs/upstream-sync/pending-upstream-commits.md:317) |
| "0 references in `src/` and `webview-ui/src/`" | "0 telemetry transport call sites (`captureEvent(` → 0); the token 'telemetry' still appears in 65 files, incl. 25 tracked `src/**/*.ts` with inert scaffolding." | [ADR:46](docs/adr/adr-upstream-sync-triage-strategy.md:46), [register:317](docs/upstream-sync/pending-upstream-commits.md:317) |
| "a naive grep matches 68 files, incl. 30 tracked `.ts`" | "A token grep matches 65 files in `src`+`webview-ui/src`, 74 tracked overall, 25 tracked `src/**/*.ts`. The 68/30 figures could not be reproduced and are withdrawn." | [plan §2 E12](docs/upstream-sync/consolidated-hardening-plan.md:40) |
| "17 modules under `src/core/webview/handlers/`" (✅ VERIFIED) | "16 modules (`git ls-files src/core/webview/handlers` → 16)." | [plan §2 E2](docs/upstream-sync/consolidated-hardening-plan.md:30) |
| "arrival ≈ 3.8 commits/day … drain ≈ 0.86 rows/day ⇒ net ≈ +3 rows/day (~+88/month)" | "Arrival: 102 stored rows / 27 days = 3.8/day (one observation). Drain: 6 rows resolved in a **single merge** (`6c4e9df5c`, 2026-09-16) — marginal drain 2026-09-17→23 = 0/day. The +88/month extrapolation is a scenario, not a measured rate." | [plan §2](docs/upstream-sync/consolidated-hardening-plan.md:46) |
| "verified 2026-09-16" (prerequisite chains) | "Descendant relations re-verified 2026-09-23 (`--is-ancestor` exit 0). Conflict line ranges are a single observation from 2026-09-16 and are not reproducible without a merge base." | [register:369](docs/upstream-sync/pending-upstream-commits.md:369), [register:383](docs/upstream-sync/pending-upstream-commits.md:383) |
| "The 4206-line upstream handler" inside an "UNVERIFIABLE HERE" row | "4206 lines, reproduced from `upstream/main`'s tree on 2026-09-23 (**not** the 2026-09-16 baseline); the 180/977/689/272 and 131 figures remain unverifiable." | [plan §2 E11](docs/upstream-sync/consolidated-hardening-plan.md:39) |
| "the two headline economics numbers reproduce arithmetically" | "…reproduce arithmetically **from stored counts that are themselves a single 2026-09-16 observation**." | [plan §6 lens A](docs/upstream-sync/consolidated-hardening-plan.md:132) |
| "already failed once from this exact coupling" | "Failed once for an unrelated **infrastructure** cause (Open VSX HTTP 503) while this coupling was live." | [plan §3 M4](docs/upstream-sync/consolidated-hardening-plan.md:60) |

**Certainty inflation**

- "measurement"/"measured baseline" → **one observation, one clone, one date**; not reproducible without `--unshallow`.
- "~15 immediate low-risk value" → **3 open clean rows; 1 in P0–P2**.
- "machine-checked … caught a real defect" → **no machine output exists here** (`--verify` exits 1 before running checks; CI runs only the probe-injected spec). Delete or replace with the exact command and its output.
- "✅ VERIFIED" on E2 → **not verified; wrong number (16, not 17)**. The ledger's own truth marker is inflated.
- "verified 2026-09-16" → **checked on that date**; state the command, the checkout SHA, and the re-check date.
- "proven"/"confirmed" applied to arithmetic → **arithmetic reproduces from stored counts**; the counts' provenance is unchanged by the arithmetic.
- "0 references" / "never" / "always" / "no references" → scope to tracked source and a named pattern; `0` becomes "0 `captureEvent(` call sites".
- "The plan's own `--verify` gate" in §5 → the referenced `pnpm upstream:preflight` **does not exist**; mark proposed, not present.
- "three places" (L3) → **five-plus**; the plan deflates its own finding.
- "independent checks" (six vs seven) → **one runner, seven checks**; the runbook's "six" is stale and is the file agents obey.

**Hand-off summary audit (claims a–d)**

| Claim | Verdict | Evidence |
|---|---|---|
| (a) "the triage script is **specified but not implemented** (creating it needs Code mode)" | **FALSE** | `wc -l scripts/upstream-sync-triage.mjs` → `1585`; spec `42212` B; [`package.json:33`](package.json:33) wired; [`code-qa.yml:87`](.github/workflows/code-qa.yml:87) runs its spec. Plan E4 already falsifies it — and E4 is correct. |
| (b) "the **nine** Δ 0 provider quick-wins, starting with `500152b78`" | **FALSE (count) / TRUE (order)** | SYNC-13 holds **six** rows ([register:376–381](docs/upstream-sync/pending-upstream-commits.md:376)), five Δ=0 and one (`745656a50`) at Δ=2 — not "nine", not all Δ 0. The "re-attempt `500152b78` first" ordering **does** match [register:406](docs/upstream-sync/pending-upstream-commits.md:406). |
| (c) "overlap distribution: 25 at 0, 33 at 1–2, 20 at 3–5, 24 at >5" | **TRUE** | `Δ` histogram reproduces exactly: `0:25`, `1–2:33`, `3–5:20`, `>5:24`; matches [ADR:29](docs/adr/adr-upstream-sync-triage-strategy.md:29). |
| (d) "register completeness was **machine-checked** … that check caught a **real defect I had introduced**" | **FALSE / UNSUPPORTED** | No machine-check output exists in this checkout: `--verify` exits 1 before any check; `--verify --json` has no `checks` key; CI exercises only injected probes. The register is internally consistent by hand-count (102 / 0 dupes) but the completeness check cannot run where it ships. The one known defect (orphan line at [register:414](docs/upstream-sync/pending-upstream-commits.md:414)) is a Prettier artefact that a row-scoped regex (`ROW_SHA_RE`) cannot detect. |

**Decisions on H-01…H-20**

| ID | Decision | Reason (≤20 words) |
|---|---|---|
| H-01 | **REVISE** | Ancestry assertion genuinely absent (`:1336` vs `:1410`), but acceptance test passes pre-change (D-38); needs a grafted fixture. |
| H-02 | **REVISE** | Invariant violated 5×, not 4 (D-21); new columns break `cells[6]` status parsing — land parser fix in same commit. |
| H-03 | **REVISE** | Right idea, but `--repo-only` does not exist (D-18) and `header-counts` is not merge-base-free. |
| H-04 | **REVISE** | Coupling proven (D-33); its cited "already failed" evidence is misattributed (D-34). |
| H-05 | **REVISE** | Sweep must include `scripts/` ([`spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267)) and the "~15" notes; "three places" is itself wrong (D-35). |
| H-06 | **REVISE** | Necessary; `runRefresh` calls git directly — needs the probe seam before it is testable. |
| H-07 | **REVISE** | §5's `pnpm upstream:preflight` does not exist (D-40); it is a proposal, not a fast path. |
| H-08 | **REVISE** | Inputs discarded (new commits only), no line counts; §5's predicate is vacuous (D-23). |
| H-09 | **ACCEPT** | Sound; pair the subject regex with a real advisory feed or it misses unlabelled advisories. |
| H-10 | **ACCEPT** | Real absent gate; must quote its exact pattern (D-13/D-14) and ship with its own test. |
| H-11 | **REVISE** | Key undecidable for branding-mode allow-list entries; define per-mode first. |
| H-12 | **REVISE** | No resolution-date input exists; headline metric cannot be computed from the row schema. |
| H-13 | **ACCEPT** | Verified 8th of 9 and the only lever lowering per-row cost; needs the suppression-ratchet policy. |
| H-14 | **ACCEPT** | Makes divergence stock countable; the root cause of the whole backlog. |
| H-15 | **REJECT** | Preconditions unmet (SYNC-7 0/7 ☑, 19 `C-REIMPLEMENT` pending) and it pre-commits the mode that produced the repair commits. |
| H-16 | **REVISE** | Trigger reads a non-rate (D-27) and metrics that do not exist yet; it would fire on noise. |
| H-17 | **ACCEPT** | Only host for fix-equivalence evidence; M6 is real. |
| H-18 | **ACCEPT (scoped)** | Rebrand rewrites all `src/**/*.ts` with no diff guard; but its idempotence test is red today — fix the `sed` first. |
| H-19 | **ACCEPT** | Supply-chain hunks are portable and currently refused by path; require a drop log. |
| H-20 | **ACCEPT — highest priority** | Right rule and self-violated by the ledger (D-12, D-14, D-35); make it machine-checked, not prose. |

**Decisions on findings S1–S3, M1–M6**

| ID | Decision | Reason |
|---|---|---|
| S1 | **AGREE (latent)** | No ancestry assertion is proven by code (D-37); but E9's quoted output is graft evidence (D-36), so under-reporting is latent, not demonstrated. Mirror case (over-report on force-push) stands. |
| S2 | **AGREE (undercounted)** | Five stored violations, not four (D-21); `--verify` has no class/Δ relation. |
| S3 | **AGREE** | SYNC-7 is 8th of 9; no capacity model, cap or P0 SLA exists anywhere in the artefacts. |
| M1 | **AGREE** | Δ is a 2026-09-16 snapshot; `--refresh` reads `baselineFull..upstream/main` and never reclassifies. |
| M2 | **AGREE** | Header `**102**` coexists with six `☑`; check 7 ([`:531`](scripts/upstream-sync-triage.mjs:531)) certifies a figure cherry-picks cannot move. |
| M3 | **DISAGREE (narrower)** | Overloading is real (7 `D-LOCAL ☐`), but every `✖` row has a rationale; the fix is H-02's schema, not a new vocabulary. |
| M4 | **DISAGREE (evidence)** | Coupling proven; the cited failure is an Open VSX 503 labelled infrastructure (D-34). |
| M5 | **AGREE** | CI wires only `test:scripts` (D-19); the live register is unverified where it ships (D-20). |
| M6 | **AGREE** | No gate inspects port intent; a half-ported `C-REIMPLEMENT` passes all seven checks. |

**New findings**

| ID | Sev | Finding | Evidence (command + observed) | Proposed fix | Acceptance test |
|---|---|---|---|---|---|
| **F-D-1** | **High** | **The evidence ledger is not fit to be the trust anchor it declares itself to be:** two quantified/✅ rows are unreproducible or wrong, and one finding's own count ("three") is wrong. A ledger that fails H-20 is not a gate. | E2 → `16` not 17 (D-12); E12 → 74/65/25, not 68/30 (D-14); L3 → ≥5 sites, not three (D-35). | Add a `command` column to §2; every row carries the exact command, the checkout SHA and the date; the reconciliation pass (§7) fails if any ✅ row lacks a command whose output equals the figure. | A re-run harness re-executes each ✅ row's quoted command and reproduces the stated figure in one clone; a deliberately altered figure fails the harness. |
| **F-D-2** | **High** | **"Machine-checked" has no machine.** The verifier cannot run in the clone shape it ships in (fails closed *before* reading the register), and CI runs only probe-injected specs, so no artefact in this repo today proves the live 102-row register. | `--verify` → exit 1; `--verify --json` → no `checks` key; `grep -rn "verify:upstream-sync" .github/workflows/` → no match (D-16, D-19, D-20). | Land H-03 (`--repo-only`, merge-base-free) and pin it in `code-qa.yml`; the watch job (H-07) must not be the only host. | A PR that corrupts one register row fails CI with the row named; reverting goes green — in a `--depth=1` clone. |
| **F-D-3** | **Medium** | **Graft evidence is presented as function evidence.** E9 is an observation about the shallow boundary; the discriminator (the whole ref is 3 commits) is not stated, so a reader will attribute under-reporting to `runRefresh`. | `git rev-list --count upstream/main` → `3`; `.git/shallow` → `78b74ec1c…`, `bfe014fd8…` (D-36). | Relabel E9 "evidence about the clone"; move the S1 claim to "proven by code reading" and cite `:1336`/`:1410`. | A reader can distinguish clone-shape evidence from function evidence without reading the script. |
| **F-D-4** | **Medium** | **E11's status mixes verifiable and unverifiable figures.** "4206-line upstream handler" *is* reproducible here; the overlap buckets are reproducible from the register; only 180/977/689/272 and 131 are not. | `git show upstream/main:…webviewMessageHandler.ts \| wc -l` → `4206`; `git grep -Il -i telemetry upstream/main \| wc -l` → `243` (D-9, D-10). | Split E11 per figure; correct 4206 to "reproduced at the current tip"; mark 131 "contradicted at tip" rather than unverifiable. | Every §2 row states a per-figure status and the command that justifies it. |
| **F-D-5** | **Medium** | **The plan does not reconcile the fiction it identifies.** §7 has no step to rewrite the ADR/register prose that still asserts "~15 immediate" and "established rather than estimated", so the misleading literals survive the hardening they motivated. | [ADR:18](docs/adr/adr-upstream-sync-triage-strategy.md:18), [ADR:151](docs/adr/adr-upstream-sync-triage-strategy.md:151), [register:79](docs/upstream-sync/pending-upstream-commits.md:79) unchanged while [plan §2](docs/upstream-sync/consolidated-hardening-plan.md:44) computes a ready set of 3. | Add §7 step R-6: every superseded claim leaves a tombstone row in the ADR ("superseded by plan §2") and the original prose is rewritten in the same pass. | `grep -rn "immediate \`A-CLEAN\` quick wins\|establishes the size of the problem rather than estimating" docs/` → 0 after reconciliation. |
| **F-D-6** | **Low** | **The plan's own count is deflated.** L3 says the "22" literal appears in "three places"; there are at least five exact occurrences plus a variant. | D-35. | Correct L3 and make the sweep enumerate sites, not estimate them. | The H-05 sweep prints the site list it rewrote and its count equals the pre-sweep grep count. |
| **F-D-7** | **Low** | **Registry anchor drift.** Lens C cites `proposeClass(...:691)`; the function is at `:670` and the Δ ladder at `:692`, so the cited line is a closing brace. | `grep -n "function proposeClass\|delta <= 5"` → `670`, `692` (D-42). | Require anchors to be validated (the line must contain the named symbol) before registration. | A link-check script fails a registry entry whose anchor line does not contain the cited identifier. |

**What we cannot know yet**

- **Deep-clone figures** — 180 fork-only, 977/689/272 files, the 131 telemetry-file count, and true fork-side `Δ`. *To know it:* `git fetch --unshallow upstream` (network + time), then re-run [README §2](docs/upstream-sync/README.md:36). Until then every one of these is unverified, and `3089` here is a **saturated** number, not a fork-only count.
- **Whether the 102-row register still equals the real pending set** — upstream has advanced ~7 days since the baseline (~26 commits at the observed 3.8/day). *To know it:* a refresh (`--refresh`, forbidden here) or the scheduled watch job (H-07).
- **Arrival mix** (security vs automation vs provider) and **whether the prerequisite chains still hold** at today's tip. *To know it:* deepen + a `--preflight` (F-C-5) that computes predecessors instead of asserting them.
- **Whether S1 under-reports end-to-end.** *To know it:* a fixture repo with a grafted `upstream/main`, a resolvable merge base and a recorded tip outside the window; unit-test `runRefresh` through the existing probe seam.
- **Resolution dates / dwell time** for the six `☑` rows beyond the single merge commit — the register stores none. *To know it:* H-02's `Resolved:` column or a changelog-keyed resolution log.
- **Whether the 4206 figure and the 243 telemetry-file count moved between the 2026-09-16 baseline and the tip I measured** — I sampled one tree, not the baseline.

**Dissent / uncertainty**

- I ran **no** `--refresh`/`--refresh --write` and wrote **no** files; therefore everything about `runRefresh`'s runtime behaviour is code-reading, and D-43 is PLAUSIBLE, not PROVEN.
- I did **not** run the spec suite (`node --test`); lens B's `83/83` is unverified by me. I concur instead on the *shape* of the gap — the live-register assertion is conditionally skipped — using my own `--verify --json` observation.
- The 4206 and 243 figures come from the **current** upstream tip, not the 2026-09-16 baseline; I cannot state the drift direction, so I refuse to call the ADR's 131 "false" — only "not reproducible at the tip I measured".
- The register's internal consistency (102 / 0 dupes / 0 non-canonical SHAs) is **not** evidence of correctness: `coverage` — the check that would prove every `merge-base..upstream/main` commit has a row — cannot run without a merge base.
- I disagree with the plan's self-assessment in both directions: it is **more** conservative than necessary in one place (E11's blanket UNVERIFIABLE) and **less** conservative in another (its own ✅ rows). Both are certainty-calibration errors and both are cheap to fix.
- "Never reclassifies" and "never deletes a row" are prose invariants no test I ran can falsify; I neither confirm nor deny them.

**Ordering advice**

1. **H-20 machine-checked, then F-D-1/F-D-2.** Until "verified" means *a quoted command whose output matches a figure in one clone*, every other number in both documents is unfalsifiable — and this is the cheapest item in the plan. Fixing it first converts the plan's own defects (D-12, D-14, D-35) into build failures rather than review findings.
2. **H-02 + the parser fix (F-B-1), then H-06.** The stored data contradicts the doctrine in five rows today (D-21); every metric, ready set and invariant reads through a parser that resolves `status` by hard-coded index ([`…:327`](scripts/upstream-sync-triage.mjs:327)).
3. **H-05 + F-D-5.** Delete the "~15 immediate", "established rather than estimating" and "three places" fictions *before* an agent obeys the runbook, because the runbook is the file agents act on.
4. **H-01 with a discriminating fixture (F-A-1) before H-07.** Automating a refresh that can advance the tip past unmeasured commits is the one failure that erases evidence, and today's test passes on unmodified code (D-38).
5. **H-03 only after `header-counts` is split (F-A-7).** Otherwise the new CI job is red by construction in the clone shape it ships in.
6. **H-12/H-16 only after resolution dates exist (F-A-3) and the drain is redefined (D-27).** A forced-decision rule wired to a non-rate will fire on noise.
7. **H-13 capacity decision now; execution after the three clean rows.** `97265fd8e`, `ae6c1a876`, `87d41aa4f` are the only rows that are Δ=0, unblocked and open (D-22) — spend them first.
8. **H-15 last and conditional (or rejected).** Its preconditions are unmet (SYNC-7 0/7 ☑) and it re-commits to the mode that produced the repair commits the strategy exists to prevent.

<!-- /REGISTER-D -->

<!-- REGISTER-E -->
### E — 🚀 Release Governance Lead (`release-governance-lead`)

*Registered 2026-09-23 · mode `release-governance-lead` · returned as a registry block; no files written by the lens.*

**Verdict:** The sync mechanism is release-compatible in principle, but its **definition of done is not a release contract**: `master` is the only publish trigger and **every** merge to it — batch, docs, or register-refresh — fires the pre-release publish, so the batch DoD's silence on versioning ([runbook §7](docs/runbooks/upstream-sync.md:186)) is a live defect, not a theoretical one (verified: 3 of the last 6 first-parent merges are `docs/*` merges and all evaluate to PUBLISH). M4's **conclusion is right and already documented on 2026-09-17** in [`README.md` §9](docs/upstream-sync/README.md:326) — but its **causal claim is false**: the abort was an Open VSX `HTTP 503` (infrastructure), and the fork's remedy was a version bump, not a governance gate, so H-04 must be accepted with a corrected rationale and a *discriminating* (negative) acceptance test. H-15 cannot be released safely today (no rollback, no unpublish, no announcement story) and H-09's lane is unsafe until the public-publish embargo problem is solved.

**Claims verified by me:**

- **Claim: "the workflow triggers on every push to master" (M4/D-33/H-04) → command `sed -n '20,24p' .github/workflows/pre-release-publish.yml` → observed:**
  ```
  on:
    push:
      branches: [master]
    workflow_dispatch: # Allows manual triggering.
  ```
  and `grep -n "paths|paths-ignore" .github/workflows/pre-release-publish.yml` → **`NO paths filter`**.
- **Claim: "an unbumped merge either publishes or fails closed — it never silently skips" → command `release_re='^chore: prepare v[0-9]+\.[0-9]+\.[0-9]+( stable)? release'; for s in 6c4e9df5c 71d621532 afe35f6a8 7b4f92882; do git log -1 --format=%s $s | grep -qE "$release_re" && echo SKIP || echo PUBLISH; done` → observed:**
  ```
  6c4e9df5c  PUBLISH   Merge pull request #345 from xavier-arosemena/sync/sync-1-5-quick-wins
  71d621532  PUBLISH   Merge pull request #346 from xavier-arosemena/fix/upstream-sync-triage-json-purity-ci
  afe35f6a8  PUBLISH   chore: prepare v3.88.5 pre-release
  7b4f92882  PUBLISH   Merge pull request #348 from xavier-arosemena/docs/register-flip-synced-and-waive-3885
  ```
  i.e. a **sync-batch merge and a docs/register merge both publish**; only `( stable)? release` subjects skip.
- **Claim: the fail-closed 3.88.5→3.88.6 story and its location → commands `git show 71d621532:src/package.json | grep -m1 '"version"'` → `3.88.5`; `git show 7b4f92882:src/package.json` → `3.88.6`; `git log -1 --format='parents=%p' 71d621532` → `parents=6c4e9df5c afe35f6a8`; `sed -n '331p' docs/upstream-sync/pending-upstream-commits.md` → ``| `d28e4a129` | 2026-08-22 | ci: upload test VSIX… | `E-SKIP` | P4 | 1 | ✖ |``.** The `HTTP 503` / "infrastructure failure, not a version error" text is at [`README.md:331`](docs/upstream-sync/README.md:331) under `## 9. Register changelog`, **not** in the register file where M4 and lenses A–D cite it.
- **Claim: per-patch bumps do not churn announcements → command `node scripts/verify-announcement-version.mjs` → observed `current extension version: 3.88.9` … `announcement data verified for v3.88.9` `EXIT=0`**, with line base pinned by `grep -n '^## \[' src/CHANGELOG.md` → `7:## [3.88.0] — 2026-09-09`.
- **Claim: only the pre-release channel is push-triggered → `sed -n '1,6p' .github/workflows/marketplace-publish.yml` → `on:` / `workflow_dispatch:` only** (stable is manual, with an approval gate).
- **Claim: a dormant second release mechanism exists (`AGENTS.md` "no `.changeset`") → `git ls-files .changeset | wc -l` → `13`; `package.json:26 "changeset:version": "cp CHANGELOG.md src/CHANGELOG.md && changeset version && cp -vf src/CHANGELOG.md ."`; `grep -rn "changeset" .github/workflows/` → no match; [`.changeset/config.json`](.changeset/config.json:1) → `"fixed": [["zoo-code"]]`, `"baseBranch": "main"` while root `"name"` is `roo-code` and `git branch -a` shows only `master`.**
- **Claim: no release rollback capability is documented → `grep -rln "rollback|unpublish|delist|fix-forward" docs/` → only [`README.md`](docs/upstream-sync/README.md:1), [`branch-hygiene.md`](docs/runbooks/branch-hygiene.md:1), 2 incident/postmortem files — no runbook.**
- **Claim: one CHANGELOG section per minor is actually held → `grep -nE "^## \[3\.88\.[1-9]" src/CHANGELOG.md` → none; `grep -cE "^## \[[0-9]+\.[0-9]+\.0\]" src/CHANGELOG.md` → `74`.**

**Claims I could not reproduce:** (1) **UNVERIFIED** whether the committed `3.88.9` ([`src/package.json`](src/package.json:6)) is already published on Open VSX, and whether `3.88.5` is truly absent — needs network/registry access; would take an Open VSX API query. (2) **UNVERIFIED** the exit code of CI run `35194285835` — needs Actions access; only the README §9 narrative is available. (3) **UNVERIFIED** H-04's acceptance test ("two consecutive batch merges → two green publish runs") — needs CI; and as written it is non-discriminating (see new findings). (4) **UNVERIFIED** any `--refresh` behaviour — forbidden by mandate (writes into `.git`).

**Release contract adjudication:**

*What happens today when a sync-batch PR merges without a bump.* The merge fires [`pre-release-publish.yml`](.github/workflows/pre-release-publish.yml:20) (the merge subject is `Merge pull request #N from …/sync/…`, which does **not** match the `( stable)? release` skip regex → `skip=false`; verified above). The guard then reads the committed version `V` and does one of three things: (a) `V` unpublished **and** strictly greater than the max published patch on its minor line → **it publishes the batch under `V`**; (b) `V` already published → `::error:: … is ALREADY published` → `process.exit(1)` → **red run, nothing published**; (c) Open VSX unreachable → `::error:: could not query Open VSX … aborting` → `process.exit(1)` → **red run, nothing published**. There is **no duplicate-publish outcome** (that is precisely what the guard prevents) and **no silent skip** (the token guard makes a tokenless run red). Because the version was necessarily published by the previous push, the **normal** outcome for an unbumped batch merge is **(b): a red fail-closed run and no release** — after which the batch sits on `master` and is published by the *next* bump, i.e. **two themes ship under one version**, with a CHANGELOG/announcement that describes neither. *Minimal DoD clause:* "Before merging a batch, run `pnpm bump:pre-release` on the batch branch and commit it with a non-release-prep subject so the merged tree's `src/package.json` version is unpublished and strictly greater than the max published patch on its minor line; run `pnpm verify:announcement-version` (and `pnpm generate:announcements` only if the line-base CHANGELOG section changed); record the version in [`README.md` §9](docs/upstream-sync/README.md:326)." *Recommended cadence:* **per-batch (batch == version)**. Cost of the two viable models for the 11 remaining batches: **per-batch** = 11 one-line bumps of [`src/package.json`](src/package.json:6), **0** `generate:announcements` runs (announcements are line-keyed — verified above), 11 `verify:announcement-version` runs, 11 green publishes; **per-window** (accumulate, ~3 windows) = 3 bumps, 0 regenerations, **8 red fail-closed runs**, and 3 publishes each carrying ~4 themes with **no theme↔version mapping**. **"Per line" is arithmetically impossible under the guard** — once the line base is published, any later push must be a strictly higher patch or it fails closed — so the only real choice is how many merges share an increment; sharing destroys the analysis-mandate-5 revertability the strategy sells. Pick **per-batch**.

**Decisions on H-01…H-20:**

| ID | Decision | Reason (≤20 words) |
| --- | --- | --- |
| H-01 | REVISE | Needed; acceptance test passes pre-change. Recorded tip is also the release-baseline anchor. |
| H-02 | REVISE | Add a `Version`/`Released` column — without it a revert has no release target. |
| H-03 | REVISE | Repo-only profile is the only host for the DoD clause; must be merge-base-free. |
| H-04 | REVISE | ACCEPT the DoD clause; REJECT duplicating the registry guard in CI (second source of truth). Test must be the negative. |
| H-05 | ACCEPT | Sweep must include the release literals (runbook §7, README §9), not only `scripts/`. |
| H-06 | ACCEPT | Release-neutral; prerequisite of H-08. |
| H-07 | REVISE | A weekly register PR merged to `master` **is a publish event**; needs the path predicate (F-E-1). |
| H-08 | REVISE | Inputs discarded, no line counts; release-neutral but premise false. |
| H-09 | REVISE | Needs a mandatory bump, a sanctioned `fix/*` prefix, a class-conditional SLA, and an embargo/`hold` policy (only publish path is public). |
| H-10 | ACCEPT | Real absent gate; ship with its own fail-closed test. |
| H-11 | REVISE | Key undecidable for branding-mode entries. |
| H-12 | REVISE | Metrics need the published version, not just resolution dates. |
| H-13 | ACCEPT | Only lever lowering per-row cost; SYNC-7 needs the suppression-ratchet policy. |
| H-14 | ACCEPT | Makes divergence countable; per-row disposition. |
| H-15 | REJECT | Unschedulable: no rollback, no unpublish, no announcement story, preconditions unmet. Re-scope conditional. |
| H-16 | REVISE | Trigger reads metrics that do not exist; must also account for the publish budget. |
| H-17 | ACCEPT | Only host for fix-equivalence evidence. |
| H-18 | ACCEPT | Bounds the release diff; rebrand `sed` must be fixed first. |
| H-19 | ACCEPT | Supply-chain hunks are portable and currently blanket-refused. |
| H-20 | ACCEPT | Make it machine-checked; the ledger self-violates it. |

**Decisions on findings S1–S3, M1–M6:**

| ID | Decision | Reason |
| --- | --- | --- |
| S1 | AGREE | Measurement integrity; release-neutral but blocks H-07's automation. |
| S2 | AGREE | Add the release invariant: a `☑` row should carry the version it shipped in. |
| S3 | AGREE | No capacity model — and no publish budget: each publish is a public event. |
| M1 | AGREE | Δ decay is real; no release impact. |
| M2 | AGREE | Certified metric cannot move; no release impact. |
| M3 | DISAGREE (narrower) | Real overload; fix belongs in H-02's schema, not a new vocabulary. |
| M4 | AGREE (re-scoped) / DISAGREE (causal claim) | Coupling verified and **already documented** in [`README.md` §9](docs/upstream-sync/README.md:326) on 2026-09-17; but "failed once from this exact coupling" is false — the abort was an Open VSX 503, labelled infrastructure. Correct claim: *the coupling was live when an infra abort occurred, and the same note states an unbumped merge would publish whatever version is committed; the fork fixed it with a manual bump, not a DoD clause.* |
| M5 | AGREE | CI cannot see the live register; also cannot see the release contract. |
| M6 | AGREE | No gate inspects port intent; a half-ported fix ships as a version. |

**New findings:**

| ID | Sev | Finding | Evidence (command + observed output) | Proposed fix | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| **F-E-1** | High | **Bookkeeping merges are release events.** With no `paths` filter, a docs-only/register-refresh PR merged to `master` fires the publish workflow; 3 of the last 6 first-parent merges are `docs/*`. Combined with H-07 this makes the weekly register refresh a weekly publish run — red when unbumped, or version-inflating when bumped. | `git log --oneline -12 --first-parent master` → `ceeb9181b …docs/branch-hygiene-policy`, `6c59f5c68 …docs/privacy-guard-scan-markdown`, `7b4f92882 …docs/register-flip-synced-and-waive-3885`; regex harness → all `PUBLISH`; `grep -n "paths-ignore" .github/workflows/pre-release-publish.yml` → `NO paths filter`. | Gate the publish job on a path predicate: run only if the pushed range changed `src/**`, `packages/**`, `webview-ui/**` or `src/package.json`; otherwise skip with a notice. Preserves bump-only publishes (they touch `src/package.json`). | A docs-only merge → green run, `skip=true`, nothing published; a bump-only merge → still publishes. |
| **F-E-2** | High | **Unbumped batch merges are absorbed into the next patch's release.** The DoD has no version step, so batch content ships under a version whose CHANGELOG/announcement describes something else — unreviewed upstream behaviour change inside a patch bump. | `git log -1 6c4e9df5c` → `Merge pull request #345 …/sync/sync-1-5-quick-wins` → `PUBLISH`; `git show 71d621532:src/package.json` → `3.88.5`; [`README.md:331`](docs/upstream-sync/README.md:331) records 3.88.5 never published and 3.88.6 cut instead. | Land H-04 as the **DoD clause only** (bump + verify before merge, non-release-prep subject), plus a `Version` column in H-02's schema. | Merge a batch **without** a bump → red publish run, nothing published; merge the same content **with** a bump → green and the version appears on Open VSX. (H-04's current positive-only test passes either way.) |
| **F-E-3** | High | **Fail-closed conflates policy with availability, and the documented remedy is a permanent version burn.** The guard's `catch → process.exit(1)` makes a registry 5xx indistinguishable from a duplicate; the recorded response was to skip `3.88.5` forever rather than re-run, even though `workflow_dispatch` exists. | [`pre-release-publish.yml:205-210`](.github/workflows/pre-release-publish.yml:205) (`catch { … process.exit(1) }`); [`README.md:331`](docs/upstream-sync/README.md:331) → "`Open VSX API returned HTTP 503` … **infrastructure** failure … The release was deliberately **not** re-triggered." | Distinguish abort classes (distinct message + exit reason for infra vs policy) and document the recovery: **re-run via `workflow_dispatch`; never burn a version on an infra failure.** | A simulated registry 5xx exits with the infra reason and points at the re-run path; a duplicate exits with the policy reason and points at `pnpm bump:pre-release`. |
| **F-E-4** | High | **There is no release-level rollback; per-theme revertability is a git property only.** Versions are immutable on both registries, so "revert a batch after publication" is fix-forward: a new higher patch plus a delist procedure — and no such runbook exists. | `grep -rln "rollback|unpublish|delist|fix-forward" docs/` → only [`README.md`](docs/upstream-sync/README.md:1), [`branch-hygiene.md`](docs/runbooks/branch-hygiene.md:1), 2 incident files; `AGENTS.md` "INTERNAL == PUBLISHING, ALWAYS"; only `master` publishes. | Add a fix-forward rollback runbook (revert → new higher patch; delist procedure; explicit "versions are immutable, installed users keep the bad build"); require a per-batch version so a revert has exactly one target. | The runbook exists; reverting a published batch maps to exactly one version number and one publish run. |
| **F-E-5** | Medium | **A dormant second release mechanism contradicts the versioning policy.** `.changeset/` is populated and a `changeset:version` script exists (it rewrites both CHANGELOG copies, generating per-patch sections) — directly against "one CHANGELOG section per minor" — but no workflow wires it, so it is inert until someone runs it. | `git ls-files .changeset \| wc -l` → `13`; [`package.json:26`](package.json:26) `"changeset:version"`; `grep -rn "changeset" .github/workflows/` → no match; [`.changeset/config.json`](.changeset/config.json:1) `"fixed": [["zoo-code"]]`, `"baseBranch": "main"` vs root `"name": "roo-code"` and a repo whose only branch is `master`. | Delete the changeset config/README or mark it explicitly inert; add a CI check that fails if tracked `.changeset/*.md` increases. | CI fails on a newly added `.changeset/*.md`; `pnpm changeset:version` is either removed or documented as forbidden. |
| **F-E-6** | Medium | **The release contract's only evidence lives in a document the runbook demotes.** The DoD and TASK 6 are silent on publishing; the release note is in the *manual's* §9, and the runbook tells agents the README "is a maintainer manual … does not issue imperatives". Agents obeying the runbook will merge without bumping. | [`README.md:326`](docs/upstream-sync/README.md:326) → `## 9. Register changelog`; [`upstream-sync.md:186`](docs/runbooks/upstream-sync.md:186) DoD has no version step; [`upstream-sync.md:7`](docs/runbooks/upstream-sync.md:7) → "treat the README as reference material". | Move the release clause into the runbook DoD (H-04) and cross-link §9 from it. | The DoD checklist contains the version clause; the register and README §9 cite the DoD. |
| **F-E-7** | Low | **Anchor mis-citation and stale `release/*` reference.** M4 and lenses A–D cite `pending-upstream-commits.md:331`, which is a `SYNC-12` table row; the text is in `README.md:331`. The register header still cites a fork tip on `release/v3.88.3-prerelease`, a prefix `AGENTS.md` forbids. | `sed -n '331p' docs/upstream-sync/pending-upstream-commits.md` → ``| `d28e4a129` | 2026-08-22 | ci: upload test VSIX… | `E-SKIP` | P4 | 1 | ✖ |``; register header line 18 → `Fork tip   \`77a670196\` (2026-09-15, \`release/v3.88.3-prerelease\` merge)`. | Correct the anchors during H-05; scrub `release/*` from the register header. | A link-check fails an anchor whose line does not contain the cited text; `grep -rn "release/v3.88" docs/upstream-sync/` → 0. |

**Recovery & rollback:** When a batch merge lands and the publish job fails, split by cause. **Infra (503/timeout):** re-run — `workflow_dispatch` on `master` for the same version, or "Re-run failed jobs" in the Actions UI; [`concurrency: marketplace-prerelease`](.github/workflows/pre-release-publish.yml:28) (`cancel-in-progress: false`) serialises runs so a re-run cannot race. This path exists and was **not** used for 3.88.5 (per [`README.md:331`](docs/upstream-sync/README.md:331)). **Policy (duplicate / non-monotonic, i.e. the merge was unbumped):** you cannot re-publish and you cannot unpublish, so land a **new committed version** — which policy requires to be a short-lived branch + PR, because `master` must never gain unpublished commits (`git pull --ff-only`) and direct commits to `master` are forbidden. **What [`branch-hygiene.md`](docs/runbooks/branch-hygiene.md:1) forbids:** force-pushing or resurrecting a branch to re-land (invariant 5 — rebranch from current `master` and link the closed PR), rewriting `master`, parking WIP in `git stash`. **What it requires:** deleting the sync branch local **and** remote immediately after merge (invariant 3; decision-tree step 1 — not a recovery move), and for a *closed-unmerged* batch, proving supersession with `git cherry -v origin/master <branch>` plus a blob comparison before deleting. **What no operator can do:** retract `V` from Open VSX or the Marketplace, or reach users who already installed it. A "revert a batch" therefore ships as a **new higher patch**, which is only targetable if the DoD bumps per batch — the missing clause is the same one that would make the rollback story coherent.

**Dissent / uncertainty:**
- I mark **H-04 REVISE, not ACCEPT**: the DoD clause is right, but "a pre-merge copy of the duplicate/monotonic version guard" forks a fail-closed gate into two sources of truth, and a pre-merge registry query is non-authoritative (registry state changes between PR check and merge). The pre-merge control should be deterministic and offline: committed version is a plain `major.minor.patch`, strictly greater than `git show <merge-base>:src/package.json`, and carried by an explicit bump commit.
- **M4 is not novel.** [`README.md` §9](docs/upstream-sync/README.md:326) already stated the coupling and the unbumped-merge hazard on 2026-09-17. The *unaddressed* part is the remedy (a manual bump instead of a DoD clause), which is what H-04 should claim.
- I did **not** verify registry state. It is possible `3.88.9` is unpublished and the current `master` (tip `ceeb9181b`, a `docs/branch-hygiene-policy` merge) is sitting in the "red fail-closed run" state F-E-1/F-E-2 predict. That is inference from verified mechanism, not observation.
- F-E-1's path predicate has a genuine trade-off: a merge that *only* changes `docs/**` but intends to publish (because a prior bump landed in an earlier ignored push) would no longer publish. Since a bump always touches `src/package.json`, the predicate is safe for bumps; it is unsafe only for "publish the already-committed tree by pushing an unrelated commit", which is not a sanctioned flow.
- Whether the P0 lane can meet a same-week SLA depends on the fix's class, which the register does not record in advance; my class-conditional recommendation is a judgement, not a measurement.
- No files were created, written, or edited; no `--refresh` was run.

**Ordering advice:**
1. **The release contract first — H-04's DoD clause + F-E-2 + F-E-6** — before any further batch merges. Every merge to `master` is already a publish attempt; without the clause the next batch repeats the 3.88.5 pattern (red run, then riding along with someone else's bump).
2. **F-E-1 (path predicate) immediately after**, because it is the precondition for H-07: a weekly register-refresh PR merged to `master` will otherwise manufacture a weekly publish event.
3. **F-E-3 (distinguish infra from policy abort) and F-E-4 (fix-forward rollback runbook) before H-09 and before H-15.** A P0 lane that cannot be rolled back cannot be run fast, and a lane whose only publish path is public cannot be run quietly.
4. **H-03 (repo-only CI) after H-02's schema lands with the `Version` column**, so the DoD clause is machine-checked rather than prose — and so the check is green in the depth-1 clone shape it ships in.
5. **H-09 only after the embargo/hold decision**: the lane must respect an own `fix/*` branch (the sanctioned prefixes do not include `security/*`), a mandatory bump, no mid-minor announcement regeneration (the popup arms once per minor, so a security note cannot reach existing users without a new minor), and the unchanged gate chain. Bypassing the *queue* is fine; bypassing the *bump* is not.
6. **H-15 last and re-scoped to conditional — or keep it REJECTed.** As a scheduled whole-history merge it converts an unreviewable change set into an irreversible public release; it becomes releasable only after F-E-4, F-E-1, a CHANGELOG/announcement plan for the merged range, and lens C's merge resolution policy exist.

<!-- /REGISTER-E -->

<!-- REGISTER-F -->
### F — 🔒 Security Auditor (`security-auditor`)

*Registered 2026-09-24 · mode `security-auditor` · returned as a registry block; **no file written or edited**. Assumptions: checkout is shallow (3-commit upstream window, no merge base); registry/advisory network access is unavailable, so every advisory/CVE statement below is an *assessment*, not a measurement; the register's `Date` column is the **upstream commit date**, not the queue-entry date (the register stores no resolution date — lens A's F-A-3); I ran no `--refresh`/`--refresh --write`.*

**Verdict:** The batching mechanism is security-neutral, but the *policy layer* is not: the register has no security SLA and no advisory intake, **4 of 5 `P0` rows are open at 17–35 days with 3 of them `C-REIMPLEMENT` (hand-port only)**, `E-SKIP`/`D-LOCAL` silently own the fork's CI supply chain (8 mutable `uses:` refs, 4 unregenerated dependency bumps, one 19-day-old Actions hardening commit that R5 makes structurally untakeable), and the pipeline **discards a PGP signature GitHub already provides** while fetching from a third-party mutable ref. The single strongest finding is that the strategy has no control that can tell "we reviewed this security hunk and refused it" apart from "we never saw it" — the rebrand sweep then rewrites security-bearing constants (auth path, session-token and user-PII storage keys, extension-identity string) across 987 files with no gate able to notice.

**Claims verified by me (claim → command → observed output):**
- **Exposure is real and unowned → `awk -F"|" '/^\| `[0-9a-f]{9}` \|/ …$6 ~ /P0/…' docs/upstream-sync/pending-upstream-commits.md`** →
  ```
  `c747c024b` | 2026-08-22 | `C-REIMPLEMENT` | P0 | 28 | ☐
  `c6eb8fb57` | 2026-09-12 | `A-CLEAN` | P0 | 0 | ☑ f4287ff4f
  `21d35c4a9` | 2026-08-20 | `C-REIMPLEMENT` | P0 | 5 | ☐
  `8d296deef` | 2026-09-06 | `C-REIMPLEMENT` | P0 | 5 | ☐
  `2ecbf35a8` | 2026-09-07 | `C-REIMPLEMENT` | P0 | 13 | ☐
  ```
  and `git log -1 --format=%ad --date=short` on each → ages today (2026-09-24): `21d35c4a9` **35 d**, `c747c024b` **33 d**, `8d296deef` 18 d, `2ecbf35a8` 17 d. Only one P0 ever closed, and it closed on the register's baseline day (register lines [192](docs/upstream-sync/pending-upstream-commits.md:192)/[402](docs/upstream-sync/pending-upstream-commits.md:402) attribute all six `☑` rows to PR #345 / merge `6c4e9df5c`).
- **No SLA exists anywhere → `grep -rInE "SLA|response target|time-to-patch|within [0-9]+ (days|hours)|deadline" docs/upstream-sync/ docs/runbooks/upstream-sync.md docs/adr/adr-upstream-sync-triage-strategy.md`** → matches **only inside [`consolidated-hardening-plan.md`](docs/upstream-sync/consolidated-hardening-plan.md:56)** (S3/H-09 themselves); zero matches in the ADR, register, manual, or runbook. `H-09` is a proposal, not a control.
- **The verifier fails closed → `node scripts/upstream-sync-triage.mjs --verify; echo EXIT=$?`** →
  ```
  [SYNC:TRIAGE] fork ref origin/master (local master is an ancestor of origin/master (stale local ref))
  ❌ [SYNC:TRIAGE] upstream/main has no merge base with origin/master (this checkout is shallow). … Deepen first: git fetch --deepen=400 upstream main
  EXIT=1
  ```
  Confirms lens A/B/D: no register check runs in the shape it ships in.
- **Upstream commits are PGP-signed and the fork never checks → `git cat-file commit 500152b78 | grep -c "^gpgsig"` → `1`; `git cat-file commit c747c024b | grep -c "^gpgsig"` → `1`; `git cat-file commit 500152b78 | head -12`** → `gpgsig -----BEGIN PGP SIGNATURE----- …`, `committer GitHub <noreply@github.com>`. Yet `grep -rInE "verify-commit|verify-tag|--show-signature|gpg|cosign|sigstore|provenance|attestation|SLSA" .github/workflows/ scripts/*.mjs` → **no output (no match)**, and `grep -nE "verify-commit|gpg|signature" scripts/upstream-sync-triage.mjs` → `NONE`. `git remote -v` → `upstream git@github.com:Zoo-Code-Org/Zoo-Code.git` with `remote.upstream.fetch +refs/heads/*:refs/remotes/upstream/*`.
- **R5's refused paths hold live supply-chain debt → `grep -rnE "uses: (actions/checkout@v|actions/github-script@v|dependabot/fetch-metadata@v)" .github/workflows/*.yml`** →
  ```
  .github/workflows/dependabot-auto-merge.yml:34:        uses: dependabot/fetch-metadata@v2
  .github/workflows/dependabot-auto-merge.yml:43:        uses: actions/github-script@v7
  .github/workflows/security-alert-digest.yml:27:        uses: actions/checkout@v4
  .github/workflows/security-alert-digest.yml:30:        uses: actions/github-script@v7
  .github/workflows/security-alert-issue.yml:26:        uses: actions/checkout@v4
  .github/workflows/security-alert-issue.yml:29:        uses: actions/github-script@v7
  .github/workflows/security-issue-assign.yml:33:        uses: actions/github-script@v7
  ```
  (`SHA-pinned: 40` / `tag-pinned: 8`.) The commit that fixes exactly this — `git show --stat 057dfeebb` → **11 workflow files + `.github/actions/setup-node-pnpm/action.yml`**, SHA re-pins of `checkout`, `upload-artifact`, `download-artifact`, `cache`, `codecov-action`, `pnpm/action-setup`, `setup-node` — is `D-LOCAL` and still `☐` 19 days later.
- **Dependency fixes are lockfile-only and unregenerated → `git show --stat 313ca59cb`** → `pnpm-lock.yaml | 93 +++---` (mammoth → v1.12.2); `4db554918` also touches `packages/cloud/package.json` although `ls packages/` → `build config-eslint config-typescript core ipc types vscode-shim` (**no `cloud/`**); `grep -rn "\"mammoth\"" src/package.json` → `"mammoth": "^1.9.1"`.
- **Telemetry invariant is not machine-enforced and its number is scope-unstable → `ls scripts/ | grep -i telemetry`** → `ABSENT: no telemetry script`; `git grep -Il "captureEvent(" -- "src/**" | wc -l` → `0` (webview-ui/src → `0`; posthog/sentry imports → `0`) but `git grep -Il -i "telemetry" -- "src/**" | wc -l` → **`34`** (webview-ui/src → `2`). So "0 telemetry references" is false as worded, true only as "0 transport call sites".
- **No secrets or internal identifiers in the sync docs → targeted sweep over `docs/upstream-sync/`** → `ghp_/github_pat_: 0`, `AKIA: 0`, `sk-*/sk-ant-*: 0`, `PRIVATE KEY-----: 0`, `Bearer …: 0`, personal emails `0`, RFC1918/link-local IPv4 `0`, UUIDs `0`. Only public identifiers (upstream contributor handles in [`triage-raw.tsv`](docs/upstream-sync/triage-raw.tsv:3), fork owner org/handle, one Actions run URL).
- **The docs privacy guard exists and is wired, but is not in the sync gate chain → `grep -rn "verify-docs-no-public-ip" .github/workflows/ package.json`** → [`code-qa.yml:67`](.github/workflows/code-qa.yml:67) and [`package.json:29`](package.json:29); `grep -rn "no-public-ip" docs/upstream-sync/README.md docs/runbooks/upstream-sync.md` → `NOT IN SYNC GATE CHAIN`. Its scope (read from [`verify-docs-no-public-ip.mjs`](scripts/verify-docs-no-public-ip.mjs:1)): **all of `docs/` (any file type) plus every `*.md` repo-wide**, pruning `node_modules/.git/dist/out/build/.turbo/.vinxi/coverage`, allowing only `127.0.0.0/8`, `0.0.0.0/32` and RFC 5737 `192.0.2.0/24`/`198.51.100.0/24`/`203.0.113.0/24`; **RFC 1918 is flagged too** ("errs toward strictness"); exit `0/1/2` with `::error file=…` annotations.
- **The only publish path is push-to-master and it has no `paths` filter → `sed -n "20,24p" .github/workflows/pre-release-publish.yml`** → `on: push: branches: [master]`; `grep -nE "^ *paths|paths-ignore" …` → `NO paths filter`; `grep -rn "environment:" .github/workflows/*.yml` → `marketplace-prerelease` ([`pre-release-publish.yml:36`](.github/workflows/pre-release-publish.yml:36)) and `marketplace-production` ([`marketplace-publish.yml:93`](.github/workflows/marketplace-publish.yml:93)) — so an environment-reviewer gate is the *only* existing hold lever, and whether reviewers are configured is a repo setting I cannot read here.
- **The rebrand's security-relevant rewrites are unexercised dead code that will fire on the next pick → `git grep -InE "roo-plus-session-token|roo-plus-user-email|roo-plus-user-name|roo-plus-user-image|services/roo-plus-auth" -- "src/**"`** → **no output**; the corresponding sed rules are [`full-rebrand.sh:74`](scripts/full-rebrand.sh:74), [`:77-80`](scripts/full-rebrand.sh:77), [`:91-92`](scripts/full-rebrand.sh:91), plus UA rewrites at [`:45`](scripts/full-rebrand.sh:45)/[`:48`](scripts/full-rebrand.sh:48) and the repo-URL rewrite at [`:63`](scripts/full-rebrand.sh:63); the sweep target is `git ls-files "src/**/*.ts" | wc -l` → **987**; the script is 98 lines with `set -e` and no trap, no diff guard.
- **The `X-REJECT` commit carries no independent security fix → `git show --stat 1ad8f528d`** → 61 files, and `git show --name-only 1ad8f528d | grep -viE "telemetry|welcome\.json|settings\.json|\.tsx$|\.ts$"` → only `PRIVACY.md`, `codecov.yml`, `src/eslint-suppressions.json` (a net **−5** suppressions), `webview-ui/playwright/vscode-theme-dark.css`. The entangled non-telemetry content is policy prose, not a vulnerability patch.
- **Compensating controls that do exist → `sed -n "1,30p"` on the fork's security workflows** → [`codeql.yml`](.github/workflows/codeql.yml:1) (weekly cron, `security-events: write` scoped to the analyze job), [`security-alert-issue.yml`](.github/workflows/security-alert-issue.yml:1) and [`security-alert-digest.yml`](.github/workflows/security-alert-digest.yml:1) (cron, `security-events: read`), `dependency-review-action` on PRs only ([`code-qa.yml:17-29`](.github/workflows/code-qa.yml:17)), top-level `permissions: contents: read` in all 14 workflows.

**Claims I could not reproduce:**
- **Whether any of the 4 open `P0` rows correspond to a published CVE/GHSA, or their exploitability** — no registry/advisory network. The register itself contains **no** `CVE-`/`GHSA-` marker (grep matches only the E-SKIP words "advisory" inside two CodeRabbit subject lines). Would take OSV/GHSA queries plus reading each upstream PR body. **UNVERIFIED** — the exposure figures below are therefore *dwell time*, not exploit severity.
- **Whether upstream's signature is cryptographically valid** — `git log -1 --format="%G?" 500152b78` → `E` ("cannot check": no keyring here). I verified only that a `gpgsig` header is **present** and that no verification code exists. Would take the GitHub web-flow public key and `git verify-commit`.
- **Whether security fixes exist in the un-fetched portion of upstream history** — this clone exposes 3 upstream commits; the 102-row set is a 2026-09-16 snapshot, so "upstream has shipped nothing security-relevant since" cannot be asserted (and ~7 days of upstream drift is expected at ~3.8 commits/day). Would take `git fetch --unshallow`.
- **Registry state of published versions / whether `marketplace-prerelease` actually requires reviewers** — repo settings + Open VSX API; lens E's items 1–2 remain UNVERIFIED for me too.
- **`--refresh`/`--refresh --write` end-to-end** — forbidden by mandate (it fetches into `.git`, and it can advance the register tip past unmeasured commits).

**Exposure analysis:** The register's own rows put the time-to-patch for its oldest security-classified work at **35 days and counting** (`21d35c4a9`, 2026-08-20, `P0`/`C-REIMPLEMENT`, still `☐`), with `c747c024b` — the fork's *read/write allowlist security feature* — at **33 days**, and the two data-loss rows at 17–18 days. The only P0 that landed (`c6eb8fb57`, 2026-09-12) did so inside the **same-day bulk merge** `6c4e9df5c` on the register's baseline day, so the observed marginal P0 drain since 2026-09-16 is **0 rows / 8 days**; there is no per-row turnaround to extrapolate from, only dwell. Two structural multipliers make the estimate worse than the dates suggest: (a) **3 of 4 open P0 rows are `C-REIMPLEMENT`**, i.e. hand-port with tests — never a cherry-pick — so the floor is engineering effort, not scheduling; and (b) both open P0 batches sit at recommended-order ranks **#5 and #6**, behind `SYNC-2` (`P1`), with no capacity model (S3). Because the register stores no resolution date, all dwell figures are lower-bound estimates from upstream dates. **Windows I would set** (calendar days from upstream fix availability to a *published* fork patch): **P0-a = 7 days** for auth/secret-handling, allow-list bypass, arbitrary file write, remote-code-execution, or supply-chain/update-path defects; **P0-b = 14 days** for the dependency lane (CVSS ≥ 7.0), 30 days below; **P0-c = 30 days** for local-only/crafted-input/DoS/PII-egress defects. **Hard ceiling: 45 days**, which the register is already within 10 days of breaching on `21d35c4a9`. Escalation at 50% of a window (digest), release blocker at 100%. Since the only publish path is a `master` push ([`pre-release-publish.yml:20`](.github/workflows/pre-release-publish.yml:20), no `paths` filter), the lane must also reserve a **publish slot** — a fix that is merged but awaiting someone else's bump has not shipped, and its SLA has not been met.

**Security-relevant rows at risk:**

| SHA | Class | Subject | Security content it carries | Why the class risks never taking it | Compensating control |
| --- | --- | --- | --- | --- | --- |
| `057dfeebb` | `D-LOCAL` ☐ (19 d) | ci: bump GitHub Actions to node24 runtimes (#1534) | 11 workflow files + [`setup-node-pnpm/action.yml`](.github/actions/setup-node-pnpm/action.yml:1): SHA re-pins of checkout / upload-artifact / download-artifact / cache / codecov-action / pnpm-action-setup / setup-node (verified in the diff) | `D-LOCAL` = "never take the upstream commit, re-apply locally"; no owner field, no schedule, status `☐`; **R5 also blanket-refuses `.github/**` on any pick**, so neither path can execute | None. 8 mutable `uses:` refs remain, including `actions/github-script@v7` ×4 (in `dependabot-auto-merge`, both `security-alert-*`, `security-issue-assign`) |
| `313ca59cb` | `D-LOCAL` ☐ (14 d) | Update dependency mammoth to v1.12.2 (#1472) | Dependency version for the DOCX conversion path (lockfile-only, 93 lines) | `D-LOCAL` dependency bumps → "regenerate via renovate.json" — a *different* pipeline with no evidence of coverage and no owner; fork still declares `"mammoth": "^1.9.1"` | `dependency-review-action` runs **only on PRs** ([`code-qa.yml:21`](.github/workflows/code-qa.yml:21)); Dependabot + `security-alert-*` cover fork alerts, not this |
| `4db554918` | `D-LOCAL` ☐ (14 d) | Update dependency globals to v16.5.0 (#1474) | Dev-dependency bump; also edits `packages/cloud/package.json` | Same class, no owner; and `packages/cloud/` **no longer exists** in the fork, so the stated "re-implement locally" path is not actionable for one hunk | None |
| `116ed7139` / `4e7f7dee8` | `D-LOCAL` ☐ (14 d) | i18next → v25.10.10 / ink → v6.8.0 | Runtime/CLI dependency versions (lockfile-only) | Same class, no owner, indefinitely `☐` (M3's status overloading) | None |
| `c747c024b` | `C-REIMPLEMENT` P0 ☐ (33 d) | feat: Add Read+Write allowlists (#1274) | **Security feature**: read/write allowlists for the guarded-write path — directly load-bearing for the fork's file-access boundary | Hand-port only (Δ 28, touches `ClineProvider`, `Task`, decomposed handlers, `global-settings`, 17 locale files); ranked **#6 of 9**, behind `SYNC-2` (`P1`); no SLA | Batch queue only |
| `21d35c4a9` / `8d296deef` / `2ecbf35a8` | `C-REIMPLEMENT` P0 ☐ (35 / 18 / 17 d) | task-history atomic merge; history disappears on reopen; disappears on restart | **Data-loss/durability** of persisted conversational state (integrity/availability of user data) | Hand-port only; both rows sit in the `SYNC-3`/`SYNC-4` investigation ranked **#5**; register notes cite two fork postmortems on adjacent payload territory — not a control | None |
| `63aca680e` | `B-CAREFUL` P1 ☐ | fix(semble): increase archive download limit (#1306) | Download-size limit on an archive fetcher (resource-exhaustion / truncation); Semble downloader is explicitly "fork-specific/**ungated**" per the alignment ADR | The register defers to a manual "verify the direction of this file" step with no owner, so the row can idle | `verify-semble-checksums.mjs --strict` and `verify-semble-release-coupling.mjs --strict` are in the gate chain |
| `a3e31e14b` | `B-CAREFUL` P1 ☐ | Provider settings contact unselected model services (#1425) | **Privacy/egress defect**: settings UI contacting provider endpoints the user did not select | Δ 10 exceeds the runbook's own `Δ > 5 ⇒ not B-CAREFUL` stop condition ([`upstream-sync.md:32`](docs/runbooks/upstream-sync.md:32)), so the row is in limbo: every attempt is supposed to stop and ask | None |
| `1ad8f528d` | `X-REJECT` ✖ | telemetry: default opt-out + consent UI (#1069) | `PRIVACY.md` wording (+18), `codecov.yml` policy, −5 eslint suppressions | Rejected by design — **correct for the consent UI**, but there is no *privacy-only* intake, so any future privacy hunk entangled with telemetry is refused by default | Manual instruction "lift the wording only"; no `PRIVACY.md`↔code linkage check exists |
| `d28e4a129` | `E-SKIP` ✖ | ci: upload test VSIX for pull requests (#1314) | Would publish a VSIX artifact produced from untrusted PRs | Permanently out of scope — **refusing this is a security positive** | n/a |
| `fdef10685` / `99736300f` | `E-SKIP` ✖ | ci: union coverage before upload / preserve coverage caches | **CI cache-integrity** handling for coverage artifacts | Both touch only [`code-qa.yml`](.github/workflows/code-qa.yml:1) (fork-owned, R5-refused), so they are structurally untakeable; the fork's own cache policy is unmanaged | None |
| `79cd12f2c`, `efc30cfa0`, `a1ca0c8f7`, `104700e92`, `b18b6f01c` | `E-SKIP` ✖ | mutation gate; CodeRabbit config; CodeRabbit web-search grounding; Renovate pre-status checks; merge queue for fork PRs | Third-party bot/service trust (repo access) and PR-gating policy | Out of scope by decision — refusing CodeRabbit/web-search grounding is a **security positive** (no third-party source-code egress); no fork equivalent review control is named | Fork runs CodeQL + `security-alert-*` + `label-pr-review-state.yml` instead |

**Decisions on H-01…H-20:**

| ID | Decision | Reason (≤20 words) |
| --- | --- | --- |
| H-01 | **ACCEPT** | Security-critical: without the ancestry assertion the refresh silently erases the evidence that a security commit was ever in the window. |
| H-02 | **REVISE** | Accept the invariants; add a security disposition field (`advisory`, `privacy`, `dropped-hunk`) and land the `cells[6]` parser fix together (F-B-1). |
| H-03 | **ACCEPT** | Repo-only CI verification is the only thing that keeps the security register from drifting into fiction where it ships. |
| H-04 | **ACCEPT** | An unbumped batch merge publishes unreviewed upstream behaviour as a patch; the DoD version clause is a security-review precondition. |
| H-05 | **ACCEPT** | Stale literals ("22", "six", "~15") are what the next agent acts on during a security triage. |
| H-06 | **ACCEPT** | Stale Δ is why security-relevant dependency/near-miss rows can be mis-sorted and mis-batched. |
| H-07 | **REVISE** | Do not automate a third-party fetch that rewrites the baseline until F-F-1 provenance post-conditions and F-E-1 path predicate land. |
| H-08 | **ACCEPT** | Capping batch size bounds the blast radius of an un-reviewed 987-file rebrand sweep; needs computable inputs (F-B-4). |
| H-09 | **REVISE** | Accept the lane, but re-specify: subject-regex-only intake is insufficient; require advisory feed, hold path, rollback reality. |
| H-10 | **REVISE** | Accept the gate; widen beyond transport symbols (PRIVACY.md linkage, CI egress inventory) and clean the 34-file scaffolding. |
| H-11 | **ACCEPT** | A divergence ledger turns "divergent-forever" into an auditable decision instead of a silent security-relevant omission. |
| H-12 | **ACCEPT** | Without dwell/advisory fields no security SLA is measurable; add oldest-unresolved-P0 age as a first-class metric. |
| H-13 | **ACCEPT** | SYNC-7 lowers the conflict mass that forces hand-ports — the slowest, least verifiable path in the P0 lane. |
| H-14 | **ACCEPT** | "No silent drop" is precisely the control that stops a security hunk being discarded without a record. |
| H-15 | **REJECT** | A whole-history merge publishes an unreviewable change set through the only public channel, and no rollback exists. |
| H-16 | **ACCEPT** | A forced-decision rule is what prevents a security backlog from growing invisibly; needs metrics first (F-A-3/F-B-4). |
| H-17 | **ACCEPT** | Names the only fix-equivalence evidence the gate chain can host; a half-ported security fix must not pass. |
| H-18 | **REVISE** | Accept, but strengthen: require storage-key/secret-constant review and migration safety, not only diff-scope and idempotence. |
| H-19 | **ACCEPT** | Concern-based R5 is right; add drop-logging, action-runtime bumps and a diff-driven "refused path changed upstream" check. |
| H-20 | **ACCEPT** | "Verified" must quote its command — the security claims ("0 telemetry") are exactly the kind that self-violate it. |

**Decisions on findings S1–S3, M1–M6:**

| ID | Decision | Reason |
| --- | --- | --- |
| S1 | **AGREE** | Silent refresh under-reporting erases the evidence that a security row was in the window; latent behind `requireMergeBase`, so it is a *latent* integrity failure. |
| S2 | **AGREE** | Unenforced invariants in stored data (5 violations per A/B/D); for security the missing relation also includes the Δ↔class ladder (lens C's F-C-2). |
| S3 | **AGREE** | This *is* the exposure-window finding — the plan files it as `L8`/Low; I would rate "no P0 lane, no SLA, no capacity model" **High** for security. |
| M1 | **AGREE** | Δ decay mis-sorts security-relevant dependency and near-miss rows, and `-x` imports inflate Δ from the sync itself (lens C). |
| M2 | **AGREE** | A certified metric that cannot fall makes a growing security backlog invisible in the register's own numbers. |
| M3 | **AGREE (narrower)** | Status overloading is exactly why a `D-LOCAL` supply-chain fix (`057dfeebb`) can sit `☐` forever with no owner; the fix belongs in H-02's schema. |
| M4 | **AGREE (scope) / DISAGREE (evidence)** | "Every master merge publishes" is a genuine release-security finding; but the cited abort was an Open VSX 503 labelled infrastructure, not the coupling. |
| M5 | **AGREE** | The register that gates security intake is unverified in CI; the only machine path is a vacuous spec branch (lens B/D prove it). |
| M6 | **AGREE** | No fix-equivalence gate ⇒ a half-ported security fix passes all seven checks; this is the most dangerous gap for security work. |

**New findings:**

| ID | Sev | Finding | Evidence (command + observed output) | Proposed fix | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| **F-F-1** | **High** | **The pipeline discards an available provenance signal while fetching from a third-party mutable ref.** Upstream commits carry GitHub web-flow PGP signatures; nothing verifies them, and `--refresh --write` will happily let the register baseline follow whatever that ref returns. | `git cat-file commit 500152b78 \| grep -c "^gpgsig"` → `1`; `git cat-file commit c747c024b \| grep -c "^gpgsig"` → `1`; `git remote -v` → `upstream git@github.com:Zoo-Code-Org/Zoo-Code.git`; `grep -rInE "verify-commit\|verify-tag\|--show-signature\|gpg\|cosign\|sigstore\|provenance\|attestation\|SLSA" .github/workflows/ scripts/*.mjs` → **no match**. | Add a provenance post-condition: after every deepen/refresh, `git fetch` must be followed by `git verify-commit` for each SHA a batch will pick against an allow-listed signer (GitHub web-flow key), and `--verify` must assert every row's `-x` upstream SHA resolves, is an ancestor of `upstream/main`, and is signature-valid; fail closed on an unknown key. | A fixture commit signed by an unlisted key fails the gate; a batch picking a non-resolving or unsigned `-x` SHA exits non-zero with the row named; `--refresh --write` refuses to advance the tip when any new commit fails verification. |
| **F-F-2** | **High** | **The rebrand sweep rewrites security-bearing constants and no gate can detect it.** Phase 3/4 renames an auth-service import path, the session-token/user-name/email/image storage keys, and the extension storage identity across 987 tracked `src/**/*.ts` after every batch; those strings are absent from the fork today, so the transforms are *unexercised dead code* that fires the moment upstream code is imported — silently retargeting a picked token-rotation or auth-identity fix. | Rules: [`full-rebrand.sh:74`](scripts/full-rebrand.sh:74) `s\|services/zoo-code-auth\|services/roo-plus-auth\|g`, [`:77`](scripts/full-rebrand.sh:77) `s/zoo-code-session-token/roo-plus-session-token/g`, [`:91`](scripts/full-rebrand.sh:91) `s/ZooCodeOrganization\.zoo-code/xavier-arosemena\.roo-plus/g`; UA at [`:45`](scripts/full-rebrand.sh:45)/[`:48`](scripts/full-rebrand.sh:48); `git grep -InE "roo-plus-session-token\|roo-plus-user-email\|roo-plus-user-name\|roo-plus-user-image\|services/roo-plus-auth" -- "src/**"` → **no output**; `git ls-files "src/**/*.ts" \| wc -l` → `987`; script is 98 lines, `set -e`, no trap, no diff guard. | Make the transform scoped and reviewable: (i) assert post-batch diff ⊆ (batch files ∪ branding files) **and** that no rewritten line matches a security-constant pattern (token/secret/key/allow-list host/UA/OAuth aud/iss/`secrets.`); (ii) any such rewrite must carry an explicit decision (re-point / rotate / `divergent-forever`) in the resolution record; (iii) idempotence must be fixed first (Phase 1's keyword sed duplicates on re-run) or the assertion is noise. | A fixture batch containing `zoo-code-session-token` fails the new gate until a reviewer records the migration/rotation decision; a rebrand on a no-op batch is byte-identical; rewriting a UA/`secrets.` constant is refused by name. |
| **F-F-3** | **High** | **Nothing distinguishes "refused after review" from "never seen", so security fixes can be permanently and silently untaken.** R5's refusals and the `D-LOCAL`/`E-SKIP` classes create an unowned queue: 8 mutable action refs, 4 unregenerated dependency bumps, and a 19-day-old Actions-pinning commit that neither the pick path (R5 forbids `.github/**`) nor the local path (no owner) can execute. | `grep -rnE "uses: (actions/checkout@v\|actions/github-script@v\|dependabot/fetch-metadata@v)" .github/workflows/*.yml` → 8 hits (see verified list); `printf "SHA-pinned: "; …@[0-9a-f]{40} \| wc -l` → `40`, `tag-pinned` → `8`; `git show --stat 057dfeebb` → 11 workflows + `setup-node-pnpm/action.yml`; `grep -rn "\"mammoth\"" src/package.json` → `^1.9.1`; `ls packages/` → no `cloud/`. | H-19 strengthened into a **diff-driven** control: when a batch's upstream window contains a commit whose changed paths are ⊆ refused paths (`.github/**`, `.coderabbit*`, `pnpm-lock.yaml`, version/CHANGELOG/locale README), the batch cannot close until each such commit carries a disposition — `pinned-locally:<fork-sha>` or `not-applicable:<reason>` — and every `D-LOCAL` dependency/Actions row gets an owner plus the P0-c SLA. Also rewrite the DoD checkbox "no R5 file was taken from upstream", which otherwise voids the allowance. | A batch merged while `057dfeebb` has no disposition fails the gate; pinning all 8 refs locally and regenerating the 4 dependency bumps flips it green; a `dropped:` entry that names no path in R5 fails. |
| **F-F-4** | **Medium** | **The privacy invariant is prose, its headline number is wrong, and a third-party egress path sits outside it.** No telemetry gate exists; the token survives in 34 tracked `src/` files while the docs assert "0 references"; and the fork's own CI still uploads coverage to Codecov — an ungoverned SaaS egress that the rejected upstream commit was partly about. | `ls scripts/ \| grep -i telemetry` → `ABSENT: no telemetry script`; `git grep -Il -i "telemetry" -- "src/**" \| wc -l` → `34` (webview-ui/src → `2`); `git grep -Il "captureEvent(" -- "src/**" \| wc -l` → `0`; `grep -rn "secrets.CODECOV_TOKEN" .github/workflows/code-qa.yml` → hits at :306/:315/:324/:333 with upload steps at :298/:310/:319/:328 ([`visual-regression.yml:56`](.github/workflows/visual-regression.yml:56) also). | Ship H-10's `verify-no-telemetry.mjs` with (i) the canonical transport-symbol pattern, (ii) a **CI egress inventory** (codecov and any new third-party upload) reviewed at batch time, (iii) a `PRIVACY.md` ↔ egress-code linkage check (fail on a new outbound host/SDK import without a PRIVACY.md diff), (iv) a dated cleanup batch for the 34 inert files; and scope the claim to "0 transport call sites". | Adding `captureEvent(`, a new third-party upload step, or a new outbound host literal without a PRIVACY.md change fails the gate by name; the register's telemetry figure is machine-derived, not prose. |
| **F-F-5** | **Medium** | **`-x` provenance is asserted, never validated.** `-x` records the upstream SHA (R3) and R9 checks the *fork* SHA is on `master`, but nothing checks that the recorded upstream SHA exists, is signed, or is the commit an advisory names — so a register row can claim a security provenance the tooling never confirms. | Runbook [R3](docs/runbooks/upstream-sync.md:17) (`git cherry-pick -x <sha>`), [R9](docs/runbooks/upstream-sync.md:23); `grep -nE "verify-commit\|gpg\|signature" scripts/upstream-sync-triage.mjs` → `NONE`; `git log -1 --format="%G?" 500152b78` → `E` (signature present, unverifiable here). | Extend `--verify` with `provenance` and `advisory-binding` checks: `git cat-file -e <upstream-sha>`, `git merge-base --is-ancestor <upstream-sha> upstream/main`, `git verify-commit <upstream-sha>`, and (when the row is advisory-driven) that the advisory's referenced commit equals the picked SHA. | A row whose `-x` SHA does not resolve, is not an ancestor, or is unsigned fails `--verify --strict` with the row named; an advisory row naming a different SHA fails. |
| **F-F-6** | **Low** | **No per-row security turnaround has ever been observed.** The single closed P0 and all five other `☑` rows landed in one same-day bulk merge on the register's baseline day; marginal P0 drain since is 0, so every SLA figure in the plan is aspirational. | P0 listing (above) shows only `c6eb8fb57 ☑ f4287ff4f`; register [192](docs/upstream-sync/pending-upstream-commits.md:192)/[402](docs/upstream-sync/pending-upstream-commits.md:402) attribute all `☑` rows to PR #345 / merge `6c4e9df5c`; the other four P0 rows are still `☐` at 17–35 days. | Adopt H-12's resolution-date input and publish "oldest unresolved P0 age" plus "P0 resolved in last 30 days" in the register header; treat a zero-turnaround report as a lane failure, not a neutral reading. | The header's oldest-unresolved-P0 age is non-zero and computable from the register alone, and it changes when a P0 row resolves on a different day. |
| **F-F-7** | **Low** | **The one public-repo privacy control is outside the batch DoD.** The docs-IPv4 guard protects a *public* repository from infrastructure disclosure, runs in `code-qa.yml`, but is absent from TASK 6 / README §4.4, so the batch's declared definition of done does not include it. | `grep -rn "verify-docs-no-public-ip" .github/workflows/ package.json` → `code-qa.yml:67`, `package.json:29`; `grep -rn "no-public-ip" docs/upstream-sync/README.md docs/runbooks/upstream-sync.md` → `NOT IN SYNC GATE CHAIN`. | Add it to runbook TASK 6 and README §4.4 (or to the single `pnpm gate:sync` aggregate lens B proposes), so the batch DoD is self-contained and a docs edit inside a batch is guarded without relying on `code-qa.yml`'s triggers. | Removing the step from `code-qa.yml` still leaves the batch's declared gate list failing on a seeded public-IP literal in a batch-authored doc. |

**P0 lane specification:**
- **Intake — must not depend on commit subjects.** (1) GitHub Security Advisories watched for `Zoo-Code-Org/Zoo-Code` and for the fork's direct dependencies; (2) Dependabot alerts on the fork; (3) OSV/GHSA queries keyed by the fork's locked versions; (4) the fork's existing `security-alert-issue.yml` / `security-alert-digest.yml` cron feeds, extended to report *upstream* advisories (they currently cover fork alerts only). The `security|CVE|vulnerab` subject regex stays as a supplement (all four prior lenses flag that it misses unlabelled advisories). Intake must be executable without the weekly refresh: **a maintainer may open a lane row from an advisory ID + SHA + class, with no register reclassification** — otherwise the lane is just the batch queue in disguise.
- **SLA — class-conditional, from upstream fix availability to a *published* fork patch:** P0-a (auth/secret handling, allow-list bypass, arbitrary file write, RCE, supply-chain/update path) **7 days**; P0-b (local-only/crafted-input/DoS/PII-egress) **30 days**; P0-c (dependency lane) **14 days** for CVSS ≥ 7.0, 30 days below. Acknowledge ≤ 24 h, escalate at 50% of the window into the digest, release-blocker at 100%. Absolute ceiling **45 days** for any security-relevant row. The lane must be able to consume a publish slot independently of the batch schedule, because a merged-but-unpublished fix has not met its SLA.
- **Hold path — the lane cannot be run quietly today, so it must be stopped *before* publish.** The only publish trigger is a push to `master` with **no `paths` filter** ([`pre-release-publish.yml:20`](.github/workflows/pre-release-publish.yml:20)), so every merge publishes whatever version is committed. Requirements: (i) land lens E's **F-E-1 path predicate first**, or a lane PR that only edits the register will publish; (ii) **explicit embargo discipline** — the advisory ID must not appear in the register, plan, or commit subjects (this repo is public, so its history *is* the disclosure) until the fix is publishable; (iii) use the existing `environment: marketplace-prerelease` required-reviewer gate plus `workflow_dispatch` as the hold lever, and **verify reviewers are actually configured** rather than assuming it; (iv) `no mid-minor announcement regeneration` — the popup arms once per minor, so a security note cannot reach installed users without a new minor.
- **Rollback reality — fix-forward only, and the lane must be revertible *before* publish.** Versions are immutable on both registries and no rollback/unpublish/delist runbook exists (lens E). Therefore the lane requires: a `fix/security-<id>` branch (R2's `sync/*` prefix is not sanctioned for this, and `security/*` is not in the sanctioned prefixes); a **mandatory per-row version bump** so a revert has exactly one target; a documented fix-forward step (`revert → new higher patch → delist procedure`); and an explicit statement in the lane PR that "installed users keep the bad build". A lane that cannot be stopped between "merged" and "published" is not safe to run fast.
- **Authority to bypass the batch queue.** A **named human** — the security maintainer or on-call release owner — authorises the bypass and records, in the register row: advisory ID, assigned class (P0-a/b/c), window start, hold/embargo decision, and authoriser. An **agent may execute the port but may not self-authorise it**, may not skip the version bump, and may not skip the register row. Queue bypass is permitted; **gate-chain bypass, bump skip, and register skip are not.** Any gate-chain exception needs a second maintainer plus a written compensating-control note, in the same spirit as the runbook's existing stop conditions.
- **Lane-specific dependency:** the fastest supply-chain fixes are the ones R5 currently refuses (F-F-3/H-19), so the lane must ship *with* the refused-path disposition control, not after it.

**Dissent / uncertainty:**
- I grade the plan's **`L8`/Low as High**: "no advisory channel or fast lane" plus "3 of 4 open P0 rows are hand-port-only" is the whole security-exposure story, and severity Low understates a 35-day-open data-loss row with no SLA.
- I **agree with A/B/C/D on M4's evidence being misattributed** (the abort was an Open VSX 503, labelled infrastructure) but I treat the coupling itself as a **security** finding, not only a release-governance one: an unbumped merge publishes unreviewed upstream code through the only public channel, which is precisely how a security *regression* would ship.
- `%G?` → `E` means the upstream signature **could not be checked here** (no keyring), not that it is invalid; I verified presence, not validity. F-F-1 is therefore "the signal is available and unused", not "upstream is untrustworthy".
- My exposure numbers are **dwell time, not exploit severity**: with no advisory access I cannot say whether `21d35c4a9` or `c747c024b` map to a published CVE, and the register itself carries no advisory identifier for any row.
- The register's `Date` is the upstream commit date; because there is no resolution date (F-A-3), all ages are lower bounds and "time-to-patch" is really "time-to-first-attempt" for still-open rows.
- I did **not** verify whether `marketplace-prerelease` has required reviewers configured; if it does not, the lane has **no** hold path today and H-09 must not be run until one exists.
- I could not attribute the telemetry-token count to a single canonical command (34 under `-i telemetry` over `src/**`; others read 25/65/74 under different scopes). That instability is itself the finding — the invariant must name its pattern and scope.
- No file was created, written, or edited, and no `--refresh` was run, so every refresh-related claim (S1/H-01/H-06/H-08) remains fixture-unverified by me; I reproduced only its *components* (3-commit window, fail-closed `--verify`, absent ancestry assertion).

**Ordering advice:**
1. **F-F-1 (fetch/`-x` provenance verification) + H-01's ancestry assertion, before H-07.** Do not automate a fetch from a third-party mutable ref that will advance the register baseline while the pipeline ignores a signature GitHub already provides — that is the one failure mode that corrupts every later security judgement.
2. **H-02 + the `cells[6]` parser fix (F-B-1), with a security disposition field (`advisory`, `privacy`, `dropped-hunk`), then H-06.** Every security metric, ready set, and refused-path decision reads through this schema, and the live data is already self-inconsistent.
3. **F-F-3/H-19 (refused-path disposition) + F-E-1 (publish path predicate) before H-07 and H-09.** A security lane that publishes on every `master` merge, running out of a register that cannot show a refused supply-chain fix, is worse than no lane — and F-E-1 is also a precondition for the lane's hold path.
4. **F-F-4 (H-10 widened) + H-05, early and cheap.** The privacy invariant is currently unenforceable *and* its headline number is wrong; both are one command each to fix, and the wrong number is what the next agent will quote.
5. **F-F-2/H-18 (scoped rebrand + secret-constant guard) before the next batch.** Every batch executed before this lands re-runs a 987-file `sed` that can silently rewrite a security constant with no gate able to notice.
6. **H-09 (lane) only after the hold path and the fix-forward rollback story exist (F-E-3/F-E-4)** — and note that bypassing the *queue* is fine while bypassing the *bump* or the gates is not.
7. **F-F-6/H-12 metrics after H-02**, otherwise the security SLA cannot be measured and will be theatre; pair with H-16's forced decision so a growing security backlog forces a capacity decision instead of compounding.
8. **H-15 last or rejected** — a whole-history merge through a publish-on-every-push channel, with no rollback and no unpublish, is the maximum-blast-radius move available; it stays closed until F-E-1, F-E-4, F-F-1 and lens C's merge-resolution policy all exist.

<!-- /REGISTER-F -->

<!-- REGISTER-G -->
### G — 🧩 Problem-Solving Maestro (`problem-solving-maestro`)

*Registered 2026-09-24 · mode `problem-solving-maestro` · returned as a registry block; no files written by the lens.*

**Verdict:** No — not as scoped. The strategy's *mechanism* is sound, but the system is not converging and cannot: measured marginal drain since the baseline is **0 rows/7 days** while the same team shipped **6 merges and 3 version bumps in 8 days**, so the queue is nobody's work, not merely slow work. The plan changes *process quality*, not *rate*: no H-item changes arrival, and only H-13/H-14/H-15 (or a scope cut) change effective drain. The convergent configuration exists but it is narrower than the plan: track **P0/P1 + the divergence program only** (27 rows), with one owner, WIP=1, and per-batch publishes.

**Convergence calculation**
- **State the condition:** `dQ/dt ≤ 0 ⟺ D ≥ R`. Today `Q ≈ 102 + 8×3.78 ≈ 132` (est., UNVERIFIED — shallow clone), `R = 102/27 = 3.78 rows/day` (one observation, arithmetic from a stored count), `R_actionable = 69/27 = 2.56/day`.
- **Measured drain:** `D = 6 rows`, all merged in `6c4e9df5c` (2026-09-16, PR #345) — verified: all six `☑` fork SHAs are ancestors of that merge — and the register at the baseline showed them as `◐`; the **only** post-baseline register diff is 6 `◐→☑` flips (10 lines, PR #348, 2026-09-17). ⇒ **marginal `D = 0.0 rows/day` for 2026-09-17→09-24.** The plan's "0.86/day over the following week" is not a rate; the work predates the baseline and the *documentation* moved in one day.
- **Capacity exists but is allocated elsewhere:** 6 post-baseline first-parent merges (`7b4f92882`, `71d621532`, `0a759960e`, `d1ad83202`, `6c59f5c68`, `ceeb9181b`) = 0.75 merges/day; `d1ad83202` alone changed **48** source paths (two task-history fixes) while the three P0 SYNC-3 rows stayed `☐`.
- **Feasible rate:** per-batch fixed cost is near-constant (987-file rebrand + 10-command gate chain + bump + publish), so `D_max` ≈ 1–2 rows/day at 100% sync allocation; observed sync allocation ≈ 0%. With `R=3.78`, no arrangement of H-01…H-20 converges.
- **The only convergent shapes (numbers):** (i) **scope cut** — tracked backlog = 27 rows (4 P0 + 23 P1), `R_tracked = 31/27 ≈ 1.15/day` ⇒ needs ≈8 rows/week ⇒ **2 sync slots/week — feasible**; (ii) **cost cut** — H-13 + apply-verdict + scoped rebrand lower per-row cost ~3× (unit cost unmeasured: no resolution dates exist, so no dwell data); (iii) **merge mode** — converts N rows into one event (highest leverage, highest blast radius). Tracking all 102 rows with a 3.8/day arrival is **non-convergent by construction, at any capacity**. What would have to change: the *tracked unit*, the *metric*, *ownership/WIP*, and *per-row cost* — in that order.
- **Where the data do not allow:** arrival is a single observation (no second measurement possible here); upstream advance since 2026-09-16 is unmeasured (shallow); per-row cost has no dwell input; the plan's `+88/month` is a scenario, not a rate.

**Binding constraint**
**The queue has no owner and no WIP limit, so it is not work.** Evidence: 0 rows closed in 8 days versus 6 merges + 3 releases in the same window; the "Recommended execution order" (9 items) has not been touched; SYNC-7 (the only rate lever) is item **8 of 9**. The others are secondary: per-row cost binds only *after* rows move (cost explains slow, not zero); review capacity is demonstrably present (0.75 merges/day); release coupling is a tax, not a block (3.88.6/.7/.8 shipped); Δ/register errors and decision latency are the *mechanism* by which an unowned queue stalls, not the top constraint. **The one change with the highest leverage:** appoint one accountable queue owner and run **WIP=1 batch/week with pre-declared conflict defaults and a 24 h decision SLA** — with **H-13's SYNC-7 reserve** as its unavoidable companion (otherwise the fix is self-limiting, because per-row cost becomes binding the moment rows actually move).

**Claims verified by me**
| Claim | Command | Observed |
|---|---|---|
| Register integrity (E1/E8-basis, C/D histograms) | `grep -E "^\| \`[0-9a-f]{9}\` \|" … \| wc -l` / `cut -d"\|" -f5,6,7` / `grep -c "| ☐"` | `102` rows; `A18/B25/C19/D12/E27/X1`; `P0 5 / P1 26 / P2 14 / P3 24 / P4 33`; **`63 ☐ / 6 ☑ / 33 ✖ / 0 ◐`**; Δ histogram `25·0 / 33·1–2 / 20·3–5 / 24·>5`, **max Δ 53** |
| All six `☑` rows landed in one merge | `for s in f4287ff4f 1f38eb5b1 3c44a7d5a 2868dec51 388a75a6d 567b94bd9; do git merge-base --is-ancestor $s 6c4e9df5c; done` | all six → `ancestor-of-6c4e9df5c`; `git log -1 --date=short 6c4e9df5c` → `6c4e9df5c 2026-09-16 Merge pull request #345 from …/sync/sync-1-5-quick-wins` |
| Register's **only** post-baseline change is bookkeeping | `git diff --stat 6c4e9df5c master -- …/pending-upstream-commits.md` + row diff | `1 file changed, 10 insertions(+), 10 deletions(-)`; six line pairs, all `◐ <fork-sha>` → `☑ <fork-sha>` |
| Zero queue throughput after the baseline | `git log --first-parent --oneline --since=2026-09-16 master \| wc -l`; `git log --first-parent --since=2026-09-17 … \| wc -l` | `7` (incl. baseline merge), **`6` merges after the baseline in 8 days**; register still `6 ☑` |
| Fork ships, queue doesn't | `git diff --name-only d1ad83202^1 d1ad83202 \| grep -c "^src/\|^webview-ui/src/\|^packages/"`; `git log --oneline 6c4e9df5c..d1ad83202` | `48` source paths; `8a3b74c75 fix(task-history): byte-bound the taskHistory webview payload`, `9e6dd6939 fix(task-history): close task trees across the byte bound` — the SYNC-3 P0 theme, with `21d35c4a9`/`8d296deef`/`2ecbf35a8` still `☐` |
| Ready set = 3 low-value rows (S3/F-A-4) | `A-CLEAN` rows → Δ + status | clean+unblocked open = `97265fd8e` (P2), `ae6c1a876` (P3), `87d41aa4f` (P3); the other 8 Δ=0 `A-CLEAN` rows are in SYNC-13 (6) or carry Δ>0 (4: `4e8fa09f2`, `c4574ffef`, `147147cda`, `745656a50`) |
| SYNC-7 = 0/7 synced, ranked 8th of 9 | `sed -n "227,236p"`; `grep -nE "^[0-9]+\. \*\*SYNC"` | 7 rows, all `☐`; `412:8. **SYNC-7** — background enabler` |
| Verifier fails closed in the shipped shape | `node scripts/upstream-sync-triage.mjs --verify >/dev/null 2>&1; echo EXIT=$?` | `❌ [SYNC:TRIAGE] upstream/main has no merge base with origin/master (this checkout is shallow) … read 22 instead of 102` / `EXIT=1`; `git rev-parse --is-shallow-repository` → `true`; `git rev-list --count master..upstream/main` → `3` |
| P0 exposure (lens F, reproduced) | `grep -E "^\| \`[0-9a-f]{9}\` \|" \| grep "\| P0 "` | `c747c024b ☐`, `c6eb8fb57 ☑ f4287ff4f`, `21d35c4a9 ☐`, `8d296deef ☐`, `2ecbf35a8 ☐` → **4 of 5 open, 3 `C-REIMPLEMENT`** |
| Stale literals are widespread (L3/L2/F-A-8) | `grep -rn "22 instead of 102"`; `grep -rn "six independent"` | ≥6 sites (`README.md:319`, `runbook:15`, tool `:1207`, `:1533`, plus `spec.mjs:1082`, register `:29`); `six independent` at [`upstream-sync.md:162`](docs/runbooks/upstream-sync.md:162) **and** [`upstream-sync-triage.spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267) → H-05's `docs/`-only test misses the second |
| Handler modules = 16, not 17 (E2/F-A-5) | `git ls-files src/core/webview/handlers \| wc -l` | `16` |
| Orphan fragment (E14) | read of register lines 413–414 | `9. **SYNC-6** — … before doing any work.` / `   doing any work.` |

**Claims I could not reproduce**
- **Baseline figures** 180 fork-only / 977 / 689 / 272 / 4206-line upstream handler / 131 telemetry files / overlap buckets' provenance — needs `git fetch --unshallow` + network. `git rev-parse --is-shallow-repository` → `true`. **UNVERIFIED** (the Δ *buckets* 25·33·20·24 I did reproduce from the register).
- **Upstream advance since 2026-09-16** (≈30 commits at the observed arrival rate; D's "~26") — the clone exposes a 3-commit upstream window. Would take `git fetch --deepen` (forbidden here). **UNVERIFIED** ⇒ `Q≈132` is an estimate, not a measurement.
- **`--refresh` / `--refresh --write` end-to-end** (S1's erasure) — refused by mandate (writes into `.git`). Ingredients reproduced: 3-commit window, fails-closed `--verify`, no ancestry assertion. **Fixture-unverified.**
- **H-04/H-07 acceptance tests** and **registry state** (is `3.88.9` published? does `marketplace-prerelease` require reviewers?) — needs CI + Open VSX/Marketplace APIs. **UNVERIFIED**; my convergence argument therefore uses *merges*, not *publishes*, as the throughput proxy.
- **Whether the six `☑` rows closed as *value* or as *bookkeeping*** — the diff proves the documentation flip; it cannot prove when the gates/tests were run. The register's schema stores no resolution date (F-A-3, reproduced: no such column).
- I made **no file writes** and ran **no fetch**.

**Conflict adjudications**
| Contested item | Positions | My decision | Deciding rule |
|---|---|---|---|
| **H-15** (scheduled catch-up merge) | A/B REVISE · C/D/E/F REJECT | **REJECT** (conditional re-scope only) | *Irreversibility × unmet preconditions.* A scheduled event destroys the option to converge first; it publishes an unreviewable change set through the only public channel, with no rollback and with SYNC-7 at 0/7. |
| **H-04** (release clause in DoD) | B/D/E/F REVISE (misattributed evidence); A REVISE | **REVISE**: accept the DoD clause, strike the causal claim, **reject** the duplicated registry guard, invert the test | *Measure the mechanism, not the anecdote* + *no second source of truth for a fail-closed gate.* Coupling verified (`on: push: branches: [master]`, no `paths` filter); the cited abort was an Open VSX `503` labelled infrastructure and lives in [`README.md:331`](docs/upstream-sync/README.md:331), not [`pending-upstream-commits.md:331`](docs/upstream-sync/pending-upstream-commits.md:331) (which is a SYNC-12 row). |
| **M4's evidence** | A/B/C/D/F: misattributed | **AGREE (coupling) / REJECT (evidence & locus)** | *A claim must cite a locus that contains it.* M4's conclusion survives; its proof does not. |
| **H-05** (docs truth sweep) | A ACCEPT · B REVISE | **REVISE** | *An acceptance test must cover the surface being swept.* `six independent` lives in [`upstream-sync-triage.spec.mjs:267`](scripts/upstream-sync-triage.spec.mjs:267); the register's "~15 quick-wins" note must be in the same sweep. |
| **H-18** (rebrand safety) | A ACCEPT · B/D/F REVISE | **REVISE** — full B+F scope | *A test that is red before the change is not an acceptance test*; and in a 987-file sweep the assertion must include security-bearing constants (storage keys, auth path, UA, OAuth aud/iss). |
| **H-05/H-18 both contest A's ACCEPT** | A alone ACCEPTed | **Side with B/D/F** | Same rule: tests must discriminate. |
| **M3** (status overloading) | A/B/D DISAGREE-narrower · C/E/F AGREE-narrower | **DISAGREE (narrower)** — but **escalate the consequence** | *Severity follows consequence, not vocabulary.* The words are fine; the missing `Resolved:`/owner fields are the defect, and the consequence is 7 unowned `D-LOCAL` rows incl. an un-takeable supply-chain pinning commit (`057dfeebb`, 19 d) — High, not Low. |
| **H-08** (planner + ≤10 files/≤400 lines) | A–E REVISE · F ACCEPT | **REVISE**; drop the line cap; add a release-event budget | *An acceptance test must be measurable with the tool that ships* (`numstat` → none) and *fixed per-batch cost must be amortised*: capping batch size multiplies rebrand+gate+publish events ⇒ raises cost per row. |
| **H-02** (schema + invariants) | A ACCEPT · B/C/D/E/F REVISE | **REVISE** — one atomic change | *Schema and parser are one contract.* `status = cells[6]` ⇒ new columns silently make `synced:false` (false negatives, not reds); extend the invariant to the full Δ↔class ladder. |
| **H-01 / H-03 / H-06 / H-11 / H-12 / H-16 / H-07** | mostly REVISE; F ACCEPTs most | **REVISE** each, per the table below | *Don't ship a gate that is red (or green) by construction*; *don't recompute a metric you have already shown is the wrong unit*; *trigger on observable state, not on an estimated rate*. |
| **H-13 / H-14 / H-17 / H-19 / H-20 / H-10** | five-to-six lenses ACCEPT | **ACCEPT** (with named extensions) | *Prefer the items that change cost, stock, or trust over the items that change bookkeeping.* |

**Dependency map** (load-bearing order — not a priority list)
| Item | Must land before | Why (mechanism) |
|---|---|---|
| **F-B-1** (name/position-based column mapping) | **H-02** | `status` is read at a hard-coded index; inserting `Blocked-by`/`Resolved` makes `synced` read `false` → the verifier goes *quiet* rather than red on the security rows. |
| **H-02** (schema: `Blocked-by`, `Resolved:`, `Version`, disposition) | F-A-3 → **H-12**, **H-16**, F-F-6, F-E-2; F-C-2; F-C-5; F-C-6; F-A-4 | Every metric, ready set, invariant and SLA reads this schema; the data already contradicts it (5 rows). |
| **F-C-9** (blame-ignore-revs + one rebrand commit) | F-C-1 records, H-18 scope assertions | One line of config; every batch landed without it degrades the fork-intent signal R4 depends on. |
| **F-A-7** (split `header-counts`) | **H-03** | `header-counts` is merge-base-derived; a repo-only profile containing it is red by construction at depth 1. |
| **H-01 code change + F-A-1 fixture**; **F-F-1** provenance post-condition; **F-E-1** paths predicate | **H-07**, **H-09**, any automated deepen | Automation + publish-on-every-push + no ancestry assertion = the one failure that erases the evidence that a security commit was ever in the window. |
| **H-06 as F-C-4 (apply-verdict) not Δ-only** | **H-08** planner | Disjoint file sets ≠ disjoint hunks; and Δ predicts coincidence, not conflict, in a decomposed-handler fork. |
| **H-04 (bump per batch) + F-E-2** | H-08, **H-09**, H-15 | Smaller batches ⇒ more merges ⇒ more publish attempts; a lane's SLA is unmet until *published*; a revert needs exactly one version target. |
| **F-E-3** (abort classes) + **F-E-4** (fix-forward rollback runbook) | **H-09**, H-15 | A fast lane that cannot be stopped between "merged" and "published" is not safe to run fast. |
| **C's resolution record** (`resolutions/SYNC-n.md`, machine-checked) | **H-17**, F-C-8 merge policy | H-17's equivalence evidence has no other host; without it H-17 is prose and violates H-20. |
| **H-20/F-D-1** (machine-checked evidence) | §7 reconciliation of this plan, and the next agent reading [`upstream-sync.md`](docs/runbooks/upstream-sync.md:1) | The plan's ledger is already wrong in three places (E2 16≠17; E12 unreproducible; L3 "three" ≥5) — reconciliation would propagate errors into the artefacts agents obey. |
| **H-13 + F-C-10** (SYNC-7 funded + suppression-ratchet policy) | per-row cost of all 19 `C-REIMPLEMENT` rows | The only lever that lowers unit cost permanently; it is itself 6 hand-ports at Δ 3–36. |
| **F-C-3** (marker + `check-types` gate) | every resolution | Cheapest protection against the worst resolution defect; depends on nothing. |
| **H-14 `/disposition` field** | F-C-6 dedupe, F-F-3 refused-path control | "No silent drop" is the only control that separates *refused after review* from *never seen*. |

**Second-order risks of the plan**
- **H-07 manufactures a weekly publish event.** With no `paths` filter, a merged register PR publishes whatever version is committed: either a red fail-closed run or version inflation. Compounded with an automated fetch from a mutable third-party ref and no ancestry assertion, the job can advance the baseline tip past unmeasured commits — the single failure mode that destroys evidence. *Mechanism: automation × publish-on-push × no post-condition.*
- **H-08 is a cost multiplier as specified.** Batch size is the wrong variable while per-batch fixed cost dominates (987-file rebrand, 10-command chain, bump, publish): halving batch size roughly doubles cost per row and doubles publish events. Capping at "≤400 changed lines" is unmeasurable today (`numstat` → none), so it will silently enforce a wrong proxy. *Mechanism: amortisation of fixed cost.*
- **H-02 becomes a schema monolith.** Three lenses want different columns (`Blocked-by`, `Resolved:`, `Version`, `advisory`/`privacy`/`dropped-hunk`, `Supersedes`); each new column adds an invariant and a parser coupling. Split: keep the register narrow + append-only; put judgement in the sidecar record. *Mechanism: every field is a new contract with no owner.*
- **H-12 will be hand-maintained fiction.** No resolution dates exist, so "metric moves when work lands" is unimplementable without a manual number — precisely the drift H-20 forbids; and changing the headline breaks check 7, which *certifies* the pending count. *Mechanism: metric without input data → prose → drift.*
- **H-03 shipped early trains alarm-blindness.** A repo-only CI job that is red by construction in the shipped shallow shape is indistinguishable from a genuinely corrupted row once it *is* fixed. *Mechanism: false-positive baseline → habituation → missed true positive.*
- **H-09 cannot be run quietly.** The repo is public: the register row *is* the disclosure, so embargo discipline requires a hold path that does not exist yet (F-E-1 + verified environment reviewers + `fix/security-*` in the sanctioned prefixes). *Mechanism: public history as the disclosure channel.*
- **H-13 can consume a whole cycle for zero user value** and its "canonical identifier" lint rules may conflict with the fork's own branding normalisation and code-index gate — the enabler could fight the invariants it is meant to simplify. *Mechanism: enabler stalls against the gate it is supposed to relax.*
- **New single points of failure:** one 1,585-line unlinted verifier that cannot run where it ships; one markdown table parsed by cell index; one publish channel; one maintainer. The hardening plan adds a planner, a scheduled job, a record system and seven gates on top of that. *Mechanism: the plan's own surface exceeds the capacity it is trying to unblock.*
- **Toil compounding:** the resolution record (one entry per conflicted file), the per-batch bump, the register PR, and the readiness preflight are four new ritual steps per batch; without WIP=1 and an owner, ritual replaces drain.

**Divergence: asset or tax**
**Verdict: net tax today, conditionally convertible to asset.** The divergence is 19 of 63 open rows (30%) and **3 of 4 open P0 rows** — i.e. it holds ~100% of the highest-value, slowest work; the per-row tax is visible as the 987-file rebrand sweep and the 1,707-line suppression ratchet (unbounded diff per batch, counts must never rise). The counter-evidence that it is not *pure* tax: [`97265fd8e`](docs/upstream-sync/pending-upstream-commits.md:235) is a typed-protocol test *aligned* with the fork's registry — one of only three ready rows — so the typed layer *reduces* cost on protocol-adjacent rows while the decomposed handlers *multiply* it. **Threshold decision rule (state, then act):** at every bi-weekly cycle, if `ready_set < 5 rows` **and** `C-REIMPLEMENT open > 15` (both true today: 3 and 19) **and** `marginal drain < 7 rows/cycle` (0 of 7 today), then batching cannot converge and the fork must choose — (a) fund divergence reduction (SYNC-7) to completion against a deadline, else (b) declare a merge mode with a written resolution policy (fork structure wins structurally; upstream fixes re-expressed; no silent drop; one record per conflicted file; repair budget; abort if repairs > N). If instead divergence stock *declines* for two consecutive cycles (`C` open < 10 and rebrand scoped to batch files), keep batching and raise the batch cap. The rule fires on the second consecutive cycle; today shows one cycle, so the correct action at day 30 is not the merge — it is the funding decision, with the merge held as the fallback.

**Minimum viable governance**
- **WIP:** 1 batch in flight; bookkeeping merges count as WIP (they publish); ≤1 publish/week + the P0 lane exception; a register refresh is a *separate* slot, not a batch.
- **Ownership:** one named **register owner** (the only role that may flip `☑`, run refresh, or emit the ready set) with a weekly 45-minute triage; one **security owner** for the P0 lane; `D-LOCAL` rows are either assigned to the register owner's local-work list or bulk-waived with a dated decision — **no third state**, because an unowned `☐` is where security fixes go to die (`057dfeebb`, `313ca59cb`).
- **Decision latency:** replace open-ended "stop and ask" with a **defaults table** (fork wins: telemetry, cloud, branding, version/CHANGELOG, protocol shape, handler structure; upstream wins on fix semantics but must be re-expressed; tie → the side with tests) plus a **24 h SLA**: the agent posts the blocking question, and after 24 h proceeds on the default with a register note. Hard stops remain only for (i) non-local gate failure and (ii) a new persisted setting.
- **Roles for a solo maintainer:** human = owner + security approver + merger + bump approver (≈1 sync slot + 1 release slot per week; the *throttle*, not the labour); agent = execute one batch end-to-end. Two batches/week is the design point that makes the P0/P1 scope converge.
- **Measured (and nothing else):** rows closed/cycle · oldest-open-P0 age · ready-set size · publishes/cycle · repair commits per cycle (the regression counter — currently 3 repair commits from the merge era, the reason for the rule).

**30/60/90 plan**
*Sequencing rule: dependency, not preference — you cannot measure before the instrument is honest, cannot automate before the guard exists, and cannot decide convergence before the drain is measured on a schema that stores resolution dates.*
- **0–30 days — make the instrument honest and stop the bleeding.** *(H-20 + F-D-1 first, because this plan's own ledger is wrong.)* Land: **H-20/F-D-1** (command-per-claim, executable harness) · **H-05 + F-D-5 + F-E-7** (docs truth sweep incl. `scripts/`, release literals, anchors) · **F-C-9** (blame-ignore-revs + one rebrand commit) · **F-C-3** (marker + `check-types` gate) · **F-E-1** (paths predicate) · **H-04 DoD clause + F-E-2/F-E-6** (bump per batch) · **H-01 code + F-A-1 fixture** · **F-B-1 + H-02** (one atomic schema/parser change with `Resolved:`/`Version`/`Blocked-by`). **Checkpoint (must be true):** a depth-1 clone's `--verify --repo-only` is **green** and names a seeded corrupt row; `--refresh --write` refuses in a fixture with a resolvable merge base; two consecutive batch merges publish exactly two versions; `grep` for the four fictions → `0`; every `✅ VERIFIED` ledger row carries a command that reproduces.
- **31–60 days — make work ready, then drain, and start measuring rate.** Land **H-06 as F-C-4 apply-verdict + F-C-6 dedupe**, drain the 3 ready rows, then the SYNC-13 chain in prerequisite order (`500152b78` first), **H-13 fund SYNC-7 with a timeboxed spike** + F-C-10 ratchet policy + abort rule, **H-14 dispositions**, **H-12 metrics** (resolved/total, ready set, arrival/drain, oldest-P0 age), **H-16 event-based forced decision** (ready set < 5 **or** oldest P0 > 30 d **or** two cycles with 0 rows closed). **Checkpoint:** ≥7 rows closed in the cycle (0.5/day) and ready set ≥5; if drain is still 0, the H-16 rule fires and the divergence decision is scheduled — not debated.
- **61–90 days — decide the structural question with data.** Land **H-17 hosted in the resolution record** (+ `verify-resolutions`), **F-C-8 merge resolution policy written into R4** (the precondition for any merge), **F-E-3/F-E-4** (abort classes + fix-forward rollback runbook), **F-F-1/F-F-3** (provenance post-conditions; refused-path dispositions), **H-19 + drop log**, **H-11** only after its key is defined, **H-10 widened** (egress inventory + PRIVACY linkage), and `--preflight` (F-C-5). **H-07 automation only if** H-01/F-E-1/F-F-1 are green. **H-15 stays closed** unless the threshold rule fires. **Checkpoint:** a written convergence verdict with 60 days of drain data against arrival; if `drain < 0.5 × arrival` **and** SYNC-7 has not reduced per-row cost, execute the threshold rule (fund divergence to completion, else declare merge with the written policy) — and record the decision as a tombstoned ADR amendment, since the current one still asserts a "measured backlog" and "~15 immediate quick-wins".

**Decisions on H-01…H-20**
| ID | Decision | Reason (≤20 words) |
|---|---|---|
| H-01 | REVISE | Assertion genuinely absent; acceptance test green pre-change — add fixture; keep signature check out of the refresh path. |
| H-02 | REVISE | One atomic schema+parser change; extend to full Δ↔class ladder; append columns after Status. |
| H-03 | REVISE | Split `header-counts` first; otherwise the new CI job is red by construction where it ships. |
| H-04 | REVISE | DoD clause yes; strike misattributed evidence and mis-cited locus; reject duplicated guard; invert the test. |
| H-05 | REVISE | Sweep `scripts/` and release literals; test must enumerate sites, not estimate counts. |
| H-06 | REVISE | Implement apply-verdict + dedupe signals, not Δ recomputation; needs the probe seam first. |
| H-07 | REVISE | Defer behind H-01, F-E-1, F-F-1, H-02; `pnpm upstream:preflight` does not exist yet. |
| H-08 | REVISE | Drop the ≤400-line cap; disjoint files ≠ disjoint hunks; add a release-event budget and amortisation note. |
| H-09 | REVISE | Accept the lane; require advisory feed, own branch prefix, mandatory bump, hold path, rollback, class SLA. |
| H-10 | ACCEPT | Real absent gate; widen to egress inventory + PRIVACY.md linkage; ship with its own fail-closed test. |
| H-11 | REVISE | Define the ledger key per allow-list mode before requiring ledger rows. |
| H-12 | REVISE | Needs `Resolved:`/`Version:` inputs and a separate pending-count series; else it is hand-maintained fiction. |
| H-13 | ACCEPT | Only lever that lowers per-row cost; fund first, with spike, ratchet policy and abort rule. |
| H-14 | ACCEPT | Per-row disposition stops divergence growth and enforces "no silent drop". |
| H-15 | REJECT | Irreversible, preconditions unmet (SYNC-7 0/7), no rollback, no resolution policy; re-scope conditional only. |
| H-16 | REVISE | Trigger on observable state (ready set, oldest-P0 age, zero-row cycles), not on an unmeasured rate. |
| H-17 | ACCEPT | Only host for fix-equivalence evidence; extend to pre-image check and fork locus mapping; gate it. |
| H-18 | REVISE | Fix Phase-1 sed idempotence first; add security-constant guard and blame-ignore-revs; assert in a worktree. |
| H-19 | ACCEPT | Concern-based R5 is right; add drop log and diff-driven refused-path disposition. |
| H-20 | ACCEPT | Highest priority: make "verified" machine-checked; it applies to this plan's own ledger first. |

**Decisions on findings S1–S3, M1–M6**
| ID | Decision | Reason |
|---|---|---|
| S1 | AGREE (latent) | No ancestry assertion, count written from a possibly-saturated window — proven by code, not by E9's graft artefact; add the force-push over-report mirror case. |
| S2 | AGREE (undercounted and narrow) | Five stored violations not four; plus five ladder violations and the unenforced `Blocked-by` relation; parser coupling makes the fix atomic. |
| S3 | AGREE — **and it is the top finding, not a queue-order nit** | The measured drain is 0 while the team shipped 6 merges; "no capacity model, no owner, no forced decision" *is* the constraint. |
| M1 | AGREE | Δ is a 2026-09-16 snapshot; `-x` imports inflate it from the sync itself, not only from local work. |
| M2 | AGREE | A certified metric that cherry-picks cannot move; replace the metric at goal level, keeping it as raw backlog. |
| M3 | DISAGREE (narrower) on vocabulary; AGREE on consequence | The words are adequate; the missing fields create an unowned queue — escalate the 7 `D-LOCAL` rows to High. |
| M4 | AGREE (coupling) / DISAGREE (evidence, locus) | Publish-on-every-push is real and already documented in `README.md` §9; the cited abort was an Open VSX 503. |
| M5 | AGREE | The register that gates everything is unverified where it ships; the only machine path is vacuous. |
| M6 | AGREE (correctness core) | No gate inspects port fidelity — a half-ported fix passes all seven checks; it is exactly how a security regression ships. |

**New findings**
| ID | Sev | Finding | Evidence (command + observed) | Proposed fix | Acceptance test |
|---|---|---|---|---|---|
| **F-G-1** | **High** | **The queue is not the work.** The fork shipped 6 merges and 3 version bumps in 8 days while closing **0** register rows — and one of those merges fixed the *same theme* as the three open P0 rows. The register therefore cannot see the fork's real work, cannot prevent re-porting, and its "pending" count is neither a goal nor a plan. | `git log --first-parent --oneline --since=2026-09-16 master` → 7 merges (incl. baseline); `git diff 6c4e9df5c master -- …/pending-upstream-commits.md` → only six `◐→☑` flips (10 lines); `git log --oneline 6c4e9df5c..d1ad83202` → `8a3b74c75`, `9e6dd6939` (task-history); SYNC-3 P0 rows still `☐`. | Make the register the queue: one owner, WIP=1, and a per-row `Local-fix:<sha>` / `Supersedes:` field so fork-side work that answers a registered theme is recorded as resolution instead of being invisible. | After one cycle, every merge touching a registered theme either closes a row or records `Local-fix:`; the header reports **rows closed/cycle**, and 0 must be explainable by an explicit deferral note. |
| **F-G-2** | **High** | **The plan is silent on non-convergence.** It computes `+3 rows/day (~+88/month)` and then prescribes 20 process items, none of which changes arrival or the tracked unit; the convergence condition `D ≥ R` is never stated. | My arithmetic above; plan [`§2`](docs/upstream-sync/consolidated-hardening-plan.md:46) (rate arithmetic, no convergence clause); `D_obs = 0` verified. | State the condition in the plan and adopt the scope cut: track **P0/P1 (27 rows) + the enabler program**; keep `E-SKIP`/`D-LOCAL`/P3/P4 in an appendix that is never counted as "pending"; report divergence stock as the second goal metric. | The register header shows two series — `P0/P1 absorbed` and `divergence stock (C-rows, rebrand scope)` — plus raw backlog; at `R_tracked ≈ 1.15/day` and two sync slots/week the tracked backlog declines for two consecutive cycles. |
| **F-G-3** | **High** | **Automation items multiply release events.** Every `master` merge publishes (no `paths` filter); H-07 adds a weekly merge and H-08 adds merges by capping batch size — so acceleration items *increase* publish runs, version burns and gate-chain cost. | `sed -n "20,24p" .github/workflows/pre-release-publish.yml` → `on: push: branches: [master]`; 3 bumps (3.88.6/.7/.8) in 8 days; 6 post-baseline merges. | Express the batch budget in **release events** (≤1 publish/cycle + P0 lane), land F-E-1 first, and treat "merges/cycle" as a first-class metric alongside rows/cycle. | A cycle's plan contains ≤1 publish event outside the lane; the count is reported in the register changelog and any excess requires a written waiver. |
| **F-G-4** | **Medium** | **The instrument's three changes must be atomic or the verifier goes quiet.** H-02's columns (B's F-B-1), H-12's resolution dates (A's F-A-3) and C's sidecar record are one contract: split across PRs, `synced` silently reads `false`, and the security rows stop being checked — a false negative is worse than a red. | `status = cells[6]` ([`upstream-sync-triage.mjs:327`](scripts/upstream-sync-triage.mjs:327)); no `Resolved:`/`Blocked-by` anywhere in the artefacts; verify cannot run in the shipped shape (`EXIT=1`). | One change: header-name-based column mapping + `Resolved:`/`Version`/`Blocked-by` columns + `resolutions/SYNC-n.md` sidecar + repo-only checks; ship a parser regression test in the same commit. | A `splitRowCells` regression asserts the new header order parses `status:"☑ <sha>"`, `synced:true`, `blockedBy:"<sha>"`; a seeded violation fails by row name in a depth-1 clone. |
| **F-G-5** | **Medium** | **Red-by-construction CI destroys the signal it adds.** H-03 before F-A-7 ships a permanently red sync job in the clone shape CI uses; combined with M5, the register's real corruption becomes indistinguishable from the known false alarm. | `--verify` at depth 1 → `EXIT=1`; `header-counts` derives from `merge-base..upstream/main`; no `verify:upstream-sync` in `.github/workflows/`. | Ship `--repo-only` green at depth 1 **first**, require it in PR CI, and make the merge-base-dependent checks a nightly advisory job. | In a `--depth=1` clone `--verify --repo-only` exits 0; a seeded 10-char row SHA makes exactly the named check fail and the run goes red for that reason. |
| **F-G-6** | **Medium** | **The plan is the new trust anchor and it is not clean.** It self-violates H-20 in three rows (E2 16≠17, E12 unreproducible 68/30, L3 "three" ≥6 sites) while the architect's §7 pass is about to propagate its claims into the ADR/runbook agents obey. | E2 → `16`; `grep -rn "22 instead of 102"` → ≥6 sites; §7 [`R-1…R-5`](docs/upstream-sync/consolidated-hardening-plan.md:937) apply/replace/re-issue. | Land F-D-1 before §7 starts; give §2 a `command` column; make the ✓ rows a re-runnable harness. | Re-running every `✅` row's command reproduces its figure in one clone; a deliberately altered figure fails the harness; §7 blocks until it passes. |
| **F-G-7** | **Medium** | **No kill criteria or scope ceiling for the register.** Nothing says when `✖` rows leave the table or when tracking narrows, so the artefact grows monotonically (`102 → ≈132` today) and its headline can never fall — the metric is structurally unfalsifiable. | `M2` verified (header 102 with 6 `☑`); 40 of 102 rows (33 `✖` + 7 `D-LOCAL`) can never drain through batching; no exit clause in the ADR/manual/runbook. | Add a tracking-scope clause: what is *tracked and counted* (P0/P1 + enabler program), what is *recorded but not counted* (P3/P4/`D-LOCAL`/`E-SKIP`), and a quarterly review that moves permanently-closed rows to an appendix. | After the change, the headline metric can decrease and did: `P0/P1 open` is a smaller number than `102`, and a quarterly review produces a dated decision (keep / narrow / adopt tooling) or the row moves to the appendix. |
| **F-G-8** | **Medium** | **The only rate lever is itself the hardest work and may fight the fork's invariants.** SYNC-7 = 6 `C-REIMPLEMENT` rows at Δ 3–36 touching provider-identifier lint rules and the code-index registry; if the "canonical identifier" rules collide with branding normalisation or the CORE_FILES byte-alignment gate, the enabler stalls and the plan's sole cost lever fails silently. | SYNC-7 row set (7 rows, all `☐`, Δ 3–36, ranked 8th of 9); the code-index gate's `branding` allow-list mode; 3 repair commits from the previous merge era. | Pre-flight SYNC-7 with the apply-verdict (F-C-4) and a **timeboxed spike** (≤3 days) that answers one question: do the identifier rules survive the rebrand and the alignment gate? Abort rule stated before funding. | The spike outputs a written verdict + a 1-row proof (one file re-aligned, gates green, suppressions not increased); if it fails, the register records `divergent-forever` for the identifier family and the plan's rate assumption is revised rather than assumed. |

**Dissent / uncertainty**
- **My throughput claim rests on 8 days and one release crisis.** The 3.88.5→3.88.8 sequence, the 1,650-line gray-webview incident, the observability watchdog and a privacy-leak redaction are all in that window — so "0 drain" may be *deferred* rather than *abandoned*. That is why the threshold rule requires **two** consecutive cycles and why my first move is the funding decision, not the merge: a single cycle is enough to change the constraint's *name*, not enough to justify an irreversible paradigm change.
- **Arrival is an estimate:** one observation, and the 102 is a stored count, not a measured flow. If arrival is materially below 3.78 (e.g. the register's population is biased toward multi-file refactors), the convergence gap narrows by up to ~30% (lens A's actionable-only reading) — it does not close.
- **`Q ≈ 132` today is derived, not measured.** I could not fetch; the whole "the backlog grew ~30% while you planned" statement is an extrapolation from the plan's own arithmetic.
- **Divergence-as-tax is judged from declared classes and Δ, not from reading the upstream diffs** (impossible in a 3-commit window). A future reader should re-check whether a meaningful share of the 19 `C-REIMPLEMENT` rows are *telemetry/CI-adjacent* (cheap `✖` decisions) rather than handler-adjacent (expensive ports) — if so, the tax is ~40% smaller and the threshold needs re-calibration.
- **I disagree with the plan's own severity ranking in two places:** `S3` is not the same order as `H-08/H-09/H-13/H-16` — it is the constraint, and `M4`'s *misattribution* is a documentation defect while its *coupling* is a release-safety defect; conflating them let lens E's strongest point (3 of the last 6 merges are `docs/*` publishes) sit below a docs sweep.
- **H-15's rejection is conditional on facts I could not verify:** whether `marketplace-prerelease` has required reviewers configured determines whether *any* hold path exists. If reviewers are absent, H-09 is blocked *and* several "merge is impossible" arguments get stronger.
- **My leverage judgement is a judgement.** TOC says find the constraint; I found an *allocation* constraint, but a defensible alternative reading is *work-item readiness* (ready set = 3 low-value rows; P0/P1 rows are all `C-REIMPLEMENT`/blocked). Both are fixed by the same first move (owner + WIP=1 + F-C-4/F-C-5 readiness), which is why I collapse them.
- No files were created, written or edited; no `--refresh`, `--refresh --write`, pick, merge or fetch was executed; the register and plan are quoted as data, not as truth.

<!-- /REGISTER-G -->

---

## 7. Reconciliation (owner pass, after §6 is complete)

| Step | Action | Owner | Status |
| --- | --- | --- | --- |
| R-1 | Apply every `ACCEPT` verbatim to the plan item | Architect | ⏳ |
| R-2 | For each `REVISE`, replace the item text and record the supersession | Architect | ⏳ |
| R-3 | For each `REJECT`, record the counter-argument and the deciding rule | Architect | ⏳ |
| R-4 | Promote lens findings that duplicate my own IDs; assign new IDs otherwise | Architect | ⏳ |
| R-5 | Re-order §4 by dependency (not severity) and re-issue the evidence ledger with corrected claims | Architect | ✅ §10.1, §10.2, §10.4 |
| R-6 | **Tombstone rule:** every superseded claim in the source artefacts (ADR/register/manual/runbook) is rewritten **and** leaves a dated tombstone ("superseded by plan §X") so a reader cannot cite the old figure | Architect + maintainer | ⏳ §11 |
| R-7 | **Machine-check the reconciliation:** before §11 edits the artefacts agents obey, the §2 ✅ rows must pass their own commands (lens D/F-D-1, G/F-G-6) | Architect | ✅ §2 corrected; harness is **H-27** |

---

## 8. Provenance

- All commands were executed in `/root/roo-plus` on 2026-09-23 with `bash`; the clone is **shallow**, so E11-class figures are unverified by design.
- Register re-counted with a row-scoped regex (`^\| \`[0-9a-f]{9}\` \|`) to avoid the ~29 false duplicates documented in [manual §8](README.md:310).
- The withdrawn hypothesis (E13) is retained deliberately: it demonstrates that at least one "high-value" finding was tested and killed on evidence.

## 9. Change log

| Date | Change |
| --- | --- |
| 2026-09-23 | Plan created from the independent review; §6 placeholders opened for 7-lens review |
| 2026-09-23/24 | 7 lens reviews registered in §6 (A–G). Corrections applied in place: **E2** (17 → 16 modules), **E9** (relabelled as clone-shape evidence), **E11** (split per figure; 131 → 243 at tip; 4206 proven at tip), **E12** (68/30 withdrawn), **L3** (three → ≥6 sites), **M4** (causal claim struck). New items **H-21…H-29** added from the lenses. §7 owner pass executed: §10 (outcome), §11 (source-artefact changes), §12 (dependency order, convergence clause, 30/60/90) |

---

## 10. Reconciliation outcome (owner pass, executed 2026-09-24)

### 10.1 Corrections applied to this plan's own evidence list

| Row | Was | Now | Falsified by |
| --- | --- | --- | --- |
| **E2** | "17 modules … ✅ VERIFIED" | **16 modules**, with the reproducing command | A (F-A-5), D (D-12), F, G |
| **E9** | presented as function evidence | relabelled **clone-shape evidence**; S1 re-based on the code reading (`:1336` → `:1410`, no `--is-ancestor`) | A, B, C, D (F-D-3), F, G |
| **E11** | one blanket "UNVERIFIABLE HERE" | split into E11a–E11d: buckets **verified**, 4206 **verified at tip**, fork-side 180/977/689/272 **unverifiable**, 131 **contradicted at tip (243)** | D (D-9/D-10, F-D-4) |
| **E10.2** | "22 appears in three places" | **≥6 sites** + a stale "six" in the spec suite | A (D-35), D (F-D-6), G |
| **E12** | "68 files, incl. 30 tracked .ts" | **withdrawn**; invariant restated as "0 `captureEvent(` call sites / 34 tracked files keep the token" | A (F-A-6), B, D (D-13/14), F (F-F-4) |
| **M4** | "already failed once from this exact coupling" | coupling **kept**; causality **struck**; locus corrected to [`README.md` §9](../upstream-sync/README.md:331), with the Open VSX 503 labelled infrastructure | A, B, C, D (D-34), E (F-E-7), F, G |
| **Rate arithmetic** | "0.86 rows/day" | **0 rows/day** marginal; the six `☑` rows are one same-day merge | A (F-A-2), D (D-27), G |
| **L3/L6/M3/M4/L8 severities** | Low | **M3 → Medium** (unowned `D-LOCAL` rows include an untakeable supply-chain fix), **L6 → Medium** (egress + false absolute), **M4 → Major kept**, **L8 → High for security** (lens F) | F (F-F-3/F-F-4), G |

### 10.2 Final disposition of H-01…H-20 (adjudicated, not averaged)

| ID | Final | Lens votes (A/B/C/D/E/F/G) | Required amendment |
| --- | --- | --- | --- |
| **H-01** | **REVISE** | R/R/R/R/R/A/R | Keep the post-conditions; **replace the acceptance test** (it passes on unmodified code) with a grafted fixture, unit-tested through the existing probe seam; do not fold signature checks into the refresh path (F-F-1 owns that) |
| **H-02** | **REVISE** | A/R/R/R/R/R/R | **One atomic change** with the parser (F-B-1: `status` is read at `cells[6]`); add `Resolved:`/`Version`/`Blocked-by`; enforce the **full Δ↔class ladder** (F-C-2: five live violations); add a security disposition field; append columns after `Status` |
| **H-03** | **REVISE** | R/R/A/R/R/A/R | Split `header-counts` (F-A-7) first; the repo-only profile runs the 5 merge-base-free checks and must be green at `--depth=1` (F-G-5) |
| **H-04** | **REVISE** | R/R/A/R/R/A/R | Keep the DoD clause (**bump per batch**); strike the causal claim; **do not duplicate** the registry guard (one source of truth); invert the acceptance test to the negative (unbumped ⇒ red) |
| **H-05** | **REVISE** | A/R/A/R/A/A/R | Sweep `docs/` **and** `scripts/` **and** the release literals; enumerate sites, never estimate counts; include the register's "~15 quick-wins" reading note |
| **H-06** | **REVISE** | A/R/R/R/A/A/R | Deliver as the **hunk-level apply verdict** (F-C-4) + patch-id/symbol dedupe (F-C-6), not Δ recomputation alone; needs the git-seam refactor for testability |
| **H-07** | **REVISE** | R/R/R/R/R/R/R | Blocked behind H-01, **F-E-1** (publish path predicate), **F-F-1** (provenance), H-02; `pnpm upstream:preflight` must exist first and must not be able to advance the tip past unmeasured commits |
| **H-08** | **REVISE** | R/R/R/R/R/A/R | **Drop the ≤400-line cap** (unmeasurable); require hunk-level disjointness, prerequisite topological order, and a **release-event budget** (F-G-3: smaller batches ⇒ more publishes) |
| **H-09** | **REVISE** | A/A/A/A/R/R/R | Adopt the full lane spec in §6-F: advisory-feed intake (not subject regex), class-conditional SLA, **hold path** (F-E-1 + verified environment reviewers), fix-forward rollback (F-E-4), own `fix/security-*` branch, mandatory bump, named human authoriser, and the refused-path control (F-F-3) shipped alongside |
| **H-10** | **ACCEPT** (extended) | A/A/A/A/A/R/A | Add the egress inventory (Codecov and any new third-party upload), the `PRIVACY.md` ↔ egress-code linkage check, and scope the claim to transport symbols |
| **H-11** | **REVISE** | R/R/R/R/R/A/R | Define the ledger key per allow-list mode (branding entries have no single forcing SHA) |
| **H-12** | **REVISE** | R/R/R/R/R/A/R | Needs `Resolved:`/`Version` inputs; keep the certified pending count as a **separate series**; add rows-closed/cycle, ready-set size, oldest-unresolved-P0 age, publishes/cycle, repair commits/cycle |
| **H-13** | **ACCEPT** | A/A/A/A/A/A/A | Fund with a **timeboxed spike** (≤3 days) + an abort rule (F-G-8: the identifier rules may fight branding/alignment gates) + the suppression-ratchet policy (F-C-10) |
| **H-14** | **ACCEPT** | A/A/A/A/A/A/A | Per-row disposition (`ported` / `divergent-forever` / `duplicate-of`), machine-checkable |
| **H-15** | **REJECT** | R/R/X/X/X/X/X | Re-scope to **conditional only**: preconditions unmet (SYNC-7 0/7), no rollback (F-E-4), no resolution policy (F-C-8), irreversible through the only public channel. It stays closed until the divergence threshold fires |
| **H-16** | **REVISE** | R/R/R/R/R/A/R | Trigger on **observable state**, not an unmeasured rate: ready set < 5, oldest-P0 age > 30 d, two consecutive zero-row cycles, or publish budget exceeded |
| **H-17** | **ACCEPT** | A/A/A/A/A/A/A | Host it in the **resolution record** (H-23) and machine-check it; extend to the pre-image check and the fork-locus mapping |
| **H-18** | **REVISE** | A/R/A/A/A/R/R | Fix the Phase-1 `sed` idempotence **first** (it duplicates keywords today — F-B-3); add the **security-constant guard** (F-F-2: auth path, session/PII storage keys, UA, `secrets.`); assert in a temp worktree, plus `.git-blame-ignore-revs` (H-29) |
| **H-19** | **ACCEPT** (extended) | A/A/A/A/A/A/A | Add drop-logging and the **diff-driven refused-path disposition** (F-F-3): a batch cannot close while a refused-path commit in its window has no disposition; rewrite the DoD checkbox that voids the allowance |
| **H-20** | **ACCEPT — highest priority** | A/A/A/A/A/A/A | Apply it **to this plan first** (F-D-1/F-G-6) and make it machine-checked (H-27) |

### 10.3 New items from the lens reviews (H-21…H-29)

| ID | P | Change | From | Acceptance test |
| --- | --- | --- | --- | --- |
| **H-21** | P0 | **Convergence & tracking-scope clause.** State `D ≥ R` in the ADR; count **P0/P1 + divergence program** as the tracked backlog; record P3/P4/`D-LOCAL`/`E-SKIP` but never count them as "pending"; report two series (tracked absorbed / divergence stock) | G (F-G-2, F-G-7) | The headline can **decrease**; at `R_tracked ≈ 1.15/day` and 2 sync slots/week the tracked backlog declines two cycles running |
| **H-22** | P0 | **Provenance verification.** `git verify-commit` against an allow-listed signer for every SHA a batch picks, plus `git cat-file -e` + `--is-ancestor upstream/main` for every `-x` SHA; refuse `--refresh --write` if any new commit fails | F (F-F-1, F-F-5) | A fixture signed by an unlisted key fails; a non-resolving or unsigned `-x` SHA fails with the row named |
| **H-23** | P0 | **Resolution record** `docs/upstream-sync/resolutions/SYNC-n.md` + `verify-resolutions` (record count = conflicted-file count; both intents cited by SHA; `fork:` SHA must touch the resolved range and must not be a rebrand commit) | C (F-C-1, F-C-7), A, B, F | A batch with a conflicted file and no record fails by name; a record citing a rebrand commit as fork intent fails |
| **H-24** | P1 | **Apply-verdict + `--preflight`:** per-row read-only verdict (blocked / hunk-level `Δh` / clean) and computed `Blocked-by` closure before any pick | C (F-C-4, F-C-5) | `--preflight` names all six SYNC-13 rows and exits non-zero **before** any cherry-pick |
| **H-25** | P1 | **Refused-path disposition + egress inventory:** R5-refused paths get a disposition (`pinned-locally:<sha>` / `not-applicable:<reason>`), and new outbound hosts/SDKs require a `PRIVACY.md` diff | F (F-F-3, F-F-4) | A batch merged while `057dfeebb` is undispositioned fails; a new upload step without a `PRIVACY.md` change fails |
| **H-26** | P1 | **Release abort classes + fix-forward rollback runbook:** distinguish infra (re-run, never burn a version) from policy (bump), and document revert → higher patch → delist | E (F-E-3, F-E-4) | A simulated 5xx points at the re-run path; a duplicate points at `pnpm bump:pre-release`; the rollback runbook exists and maps a revert to exactly one version |
| **H-27** | P1 | **Evidence harness + `scripts/**` linting:** every "verified" claim carries a re-runnable command; `scripts/**/*.mjs` gets an ESLint pass | D (F-D-1), B (F-B-5) | Re-running each §2 row's command reproduces its figure; a seeded `as any` in the verifier fails CI |
| **H-28** | P1 | **Resolution-integrity gates:** `git diff --check` + an unmerged-marker scan over the batch diff, and `pnpm check-types` in the gate chain | C (F-C-3) | A file containing `<<<<<<<` fails the gate by id; a type-broken pick fails the batch |
| **H-29** | P2 | **Blame hygiene:** one rebrand commit per batch with a fixed subject, appended to `.git-blame-ignore-revs`, `blame.ignoreRevsFile` configured, and the fork-intent query excludes that subject | C (F-C-9) | `git blame -L` on a rebranded-but-unchanged line attributes the substantive commit; no resolution record cites a rebrand commit |

### 10.4 Dependency order (load-bearing, not a priority list — lens G)

`F-B-1` (column contract) → **H-02** → `H-06`/`F-C-2`/`F-A-3` → `H-12`, `H-16` · `F-A-7` → **H-03** · `H-01`+fixture, **F-E-1**, **H-22** → **H-07**/**H-09** · `H-04`(bump/batch) → `H-08`, `H-09`, `H-15` · **F-E-3/F-E-4** → `H-09`, `H-15` · **H-23** → `H-17`, `F-C-8` · `H-20`/`F-D-1` → §11 edits to the artefacts agents obey · `H-13`+`F-C-10` → per-row cost of all 19 `C-REIMPLEMENT` rows · **H-28** → every resolution (depends on nothing).

### 10.5 Adjudicated conflicts

| Contested | Positions | Decided | Deciding rule |
| --- | --- | --- | --- |
| H-15 scheduled merge | A/B REVISE · C/D/E/F/G REJECT | **REJECT** (conditional re-scope) | Irreversibility × unmet preconditions; pre-commits the mode that produced the repair commits |
| H-04 | A REVISE · B/D/E/F/G REVISE | **REVISE** | Measure the mechanism, not the anecdote; never two sources of truth for a fail-closed gate |
| M4 evidence | A/B/C/D/F/G: misattributed | **coupling AGREE, evidence REJECT** | A claim must cite a locus that contains it |
| H-05 / H-18 (A: ACCEPT) | B/D/F/G: REVISE | **REVISE** (B/D/F/G) | A test that is red before the change is not an acceptance test |
| M3 vocabulary | A/B/D: DISAGREE-narrower | **DISAGREE on vocabulary, AGREE on consequence** — severity **Medium** | Severity follows consequence: 7 unowned `D-LOCAL` rows include an untakeable supply-chain fix |
| H-08 batch cap | F ACCEPT · others REVISE | **REVISE** | An acceptance test must be measurable with the tool that ships; fixed per-batch cost must be amortised |
| L8 severity | plan: Low | **High for security** | A 35-day-open data-loss row with no SLA is not a Low |

---

## 11. Required changes to the source artefacts (downgrade list)

These edits must land **before** the next agent obeys the artefacts (R-6 tombstone rule: rewrite in place **and** leave a dated "superseded by plan §X" note).

| Artefact | Change | Blocking? |
| --- | --- | --- |
| [`ADR`](../adr/adr-upstream-sync-triage-strategy.md:18) | "establishes the size of the problem rather than estimating it" → "a single observation on 2026-09-16 in a shallow clone; not reproducible without `--unshallow`" | Yes (H-05) |
| [`ADR`](../adr/adr-upstream-sync-triage-strategy.md:151) | "~15 commits of immediate `A-CLEAN` quick wins" → "15 `A-CLEAN` rows carry P0–P2; 6 `☑`, 6 blocked in SYNC-13, 3 open (2 with Δ>0) ⇒ **at most 1 immediately pickable clean win**" | Yes (H-05) |
| [`ADR`](../adr/adr-upstream-sync-triage-strategy.md:136) | Migration phase 1's "`A-CLEAN` slice of `SYNC-3`/`SYNC-4`" → those batches contain no `A-CLEAN` rows; point at SYNC-13 | Yes (L4) |
| [`ADR`](../adr/adr-upstream-sync-triage-strategy.md:46) | "upstream has **131 files** referencing" telemetry → "counted at 131 in an unrecorded checkout; 243 at the 2026-09-22 tip" | Yes |
| [`ADR`](../adr/adr-upstream-sync-triage-strategy.md:46) | "0 references in `src/` and `webview-ui/src/`" → "0 telemetry **transport call sites** (`captureEvent(` → 0); the token persists in 34 tracked files" | Yes |
| [`register`](pending-upstream-commits.md:29) / [`manual`](README.md:20) / [`runbook`](../runbooks/upstream-sync.md:15) / tool diagnostics | Parameterise the "22 instead of 102" literal (≥6 sites) — never replace it with another hard number | Yes (L3) |
| [`runbook`](../runbooks/upstream-sync.md:162) + [`spec`](../../scripts/upstream-sync-triage.spec.mjs:267) | "six independent checks" → seven (one runner, seven checks) | Yes (L2) |
| [`register`](pending-upstream-commits.md:414) | Remove the orphan fragment "doing any work." | Yes (L1) |
| [`register`](pending-upstream-commits.md:79) | "~15 commits of immediate low-risk value" → the computed ready set (3 rows) | Yes |
| [`register`](pending-upstream-commits.md:18) | Fork tip cited as a `release/v3.88.3-prerelease` merge — a prefix `AGENTS.md` forbids; scrub | Yes (F-E-7) |
| [`runbook`](../runbooks/upstream-sync.md:186) §7 DoD | Add the **release clause** (bump per batch + announcements + verify + record the version) | Yes (H-04) |
| [`runbook`](../runbooks/upstream-sync.md:17) R3/R9 | Extend to validated provenance: `-x` SHA must resolve, be an ancestor of `upstream/main`, and be signature-verified | Yes (H-22) |
| [`runbook`](../runbooks/upstream-sync.md:18) R4 | Add hunk attribution (`git blame -L` / `git log -L`), the fork-locus mapping, and the resolution record | Yes (H-23) |
| [`runbook`](../runbooks/upstream-sync.md:19) R5 | Path-based → **concern-based** with disposition logging (H-19/H-25) | Yes |
| [`manual`](README.md:141) vs [`runbook`](../runbooks/upstream-sync.md:104) | One gate list (single `pnpm gate:sync` manifest both files reference) | Yes (F-A-9) |
| [`register`](pending-upstream-commits.md:363) `SYNC-13` | Reclassify or except the A-CLEAN rows with Δ>0 and record `Blocked-by` (H-02) | Yes |
| [`ADR` §Migration] | Remove "drained newest-first" if that is the reading; adopt **predecessor-first within a theme** | Yes |

---

## 12. Dependency-ordered execution: 30 / 60 / 90

*Ordering rule: dependency, not preference — you cannot measure before the instrument is honest, cannot automate before the guard exists, and cannot decide convergence before drain is measured on a schema that stores resolution dates.*

- **0–30 days — make the instrument honest; stop the bleeding.** H-20/H-27 (command-per-claim harness) → H-05 + §11 edits + F-D-5 tombstones → H-29 (blame hygiene) → H-28 (marker + `check-types`) → F-E-1 (publish path predicate) → H-04 + F-E-6 (release clause in the DoD) → H-01 + fixture → **F-B-1 + H-02** (one atomic schema/parser change with `Resolved:`/`Version`/`Blocked-by`) → H-22 (provenance). **Checkpoint:** `--verify --repo-only` **green** at `--depth=1` and names a seeded corrupt row; `--refresh --write` refuses in a fixture with a resolvable merge base; two consecutive batch merges publish exactly two versions; the four fictions grep to 0; every ✅ row's command reproduces.
- **31–60 days — make work ready, then drain, and start measuring rate.** H-06 as F-C-4/H-24 (apply-verdict + preflight) → drain the 3 ready rows → the SYNC-13 chain in prerequisite order (`500152b78` first) → **H-13 spike** + F-C-10 ratchet policy + abort rule → H-14 dispositions → H-12 metrics → H-16 forced decision (ready set < 5 / oldest P0 > 30 d / two zero-row cycles) → **H-21 scope cut**. **Checkpoint:** ≥7 rows closed in the cycle (≈0.5/day) and ready set ≥5; if drain is still 0, the H-16 rule fires and the divergence decision is **scheduled, not debated**.
- **61–90 days — decide the structural question with data.** H-23 (resolution records) + H-17 → F-C-8 merge resolution policy written into R4 → H-26 (abort classes + rollback runbook) → H-25 (refused-path disposition + egress inventory) → H-19 + drop log → H-11 (after its key is defined) → H-10 (widened) → **H-07 automation only if** H-01/H-22/F-E-1 are green. **H-15 stays closed** unless the threshold rule fires. **Checkpoint:** a written convergence verdict against 60 days of drain data; if `drain < 0.5 × arrival` **and** SYNC-7 has not reduced per-row cost, execute the threshold rule (fund divergence to completion, else declare the merge with the written policy) — and record it as a tombstoned ADR amendment, because the current ADR still asserts a "measured backlog" and "~15 immediate quick-wins".

**Divergence threshold rule (lens G).** At every bi-weekly cycle: if `ready_set < 5` **and** `C-REIMPLEMENT open > 15` **and** `marginal drain < 7 rows/cycle`, then batching cannot converge and the fork must either (a) fund divergence reduction (SYNC-7) to completion against a deadline, or (b) declare merge mode with the written resolution policy. **Both conditions currently hold** (3 / 19 / 0-of-7) — so the day-30 action is the **funding decision**, not the merge; the merge stays the fallback until the rule fires twice.

---

## 13. Prompt pack (paste-ready) and the optional-hardening checklist

Three prompts, three jobs, no overlap: **A** shows the list (read-only), **B** executes a batch (writes), **C** advances the hardening (proposes, then writes only on approval).

### 13.1 Prompt A — "show me the list" (triage / refresh, no code changes)

```text
ROLE: upstream sync triage for Roo+ (fork of Zoo-Code-Org/Zoo-Code). READ-ONLY: do not pick, edit, or commit anything.
Mode: Code, but make no file writes without my explicit approval.

1. git fetch --deepen=400 upstream main
2. git merge-base upstream/main master        # MUST print a SHA; empty ⇒ STOP and report (shallow clone)
3. node scripts/upstream-sync-triage.mjs --verify
4. node scripts/upstream-sync-triage.mjs --refresh        # DRY RUN: proposes rows for NEW commits only
5. REPORT, then STOP:
   - backlog size and how many rows are ☑ (already merged) vs ☐ (open)
   - NEW upstream commits since the register's recorded tip: sha · date · subject · proposed class · priority
   - the READY set (A-CLEAN ∧ Δ=0 ∧ no unsynced prerequisite) and the BLOCKED set with what each waits on
   - the top 5 by priority and the single recommended next batch
6. ONLY IF I approve: re-run with --refresh --write, update the Summary tables + the dated changelog line,
   then re-run --verify and show me the register diff. Never reclassify or delete an existing row.
```

**What it does and does not do.** It answers "what is new and what is next": new upstream commits are appended as **new rows** with a proposed class and priority, while already-merged rows keep their `☑ <fork-sha>`, so the output shows **both** — new work and the record of what you already took. Two caveats to read correctly: (i) the headline "Pending upstream commits" is a **range count** (merge base → upstream tip), so it *grows* as upstream advances and never falls with work — progress is the `☑` count and the per-batch roll-up, not the headline (`M2`); (ii) refresh only proposes — it never reclassifies, reorders or deletes a row, and the Summary tables/changelog stay manual (`README` §8). One safety note: until `H-01` lands, refresh trusts the recorded baseline tip, so in a shallow or partially-deepened clone it can under-report and then advance the tip past the commits it never saw (`S1`) — run it with a real merge base and read the reported counts before approving `--write`.

### 13.2 Prompt B — "advance the hardening by one item" (propose → decide → implement)

```text
ROLE: upstream-sync hardening engineer for Roo+. One item per session.
READ: docs/upstream-sync/consolidated-hardening-plan.md (§13.3 checklist, §4 plan items, §10 disposition,
§11 source-artefact changes) and docs/upstream-sync/README.md + docs/runbooks/upstream-sync.md.

1. Verify the CURRENT state with commands (do not trust the checklist alone): for each ☐ item in §13.3,
   run its "Done when" check and report pass/fail in one line.
2. Pick the FIRST failing item in §13.3 order (unless I name one). For that item only, report:
   - what is broken today, with the command and the observed output
   - the exact change (files + the shape of the edit), effort estimate, and blast radius
   - its acceptance test, and the rollback (how to undo it)
   - anything it must land with, so it is not split across PRs
3. STOP for my decision. Do not implement yet.
4. On approval: implement, run the acceptance test, run the repo gates it touches (pnpm lint · pnpm check-types ·
   the relevant scripts/*.spec.mjs), report before/after, and mark the item ☑ in §13.3 with the date and the
   fork SHA. If the acceptance test cannot be made discriminating, say so and leave the item open.

Constraints: no new documents (record outcomes in §13.3 and the §9 changelog); no changeset files; never edit
CHANGELOG.md; suppress nothing to make a gate pass; if an item turns out to need a product decision, stop and say so.
```

### 13.3 Optional-hardening checklist — adopt in this order, one item per session

Effort: **S** ≤ 30 min · **M** 1–3 h · **L** half-day or more. `Done when` is the discriminating test; a test that also passes *before* the change does not count.

| # | Item (plan ID · lens finding) | Why it matters for fast periodic merging | Effort | Done when | Status |
| --- | --- | --- | --- | --- | --- |
| **HD-01** | Publish path filter (`F-E-1`) | Bookkeeping/doc merges currently fire the publish workflow, so routine register updates either go red or burn a version | **S** | A `docs/**`-only merge → run green, `skip=true`, nothing published; a bump commit still publishes | ☐ |
| **HD-02** | Release clause in the DoD + prompt step 7 (`H-04`, `F-E-2`, `F-E-6`) | Without a bump per batch, a sync merge lands and the publish run fails closed; the batch then ships under someone else's version | **S** | Two consecutive batch merges publish exactly two versions; an unbumped merge is red for that reason | ☐ |
| **HD-03** | Register verification in CI, merge-base-free subset (`H-03`, `F-A-7`, `F-G-5`) | Register drift is currently invisible where it ships; the verifier cannot even run in a depth-1 checkout | **M** | In `--depth=1`, the repo-only profile exits 0; a seeded 10-char row SHA fails and names the check | ☐ |
| **HD-04** | Refresh guard + parameterise the stale literals (`H-01`, `F-A-1`, `L3`) | Prevents refresh from silently under-reporting and then advancing the baseline past unmeasured commits | **M** | A fixture with a resolvable merge base but a recorded tip outside the window refuses `--write`; the "22" literal is gone from all ≥ 6 sites | ☐ |
| **HD-05** | Weekly watch job (`H-07`) | Turns "remember to run Prompt A" into a PR that appears on its own | **M** | One register-refresh PR per upstream advance, none merged automatically | ☐ |
| **HD-06** | Register/parser atomic change (`H-02`, `F-B-1`, `F-A-3`) | New columns currently make the parser read the wrong cell, so the verifier goes *quiet* on `☑` rows instead of red | **M** | A parser regression asserts `status` still parses after the new header; a seeded violation fails by row name; every `☑` row carries `Resolved:` and `Version` | ☐ |
| **HD-07** | Provenance checks (`H-22`, `F-F-1`, `F-F-5`) | Upstream signs its commits and the pipeline ignores it; nothing validates the `-x` SHA it records | **M** | A fixture signed by an unlisted key fails; a non-resolving or unsigned `-x` SHA fails with the row named | ☐ |
| **HD-08** | Resolution record + integrity gates (`H-23`, `H-28`, `F-C-1`, `F-C-3`, `F-C-7`) | A half-ported fix currently passes all seven gates; conflicts leave no auditable trail | **L** | A conflicted file without a record fails `verify-resolutions`; a file containing `<<<<<<<` fails the batch; `pnpm check-types` runs in the chain | ☐ |
| **HD-09** | Apply-verdict + `--preflight` (`H-24`, `F-C-4`, `F-C-5`) | Δ is file-level and blind to dependencies; this is what makes "ready set" and prerequisite order trustworthy | **L** | `--preflight` names all six SYNC-13 rows and exits non-zero **before** any cherry-pick | ☐ |
| **HD-10** | Scoped rebrand + security-constant guard + blame hygiene (`H-18`, `H-29`, `F-F-2`, `F-C-9`) | A 987-file `sed` runs after every batch and can rewrite auth/session constants unnoticed | **M** | Rebrand on a no-op batch produces no diff; a fixture containing `zoo-code-session-token` fails until a reviewer records the decision; `git blame -L` attributes the substantive commit | ☐ |
| **HD-11** | Convergence clause + tracking scope (`H-21`, `F-G-2`, `F-G-7`) | The headline can never fall; without a tracked scope there is no way to see convergence | **S** | The header shows `P0/P1 absorbed` and `divergence stock` as separate series, and the tracked number can decrease | ☐ |
| **HD-12** | Refused-path disposition + egress inventory (`H-25`, `F-F-3`, `F-F-4`) | Supply-chain hunks (action pinning, dependency bumps) are refused by path and unowned, so they are never taken | **M** | A batch cannot close while a refused-path commit in its window has no disposition; a new outbound host/upload without a `PRIVACY.md` diff fails | ☐ |
| **HD-13** | P0 security lane (`H-09`) | Only worth running once HD-01/HD-02/HD-12 exist — a lane that publishes on every merge cannot be run quietly | **L** | An advisory id can open a lane row without reclassification, with a hold path and a fix-forward rollback | ☐ |
| **HD-14** | Metrics + forced decision (`H-12`, `H-16`) | Turns "are we converging?" into a number instead of an impression; depends on HD-06's `Resolved:` column | **M** | Rows closed/cycle, ready-set size, oldest-unresolved-P0 age and publishes/cycle are reported, and the forced-decision rule fires on observable state | ☐ |

**Deferred by decision — do not implement without re-opening the decision:** `H-08` (batch-size planner: the cap is unmeasurable and smaller batches multiply release events), `H-11` (divergence ledger: its key is undefined for branding-mode allow-list entries), `H-15` (scheduled whole-history merge: rejected by six of seven lenses; re-scope only if the §12 threshold rule fires twice).

**Practical reading:** `HD-01…HD-04` are what make *fast periodic merges* safe and cheap (about a day of work in total); `HD-05…HD-07` remove the two silent-failure modes (unwatched drift, unverified provenance); `HD-08…HD-12` are safety nets for the hand-port path; `HD-13…HD-14` are only worth it once the first ten are done.
