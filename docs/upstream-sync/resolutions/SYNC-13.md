# SYNC-13 — Provider quick-wins (opencode-go chain) — resolution record

- batch: SYNC-13
- base: 1850da0bb
- head: 07f0966a8
- conflicted_files: packages/types/src/__tests__/opencode-go.test.ts, packages/types/src/providers/opencode-go.ts, src/api/providers/__tests__/kenari.spec.ts, src/api/providers/__tests__/kimi-code.spec.ts, src/api/providers/__tests__/lite-llm.spec.ts, src/api/providers/__tests__/nanogpt.spec.ts, src/api/providers/__tests__/opencode-go.spec.ts, src/api/providers/__tests__/openrouter.spec.ts, src/api/providers/__tests__/requesty.spec.ts, src/api/providers/__tests__/unbound.spec.ts, src/api/providers/__tests__/vercel-ai-gateway.spec.ts, src/api/providers/fetchers/__tests__/opencode-go.spec.ts, src/api/providers/fetchers/opencode-go.ts, src/api/providers/opencode-go.ts, src/api/providers/router-provider.ts

> **Scope.** `base`/`head` are pinned to the sync picks only (`1850da0bb...07f0966a8`),
> so the range is exactly these 15 code files. The 2026-10-01 register refresh and
> the `triage-raw.tsv` extension live in `1850da0bb` (the branch's first commit) and
> are therefore outside this record's range. The only live conflict in the batch was
> a **modify/delete** on `src/api/providers/__tests__/zoo-gateway.spec.ts`, which the
> fork had already removed (cloud removal, see `docs/adr/adr-cloud-removal.md`) — its
> upstream hunk was dropped and the deletion kept (see the note below); because the
> file is absent on both `origin/master` and `HEAD`, it is not part of the diff range
> and so has no block. The row flip for the predecessor `6ad8a6e58` (SYNC-5) and the
> SYNC-13 flips live in the register, not here.

### packages/types/src/__tests__/opencode-go.test.ts [shape: modify/modify]

- upstream: a80b3b3ab (+ `cc9c0afe9`) — adds opencode-go type coverage for the gpt-5.6-luna `/v1/responses` route and the corrected context limits.
- fork: 07f0966a8a — the fork's opencode-go type tests and identifier expectations.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's new type cases are additive to the fork's opencode-go test table; the fork's existing assertions are preserved unchanged.
- dropped: none
- evidence: packages/types/src/__tests__/opencode-go.test.ts; gates: check-types, lint
- divergence: none

### packages/types/src/providers/opencode-go.ts [shape: modify/modify]

- upstream: a80b3b3ab (+ `cc9c0afe9`) — records real context/output limits for opencode-go models in the shared provider table.
- fork: 07f0966a8a — the fork's opencode-go model metadata entries.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The upstream model-limit metadata extends the fork's provider table without displacing any fork-specific entry or default.
- dropped: none
- evidence: packages/types/src/__tests__/opencode-go.test.ts; gates: check-types, lint
- divergence: none

### src/api/providers/__tests__/kenari.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds a `refreshModels` mock to the shared router-provider spec harness so cost estimates are exercised against a live catalog.
- fork: 0852093504 — the fork's kenari spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The mock addition is harness plumbing; the fork's kenari case list and assertions are retained as the surviving intent.
- dropped: none
- evidence: src/api/providers/__tests__/kenari.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/kimi-code.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — wires the `refreshModels` mock into the router-provider harness used by the kimi-code suite.
- fork: 0852093504 — the fork's kimi-code spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's mock wiring merges into the fork's harness while the fork's identifier expectations remain the authoritative behaviour.
- dropped: none
- evidence: src/api/providers/__tests__/kimi-code.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/lite-llm.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds the `refreshModels` stub for cost-estimate coverage in the router-provider harness.
- fork: 0852093504 — the fork's lite-llm spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The stub is additive plumbing and does not change the fork's lite-llm assertions, which are kept verbatim.
- dropped: none
- evidence: src/api/providers/__tests__/lite-llm.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/nanogpt.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds the zero-price cost case for an unfetched model on top of the shared harness.
- fork: 2868dec51 — the fork's nanogpt tool-parameter tests (SYNC-5 pick of `7e85e2793`).
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's cost case is merged in while the fork's nanogpt tool-parameter coverage, added by an earlier pick, survives intact.
- dropped: none
- evidence: src/api/providers/__tests__/nanogpt.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/opencode-go.spec.ts [shape: modify/modify]

- upstream: a80b3b3ab (+ `7bb14e44e`, `cc9c0afe9`) — adds `/v1/responses` routing, the conversation session header, and context-limit specs.
- fork: 07f0966a8a — the fork's opencode-go provider spec.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The earlier conflict here was the missing prerequisite `refreshModels` mock; it was landed by the `6ad8a6e58` pick, after which upstream's three opencode-go specs applied cleanly.
- dropped: none
- evidence: src/api/providers/__tests__/opencode-go.spec.ts; gates: check-types, lint
- divergence: none

### src/api/providers/__tests__/openrouter.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds the `refreshModels` mock to the openrouter router-provider harness.
- fork: 1aa18aef0 — the fork's openrouter spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's mock is additive to the fork's openrouter suite and leaves the fork's model-price cases untouched.
- dropped: none
- evidence: src/api/providers/__tests__/openrouter.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/requesty.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds the shared `refreshModels` mock used by the router-provider suites.
- fork: 47d864776 — the fork's requesty spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The shared mock addition lands without disturbing the fork's requesty provider expectations or its harness shape.
- dropped: none
- evidence: src/api/providers/__tests__/requesty.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/unbound.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds the `refreshModels` mock to the unbound router-provider harness.
- fork: 47d864776 — the fork's unbound spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's harness plumbing is merged while the fork's unbound assertions remain the behaviour under test.
- dropped: none
- evidence: src/api/providers/__tests__/unbound.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/__tests__/vercel-ai-gateway.spec.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — adds the `refreshModels` mock for cost coverage in the gateway harness.
- fork: 47d864776 — the fork's vercel gateway spec harness.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The mock is additive and the fork's gateway assertions remain the authoritative expectations after the merge.
- dropped: none
- evidence: src/api/providers/__tests__/vercel-ai-gateway.spec.ts; gates: gate:sync
- divergence: none

### src/api/providers/fetchers/__tests__/opencode-go.spec.ts [shape: modify/modify]

- upstream: cc9c0afe9 — adds fetcher tests asserting the corrected opencode-go context limits.
- fork: 07f0966a8a — the fork's opencode-go fetcher spec.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's fetcher limit tests are imported for the fork's opencode-go fetcher, which had no competing limit assertions.
- dropped: none
- evidence: src/api/providers/fetchers/__tests__/opencode-go.spec.ts; gates: check-types, lint
- divergence: none

### src/api/providers/fetchers/opencode-go.ts [shape: modify/modify]

- upstream: cc9c0afe9 — reports the true context limits instead of the placeholder values shown by the context meter.
- fork: 8c3ae1e8b — the fork's opencode-go fetcher.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The fork's fetcher carried no competing limit logic, so upstream's corrected limit reporting is adopted as the surviving behaviour.
- dropped: none
- evidence: src/api/providers/fetchers/__tests__/opencode-go.spec.ts; gates: check-types, lint
- divergence: none

### src/api/providers/opencode-go.ts [shape: modify/modify]

- upstream: a80b3b3ab (+ `7bb14e44e`, `cc9c0afe9`) — routes gpt-5.6-luna through `/v1/responses`, sends the conversation session header, and surfaces correct context limits.
- fork: b7f78f8ef — the fork's opencode-go provider implementation.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Upstream's routing, header and limit changes are re-expressed in the fork's provider file, whose existing structure and header builder are preserved.
- dropped: none
- evidence: src/api/providers/__tests__/opencode-go.spec.ts; gates: check-types, lint
- divergence: none

### src/api/providers/router-provider.ts [shape: modify/modify]

- upstream: 6ad8a6e58 — stops filling the UI cost estimate from `defaultModelInfo` prices when the selected model is not in the catalog, and adds a negative-cache retry window around `refreshModels`.
- fork: b7f78f8ef — the fork's router-provider base class.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The zero-price fallback and retry window are provider-generic and did not collide with the fork's router-provider structure, so they applied verbatim.
- dropped: none
- evidence: src/api/providers/__tests__/opencode-go.spec.ts; gates: check-types, lint
- divergence: none

## Dropped hunks (not `dropped:` — outside R5)

- `src/api/providers/__tests__/zoo-gateway.spec.ts` — upstream `6ad8a6e58` modified this file, but the fork had already deleted it (cloud removal, `docs/adr/adr-cloud-removal.md`). The modify/delete conflict was resolved by keeping the fork's deletion, so upstream's zoo-gateway spec hunk is intentionally dropped. The file is absent on both `origin/master` and `HEAD`, so it is neither an R5 path nor a file the batch touched in `base...head`; it is recorded here as prose rather than as a `dropped:` entry.
