# Slash Commands

Slash commands are reusable prompts you run from the chat by typing `/` and picking a
command. They turn a prompt you repeat — a review checklist, a release note template, a
migration script request — into a named, one-keystroke action.

## Overview

A slash command has a name, an optional description, and a prompt body. When you run it,
Roo+ inserts the prompt as if you had typed it, optionally filling in arguments you
provide after the command name.

## Creating commands

Create a command as a Markdown file in one of the command directories:

- **Project** — `.roo/commands/` in the workspace, committed and shared with the team.
- **Global** — `.roo/commands` in your home directory (`~/.roo/commands`), available in
  every workspace.

The file name becomes the command name (for example `review.md` → `/review`). The file
body is the prompt Roo+ runs. When a project and a global command share a name, the
project one wins; both override a built-in command of the same name.

## Management

The **Slash Commands** settings page lists every command Roo+ can see, grouped by scope.
From there you can open a command to edit it, or remove one you no longer need. Because
commands are plain files, you can also edit them in your editor and see the change the
next time the list refreshes.

## Using them

Type `/` in the chat input to open the command menu, then choose a command. Roo+ expands
it into the prompt and runs it in the current conversation, using the active mode's tools.

## Argument hints

A command file can declare an `argument-hint` in its YAML frontmatter, which Roo+ shows
so you know what input the command expects. That makes a command reusable across many
inputs instead of hard-coding one case; keep the prompt body generic and let the hint
describe the variable part.

## Examples

A simple project command at `.roo/commands/review.md`:

```markdown
Review the staged changes and report findings by severity.

For each finding include the file and line, why it matters, and a suggested fix.
Prefer correctness and security issues over style.
```

Run it with `/review` after staging a change.

## Built-in `init`

Roo+ ships an `init` command that inspects a project and drafts an `AGENTS.md` describing
how to build, test, and work in the repository. Run `/init` once in a new project to
bootstrap the Agent Rules Standard, then refine the result by hand.

## Troubleshooting

- **A command does not appear.** Confirm the file is a `.md` file directly inside a
  commands directory, and refresh the settings page.
- **Arguments are not substituted.** Check the prompt body references the argument names
  the command declares.
- **Two commands with the same name.** The project-scoped command wins over the global
  one; rename one to disambiguate.
