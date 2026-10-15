# Terminal Shell Integration

By default Roo+ runs commands in the **Inline Terminal** inside the chat, which bypasses
shell profiles and shell integration for fast, reliable runs. When you turn the inline
terminal off, Roo+ uses the VS Code integrated terminal instead, and shell integration is
how it then knows exactly when a command starts and finishes, what its exit code was, and
what it printed.

## What is shell integration

On the VS Code terminal path, shell integration is what makes command detection reliable:
your shell emits invisible markers around each prompt and command, and Roo+ watches for
those markers to detect command completion. That is far more reliable than a fixed timer,
especially for long-running commands such as test suites, builds, and package installs.

If shell integration is unavailable, Roo+ falls back to reading the visible terminal
output. The fallback is less precise and is the usual cause of truncated or mislabelled
command results. See
[Troubleshooting Shell Integration](../troubleshooting/shell-integration.md) when a
command looks like it never finished.

## How it works

1. On the VS Code terminal path, Roo+ opens (or reuses) a terminal in the VS Code integrated terminal.
2. The shell runs your command and, thanks to shell integration, emits start/end markers.
3. Roo+ maps the markers to the command it issued and captures the exit code and output.
4. Long output is streamed back into the chat as the command runs.

The settings below tune this pipeline when your shell, prompt framework, or platform
needs help. They live in **Settings → Terminal → Advanced** and appear only after the
inline terminal is turned off, because they affect the VS Code terminal path alone.

## Settings reference

| Setting                                                                       | Default | What it controls                                                                          |
| ----------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| [Use inline terminal (recommended)](#use-inline-terminal-recommended)         | On      | Whether Roo+ runs commands in the Inline Terminal (chat) instead of the VS Code terminal. |
| [Inherit environment variables](#inherit-environment-variables)               | On      | Whether the Roo+ terminal inherits your VS Code environment.                              |
| [Terminal shell integration timeout](#terminal-shell-integration-timeout)     | 5s      | How long Roo+ waits for shell integration before falling back.                            |
| [Terminal command delay](#terminal-command-delay)                             | 0ms     | Extra pause inserted before reading command output.                                       |
| [Enable PowerShell counter workaround](#enable-powershell-counter-workaround) | Off     | Fixes a PowerShell prompt redraw glitch.                                                  |
| [Clear Zsh EOL mark](#clear-zsh-eol-mark)                                     | On      | Strips Zsh's end-of-line marker from captured output.                                     |
| [Enable Oh My Zsh integration](#enable-oh-my-zsh-integration)                 | Off     | Compatibility with Oh My Zsh prompts.                                                     |
| [Enable Powerlevel10k integration](#enable-powerlevel10k-integration)         | Off     | Compatibility with the Powerlevel10k prompt.                                              |
| [Enable ZDOTDIR handling](#enable-zdotdir-handling)                           | Off     | Respects a custom `ZDOTDIR` when starting Zsh.                                            |

### Use inline terminal (recommended)

**Default: on.**

With this on, Roo+ runs commands in the Inline Terminal in the chat, bypassing shell
profiles and shell integration for faster, more reliable runs. Turn it off when you
specifically need the VS Code integrated terminal — for example when a command depends on
your shell profile, prompts, or plugins. Turning it off also enables the advanced settings
below, which tune the VS Code terminal path.

### Inherit environment variables

**Default: on.**

Mirrors VS Code's `terminal.integrated.inheritEnv`. When on, the Roo+ terminal inherits
the environment VS Code was started with (your `PATH`, proxies, language toolchains, and
so on). When off, the terminal starts from a clean environment and your shell's own
startup files are solely responsible for configuring the environment.

### Terminal shell integration timeout

**Default: 5s (range 1s–60s).**

How long Roo+ waits for the shell to report that integration is ready before it gives up
and uses the polling fallback. Increase it on slow machines or with heavy shell startup
scripts; if a command "hangs" at the start, a higher value often fixes it. Decrease it if
you would rather fall back quickly than wait.

### Terminal command delay

**Default: 0ms (range 0–1000ms).**

An extra pause Roo+ inserts before it starts capturing output. Most users never need
this. Raise it (for example to 50–100ms) if a command's first line of output is missing
or arrives before Roo+ is ready to read it.

### Enable PowerShell counter workaround

**Default: off.**

Some PowerShell prompts redraw the prompt line and confuse output capture, producing
duplicated or interleaved prompt text. Enabling this workaround compensates for that
redraw. Turn it on if you see duplicated prompts or garbled output in Windows
PowerShell terminals.

### Clear Zsh EOL mark

**Default: on.**

Zsh appends a special end-of-line marker (`%` / inverse-video space) to its prompt. When
on, Roo+ removes that marker from captured output so it does not pollute command results.

### Enable Oh My Zsh integration

**Default: off.**

Enables compatibility tuning for prompts produced by Oh My Zsh. Turn it on if Oh My Zsh
prompt characters leak into captured output or break the detection of command boundaries.

### Enable Powerlevel10k integration

**Default: off.**

Enables compatibility tuning for the Powerlevel10k prompt theme. Turn it on if your
Powerlevel10k prompt causes output-capture problems.

### Enable ZDOTDIR handling

**Default: off.**

When on, Roo+ respects a custom `ZDOTDIR` environment variable when it starts Zsh, so
your Zsh configuration is loaded from the expected directory. Turn it on if you keep your
Zsh dotfiles somewhere other than your home directory.

## FAQ

**A command never seems to finish.** Raise the [shell integration
timeout](#terminal-shell-integration-timeout) or confirm that the [inline
terminal](#use-inline-terminal-recommended) is enabled.

**Output is missing its first or last lines.** Try a small [command
delay](#terminal-command-delay).

**My prompt characters show up in the output.** If you use Zsh, try [Clear Zsh EOL
mark](#clear-zsh-eol-mark); for Oh My Zsh or Powerlevel10k, enable the matching
integration.

**Which shell does Roo+ use?** The one selected in the **Shell for Roo+** profile
setting, or the VS Code default when unset.
