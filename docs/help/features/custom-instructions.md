# Custom Instructions & Rules

Custom instructions tell Roo+ how you want it to work: your conventions, your preferred
libraries, the things it should never do. Roo+ supports instructions at several scopes so
you can keep shared guidance in one place and project-specific guidance in the project.

## Setting custom instructions

The simplest form is a block of instruction text. You can set it at two scopes:

- **Global** — applies to every workspace and every mode.
- **Workspace** — applies only to the current project, so a team can share it.

Enter global instructions in **Settings → Modes → Global custom instructions**, and use
the per-mode fields for guidance specific to one mode.

## Setting Up Global Rules

Global custom instructions work best for short, always-applicable guidance. For anything
longer, prefer a rules directory (next section), which keeps instructions in reviewable
files and out of a single text box.

To use the global rules directory, Roo+ reads rule files from a dedicated location on
your machine — outside any single project — so the same rules follow you into every
workspace. Create the directory and add Markdown files describing your rules; Roo+ loads
every file it finds there, so you can split guidance by topic.

## Global Rules Directory

The global rules directory is the home for instructions that should apply everywhere but
are too long for a single field. Roo+ loads every rule file in the directory and injects
them into the model's context, in a predictable order.

- Put one concern per file (for example `coding-style.md`, `testing.md`,
  `git-workflow.md`).
- Keep each file focused. Roo+ loads every file in the directory and combines them, so
  prefix filenames with numbers (for example `01-style.md`, `02-testing.md`) if you need a
  specific order.
- Rules that should apply to only one mode go in that mode's own rule directory
  (`.roo/rules-<slug>/`), not the shared global directory.

If a rule should live with the project instead, use the workspace-level rules directory
under `.roo/rules/` so it is committed and shared.

## Workspace-level instructions

Workspace instructions travel with the repository. Roo+ reads them from `.roo/` in the
project root, which means a team can review changes to the rules through the same pull
requests as the code. Prefer workspace rules for anything that is specific to one
codebase, and global rules for personal or cross-project conventions.

## How instructions combine

When several layers of guidance are present, Roo+ combines them, with the most specific
taking precedence on a conflict:

1. Built-in defaults.
2. Global instructions and the global rules directory.
3. Workspace instructions and `.roo/rules/`.
4. Mode-specific instructions and mode rule files.

Guidance that does not conflict is additive: everything is included, so keep layers
complementary rather than repetitive.

## AGENTS.md and single-file rules

Roo+ recognizes `AGENTS.md` as a first-class convention. An `AGENTS.md` file at the
repository root carries the "Agent Rules Standard" — durable guidance for agents working
in the repo, such as build commands, code-quality expectations, and conventions. Because
it lives in the repository, it is versioned and reviewed like any other file. (Roo+ also
accepts `AGENT.md`, and an `AGENTS.local.md` override for personal additions.)

Roo+ also reads single-file rules: `.roorules` (and the legacy `.clinerules`), so rule
content can live in one file rather than a directory. Mode-scoped variants use
`.roorules-<slug>` / `.clinerules-<slug>`.

## Examples

- **Global:** "Prefer functional components in React; never use `any`."
- **Workspace:** "Run `pnpm test` from the package that declares Vitest; never commit to
  `master`."
- **Mode-specific:** "When reviewing, report findings by severity and cite line numbers."

Keep examples short and imperative — instructions are guidance for behavior, not
documentation for humans.
