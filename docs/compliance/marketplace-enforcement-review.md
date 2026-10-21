# Marketplace Enforcement Review — `xavier-arosemena.roo-plus`

**Prepared:** 2026-10-20
**Subject:** gap analysis of this repository against the three policies Microsoft cited when the publisher was blocked and the extension removed
**Repository state reviewed:** `master` @ `02fedec83d` (2026-10-20)
**Classification:** internal working document. Regulatory/policy analysis only — **not legal advice**. It describes obligations and observable evidence; it does not opine on enforceability, liability, or litigation, and it is not an appeal.

---

## 1. Scope and method

### 1.1 What was reviewed

| Area                           | Surfaces examined                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policies                       | `https://aka.ms/vsmarketplace-agreement` (PDF, 12 pp., header _"EFFECTIVE DATE: JUNE 2021"_), `https://aka.ms/vsmarketplace-ToU` (PDF, 8 pp., header _"Last Updated September 2025"_), and the Marketplace Security and Trust blog page. All three retrieved 2026-10-20.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Runtime third-party binaries   | [`index.ts`](../../src/services/binary-acquisition/index.ts:1), [`semble.ts`](../../src/services/binary-acquisition/semble.ts:1), [`dcg.ts`](../../src/services/binary-acquisition/dcg.ts:1), [`constants.ts`](../../src/services/destructive-command-guard/constants.ts:1), [`semble-downloader.ts`](../../src/services/code-index/semble/semble-downloader.ts:1), [`manager.ts`](../../src/services/destructive-command-guard/manager.ts:1), [`ExecuteCommandTool.ts`](../../src/core/tools/ExecuteCommandTool.ts:1), [`SEMBLE-RELEASE-GOVERNANCE.md`](../SEMBLE-RELEASE-GOVERNANCE.md:1), [`DCG-RELEASE-GOVERNANCE.md`](../DCG-RELEASE-GOVERNANCE.md:1), [`adr-semble-binary-download-only.md`](../adr/adr-semble-binary-download-only.md:1) |
| Telemetry / data handling      | `src/**` and `webview-ui/src/**` greps; [`consolidated-hardening-plan.md`](../upstream-sync/consolidated-hardening-plan.md:206) rows E11–E13; [`PRIVACY.md`](../../PRIVACY.md:1); [`DEBT.md`](../../DEBT.md:245) §25                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Publisher / listing metadata   | [`package.json`](../../src/package.json:1), [`package.nls.json`](../../src/package.nls.json:1), [`README.md`](../../README.md:1), [`src/README.md`](../../src/README.md:1), 17 files under `locales/*/README.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Branding / derivative work     | [`adr-upstream-alignment-fork-strategy.md`](../adr/adr-upstream-alignment-fork-strategy.md:1), [`adr-upstream-sync-triage-strategy.md`](../adr/adr-upstream-sync-triage-strategy.md:1), [`adr-custom-modes-canonical-catalog.md`](../adr/adr-custom-modes-canonical-catalog.md:1), [`full-rebrand.sh`](../../scripts/full-rebrand.sh:1), root and packaged `LICENSE`                                                                                                                                                                                                                                                                                                                                                                            |
| Security posture / consent     | [`workspaceTrust.ts`](../../src/utils/workspaceTrust.ts:1), auto-approval defaults in [`global-settings.ts`](../../packages/types/src/global-settings.ts:48) and [`ClineProvider.ts`](../../src/core/webview/ClineProvider.ts:2772), [`SECURITY.md`](../../SECURITY.md:102)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Enforcement-adjacent behaviour | [`2026-09-25-prerelease-guard-bypass-3.88.10.md`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:1), [`release-publishing.md`](../runbooks/release-publishing.md:9), [`marketplace-publish.yml`](../../.github/workflows/marketplace-publish.yml:1), [`CHANGELOG.md`](../../CHANGELOG.md:11), git history 2026-09-08 → 2026-10-20                                                                                                                                                                                                                                                                                                                                                                                                   |

### 1.2 What was **not** reviewed

- The publisher portal, the support ticket, and the 2026-08/09 and 2026-09-23 e-mail threads. No artefact in this repository records their contents beyond the quoted fragments in [`release-publishing.md`](../runbooks/release-publishing.md:11) and [`DEBT.md`](../../DEBT.md:249).
- `http://aka.ms/vsmarketplace-policies` ("Marketplace Participation Policies"), which the Publisher Agreement incorporates by reference at §1(n). It is a distinct document from the three cited and was outside the requested scope; **its content is therefore unverified here**.
- The rendered Marketplace listing, the publisher's verification status, and the gallery API. **No request was made to `marketplace.visualstudio.com`** during this review; the publisher is blocked and repeat requests were treated as counterproductive.
- `.env` (not read, per `.rooignore`), any secret store, and any publish command (`vsce` was never executed).
- The `custom-modes` submodule content: the submodule is not checked out in this clone, so the "302-mode" count could not be verified ([`adr-custom-modes-canonical-catalog.md`](../adr/adr-custom-modes-canonical-catalog.md:42) states 301).

### 1.3 Evidence conventions

- **[Finding]** — a statement verified against the repository or a retrieved policy text, with `file:line`.
- **[Inference]** — a reasoned reading of findings, labelled as such and never presented as a finding.
- **[Unverified]** — could not be confirmed from the repo or an official source; reason given.
- Policy quotations are short excerpts from the retrieved texts. The Publisher Agreement and the Terms of Use are published as PDFs; quotations preserve their wording but not their line breaks.
- The Security and Trust blog carries **no publication date** in the retrieved text, so no claim is made about when its practices took effect.

### 1.4 Confidence by finding

| ID  | Finding                                                                          | Confidence                                                                                                          | Basis |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| C2  | No evidenced reply to notice #305 after the 2026-09-23 unblock                   | **High** that no artefact exists in-repo; **Medium** that no reply was sent (the reply could live outside the repo) |
| C1  | Listing Information does not identify runtime-downloaded executables             | **High** (direct read of [`package.nls.json`](../../src/package.nls.json:3) and README)                             |
| C3  | Post-unblock publish behaviour reads as de-prioritising the Marketplace          | **High** on facts; **Medium** on how a reviewer weighed them                                                        |
| C5  | Derivative-work attribution and licence metadata are incomplete                  | **High** on facts; **Medium** on reviewer impact                                                                    |
| C4  | Automated pre-publish audit gate was removed                                     | **High** (documented in [`DEBT.md`](../../DEBT.md:270))                                                             |
| C6  | Residual telemetry scaffolding contradicts "zero telemetry"                      | **High** on presence; **Low** on it being treated as a violation (no transport exists)                              |
| C7  | Provenance-record defects (broken links, wording, hosting account)               | **High**                                                                                                            |
| C9  | Listing-claim inconsistencies (301 vs 302, "no cloud", pre-release availability) | **High** on the inconsistency; **Low** on materiality                                                               |
| C8  | DCG rider licence obligations not evidenced                                      | **Medium** — depends on whether the extension is held to "distribute" the binary                                    |
| C10 | `isWorkspaceTrusted()` treats `undefined` as trusted                             | **High** on behaviour; **Low** on materiality (documented rationale, manifest blocks restricted mode)               |

---

## 2. Policy map

Requirement statements are paraphrases. Quotes are verbatim short excerpts.

### 2.1 Publisher Agreement (`aka.ms/vsmarketplace-agreement`)

| §         | Clause (short quote)                                                                                                                                                           | Requirement                                                    | Status                                                                                        | Evidence                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1(l)      | _"Listing Information" means the information and images accompanying an Offering that identifies the nature, volume, fees, Terms of Use, and other features of the Offering_   | The listing must identify the Offering's nature and features   | **Partly** — feature table discloses consent-gated binaries; the _short description_ does not | [`package.nls.json:3`](../../src/package.nls.json:3); [`README.md:63`](../../README.md:63)                                                 |
| 1(n)      | _"Marketplace Participation Policies" means the business policies … set forth at http://aka.ms/vsmarketplace-policies_                                                         | A fourth incorporated document applies                         | **Unverified** — not retrieved in this review                                                 | —                                                                                                                                          |
| 3(c)      | _"You are solely responsible and liable for your Offerings, Offering Assets, and Listing Information"_                                                                         | Publisher owns listing accuracy                                | **Partly** — see C1, C9                                                                       | §3 conflict register                                                                                                                       |
| 3(e)      | _"Microsoft may periodically test and evaluate your Offering to verify that it continues to comply"_                                                                           | Post-publication review is expected, not exceptional           | **Yes** (acknowledged in-repo)                                                                | [`DEBT.md:247`](../../DEBT.md:247) records that notice #305 required three specific changes                                                |
| 3(g)(iii) | _"inconsistency between your Offering and its Listing Information"_ is a stated removal reason                                                                                 | Offering behaviour must match the listing                      | **Partly** — runtime downloads are behaviour not described in the description; see C1         | [`binary-acquisition/index.ts:184`](../../src/services/binary-acquisition/index.ts:184)                                                    |
| 4(b)      | _"If any portion of your Offering's code is licensed from a third party or under any open-source license, you are solely responsible for compliance with those license terms"_ | Third-party licence compliance is the publisher's              | **Partly** — see C5, C8                                                                       | [`SEMBLE-RELEASE-GOVERNANCE.md:15`](../SEMBLE-RELEASE-GOVERNANCE.md:15); [`DCG-RELEASE-GOVERNANCE.md:13`](../DCG-RELEASE-GOVERNANCE.md:13) |
| 8(d)      | _"must not install or launch executable code on the user's environment beyond what is identified in or may reasonably be expected from the Listing Information"_               | Runtime-acquired executables must be identified in the listing | **Partly** — consent dialog identifies them; listing description does not                     | [`semble.ts:26`](../../src/services/binary-acquisition/semble.ts:26); [`dcg.ts:41`](../../src/services/binary-acquisition/dcg.ts:41)       |
| 8(d)      | _"Your Offering must not jeopardize or compromise user security"_                                                                                                              | Reasonable security measures                                   | **Yes**, with caveats (C4, C6, C10)                                                           | [`SECURITY.md:102`](../../SECURITY.md:102)                                                                                                 |
| 10(d)     | _"You have obtained any and all consents, approvals, or licenses … required for you to make your Offering … available"_                                                        | Rights chain for every distributed component                   | **Partly** — Semble chain documented; DCG rider not reproduced                                | §3 C8                                                                                                                                      |
| 10(f)     | _"information that you provide to us … is true, accurate, current, and complete"_                                                                                              | Listing metadata accuracy                                      | **Partly** — see C9                                                                           | [`README.md:41`](../../README.md:41); [`locales/fr/README.md:28`](../../locales/fr/README.md:28)                                           |
| 12(a)/(b) | _"Microsoft may terminate this Agreement at any time, for any reason or no reason"_; _"We reserve the right to remove, disable, and terminate your Offerings"_                 | Removal requires no clause finding                             | **Noted** — the 2026-10-20 notice cites no clause, consistent with this §                     | [`release-publishing.md:9`](../runbooks/release-publishing.md:9)                                                                           |

### 2.2 Terms of Use (`aka.ms/vsmarketplace-ToU`)

| §      | Clause (short quote)                                                                                                                                                                                                                           | Requirement                                                                                           | Status                                                                                                                                                                                        | Evidence                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 4(v)   | _"Don't engage in activity that is false or misleading … or causing unexpected behavior that is not clearly documented at the top of both the package description and package README"_                                                         | Unexpected behaviour must be documented **at the top of both** the package description and the README | **No** — the description is silent; the README documents it in a mid-page feature table                                                                                                       | [`package.nls.json:3`](../../src/package.nls.json:3); [`README.md:63`](../../README.md:63)        |
| 4(vi)  | _"Only post your own original work or work that you have written permission or a license to post and is not duplicative to content that has been originally published by Microsoft or a Publisher … without changing the content's substance"_ | Derivative work must be licensed and substantively differentiated                                     | **Partly** — Apache-2.0 inherited and disclosed; core is deliberately kept byte-identical ([`adr-upstream-alignment-fork-strategy.md:30`](../adr/adr-upstream-alignment-fork-strategy.md:30)) | §3 C5                                                                                             |
| 4(xiv) | _"Don't create content that is not useful or does not add value (i.e., the package or extension is empty, an exact duplicate of another package or extension …)"_                                                                              | Not an exact duplicate                                                                                | **Yes** — materially extended (Semble layer, consent gate, catalog)                                                                                                                           | [`adr-upstream-alignment-fork-strategy.md:16`](../adr/adr-upstream-alignment-fork-strategy.md:16) |
| 4(xvi) | _"Don't circumvent any restrictions on access to or availability of the Sites"_                                                                                                                                                                | No circumvention                                                                                      | **Yes** on evidence; the repo explicitly forbids re-publishing under a new publisher                                                                                                          | [`release-publishing.md:25`](../runbooks/release-publishing.md:25)                                |
| 5      | _"We reserve the right to terminate or suspend your access … and/or remove your content … if we believe, in our sole discretion, that … (v) for any reason whatsoever"_                                                                        | Removal needs no stated ground                                                                        | **Noted**                                                                                                                                                                                     | —                                                                                                 |

### 2.3 Security and Trust practices (blog)

These are publisher **best practices** on the blog page, not contractual clauses. The page also describes enforcement mechanics.

| Practice (short quote)                                                                                                                              | Requirement                           | Status                                                                                                                    | Evidence                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| _"Include license: Include license/EULA. Add any necessary notice for 3rd party attribution."_                                                      | Licence + third-party notices shipped | **Partly** — Apache-2.0 `LICENSE` is packaged; **no `license` field** in the manifest and **no third-party notices file** | [`package.json:1`](../../src/package.json:1) (no `"license"` key); [`src/LICENSE`](../../src/LICENSE:1) |
| _"Prevent content duplication: If you start by cloning another open-source extension, make sure to update the repository link and readme content."_ | Repository link and README updated    | **Yes** — links rewritten to the fork and README rewritten                                                                | [`full-rebrand.sh:63`](../../scripts/full-rebrand.sh:63); [`README.md:44`](../../README.md:44)          |
| _"Prevent search confusion: Choose unique publisher and extension display name, and image."_                                                        | Distinct identity                     | **Partly** — distinct publisher and icon; display name `Roo+` is one token away from an existing product                  | [`package.json:3`](../../src/package.json:3); [`package.json:56`](../../src/package.json:56)            |
| _"Avoid obfuscation: Clean, and non-obfuscated code …"_                                                                                             | No obfuscation                        | **Yes** — readable TypeScript bundles                                                                                     | build config in [`package.json:470`](../../src/package.json:470)                                        |
| _"Copycats: We're reviewing extensions that duplicate repository links and logo images for potential impersonation."_                               | Not a copycat profile                 | **Partly** — same risk area as above                                                                                      | §3 C5                                                                                                   |
| _"we remove it immediately and, if needed, ban the publisher"_                                                                                      | Enforcement mechanics                 | **Noted** — consistent with the 2026-10-20 outcome                                                                        | —                                                                                                       |

---

## 3. Ranked conflict register

Scoring: severity 1–5 × likelihood that a Marketplace reviewer would read the item as a conflict 1–5. Ordering is by score; ties are broken by directness to the 2026-09-23 condition.

### C2 — Notice #305 was never evidenced as answered after the conditional unblock (25 = 5 × 5)

**Description.** The repository contains no artefact recording receipt of the 2026-09-23 message, no record of a reply to the notice #305 thread, and no record of a publisher-portal update. The repo's own plan and debt register both say the loop must be closed externally and both remain open.

**Evidence.**

- [`DEBT.md:249`](../../DEBT.md:249) — heading _"Marketplace Portal Action + Notice #305 Reply (external — cannot close from repo)"_.
- [`DEBT.md:253`](../../DEBT.md:253) — _"republish a patch so the README goes live, then reply to notice #305 with the direct privacy URL … No portal privacy field exists to set."_
- [`marketplace-305-remediation-plan.md:129`](../../plans/marketplace-305-remediation-plan.md:129) — _"Manual action — Marketplace portal (cannot be done from the repo)"_, _"do not close Marketplace notice #305 until done"_ ([`:133`](../../plans/marketplace-305-remediation-plan.md:133)).
- [`marketplace-305-remediation-plan.md:143`](../../plans/marketplace-305-remediation-plan.md:143) — _"D5: Reply to the Marketplace notice (fix summary + source pointer)"_.
- A repository-wide search for `unblock` returns no reference to the 2026-09-23 message; every hit is unrelated ([`CHANGELOG.md:251`](../../CHANGELOG.md:251) is a 3.72-era CI fix).

**Clause touched.** Agreement §3(c), §3(e), §10(f); ToU §4(v).

**How a reviewer would read it.** The publisher was told to "review and update the publisher and extensions accordingly". The artefacts a reviewer can see show remediation work that predates the message (2026-09-08) plus a one-line description change on 2026-09-23 ([`package.nls.json:3`](../../src/package.nls.json:3)). Nothing shows the reviewer being told the work was complete; the publisher's own register says the notice could not be closed. **[Inference]** A reviewer could conclude the condition was acknowledged but not closed.

**Remediation.** Assemble the outbound record (dates, recipients, attachments) for the notice #305 reply and the portal actions; if no reply was ever sent, send one now containing: the clause-by-clause response, the VSIX hashes, the provenance documents, and the specific changes made after 2026-09-23. Then close [`DEBT.md:249`](../../DEBT.md:249) with a dated resolution line so the next reader sees the evidence in-repo.

---

### C1 — Listing Information does not identify the executables the extension downloads and runs (20 = 5 × 4)

**Description.** Two third-party native binaries are downloaded at runtime and executed: Semble (pinned `v0.5.2`, ~150 MB, four platforms) and DCG (pinned `v0.7.7`, ~5 MB, five platforms). The consent dialog names them; the Marketplace **short description** does not, and neither the description nor a top-of-README notice says that first use of an execution or indexing feature will fetch and run an external executable. README disclosure exists only inside a mid-page feature table.

**Evidence.**

- [`package.nls.json:3`](../../src/package.nls.json:3) — the entire description; no mention of downloads or executables.
- [`README.md:63`](../../README.md:63) — _"first-use binaries require explicit consent"_ (feature table, line 63 of 331).
- [`semble-downloader.ts:65`](../../src/services/code-index/semble/semble-downloader.ts:65) — download base URL; [`semble-downloader.ts:87`](../../src/services/code-index/semble/semble-downloader.ts:87) — pinned SHA-256 map.
- [`constants.ts:37`](../../src/services/destructive-command-guard/constants.ts:37) — DCG download base URL.
- [`ExecuteCommandTool.ts:136`](../../src/core/tools/ExecuteCommandTool.ts:136) — DCG install/run path, gated on the opt-in setting, consent at [`:144`](../../src/core/tools/ExecuteCommandTool.ts:144).
- [`PRIVACY.md:29`](../../PRIVACY.md:29) — the privacy policy's third-party statement does not mention these downloads.

**Clause touched.** Agreement §8(d) (_"must not install or launch executable code … beyond what is identified in or may reasonably be expected from the Listing Information"_); §1(l); §3(g)(iii); ToU §4(v) (_"at the top of both the package description and package README"_).

**How a reviewer would read it.** The clause names exactly this pattern, and the Terms of Use names exactly where the disclosure must sit. The mitigation shipped in 3.88 is a runtime dialog plus a documentation page — good practice, but it is not the location the clause specifies. **[Inference]** This is the most likely surviving "matching source / unexpected behaviour" reading even after the provenance work.

**Remediation.** Put a two-sentence notice in the `extension.description` string (all 17 `package.nls.*.json` files) and at the top of [`README.md`](../../README.md:1) and [`src/README.md`](../../src/README.md:1): names, purpose, that they are downloaded from GitHub at first use after explicit consent, pinned versions, and a link to the governance documents. Add the same sentence to [`PRIVACY.md`](../../PRIVACY.md:1). No behavioural change is required.

---

### C3 — Post-unblock publishing reads as de-prioritising the Marketplace (16 = 4 × 4)

**Description.** Two days after the conditional unblock, the Marketplace received `3.88.10` as a **pre-release**, published by accident when a release-prep guard failed to detect a merge. From 2026-10-06 the pipeline was reworked so that a Marketplace failure cannot fail a release; the pre-release channel was later made Open VSX-only by deleting the token.

**Evidence.**

- [`2026-09-25-prerelease-guard-bypass-3.88.10.md:15`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:15) — _"the workflow **published `3.88.10` as a pre-release** to both registries instead of skipping"_; the evidence table records `3.88.10` → HTTP 200 with `Microsoft.VisualStudio.Code.PreRelease=true` ([`:41`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:41)).
- [`2026-09-25-prerelease-guard-bypass-3.88.10.md:88`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:88) — unpublishing was considered and rejected; per-version deletion would have required e-mailing `VSMarketplace@microsoft.com`.
- [`release-publishing.md:108`](../runbooks/release-publishing.md:108) and [`marketplace-publish.yml:309`](../../.github/workflows/marketplace-publish.yml:309) — _"VS Code Marketplace leg is advisory"_, `continue-on-error: true`.
- [`marketplace-publish.yml:130`](../../.github/workflows/marketplace-publish.yml:130) — `fail-on-invalid-vsce-pat: "false"`.
- [`release-publishing.md:31`](../runbooks/release-publishing.md:31) — _"`VSCE_PAT` was deleted from the `marketplace-prerelease` environment"_.
- Premise 3 in the brief (2026-09-15 `vsce verify-pat` failing, commit `d5abf5cb62`) is corroborated by git history: `d5abf5cb62` _"fix(ci): don't let a broken VS Marketplace PAT block the Open VSX pre-release"_ (2026-09-15).

**Clause touched.** ToU §5 (termination/suspension at discretion); Agreement §3(e) (post-publication testing) and §4(a)(iv)-adjacent evaluation rights; blog _"Unusual Metrics Monitoring"_ / enforcement mechanics.

**How a reviewer would read it.** A new publication appeared at the Marketplace two days after a conditional unblock, carrying a pre-release flag, with no accompanying evidence of the requested review. Then the Marketplace was systematically demoted to best-effort and its credential removed. **[Inference]** Read in sequence, this looks like a publisher that continued to ship while treating the compliance channel as optional — the opposite of the "review and update" instruction. The counter-reading (a CI defect, promptly documented, with the Marketplace deliberately never re-tried after 2026-09-25) is supported by the incident record but is not visible to someone reading only the listing history.

**Remediation.** State the sequence once, factually, in the request for the decision record: what was published, when, on which channel, with which flag, and that no further Marketplace publishes were attempted after 2026-09-25. Do not re-litigate the accident; supply the timeline and the incident document.

---

### C5 — Derivative-work identity, attribution, and licence metadata are incomplete (16 = 4 × 4)

**Description.** The extension is a fork of Zoo Code (itself forked from Roo Code / Cline). Attribution is disclosed in the README, and the inherited licence (Apache-2.0) is shipped, but: the manifest has no `license` field; there is no third-party notices file; the search keywords include `"zoo code"` and `"cline"`; the display name `Roo+` is one token from an existing product name; and the strategy ADR deliberately keeps the upstream core byte-identical, with only token-level rebranding.

**Evidence.**

- [`README.md:44`](../../README.md:44) — fork disclosure; [`README.md:330`](../../README.md:330) — _"Roo+ is not affiliated with Zoo Code, Roo Code, or Cline."_
- [`package.json:3`](../../src/package.json:3) — `"displayName": "%extension.displayName%"` → `"Roo+"` ([`package.nls.json:2`](../../src/package.nls.json:2)).
- [`package.json:44`](../../src/package.json:44) `"cline"`, [`package.json:56`](../../src/package.json:56) `"zoo code"`.
- No `"license"` key anywhere in [`package.json`](../../src/package.json:1); the licence lives only in [`src/LICENSE`](../../src/LICENSE:1) (Apache-2.0, byte-identical to the root copy).
- [`adr-upstream-alignment-fork-strategy.md:30`](../adr/adr-upstream-alignment-fork-strategy.md:30) — _"Keep the upstream core byte-identical"_, with branding as one of only two allow-listed divergences ([`:34`](../adr/adr-upstream-alignment-fork-strategy.md:34)).
- [`full-rebrand.sh:50`](../../scripts/full-rebrand.sh:50) — bulk replacement of the upstream brand string across `src/**/*.ts`; [`:63`](../../scripts/full-rebrand.sh:63) — upstream GitHub URL replaced with the fork's.
- Upstream `Zoo-Code-Org/Zoo-Code` has **no `NOTICE` file** (HTTP 404 on `raw.githubusercontent.com` at 2026-10-20) and an Apache-2.0 `LICENSE`, so no Apache §4(d) notice obligation arises from that file.

**Clause touched.** ToU §4(vi) (own work or licensed work, not duplicative without substantive change); blog _"Prevent content duplication"_, _"Prevent search confusion"_, _"Include license"_, _"Copycats"_; Agreement §4(b), §10(d).

**How a reviewer would read it.** The disclosure is present and correct (strong evidence), but three signals point the other way: a name that is a near-neighbour of an existing product, competitor names in the keyword list, and a core kept byte-identical under a token rebrand. **[Inference]** With the blog's copycat section in view, a reviewer could treat the identity choices — not the code — as the issue. Apache-2.0 §4(b) also requires modified files to carry prominent change notices, which the rebrand script does not add.

**Remediation.** Add `"license": "Apache-2.0"` to [`package.json`](../../src/package.json:1); add a `THIRD-PARTY-NOTICES.md` covering Zoo Code / Roo Code / Cline lineage, Semble (MIT), DCG (see C8), and the custom-modes catalogue; drop competitor names from `keywords`; add a one-line "modified from Zoo Code" header where the rebrand script rewrites files. Renaming the product is a business decision, not a repo fix, and is not recommended here.

---

### C4 — The automated pre-publish audit gate was removed, and the removal is documented (12 = 4 × 3)

**Description.** On 2026-09-08 a working, fail-closed VSIX audit gate was removed from every automated and publish path. The debt register records the outcome in explicit terms.

**Evidence.** [`DEBT.md:270`](../../DEBT.md:270) — _"the automated publish gate was **REMOVED from all automated / publish paths** … Publications are **single-command with ZERO audit gating or triage**"_; retained as an optional manual step only ([`:272`](../../DEBT.md:272)). The removal post-dates the security notice and precedes the 2026-09-23 review.

**Clause touched.** Agreement §8(d) (_"reasonable security measures"_; _"must not jeopardize or compromise user security"_); blog sections on malware scanning and _"Stop secret leaks"_.

**How a reviewer would read it.** Reading the repository's own security register, a reviewer sees a maintained project that dismantled its only pre-publication artifact scan immediately after a security notice, and wrote the justification in capital letters. **[Inference]** The reasoning may be sound (208 benign bundled-OSS findings, Marketplace scanning, dependency review); the optics are not, because the record is written as an assertion rather than as a measured risk acceptance.

**Remediation.** Either reinstate the gate as advisory-but-recorded, or restate [`DEBT.md:270`](../../DEBT.md:270) as a dated risk acceptance naming the residual risk, the compensating controls with `file:line`, and the review date. Do not rewrite history — append.

---

### C6 — Residual telemetry scaffolding contradicts "zero telemetry by design" (9 = 3 × 3)

**Description.** There is no transport: `grep -rl "captureEvent(" src` returns 0 files. But 30 TypeScript files under `src/` still contain the token `telemetry`, including dead property bags and comments that describe capture that no longer happens.

**Evidence.**

- [`MarketplaceManager.ts:115`](../../src/services/marketplace/MarketplaceManager.ts:115) — _"// Capture telemetry for successful installation"_ followed by a `telemetryProperties` object that is never consumed.
- [`search-service.ts:62`](../../src/services/code-index/search-service.ts:62) — _"// Capture telemetry for the error"_; [`git.ts:44`](../../src/utils/git.ts:44) — _"convert to HTTPS format for telemetry"_.
- [`consolidated-hardening-plan.md:210`](../upstream-sync/consolidated-hardening-plan.md:210) — row E12 already withdrew the absolute claim and replaced it with _"0 transport call sites"_.
- Public claim: [`README.md:63`](../../README.md:63) _"Zero telemetry by design — no PostHog, no analytics"_; [`PRIVACY.md:30`](../../PRIVACY.md:30) _"does not collect usage, analytics, or error telemetry"_.

**Clause touched.** ToU §4(v) (false or misleading); Agreement §10(f) (information true and accurate).

**How a reviewer would read it.** A static scan of the packaged bundle will hit "Capture telemetry" comments in shipped code and the word `telemetry` in file names. **[Inference]** A reviewer doing exactly that scan can reasonably ask whether the "zero telemetry" claim is accurate; the answer (no transport) requires reading further than the scan.

**Remediation.** Delete the dead property bag and the three stale comments; rename files whose names carry the token only if the rename is mechanical. Then the public claim and the source agree at scanner depth, not only at reviewer depth.

---

### C7 — Provenance records contain defects that weaken the file (9 = 3 × 3)

**Description.** The two governance documents are the strongest artefacts in the repository, but each links to a path that does not exist, one describes DCG as "packaged" where the code downloads, and the Semble bytes come from a personal account rather than an organisation tied to the publisher.

**Evidence.**

- [`SEMBLE-RELEASE-GOVERNANCE.md:118`](../SEMBLE-RELEASE-GOVERNANCE.md:118) and [`DCG-RELEASE-GOVERNANCE.md:52`](../DCG-RELEASE-GOVERNANCE.md:52) link to `docs/marketplace-305-remediation-plan.md`; the file exists only at [`plans/marketplace-305-remediation-plan.md`](../../plans/marketplace-305-remediation-plan.md:1).
- [`DCG-RELEASE-GOVERNANCE.md:15`](../DCG-RELEASE-GOVERNANCE.md:15) — _"Roo+ **packages and pins upstream release binaries**"_, while the same paragraph says it is _"not bundled"_ and the code only downloads ([`constants.ts:37`](../../src/services/destructive-command-guard/constants.ts:37)).
- [`SEMBLE-RELEASE-GOVERNANCE.md:29`](../SEMBLE-RELEASE-GOVERNANCE.md:29) — packaging repo `Audare-est-Facere/sembleexec` on a personal account; the same document's earlier target was a non-existent organisation ([`arch-review-semble-download-404.md:6`](../../plans/arch-review-semble-download-404.md:6), _"Repository `Roo-Plus-Org/sembleexec` does not exist (HTTP 404)"_).

**Clause touched.** Agreement §3(c), §4(b), §10(d); ToU §4(v).

**How a reviewer would read it.** Dangling internal links are the classic signal that a provenance document was written once and not maintained. **[Inference]** They invite the conclusion that the "publish matching source" answer is documentary rather than operational — even though the checksum gate is real ([`semble-downloader.ts:757`](../../src/services/code-index/semble/semble-downloader.ts:757); [`manager.ts:107`](../../src/services/destructive-command-guard/manager.ts:107)).

**Remediation.** Fix both links; change "packages" to "downloads, pins and verifies"; in the Semble document, state explicitly who controls `Audare-est-Facere` and how a reader verifies the release assets against the pinned hashes.

---

### C9 — Listing claims are inconsistent or stale in places (8 = 2 × 4)

**Description.** The English listing says a 302-mode catalogue; the strategy ADR says 301; all 17 locale READMEs say 301. The short description promises "no cloud"; the extension's core value is remote model providers. The README still tells users how to install a pre-release from a Marketplace listing that no longer exists.

**Evidence.** [`README.md:41`](../../README.md:41), [`README.md:122`](../../README.md:122) (302) vs [`adr-custom-modes-canonical-catalog.md:42`](../adr/adr-custom-modes-canonical-catalog.md:42) (301) and [`locales/fr/README.md:28`](../../locales/fr/README.md:28) (301); [`src/README.md:191`](../../src/README.md:191) (pre-release dropdown on the Marketplace); [`README.md:49`](../../README.md:49) (_"Everything runs on **your own models**"_ — the accurate framing, in tension with the "no cloud" tagline).

**Clause touched.** Agreement §3(g)(iii), §10(f); ToU §4(v).

**How a reviewer would read it.** Individually trivial; collectively, three different numbers and an instruction that cannot be followed. **[Inference]** Low weight on its own, but it undermines the credibility of the more substantive statements in the same documents.

**Remediation.** Settle the catalogue count with a single generated number, propagate it to the 17 locale READMEs, replace "no cloud" with the accurate phrasing already used at [`README.md:49`](../../README.md:49), and re-scope the pre-release paragraph to Open VSX.

---

### C8 — DCG's rider licence is described but not reproduced (6 = 3 × 2)

**Description.** DCG is licensed _"MIT License (with OpenAI/Anthropic Rider)"_. The rider is part of the licence's conditions, forbids granting any rights to named restricted parties, and requires that _"any distribution of the Software or any Derivative Works must include this rider provision unmodified."_ The repository records the licence in one line and ships no copy of the rider. The extension does **not** redistribute the bytes: it downloads them from the upstream release URL after consent.

**Evidence.** [`DCG-RELEASE-GOVERNANCE.md:13`](../DCG-RELEASE-GOVERNANCE.md:13) (one-line licence description); upstream `LICENSE` retrieved 2026-10-20 from `Dicklesworthstone/destructive_command_guard`; download-only path at [`constants.ts:37`](../../src/services/destructive-command-guard/constants.ts:37) and [`dcg.ts:41`](../../src/services/binary-acquisition/dcg.ts:41).

**Clause touched.** Agreement §4(b) (third-party licence compliance), §10(d) (consents/approvals obtained).

**Assessment.** **[Inference]** On the current design the rider's distribution condition is probably not triggered, because Roo+ neither mirrors nor bundles the artifact and the user fetches it from upstream. Two gaps remain regardless: (a) the consent dialog and governance note do not show the user the rider text they are accepting upstream's terms under; (b) any future bundling, mirroring, or offline bundle would trigger an obligation the project has no mechanism to meet. This is an obligation to _verify with counsel_, not a conclusion. No legal opinion is offered here.

**Remediation.** Ship the upstream licence text verbatim alongside the DCG governance note, and link it from the consent dialog's purpose string. Record explicitly that distribution is upstream-only and that no mirror exists.

---

### C10 — `isWorkspaceTrusted()` treats `undefined` as trusted (4 = 2 × 2)

**Description.** The gate returns trusted unless the API explicitly reports `false`. The rationale is documented and coherent (the manifest declares `untrustedWorkspaces.supported: false`, so the extension cannot be active in Restricted Mode).

**Evidence.** [`workspaceTrust.ts:71`](../../src/utils/workspaceTrust.ts:71) and the comment block at [`:55`](../../src/utils/workspaceTrust.ts:55); manifest declaration at [`package.json:16`](../../src/package.json:16); the reasoning is also recorded in [`DEBT.md:293`](../../DEBT.md:293).

**Clause touched.** Agreement §8(d) (reasonable security measures).

**How a reviewer would read it.** A `!== false` check is a recognised fail-open shape. **[Inference]** It is defensible here and unlikely to have driven the decision; it matters only because it sits directly under the "untrusted workspaces are gated" claim.

**Remediation.** None required. If the claim is ever restated, point at the manifest declaration as the primary control.

---

## 4. The 2026-09-23 instruction

### 4.1 The sentence, parsed

> _"We have reviewed the shared VSIX details and unblocked the publisher. Please review and update the publisher and extensions accordingly."_

Three components, in order:

1. **"reviewed the shared VSIX details"** — the review was of the artefact(s) supplied in the notice #305 thread, not of the repository and not of the live listing. Whatever was in those VSIXs is what Microsoft judged.
2. **"unblocked the publisher"** — an account-level action, revocable, taken _before_ the requested update. The unblock is therefore conditional in substance even though the sentence does not use the word "condition".
3. **"review and update the publisher and extensions accordingly"** — an instruction addressed to the publisher identity **and** to each extension, with "accordingly" pointing back at whatever the shared VSIX details showed.

### 4.2 Actions the instruction plausibly required

| #   | Plausible required action                                                                                                             | Evidenced?                                          | Evidence                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Review the publisher profile (display name, contact, verification, domains) and correct anything inconsistent                         | **Not evidenced**                                   | Portal-side action; no artefact in-repo. **[Unverified]**                                                                                                                                                                                                              |
| A2  | Review each extension's listing metadata (name, display name, description, categories, links, icon) and correct anything inconsistent | **Partly**                                          | 2026-09-23 description rewrite and privacy link across 18 `package.nls.*.json` files (`3b09f42884`); later branding fixes 2026-10-14/15 (`81ac320cf5`, `d6cc32c4b9`, `90b35b3eed`). Nothing touched the publisher, the icon, the repository link, or the keyword list. |
| A3  | Republish an extension build carrying the corrections                                                                                 | **Yes, but inadvertently and on the wrong channel** | `3.88.10` reached the Marketplace as a **pre-release** on 2026-09-25 ([`2026-09-25-prerelease-guard-bypass-3.88.10.md:41`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:41)); the intended stable, `3.88.11`, was never published there as a stable.     |
| A4  | Reply to the notice thread with what was changed, pointing at the matching source                                                     | **Not evidenced**                                   | [`DEBT.md:249`](../../DEBT.md:249) still open; [`marketplace-305-remediation-plan.md:143`](../../plans/marketplace-305-remediation-plan.md:143) still the plan of record.                                                                                              |
| A5  | Set or confirm the privacy/data-collection disclosure                                                                                 | **Partly**                                          | Listing README links the policy ([`README.md:63`](../../README.md:63)); the publisher's own note says there is no portal field for it ([`DEBT.md:252`](../../DEBT.md:252)); [`PRIVACY.md`](../../PRIVACY.md:1) does not mention the runtime downloads.                 |
| A6  | Ensure the answer to "publish matching source" is visible from the listing                                                            | **Partly**                                          | Governance documents and consent dialogs exist (3.88 line); nothing in the listing text points at them.                                                                                                                                                                |

### 4.3 What happened between the two dates

| Date               | Event                                                                                               | Source                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 2026-09-08         | Remediation commits `1aa18aef05`, `ca87579481`; automated VSIX audit gate removed                   | git history; [`DEBT.md:270`](../../DEBT.md:270)                                                                   |
| 2026-09-15         | Marketplace publishing already failing (`vsce verify-pat`); CI made tolerant of it                  | `d5abf5cb62`; [`release-publishing.md:21`](../runbooks/release-publishing.md:21)                                  |
| **2026-09-23**     | Conditional unblock; description + privacy link updated and `3.88.9` prepared                       | the brief; `3b09f42884`                                                                                           |
| 2026-09-25         | `3.88.10` published to the Marketplace as a pre-release by guard failure; stable moved to `3.88.11` | [`2026-09-25-prerelease-guard-bypass-3.88.10.md:1`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:1) |
| 2026-09-25 → 10-06 | Listing disappears; pipelines reworked so a Marketplace failure cannot fail a release               | `265b8ea1a1`, `46cec67a5e`, `d54b62e7f5`                                                                          |
| 2026-10-06 → 10-20 | Branding/i18n work continues; Marketplace presence probe added; enforcement recorded                | `52a063e65b`, `cff1a0a44e`, `89435116d4`                                                                          |
| 2026-10-20         | Publisher blocked, extension removed, no reinstatement                                              | [`release-publishing.md:9`](../runbooks/release-publishing.md:9)                                                  |

**Central question — answer, stated as a hypothesis set, not a finding.**

**[Inference]** The most plausible reading of "an unmet condition" is a _process_ gap rather than a _code_ gap:

1. The corrections made after 2026-09-23 were one line of listing text plus a link — the smallest possible response to an instruction that says "review and update the publisher **and** extensions".
2. No reply closed the loop; the publisher's own register says the notice could not be closed from the repository and never records it being closed at all.
3. The next Marketplace publication was an unintended pre-release, and after 2026-09-25 the Marketplace was formally demoted to best-effort, so no corrected stable build was ever offered to the reviewer.
4. The artefact removed on 2026-10-20 was therefore, from Microsoft's side, the same shape as the one they had conditionally cleared, minus one paragraph.

Item C1 (the description still not identifying downloaded executables) is the most plausible _substantive_ unmet condition, because Agreement §8(d) and ToU §4(v) both point at exactly that surface, and the 3.88 answer addressed the runtime dialog and the documentation rather than the listing text.

---

## 5. What is provably compliant

These statements are defensible from evidence in this repository and require no inference. They are the ones worth asserting in any written request.

1. **No telemetry transport exists in the shipped source.** `grep -rl "captureEvent(" src` → 0 files; `grep -rl -i "telemetry" --include=*.ts src` → 30 files of inert scaffolding (verified 2026-10-20 at `02fedec83d`). PostHog, the `TelemetryService`, machine-id identity, and the analytics endpoint were removed in the 3.88 line ([`CHANGELOG.md:37`](../../CHANGELOG.md:37)).
2. **Untrusted workspaces are refused at the manifest level.** `capabilities.untrustedWorkspaces.supported: false` with restricted command settings ([`package.json:16`](../../src/package.json:16)), plus runtime gates ([`workspaceTrust.ts:117`](../../src/utils/workspaceTrust.ts:117)).
3. **Binary acquisition is consent-gated, version-scoped, and fails closed.** Untrusted workspace → no download; dismissal → deny; only "Always allow" persists, keyed to `id@version` ([`binary-acquisition/index.ts:184`](../../src/services/binary-acquisition/index.ts:184)). No auto-default exists ([`:154`](../../src/services/binary-acquisition/index.ts:154)).
4. **Both acquired binaries are downloaded, never bundled, and verified by pinned SHA-256 before extraction.** Semble: four platform hashes at [`semble-downloader.ts:87`](../../src/services/code-index/semble/semble-downloader.ts:87), verified at [`:757`](../../src/services/code-index/semble/semble-downloader.ts:757). DCG: five platform hashes at [`constants.ts:9`](../../src/services/destructive-command-guard/constants.ts:9), verified via [`manager.ts:107`](../../src/services/destructive-command-guard/manager.ts:107).
5. **Version ↔ checksum coupling is enforced in CI**, in both directions, so a silent artifact swap under an existing tag fails the build ([`verify-semble-release-coupling.mjs`](../../scripts/verify-semble-release-coupling.mjs:1); [`SEMBLE-RELEASE-GOVERNANCE.md:53`](../SEMBLE-RELEASE-GOVERNANCE.md:53)).
6. **Semble's authorship and licence chain are documented accurately**: upstream `MinishLab/semble`, MIT, author named; Roo+-controlled packaging repo builds the binaries; no Semble source in this repository ([`SEMBLE-RELEASE-GOVERNANCE.md:11`](../SEMBLE-RELEASE-GOVERNANCE.md:11)).
7. **DCG is opt-in by default.** `DEFAULT_DESTRUCTIVE_COMMAND_GUARD_ENABLED = false` ([`global-settings.ts:48`](../../packages/types/src/global-settings.ts:48)); the install path only runs when the setting is true ([`ExecuteCommandTool.ts:136`](../../src/core/tools/ExecuteCommandTool.ts:136)).
8. **Auto-approval is off by default.** `autoApprovalEnabled` and `alwaysAllowExecute` default to `false` ([`ClineProvider.ts:2772`](../../src/core/webview/ClineProvider.ts:2772), [`:2713`](../../src/core/webview/ClineProvider.ts:2713)).
9. **The fork is disclosed and the inherited licence is shipped.** Fork lineage named in the README ([`README.md:44`](../../README.md:44)); Apache-2.0 `LICENSE` present in the packaged root ([`src/LICENSE`](../../src/LICENSE:1)); upstream has no `NOTICE` file to reproduce.
10. **The repository forbids the one action that would aggravate the decision.** _"Never re-publish under another publisher to work around the decision"_ ([`release-publishing.md:25`](../runbooks/release-publishing.md:25)).
11. **The enforcement outcome is recorded, not concealed.** [`release-publishing.md:9`](../runbooks/release-publishing.md:9) states the block, the date, the representative id, and that reinstatement was refused.

---

## 6. Open questions only Microsoft can answer

Keep this to the minimum. Each is a factual question about the decision record, not an argument.

1. **Which clause(s) of the Publisher Agreement and Terms of Use were relied on, and which specific artefact or behaviour evidenced each?** The 2026-10-20 notice cites the instruments but no clause and no evidence. Without that, every item in §3 above is a hypothesis.
2. **What did "review and update the publisher and extensions accordingly" require, and which of those actions did Microsoft assess as not done?** Specifically: was a reply in the notice #305 thread required, was a re-submission required, and was the publisher profile itself part of the condition? This determines whether C2 or C1 is the operative gap.
3. **Is the block publisher-level or extension-level, and would a future submission be considered if the identified gaps were remediated and evidenced?** If the decision is final at publisher level, no further engineering is warranted; if it is final at extension level only, the remediation in §3 has a purpose. A related factual question: what was the status of the listing between 2026-09-25 and 2026-10-06, when reads returned `429` with no `Retry-After` and the gallery reported `TotalCount 0`?

---

## 7. Do-not-do list

Actions that would aggravate the position, with the reason each is excluded.

| Don't                                                                                                                                                             | Why                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Re-publish under a new publisher id, a new extension name, or an affiliated account                                                                               | Explicitly characterised as circumvention in the repo's own runbook ([`release-publishing.md:25`](../runbooks/release-publishing.md:25)); converts a publisher block into an account-level risk. |
| Re-use or "fix in place" a version number that already exists on a registry                                                                                       | Rejected on the record for `3.88.10`, with the mechanism documented ([`2026-09-25-prerelease-guard-bypass-3.88.10.md:88`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md:88)).       |
| Unpublish, delete, or silently retract anything to make the history look cleaner                                                                                  | `vsce unpublish` removes the whole extension and breaks users who pinned a version; silent retraction also destroys the evidence trail the request depends on.                                   |
| Poll the gallery, the publisher page, or the API to detect a change                                                                                               | The observed pattern (429 with no `Retry-After`, reads included, across hosts) makes further requests counterproductive and adds noise to a signal Microsoft may be watching.                    |
| Argue the decision, characterise it as unfair, or cite the blog's own recommendations as proof of compliance                                                      | The brief is a gap analysis, not an appeal. The blog is publisher guidance, not a compliance certificate.                                                                                        |
| Rewrite history in `DEBT.md`, the incident record, or git history to remove the awkward entries (audit-gate removal, the 3.88.10 accident, the open notice reply) | Those entries are the strongest available evidence of good faith; append corrections, never replace them.                                                                                        |
| Add new telemetry, analytics, or "quality" endpoints while the matter is open                                                                                     | Directly contradicts the "zero telemetry" claim and re-opens C6.                                                                                                                                 |
| Rename the product or publisher unilaterally to escape C5                                                                                                         | A rename after an enforcement action reads as evasion and would strand the user base; identity changes should follow, not precede, a decision record.                                            |
| Publish a "compliance" build to Open VSX and describe it as remediating the Marketplace decision                                                                  | Open VSX is a different registry with different terms; the claim would be inaccurate and would undercut the credibility of the rest of the record.                                               |

---

## Appendix A — Verification log

All commands were run in `/root/roo-plus` at `02fedec83d` on 2026-10-20.

| Check                     | Command (abridged)                                                                        | Result                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Telemetry transport       | `grep -rl "captureEvent(" --include=*.ts src \| wc -l`                                    | `0`                                                  |
| Telemetry token           | `grep -rl -i "telemetry" --include=*.ts src \| wc -l`                                     | `30`                                                 |
| Residual upstream brand   | `grep -rl -E "Zoo Code\|Zoo-Code\|zoo-code" --include=*.ts --include=*.json src \| wc -l` | `3`                                                  |
| Manifest licence field    | `grep -n '"license"' src/package.json`                                                    | absent                                               |
| Catalogue count sources   | manifest `includeSlugs`                                                                   | `90` pre-loaded                                      |
| Submodule content         | `ls custom-modes/custom_modes.d/*.yaml \| wc -l`                                          | `0` (submodule not checked out) → 301/302 unverified |
| Missing governance target | `find . -name marketplace-305-remediation-plan.md`                                        | only `./plans/marketplace-305-remediation-plan.md`   |
| Marketplace requests      | —                                                                                         | **none made**                                        |
| Publish tooling           | —                                                                                         | `vsce` **not run**                                   |
| `.env`                    | —                                                                                         | **not read**                                         |

## Appendix B — Commits cited

| Commit       | Date       | Subject                                                                                   | Relevance                                      |
| ------------ | ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `1aa18aef05` | 2026-09-08 | Security: resolve Marketplace notification #305                                           | The remediation the 2026-09-23 review examined |
| `ca87579481` | 2026-09-08 | Security: follow-up fixes for Marketplace notification #305                               | Same                                           |
| `d5abf5cb62` | 2026-09-15 | fix(ci): don't let a broken VS Marketplace PAT block the Open VSX pre-release             | Publishing already failing before the unblock  |
| `3b09f42884` | 2026-09-23 | chore: prepare v3.88.9 pre-release (Marketplace description + privacy link)               | The only listing-text update after the unblock |
| `c6975c50ec` | 2026-09-25 | Merge release-prep                                                                        | Trigger of the accidental pre-release publish  |
| `15a7934a44` | 2026-09-25 | chore: prepare v3.88.11 stable release                                                    | Stable displaced by the accident               |
| `46cec67a5e` | 2026-10-06 | ci(release): keep the stable publish resilient when the VS Marketplace is unavailable     | Marketplace demoted to best-effort             |
| `52a063e65b` | 2026-10-19 | chore(marketplace): add marketplace presence verification and release docs                | Presence probe added                           |
| `cff1a0a44e` | 2026-10-20 | chore(release): record Marketplace enforcement removal in publish docs and presence probe | Enforcement recorded                           |
| `89435116d4` | 2026-10-20 | docs(release): record that the pre-release channel is now Open VSX-only                   | PAT removed from the pre-release environment   |

---

_Prepared as an internal gap analysis. It states obligations and observable evidence; it does not offer legal advice, does not assess enforceability or liability, and does not recommend any course of action beyond remediating the gaps identified above and asking Microsoft the three questions in §6._
