# SYNC-18 — vscode-lm robustness — resolution record

- batch: SYNC-18
- base: a392616921
- head: 9e23f8be2c
- conflicted_files: src/api/providers/**tests**/vscode-lm.spec.ts, src/api/providers/vscode-lm.ts, src/api/transform/**tests**/vscode-lm-format.spec.ts, src/api/transform/vscode-lm-format.ts

> **Scope.** One row shipped (`aaa22e167`, #1605). Its sibling `0f75a60bc` (#1606) was deferred as
> dependency-blocked on the unsynced `08d05eb0f` (#1188) and is therefore outside this range. The
> only git conflict was the `vscode-lm.ts` import block; the other three files auto-merged.

### src/api/providers/vscode-lm.ts [shape: modify/modify]

- upstream: aaa22e167 — sanitizes lone UTF-16 surrogates in the system prompt, message text and tool input before the VS Code LM request, and widens the import to `ApiStreamChunk` plus the new sanitizer helpers.
- fork: 5f582a512c — the fork's `completePrompt` options plumbing, which the import change does not touch.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's import block is a strict superset of the fork's — it keeps `convertToVsCodeLmMessages` and `extractTextCountFromMessage` and only adds `ApiStreamChunk` plus the sanitizers the picked code now uses — so the superset is the surviving intent on both sides.
- dropped: none
- evidence: src/api/providers/**tests**/vscode-lm.spec.ts — the surrogate cases fail before, pass after; gates: gate:sync
- divergence: none

### src/api/providers/**tests**/vscode-lm.spec.ts [shape: modify/modify]

- upstream: aaa22e167 — adds surrogate-sanitization coverage for message text, tool input, tool names and nested arguments.
- fork: 20dd96666 — the fork's shared reset helper, reused by this provider spec.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The new cases are additive to the fork's spec and the auto-merge preserved the fork's harness and existing assertions untouched.
- dropped: none
- evidence: src/api/providers/**tests**/vscode-lm.spec.ts — 111 tests pass; gates: gate:sync
- divergence: none

### src/api/transform/vscode-lm-format.ts [shape: modify/modify]

- upstream: aaa22e167 — adds the `sanitizeSurrogates` / `sanitizeSurrogatesDeep` / `sanitizeToolNameSurrogates` / `decodeToolNameSurrogates` helpers used at the conversion boundary.
- fork: 5b7ae240b6 — the fork's transform module as last changed by the SDK upgrade; the fork carries no competing sanitizer logic.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The helpers are additive to the fork's transform module and collided with no fork-specific conversion behaviour, so upstream's implementation is adopted verbatim.
- dropped: none
- evidence: src/api/transform/**tests**/vscode-lm-format.spec.ts — the sanitizer cases fail before, pass after; gates: gate:sync
- divergence: none

### src/api/transform/**tests**/vscode-lm-format.spec.ts [shape: modify/modify]

- upstream: aaa22e167 — covers the surrogate sanitizers and the tool-name round-trip.
- fork: 5b7ae240b6 — the fork's format spec as last changed by the SDK upgrade.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The added cases extend the fork's spec and the clean auto-merge left every existing assertion in place.
- dropped: none
- evidence: src/api/transform/**tests**/vscode-lm-format.spec.ts — 111 tests pass across both specs; gates: gate:sync
- divergence: none
