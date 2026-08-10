# Hand-off Prompt — Architecture Reviewer: Coordinate & Delegate Phase 1 (Inbound Protocol Migration)

> **How to use:** Paste the block below verbatim into a new Architecture Reviewer session. It instructs that reviewer to coordinate and delegate Phase 1 through specialized `code`-mode sub-tasks, mirroring the Phase 0 execution model.

---

```markdown
You are an Architecture Reviewer coordinating Phase 1 of the Roo+ typed-message-protocol migration. Your job is to plan, delegate via `new_task` (mode=code), and verify the complete migration of the remaining 147 untyped inbound `WebviewMessage` types into the zod schema registry — domain by domain, one sub-task per domain. Do NOT implement the migration yourself; delegate to specialized sub-tasks and gate each on verification.

## Read first (context)

1. Architecture review (Phase 0 delivered 2026-08-10): [`docs/architecture-review-protocol-migration.md`](docs/architecture-review-protocol-migration.md)
2. S1 protocol plan (milestones S1-M3/M4, domain list, same-PR rule): [`plans/s1-message-protocol.md`](plans/s1-message-protocol.md)
3. ADR (decision + migration strategy): [`src/docs/adr-typed-message-protocol.md`](src/docs/adr-typed-message-protocol.md)
4. Debt register (item #5, transitional types): [`DEBT.md`](DEBT.md)
5. Inbound schema registry + parse boundary: [`packages/types/src/webview-messages/index.ts`](packages/types/src/webview-messages/index.ts)
6. Message type union source: [`packages/types/src/vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts) (`WebviewMessage` interface, line ~433)
7. Ratchet + analysis: [`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs) and [`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs)

## Verified baseline (2026-08-10 — do not re-derive, but re-confirm once)

- Inbound: `WebviewMessage.type` = **165** members; **18** registered in `webviewMessageSchemas`; **147** untyped; ratchet limit = **147**.
- Outbound: `ExtensionMessage.type` = **77** members; **5** registered (Phase 0 scaffold, `parseExtensionMessage`); **72** untyped; limit = **72**. (Outbound is Phase 2 — DO NOT touch it in Phase 1.)
- Both ratchets are wired into CI (`.github/workflows/code-qa.yml`, "Verify message-schema ratchet") and currently pass. Run `pnpm --filter @roo-code/types build && node scripts/verify-message-schemas.mjs` once to confirm before starting.

## Goal

Get the inbound untyped count from **147 → 0** by registering every remaining type, in the security-priority order below, one `new_task` sub-task per domain. Each landed domain must DECREASE the untyped count and ratchet `UNTYPED_MESSAGE_LIMIT` down to the new count so CI stays green and progress is forced.

## Phase 1 domain order (priority = security sensitivity)

1. **Terminal** (×9) — command execution surface; highest risk.
2. **Worktree** (×12) — filesystem mutation + path handling.
3. **Code-index** (×10) — settings + secret-status messages.
4. **Marketplace remaining** (×7) — install/remove side effects.
5. **Images** (×4) — file reads.
6. **Skills** (×6) + **Rules** (×5) — metadata responses; batch in ONE sub-task.
7. **Debug + misc** (×8+) — diagnostics; batch in ONE sub-task.

Each sub-task must extract its own exact type list from the `WebviewMessage.type` union in `packages/types/src/vscode-extension-host.ts` (cross-reference the domain lists in the ADR/plan; the union is the single source of truth). Do not trust the counts alone — verify against the union.

## Per-domain implementation recipe (the "same PR per domain" rule — non-negotiable)

Each delegated sub-task must do ALL of the following in one change set:

1. **Schema**: create `packages/types/src/webview-messages/<domain>.ts` with a zod schema per message type (`z.literal("type")` discriminated). REUSE existing schemas wherever possible (`rooCodeSettingsSchema`, `modeConfigSchema`, `todoItemSchema`, `queuedMessageSchema`, `marketplaceItemSchema`, etc.). Payload fields that map to existing typed interfaces (e.g. `WorktreeIncludeStatus`, `SkillMetadata`, `RuleMetadata`) should reference those types — never `z.unknown()` unless truly transitional.
2. **Register**: add each schema to `webviewMessageSchemas` AND to the `webviewMessageSchema` discriminated union in `packages/types/src/webview-messages/index.ts`; export the domain module.
3. **Handler**: narrow the corresponding handler module under [`src/core/webview/handlers/`](src/core/webview/handlers/) to consume the `z.infer` union for the domain (remove `message.values as any` / `message.settings as any` casts).
4. **Sender**: update the webview construction sites (`webview-ui/src/...`) that send these types, in the SAME change set (this is what keeps every domain atomic and breakage-free).
5. **Tests**:
    - `packages/types/src/webview-messages/__tests__/<domain>.spec.ts` (valid parses, malformed rejected, registry seeded) mirroring the existing per-domain specs.
    - Extend the existing handler spec(s) for the domain (e.g. `webviewMessageHandler.*.spec.ts`).
    - Extend `packages/types/src/webview-messages/__tests__/parseWebviewMessage.spec.ts` registry-seed test with the new types.
6. **Ratchet**: after the domain lands and its untyped count is known, add the domain's types to `MESSAGE_SCHEMA_BASELINE` in `scripts/message-schema-analysis.mjs` (this makes the new registration permanent) and ratchet `UNTYPED_MESSAGE_LIMIT` down to the new verified untyped count. Update the module comment derivation.
7. **Docs**: update `DEBT.md` item #5 count after the domain lands.

## Verification gates (every sub-task must pass before you accept it)

- `pnpm --filter @roo-code/types build` (ESM + CJS + DTS).
- `node scripts/verify-message-schemas.mjs` — **untyped count must have DECREASED** vs. the previous domain; baseline must include the new types; exit 0.
- `cd packages/types && npx vitest run` — full types suite green.
- `cd src && npx tsc --noEmit` — clean.
- `pnpm --dir src exec eslint --prune-suppressions --max-warnings=0 <touched-files>` — no suppression-count increases.
- Relevant handler/sender specs green (`cd src && npx vitest run <spec>`; `cd webview-ui && npx vitest run <spec>` if a sender changed).
- `node --test scripts/verify-message-schemas.spec.mjs` — ratchet specs green.

## Orchestration rules

- Create sub-tasks ONE at a time — `new_task` MUST be called alone, never alongside other tools.
- Domains are largely independent; the ordering above is priority, not hard dependency. Do NOT land the next domain until the previous one's ratchet update is in and CI-green, so `UNTYPED_MESSAGE_LIMIT` always tracks reality.
- Give each sub-task: the exact domain, its type list (extracted from the union), the files to touch, the implementation recipe (above), the verification gates, and the constraint list (below). Provide rich context so the sub-task is self-contained.
- After each sub-task, spot-check the diff and re-run the ratchet yourself before delegating the next.
- Progress tracking: keep the inbound registered/untyped count visible; after the final domain, the untyped count must be 0 and `UNTYPED_MESSAGE_LIMIT` must be 0.

## Constraints (pass to every sub-task)

- NO `.changeset` files (maintainers manage them).
- NO new eslint suppressions; no `as any` — prefer typed APIs or precise `unknown` type guards with a justifying comment (double assertions only as a last resort, documented).
- NO floating promises — `void`/`await`/`.catch()` as appropriate.
- Keep the `WebviewMessage` interface name and all construction sites compiling until a domain is fully migrated (the same-PR rule guarantees this).
- Do NOT touch the outbound `ExtensionMessage`/`extension-messages` code (Phase 2 scope).
- Do NOT modify `scripts/message-schema-analysis.mjs`/`verify-message-schemas.mjs` beyond the baseline/limit ratchet updates described above.

## Completion criteria for Phase 1

- Inbound untyped count = **0**; `UNTYPED_MESSAGE_LIMIT` = 0; all 165 types registered; ratchet passes.
- Every handler consumes the typed `z.infer` union (no `as any` payload casts remain in `src/core/webview/handlers/`).
- `DEBT.md` item #5, the ADR, and the review doc updated to the terminal state.
- Update [`docs/architecture-review-protocol-migration.md`](docs/architecture-review-protocol-migration.md) Phase 1 section to DELIVERED with the final verified counts.
- Report: final registered count, final untyped count, domains completed, and any residual transitional types with rationale (none expected).

Then, with your remaining capacity, produce a Phase 2 hand-off prompt for the outbound `ExtensionMessage` migration (72 types) following the same template.
```

---

## Notes for the coordinator (context beyond the prompt)

- **Effort:** Phase 1 is ~147 types across 7 sub-tasks; each domain is 2–4 days of part-time work with the same-PR discipline → roughly 3–5 weeks end-to-end; batching skills+rules and debug+misc cuts PR count to ~5–6 change sets.
- **Highest-risk domains** (terminal, worktree) should go first — they carry execution/filesystem side effects and deliver the most security value.
- **Reuse-first:** the codebase already has schemas for many payload shapes (`rooCodeSettingsSchema` in `packages/types/src/global-settings.ts`, `modeConfigSchema`, `todoItemSchema`, `MarketplaceItem`, `WorktreeIncludeStatus`, `SkillMetadata`, `RuleMetadata`, `QueuedMessage`). Sub-tasks should reference these rather than re-typing shapes, which keeps the schemas small and drift-free.
- **Ratchet mechanics:** `MESSAGE_SCHEMA_BASELINE` only ever grows; `UNTYPED_MESSAGE_LIMIT` only ever decreases. Landing a domain without ratcheting the limit is a partial delivery — the coordinator should reject it.
