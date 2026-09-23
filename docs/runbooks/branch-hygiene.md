# Runbook: Branch Lifecycle & Hygiene

Scope: `xavier-arosemena/roo-plus` (`origin`); `upstream` (`Zoo-Code-Org/Zoo-Code`) is read-only for this repo. Owner: maintainers. Last audit: 2026-09-23.

## Purpose

Keep the branch namespace small, honest, and unambiguous: every remote branch should map to an open PR or an active release concern. This runbook defines the branch lifecycle, the audit procedure, and the evidence required before deleting a branch. It exists because the 2026-09-23 audit found four local branches with no open work (two merged, two superseded) plus a five-week-old orphaned stash.

## Invariants

1. **`master` is the only long-lived branch.** Feature, fix, docs, chore, and test work happens on short-lived branches that merge into `master` and are then deleted, locally and on `origin`.
2. **The version line defines a release, not a branch.** Publishing — including the Open VSX pre-release guard, the version-uniqueness/monotonicity checks, and announcement verification — is owned by [`.github/workflows/pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:1) on `master`, as required by the release policy in [`AGENTS.md`](../../AGENTS.md). There are no `release/*` branches and no out-of-band publish workflows (see [Retired](#retired-releasev3880-prerelease-and-out-of-band-publishing)).
3. **A branch is deleted when its PR reaches a terminal state** — merged, or closed as superseded with the superseding PR linked in the closing comment.
4. **Nothing lives only in `git stash`.** Stashes are local, unaudited, invisible to reviewers, and silently block `git pull`; persistent work-in-progress goes on a short-lived `wip/*` branch.
5. **Work is never re-landed on the same branch.** If a PR closes unmerged, rebranch from current `master` and reference the closed PR. Do not resurrect the old branch with a force-push; that is how duplicate-history branches are created.

## Lifecycle

| Phase        | Rule                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create       | Branch from current `origin/master`. Sanctioned prefixes: `feat/*`, `fix/*`, `docs/*`, `chore/*`, `test/*`, `wip/*`.                                                                |
| Stay current | Refresh against `origin/master` (rebase, or merge `master` in) before requesting review. A branch trailing `master` by more than roughly 20 commits must be refreshed before merge. |
| Merge        | Squash-merge single-intent branches; keep merge commits for stacked or released work, matching existing history. Never merge with `--no-ff` purely for cosmetics.                   |
| Delete       | Immediately after merge or supersession: local **and** remote (`git push origin --delete <branch>`). Merged refs must not linger.                                                   |
| Audit        | Weekly, and before starting a new minor release line.                                                                                                                               |

## Audit procedure

```bash
git fetch --all --prune          # `fetch.prune` is enabled in this working copy
git remote prune origin

# 1. Local inventory with tracking state
git --no-pager branch -vv
git for-each-ref --format='%(refname:short)|upstream=%(upstream:short)|track=%(upstream:track)' refs/heads

# 2. Merged into the default branch? ahead/behind?
for b in $(git for-each-ref --format='%(refname:short)' refs/heads | grep -v '^master$'); do
	printf '%s merged=%s ahead/behind=%s\n' "$b" \
		"$(git merge-base --is-ancestor "$b" origin/master && echo yes || echo no)" \
		"$(git rev-list --left-right --count origin/master..."$b")"
done

# 3. Local branches with no upstream (unpushed work or stale pointers)
git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads | awk '$2==""{print $1}'

# 4. Local-only commits on any branch (unpushed work)
git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads | while read -r b u; do
	[ -n "$u" ] && echo "$b: $(git rev-list --count "$u".."$b") unpushed"
done

# 5. Remote branches with no open PR (deletion candidates)
gh pr list --state open --limit 200 --json headRefName -q '.[].headRefName' | sort > /tmp/open-pr-heads
git ls-remote --heads origin | awk '{sub("refs/heads/","",$2); print $2}' | grep -v '^master$' | sort > /tmp/remote-heads
comm -13 /tmp/open-pr-heads /tmp/remote-heads

# 6. Stashes, including those whose base branch no longer exists
git --no-pager stash list
```

## Deletion decision tree

1. `git merge-base --is-ancestor <ref> origin/master` succeeds → **merged**: delete local and remote, no further evidence needed.
2. Not an ancestor, but its PR is `MERGED` (squash/rebase) and `git cherry -v origin/master <branch>` reports the patch as already applied (`-` prefix) → **superseded**: delete local and remote, link the merge PR.
3. Not an ancestor and the PR is `CLOSED` unmerged → **prove supersession first**: `git cherry -v origin/master <branch>` for patch identity plus a blob comparison of every touched file against `origin/master` (`git rev-parse <branch>:<path>` vs `git rev-parse origin/master:<path>`). Record the evidence in the PR, then delete local and remote.
4. Any branch with local-only commits, or with a live stash based on it → **stop**. Push it or open a PR before deleting anything.

Record deleted tips in the audit log so they stay recoverable from the object database and from GitHub's commit URLs.

## Current state (post-audit 2026-09-23)

Only `master` remains, in sync with `origin/master`. Deleted in this cleanup:

| Branch                                             | Tip                              | Reason                                                                                                                                                                                                                |
| -------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/privacy-redact-disclosed-infra` (local only) | `5ab60fa03`                      | Tip is an ancestor of `origin/master`; content landed via PR #357.                                                                                                                                                    |
| `docs/privacy-redact-master` (local + remote)      | `18bff5a04`                      | PR #358 closed unmerged; the redactions and guard assets were re-landed by PR #360 (`cadc8f6d9`). The redacted docs are blob-identical to `master`, and `master`'s guard script is a strict superset of the branch's. |
| `fix/taskhistory-byte-bound` (local + remote)      | `7589945b2` (remote `5ab60fa03`) | Merged via PR #357; the remote-only commit was already contained in `master`.                                                                                                                                         |
| `release/v3.88.0-prerelease` (local + remote)      | `96e3b1453` (remote `eadd6c1b0`) | PR #320 merged; the line is superseded by the `master`-based pre-release flow. The local branch had 0 local-only commits.                                                                                             |

Orphaned stash `158bc420ebb3ab6c50f81c22fb1efb9e00c83d1f` (`wip-dependabot`, base branch `dependabot/npm_and_yarn/minor-patch-b161c5363f` since deleted) was dropped after verifying it held no unique work:

- Its `src/package.json` / `webview-ui/package.json` pins (`web-tree-sitter@0.25.6`, `@playwright/test@1.60.0`, `playwright-core@1.60.0`) match what `master` already resolves, and the accompanying `pnpm-lock.yaml` churn was the same downgrade already present on `master`.
- Its only other change was a stale local flip of the tooltip specs to select `role="tooltip"`; `master`'s suite passes 8/8 as-is, so the flip is not a fix and would change what the tests assert.

Recovery while the object survives `gc`: `git stash apply 158bc420ebb3ab6c50f81c22fb1efb9e00c83d1f`.

## Retired: `release/v3.88.0-prerelease` and out-of-band publishing

The branch existed to trigger the branch-only workflow `.github/workflows/ovsx-prerelease-publish.yml` (`on: push: branches: [release/v3.88.0-prerelease]`); that file was removed from `master` together with the branch. Its Open VSX guard — query published versions, fail on an already-published version, fail when the committed patch is not greater than the max published patch on the minor line, verify announcement data — is implemented on `master` in [`.github/workflows/pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:145) (`on: push: branches: [master]` plus `workflow_dispatch`). Retiring the branch removed a duplicate publish path, not a capability. If the branch-only workflow is ever reconsidered, recover it from `96e3b1453` / `89257ad6d` (also visible in PR #320) and reconcile it with `pre-release-publish.yml` first.

## Repository settings and maintainer actions

- `fetch.prune=true` was set repo-locally on 2026-09-23 so deleted remote branches stop leaving stale remote-tracking refs. Re-apply after a fresh clone.
- Enable automatic head-branch deletion on merge: `gh api -X PATCH repos/xavier-arosemena/roo-plus -f delete_branch_on_merge=true` — still pending; until it is enabled, post-merge deletion is a manual step.
- Keep `master` protected with required status checks, and pull with `git pull --ff-only` so local `master` never gains unpublished commits.
- Dependency-bot branches (`dependabot/*`) are owned by the bot: do not push to them, and treat any stash created from them as throwaway.

## Audit log

| Date       | Result                                                                                                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | 4 stale branches deleted (2 merged, 2 superseded), 1 orphaned stash dropped, `fetch.prune` enabled. Root finding: PR #358 was closed and its intent re-landed by PR #360, leaving duplicate-history artifacts — the pattern invariants 3–5 prevent. |
