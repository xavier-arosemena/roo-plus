---
description: "Prepare a new release of the Roo+ extension"
argument-hint: patch | minor | major
mode: code
---

1. Identify the most recent stable extension release:

    ```bash
    gh release view --json tagName,targetCommitish,publishedAt
    ```

2. Analyze changes since that release:

    ```bash
    gh pr list --state merged --base master --json number,title,author,url,mergedAt,closingIssuesReferences --limit 1000 -q '[.[] | select(.mergedAt > "TIMESTAMP") | {number, title, author: .author.login, url, mergedAt, issues: .closingIssuesReferences}] | sort_by(.number)'
    ```

3. For each PR with linked issues, fetch the issue reporter:

    ```bash
    gh issue view ISSUE_NUMBER --json number,author -q '{number, reporter: .author.login}'
    ```

4. Summarize the changes. If the user did not specify a release type, ask whether this should be a major, minor, or patch release.

    - The pre-release lane is separate from the stable lane.
    - CI generates a pre-release automatically on every `master` push as `major.ODD_MINOR.0-pre-release.<run>` (the odd minor keeps the pre-release outranking the latest stable on both marketplaces).
    - A stable release is a manual dispatch of the "Publish Stable Extension" workflow on `master`; it publishes the exact version in `src/package.json`.
    - When promoting a pre-release line to stable, use the same major.minor.patch as the pre-release (e.g. `3.81.0` for the `3.81.0-pre-release.N` line) so the stable build outranks the pre-release builds.

5. Review and update the Marketplace-facing root `README.md`.

    - Treat root `README.md` as the source of truth for Marketplace content.
    - Update the "What's New" section for the release when appropriate.
    - Do not manually edit `src/README.md`; the extension bundle step copies root `README.md` into `src/README.md`.
    - Check for stale upstream Zoo Code wording that should now say Roo+.

6. Write the release notes directly into `CHANGELOG.md` on the release branch.

    - Use the heading format `## [version]` (with square brackets) — e.g. `## [3.58.1]`. The publish workflow at `.github/workflows/marketplace-publish.yml` extracts release notes by matching this exact pattern; headings without brackets will be missed and the GitHub release will fall back to a generic message.
    - Always include contributor attribution and the PR number: use `(PR #<prNumber> by @username)`.
    - For PRs that close issues, include both issue and PR authors: `- Fix: Description (#123 by @reporter, PR #456 by @contributor)`.
    - For PRs without linked issues, include the PR number and author: `- Add support for feature (PR #456 by @contributor)`.
    - Provide brief descriptions of each item to explain the change.
    - Order the list from most important to least important.
    - Include every PR in the release window. Count the PRs and cross-reference the list before continuing.

7. For a major or minor release — curate the in-extension release announcement consciously:

    - Ask the user what three areas should be highlighted.
    - Update ALL four announcement layers (they must stay in sync):
        1. **English content** — `announcement.*` in `webview-ui/src/i18n/locales/en/chat.json` (`title`, `support`, `release.highlight1/2/3`).
        2. **Social links** — `webview-ui/src/components/chat/Announcement.tsx` (hardcoded links; update `EXTERNAL_LINKS` in `webview-ui/src/constants/externalLinks.ts` when needed).
        3. **Trigger** — bump `latestAnnouncementId` in `src/core/webview/ClineProvider.ts` so the new announcement shows once on next launch (the id is compared against the stored "last shown" id).
        4. **All 17 locale translations** — propagate the new highlight/support strings to every `webview-ui/src/i18n/locales/*/chat.json`.
    - Announcement bullets are rendered via plain `t()` (not `Trans`), so **do not wrap bullet text in `<bold>...</bold>` tags** — they render literally as text. Keep bullets plain text.
    - Ask the user to confirm the English announcement before proceeding.
    - Arrange translation updates for all supported locales affected by README, announcement, or package localization changes. Use the `/roo-translate` skill to propagate the updated `chat.json` announcement highlight keys and the "What's New" section to all supported locales.
    - All 17 locale READMEs should contain a translated "What's New" section. Check each one and add a translated section where missing.
    - When a feature is removed (e.g. cloud services), **remove the now-dead announcement translation blocks** (e.g. `announcement.cloudAgents.*`) from ALL locale files so stale copy doesn't linger.
    - Note: `scripts/find-missing-translations.js` only checks key presence, not value drift — manually verify the 17 locales match the new English values.

8. Create the release branch:

    ```bash
    git checkout -b release/v[version]
    ```

9. Bump the version in `src/package.json` to the target release version and ensure `CHANGELOG.md` and `src/CHANGELOG.md` are up to date.

    - Verify the `CHANGELOG.md` heading uses `## [version]` (with brackets).
    - Copy or sync `CHANGELOG.md` to `src/CHANGELOG.md` if the project keeps both.
    - Review the generated version and changelog before opening the PR.

10. Open a single release PR with the fully generated release state.

    ```bash
    git add CHANGELOG.md src/CHANGELOG.md src/package.json README.md locales/*/README.md src/package.nls*.json
    # If generated or updated:
    git add webview-ui/src/components/chat/Announcement.tsx src/core/webview/ClineProvider.ts
    git commit -m "chore: prepare v[version] release"
    git push origin release/v[version]
    gh pr create --title "Release v[version]" --body "Release preparation for v[version]. This PR includes the final version bump, changelog updates, Marketplace README updates, and any announcement changes." --base master --head release/v[version]
    ```

    - There is no separate version-bump PR in this flow.
    - The release PR should already contain the final version number and generated changelog updates.
    - If the release includes translated README or package-localization updates, include those files in the same PR.
    - Let the release validation workflow and normal PR checks run before merge.

11. Once the release PR is open and passing checks, get it approved by a reviewer, then merge it to `master` (the version bump and changelog must be on `master` before publishing).

    ```bash
    gh pr merge [pr-number] --squash
    ```

    - Do not create a `v[version]` tag — stable publishes are triggered manually, not by tag pushes.

12. Manually trigger the stable publish workflow on `master`.

    - In GitHub, go to **Actions → Publish Stable Extension → Run workflow**, select the `master` branch, and run it (or dispatch via the CLI: `gh workflow run marketplace-publish.yml --ref master`).
    - The workflow's approval gate bypasses users with write/admin access; other users must have an approved PR for the dispatched commit.
    - It builds and packages the version in `src/package.json`, publishes to VS Code Marketplace and Open VSX, and creates the GitHub release `v[version]` (with changelog notes) at the dispatched `master` commit.

13. Approve the `marketplace-production` environment deployment.

    - The environment gate fires and notifies the configured approvers.
    - A human approver must approve the deployment before the extension is published to either marketplace.

14. Verify the release.

    - Confirm the GitHub release `v[version]` exists with the VSIX attached, and the extension version is live on both marketplaces.
    - No further action is needed on `master`; the next `master` push automatically produces the next pre-release.
