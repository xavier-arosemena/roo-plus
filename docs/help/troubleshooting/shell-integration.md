# Troubleshooting Shell Integration

This page is a focused checklist for when a terminal command fails, stalls, or returns
incomplete output in the middle of a task. For the settings themselves, see
[Terminal Shell Integration](../features/shell-integration.md).

## Symptoms

Match what you are seeing to the most likely cause:

- **The command runs but Roo+ never reports it as finished.** Shell integration was not
  detected before the timeout, so Roo+ is waiting.
- **Output is truncated, empty, or shows only the last line.** Output capture started too
  early or too late.
- **Prompt characters or control codes appear in the output.** Your prompt framework is
  emitting markers Roo+ has not been told to strip.
- **`PowerShell is not recognized...` or similar shell errors.** Roo+ issued a command the
  shell could not resolve — usually a `PATH` or shell-profile problem.

## Quick checks

Work through these in order; each is a single toggle in **Settings → Terminal → Advanced**.

1. **Is shell integration enabled?** Confirm [Use inline terminal
   (recommended)](../features/shell-integration.md#use-inline-terminal-recommended) is on
   (it is by default).
2. **Is the timeout too low?** A slow shell can miss the default 5-second
   [timeout](../features/shell-integration.md#terminal-shell-integration-timeout). Raise it
   to 10–15 seconds and retry.
3. **Is output arriving too early?** Add a small [command
   delay](../features/shell-integration.md#terminal-command-delay) (50–100ms).
4. **Are environment variables missing?** Check [Inherit environment
   variables](../features/shell-integration.md#inherit-environment-variables) is on.
5. **Restart the terminal.** Roo+ reuses terminals; a stale one can hold a broken shell
   session. Kill it and run the command again.

## Per-shell fixes

### bash

Ensure your `~/.bashrc` does not early-`return` when it detects a non-interactive shell.
Shell integration depends on your startup file running to completion. If you guard
interactive-only sections, make sure the shell-integration hook is outside that guard.

### zsh

Zsh prompts commonly need one of the Zsh compatibility options:

- Duplicated prompt characters → enable [Clear Zsh EOL
  mark](../features/shell-integration.md#clear-zsh-eol-mark) (on by default).
- Oh My Zsh prompt interference → enable [Enable Oh My Zsh
  integration](../features/shell-integration.md#enable-oh-my-zsh-integration).
- Powerlevel10k → enable [Enable Powerlevel10k
  integration](../features/shell-integration.md#enable-powerlevel10k-integration).
- Dotfiles kept outside your home directory → enable [Enable ZDOTDIR
  handling](../features/shell-integration.md#enable-zdotdir-handling).

### PowerShell

- Prompt redraw glitches / duplicated prompts → enable [Enable PowerShell counter
  workaround](../features/shell-integration.md#enable-powershell-counter-workaround).
- `PowerShell is not recognized as an internal or external command` → the command ran in
  the wrong shell. Confirm your Roo+ shell profile, and that `pwsh`/`powershell` is
  on `PATH`. If you rely on `PATH` from your user environment, keep [Inherit environment
  variables](../features/shell-integration.md#inherit-environment-variables) on.

## Diagnostic logging

If the quick checks do not resolve it, capture evidence before opening an issue:

1. Open **View → Output** and select the Roo+ channel.
2. Reproduce the failing command.
3. Note: the shell being used, the exact command, the exit code (if shown), and whether
   output was empty, truncated, or garbled.
4. Copy the surrounding output-channel lines — they record whether shell integration was
   detected and which fallback was used.

## When to open a GitHub issue

Open an issue once you have the diagnostic evidence above and the quick checks have not
helped.

- File it at [Roo+ issue chooser](https://github.com/xavier-arosemena/roo-plus/issues/new/choose).
- Include: OS, shell and version, the Roo+ terminal settings in effect, the exact
  command, and what you expected versus what happened.
- If the failure depends on your specific setup and has no clear bug, start a
  [GitHub Discussion](https://github.com/xavier-arosemena/roo-plus/discussions) instead so
  others can weigh in.
