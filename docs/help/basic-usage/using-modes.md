# Using Modes

Modes let you give Roo+ a role with a matching set of capabilities. Switching modes
changes what tools Roo+ may use and how it approaches your task — from writing code to
planning an architecture to explaining an idea.

## Why modes

A single assistant cannot be equally good at everything without also being equally
permissioned for everything. Modes separate those concerns:

- **Capability** — each mode exposes only the tool groups it needs, so a planning mode
  cannot accidentally edit files.
- **Behavior** — each mode carries instructions that shape how Roo+ works and what it
  optimizes for.
- **Safety** — narrower modes reduce the blast radius of an accidental action.

## Switching modes

Change the active mode from the mode selector in the chat input. The selected mode
applies to the current task; you can switch at any point and Roo+ continues with the new
mode's tools and instructions from that message onward.

## Built-in modes

Roo+ ships with these built-in modes:

- **Code** — writes, edits, and refactors code with the full toolset.
- **Ask** — answers questions and explains code without modifying your project.
- **Architect** — plans and designs: breaks down problems, proposes structure, and
  produces specifications before implementation.
- **Debug** — investigates failures systematically: reads stack traces, adds targeted
  logging, and isolates root causes.
- **Orchestrator** — coordinates larger, multi-step efforts, delegating work across
  other modes.

Roo+ also ships additional ready-to-use custom modes beyond these built-ins; see the
Roo+ custom-modes catalog in the repository for the full list.

## Customizing modes

Every mode is defined by a small amount of configuration:

- **Description** — a one-line summary shown when selecting the mode.
- **Tool groups** — which categories of tools the mode may use.
- **Instructions** — the mode-specific guidance Roo+ follows.

You can edit the built-in modes' settings and create entirely new modes. To create a mode
with richer configuration (YAML, per-mode rule files, regex-based rules), see
[Custom Modes](../features/custom-modes.md). To add shared instructions that apply across
modes, see [Custom Instructions & Rules](../features/custom-instructions.md).
