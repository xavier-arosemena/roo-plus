# Runbook: dependency advisories and the `pnpm audit` gate

Scope: the `audit-dependencies` job in
[`code-qa.yml`](../../.github/workflows/code-qa.yml:1), which runs a single command:

```bash
pnpm audit --audit-level=high
```

Exit 1 on **any** high or critical advisory, in any workspace or lockfile path. Moderate and low
advisories are reported but do not fail the job. This file records what has been fixed, what is
deliberately still open, the override mechanics that repeatedly defeat a naive fix, and the rule for
advisories that have no patched release.

## State on 2026-11-03

| Snapshot         | Total | Critical | High  | Moderate | Low | Gate                      |
| ---------------- | ----- | -------- | ----- | -------- | --- | ------------------------- |
| Before this pass | 63    | 5        | 15    | 33       | 10  | exit 1                    |
| After this pass  | 33    | **0**    | **1** | 26       | 6   | exit 1 (one high remains) |

The single remaining high is `zod` (see below). Everything else this pass touched is green.

## What was fixed

Direct dependency bumps (declared in the workspace `package.json`):

| Package                     | From      | To        | Advisory                                        | Where                   |
| --------------------------- | --------- | --------- | ----------------------------------------------- | ----------------------- |
| `simple-git`                | `^3.27.0` | `^4.0.1`  | CRITICAL + HIGH (`>=3.15.0 <4.0.1`, `<=3.36.0`) | `src`                   |
| `@modelcontextprotocol/sdk` | `1.29.0`  | `1.32.0`  | HIGH x4 (`<1.32.0`)                             | `src`                   |
| `shell-quote`               | `^1.8.2`  | `^1.11.0` | CRITICAL (`>=1.8.4 <1.11.0`)                    | `src`, `webview-ui`     |
| `undici`                    | `^6.28.0` | `^6.29.1` | HIGH x3 (`<6.29.1`)                             | `src`                   |
| `dompurify`                 | `^3.4.13` | `^3.4.17` | CRITICAL + HIGH (`<=3.4.16`)                    | `webview-ui`            |
| `vite`                      | `8.1.0`   | `8.1.6`   | HIGH (`>=8.0.0 <=8.1.5`)                        | `webview-ui` + override |

Transitive pins ([`pnpm-workspace.yaml`](../../pnpm-workspace.yaml:1) `overrides`):

| Package            | Pinned to                                       | Advisory            | Why an override                                          |
| ------------------ | ----------------------------------------------- | ------------------- | -------------------------------------------------------- |
| `proxy-addr`       | `^2.0.8`                                        | CRITICAL (`<2.0.8`) | express resolves its own range under the MCP SDK         |
| `body-parser`      | `^2.4.0` (global **and** `express>body-parser`) | HIGH (`<2.4.0`)     | see the precedence trap below                            |
| `source-map-js`    | `^1.2.2`                                        | HIGH (`<1.2.2`)     | transitive via `@vitest/coverage-v8>magicast` and `vite` |
| `follow-redirects` | `^1.16.2`                                       | HIGH (`<=1.16.1`)   | transitive via `ovsx`                                    |
| `shell-quote`      | `^1.11.0`                                       | CRITICAL            | see the precedence trap below                            |
| `undici`           | `^6.29.1`                                       | HIGH x3             | see the range trap below                                 |

One code change was required: `simple-git` 4 **removed the callable default export**, so
[`ShadowCheckpointService.ts`](../../src/services/checkpoints/ShadowCheckpointService.ts:7) now
imports the named factory (`import { simpleGit } from "simple-git"`). Its spec already used the
named form, so the tests were unchanged and 39/39 pass.

## Three override traps that make a "fix" look applied when it is not

These cost real time; read them before touching `overrides`.

1. **A global override beats a `package.json` bump.** `shell-quote` was bumped to `^1.11.0` in both
   workspaces and `pnpm audit` still reported the critical at 1.9.0, because
   `overrides.shell-quote: "^1.9.0"` pinned the resolved version. The workspace range and the
   override must move together.
2. **A path-specific override beats the global one.** `overrides.body-parser: "^2.4.0"` had no
   effect while `overrides["express>body-parser"]: "^2.3.0"` existed. Both must name the patched
   minor.
3. **An open-ended range resolves to the next major.** `undici: ">=6.29.1"` installed **8.12.3**,
   silently crossing a major on a package whose `fetch`/`Agent` surface this extension uses.
   Use the caret (`^6.29.1`) to stay on the line the code targets.

Always confirm the **resolved** version, not the declared one:

```bash
grep -nE "^  (shell-quote|undici|body-parser|simple-git|zod)@" pnpm-lock.yaml
```

## Deliberately still open: `zod` (HIGH, needs a migration not a bump)

- Advisories: `zod <4.6.6` → patched `>=4.6.6`. That is a **major** upgrade from the pinned
  `3.25.76`.
- `zod` is pinned once and resolved by `packages/types`, `packages/core`, `packages/build`, `src`
  and `webview-ui`. Schema instances cross package boundaries, so mixing zod 3 and zod 4 inside the
  monorepo risks duplicate type identities — this needs one coordinated migration, not a
  per-package bump.
- A scoped `"@roo-code/build>zod": "^4.6.6"` override was tried and **reverted**: it resolves, but
  the audit finding simply moves to the next workspace (`packages__core>zod`), so it buys nothing
  and ships an unverified major in a build tool. Do not re-add it as a "partial fix".
- Plan: migrate `packages/types` schemas first (they are the shared vocabulary), then `core`, `src`
  and `webview-ui`, and only then remove the `zod: "3.25.76"` override. Track it as its own change;
  `pnpm audit --audit-level=high` stays red until it lands.

**Until then, `audit-dependencies` is legitimately red on `master`.** Do not "fix" that by
lowering `--audit-level`, adding `pnpm.auditConfig.ignoreCves`, or otherwise suppressing: the
remaining finding is real and known.

## Advisories with no patched release — the decision rule

The rule, stated once so it does not get re-litigated per advisory:

1. **If a patched version exists in the declared major → take it** (bump or override).
2. **If the patch is only in a new major → decide explicitly**, in a change that carries the code
   migration and its tests (simple-git 4 is the model: one-line import change + 39 tests).
3. **If no patched version exists at all → do not block indefinitely, and do not silently ignore.**
   Record it here with: package, advisory URL, why no patch exists, and the chosen disposition —
   remove/replace the depending tool, or carry a dated exception with an owner and a re-check date.
4. **Never** add a blanket suppression, downgrade the severity gate, or drop a dependency from the
   audit without a runbook entry.

### `braces` — current status: not flagged

`braces@3.0.3` is installed, and **`pnpm audit` does not report it today** (verified: zero matches
for `braces` in `pnpm audit --json`). Earlier notes in this repo claimed "`braces` has no patched
version"; that claim is not reproducible against the current advisory database and is therefore
**not** recorded as an open exception. If it reappears, apply rule 3 above.

Residual moderate/low findings (26 moderate, 6 low at the time of writing) are dominated by
dev-only tooling paths such as `apps/cli>@inkjs/ui>deepmerge`; they do not gate the job. Re-run the
command below before concluding anything about them — the advisory database moves daily.

## Re-verifying

```bash
pnpm install --frozen-lockfile          # lockfile must be consistent with the manifests
pnpm audit --audit-level=high; echo "gate exit: $?"   # the CI gate; 0 = green
pnpm audit --json | jq -r '.advisories | to_entries[] | select(.value.severity=="high" or .value.severity=="critical") | "\(.value.severity)\t\(.value.module_name)\t\(.value.patched_versions)"'
grep -nE "^  [a-z-]+@" pnpm-lock.yaml   # confirm RESOLVED versions
```

Behavioural checks for the majors taken here (all green on 2026-11-03):

```bash
pnpm check-types                          # 9/9
pnpm --filter roo-plus bundle             # esbuild with simple-git 4 / undici 6.29.1
pnpm --filter @roo-code/vscode-webview build   # vite 8.1.6 + dompurify 3.4.17
cd src && npx vitest run services/checkpoints  # 39/39 (simple-git 4 import change)
```
