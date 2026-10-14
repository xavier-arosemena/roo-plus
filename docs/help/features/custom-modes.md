# Custom Modes

Custom modes let you define your own roles for Roo+, each with its own tool groups,
instructions, and behavior. Use them to encode a workflow you repeat — a reviewer, a
migration assistant, a docs writer — so you can switch into it with one click.

## What a mode contains

Every mode is described by:

- **Slug** — a stable identifier used to select and reference the mode.
- **Name** — the human-readable label shown in the picker.
- **Description** — a short summary of when to use it.
- **Tool groups** — the categories of tools the mode may use (read, edit, browser,
  command, and so on).
- **Instructions** — the role, rules, and conventions Roo+ should follow.
- **Mode-specific rules** — optional files that refine the instructions (see below).

## Import and export

Modes can be exported and imported so you can back them up or share them:

- **Export** writes a mode definition you can store or commit.
- **Import** loads a definition back into Roo+.

Because a mode definition is portable, a team can keep its modes in version control
alongside the project.

## Creating a mode

There are three ways to create a mode:

1. **Ask Roo+** — describe the mode you want in the create-mode dialog and let Roo+
   draft the definition.
2. **Modes page** — open **Settings → Modes** and fill in the fields directly.
3. **YAML + JSON** — author the mode in a `.roomodes` file in the workspace root (or a
   global modes file). YAML is the canonical, most readable format; JSON is also accepted.

## Property reference

| Property             | Purpose                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `slug`               | Stable identifier — letters, numbers, and dashes only (unique within your modes).                |
| `name`               | Display name in the mode picker.                                                                 |
| `description`        | One-line summary of the mode's purpose.                                                          |
| `roleDefinition`     | The mode's role prompt. Required.                                                                |
| `groups`             | Tool groups the mode may use. Required.                                                          |
| `whenToUse`          | Guidance Roo+ uses when deciding whether the mode fits.                                          |
| `customInstructions` | Free-form instructions shaping behavior.                                                         |
| `allowedMcpServers`  | Optional allow-list of MCP server names; when set, only those servers are available to the mode. |

## Mode-specific instruction files

A mode can pull in extra instructions from files in the workspace, so long guidance does
not have to live inside the mode definition. Roo+ reads mode-scoped rule files (for
example under `.roo/rules-<slug>/`) and applies them only when that mode is active. This
keeps each mode's guidance focused and its files independently reviewable.

## Configuration precedence and overriding

When the same setting is defined in more than one place, Roo+ applies it in a fixed
order, with the more specific definition winning:

1. **Global defaults** — built-in values.
2. **Global user modes** — modes you defined for every workspace.
3. **Project modes** — modes committed in the workspace.
4. **Mode-specific rule files** — the most specific layer.

If a project defines a mode with the same slug as a global one, the project definition
takes precedence for that workspace.

## Regex rules

For finer control than whole tool groups, a mode can use regex-based rules to allow or
block specific operations. Use these to permit only certain commands, or to block writes
to sensitive paths, without removing an entire tool group. Keep regex rules narrow and
well-commented, since they are easy to over- or under-match.
