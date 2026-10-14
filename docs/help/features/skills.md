# Skills

Skills let you package reusable instructions — and optionally scripts — that Roo+ loads
on demand. Instead of repeating the same workflow in every prompt, you give it a name and
Roo+ pulls it in when it is relevant.

## Why skills

Long, repeatable procedures (a release checklist, a data-migration recipe, a code-review
protocol) do not belong in every prompt. Packaged as a skill, they load only when needed,
keeping the working context focused while the knowledge stays available.

## What you can do

- Capture a multi-step workflow once and reuse it.
- Bundle supporting scripts and reference material with the instructions.
- Share skills by committing the project skills directory.
- Keep personal skills global so they follow you across workspaces.

## How they work

A skill is a folder containing a `SKILL.md` file. The file has a short header (name and
description) and a body of instructions. When Roo+ decides a skill is relevant, it reads
the `SKILL.md` body into context; the skill may then point at other files in its folder,
or at scripts it can run.

The description matters: Roo+ uses it to decide when a skill applies, so write it as a
precise, one-line summary of the situations the skill covers.

## Creating your first skill

1. Create a folder named after your skill.
2. Add a `SKILL.md` with a name, a description, and the instructions.
3. Add any scripts or reference files the skill needs alongside it.
4. Place the folder in a skills directory (next section) and confirm it appears in
   **Settings → Skills**.

## Directory structure and override priority

Skills live in the same two scopes as other Roo+ configuration:

- **Workspace** — `.roo/skills/<name>/SKILL.md`, committed and shared with the team.
- **Global** — `.roo/skills` in your home directory (`~/.roo/skills`), available in every
  workspace.

Roo+ also recognises the cross-agent `.agents/skills/` directory in both scopes, and
mode-scoped variants such as `.roo/skills-<mode>/`. When several copies of a skill exist,
the most specific one wins: a workspace skill beats a global one, and within a scope
`.roo/` beats `.agents/`, so a project can pin the exact version it needs.

## Discovery

Roo+ lists project skills separately from global skills in **Settings → Skills**, and
shows each skill's source so you always know which copy is active. Project skills appear
only when a workspace is open. The list reflects the files on disk; add or edit a
`SKILL.md` and the list updates on the next refresh.

## Troubleshooting

- **A skill is not listed.** Confirm the folder contains a `SKILL.md` file with a valid
  header, and that the folder sits directly inside a skills directory.
- **A skill never gets used.** Sharpen the description — it is the signal Roo+ matches
  against.
- **The wrong copy is used.** Check for a same-named skill in the other scope; the
  workspace copy wins.

## Skills vs custom instructions vs slash commands

|                         | Best for                                            | Loaded                           |
| ----------------------- | --------------------------------------------------- | -------------------------------- |
| **Skills**              | Packaged, on-demand workflows with optional scripts | When relevant to the task        |
| **Custom instructions** | Always-on conventions and rules                     | Always, for the applicable scope |
| **Slash commands**      | Short prompts you run explicitly                    | When you invoke the command      |

Use instructions for "always do this", skills for "do this workflow when it fits", and
slash commands for "do this now".
