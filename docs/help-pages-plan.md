# In-app "Learn more" help pages — content + wiring plan (Phase 1)

**Status:** Planning / specification. Living document.
**Phase:** 1 of 2 (research + design). Phase 2 implements.
**Audience:** Roo+ maintainers and the Phase 2 implementer.
**Owner sign-off required** on the Open Questions (section 6) before Phase 2 begins.

This document is the source of truth for which in-app help pages must exist and how the
extension resolves their URLs at runtime. It is artifact-only: it does **not** author help
pages, modify [`docLinks.ts`](../webview-ui/src/utils/docLinks.ts:12), or wire any link.

---

## 0. Background and guardrails

Context: Roo+ is a GitHub-only fork of `Zoo-Code-Org/Zoo-Code`. A prior cleanup retired the
dead `docs.roo.plus` / `docs.zoocode.dev` destinations and changed
[`buildDocLink()`](../webview-ui/src/utils/docLinks.ts:12) to return the GitHub repo root while
**ignoring its `path` argument**. Every in-app contextual "learn more" link therefore currently
loses its target. Remediation (owner-approved): host help pages as Markdown in this repo and
deep-link them via GitHub **blob** URLs, with a CI check and a GitHub Discussions-search fallback.

Non-negotiable guardrails for Phase 2:

- **GitHub is the only external channel.** No Reddit, Discord, `docs.roo.plus`, `docs.zoocode.dev`,
  or `support@*` e-mail destinations.
- `docs/adr/*`, [`README.md`](../README.md:44), [`SECURITY.md`](../SECURITY.md:83),
  [`scripts/verify-upstream-code-index-alignment.mjs`](../scripts/verify-upstream-code-index-alignment.mjs:149),
  [`scripts/verify-locale-readmes.mjs`](../scripts/verify-locale-readmes.mjs:1), and
  `src/services/code-index/**` are **upstream-alignment artifacts and must not be touched**.
- Do **not** edit `CHANGELOG.md`, `src/CHANGELOG.md`, or create changesets.
- No i18n values change in Phase 1.
- `docs/` is scanned by [`scripts/verify-docs-no-public-ip.mjs`](../scripts/verify-docs-no-public-ip.mjs:1):
  **no non-localhost IPv4 literals may appear in this file** (or any page added in Phase 2).

---

## 1. Slug catalog / mapping table

### 1.1 Inventory method and count

Enumerated every `buildDocLink(` argument via repository-wide search. Scope of the "source of
truth" set is production webview code:

- `webview-ui/src/**/*.{ts,tsx}` excluding `__tests__` and `*.spec.*`.

Four additional `buildDocLink` references exist **only as test mocks**
([`SkillsSettings.spec.tsx`](../webview-ui/src/components/settings/__tests__/SkillsSettings.spec.tsx:30),
[`TerminalSettings.profile.spec.tsx`](../webview-ui/src/components/settings/__tests__/TerminalSettings.profile.spec.tsx:15),
[`SlashCommandsSettings.spec.tsx`](../webview-ui/src/components/settings/__tests__/SlashCommandsSettings.spec.tsx:30),
[`WelcomeViewProvider.spec.tsx`](../webview-ui/src/components/welcome/__tests__/WelcomeViewProvider.spec.tsx:87));
they are **not** real slugs and are excluded from the catalog and from the CI enumeration.
Compiled artifacts under `src/webview-ui/build/**` are also excluded (build output).

**Counts:**

| Metric                                              | Count                                    |
| --------------------------------------------------- | ---------------------------------------- |
| Production `buildDocLink` **call sites**            | **24**                                   |
| Distinct static **slug pages** (anchor-stripped)    | **10**                                   |
| Dynamic provider slug template (`providers/<slug>`) | 1 (expands to **32** concrete providers) |
| Total target pages if all materialized              | **42** (10 static + 32 provider)         |

### 1.2 Call-site table (100% coverage)

Anchor is the fragment embedded in the `path` argument; campaign is the 2nd argument.

| #   | file:line                                                                                              | slug (`path`)                                           | anchor                                  | campaign                                       | UI context (what the user is doing)                            |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| 1   | [`McpView.tsx:60`](../webview-ui/src/components/mcp/McpView.tsx:60)                                    | `features/mcp/using-mcp-in-roo`                         | —                                       | `mcp_settings`                                 | MCP view description → "Learn More"                            |
| 2   | [`McpView.tsx:171`](../webview-ui/src/components/mcp/McpView.tsx:171)                                  | `features/mcp/using-mcp-in-roo`                         | `#editing-mcp-settings-files`           | `mcp_edit_settings`                            | "Learn more about editing settings" beneath MCP server buttons |
| 3   | [`ModesView.tsx:758`](../webview-ui/src/components/modes/ModesView.tsx:758)                            | `basic-usage/using-modes`                               | —                                       | `prompts_view_modes`                           | Create-mode dialog help text ("learn about using modes")       |
| 4   | [`ModesView.tsx:762`](../webview-ui/src/components/modes/ModesView.tsx:762)                            | `features/custom-modes`                                 | —                                       | `prompts_view_modes`                           | Create-mode dialog help text ("learn about customizing modes") |
| 5   | [`ModesView.tsx:1375`](../webview-ui/src/components/modes/ModesView.tsx:1375)                          | `features/custom-instructions`                          | `#global-rules-directory`               | `prompts_mode_specific_global_rules`           | Mode-specific "global rules directory" hint                    |
| 6   | [`ModesView.tsx:1430`](../webview-ui/src/components/modes/ModesView.tsx:1430)                          | `features/custom-instructions`                          | `#setting-up-global-rules`              | `prompts_global_custom_instructions`           | Global custom instructions description                         |
| 7   | [`ModesView.tsx:1476`](../webview-ui/src/components/modes/ModesView.tsx:1476)                          | `features/custom-instructions`                          | `#setting-up-global-rules`              | `prompts_global_rules`                         | "Load from file" hint on global custom instructions            |
| 8   | [`SlashCommandsSettings.tsx:155`](../webview-ui/src/components/settings/SlashCommandsSettings.tsx:155) | `features/slash-commands`                               | —                                       | `slash_commands_settings`                      | Slash-commands settings description → "Docs"                   |
| 9   | [`ApiOptions.tsx:357`](../webview-ui/src/components/settings/ApiOptions.tsx:357)                       | `providers/${slug}` _(dynamic)_                         | —                                       | `provider_docs`                                | Per-provider "docs" button (slug from `getProviderDocsSlug()`) |
| 10  | [`TerminalSettings.tsx:192`](../webview-ui/src/components/settings/TerminalSettings.tsx:192)           | `features/shell-integration`                            | `#use-inline-terminal-recommended`      | `settings_terminal_shell_integration_disabled` | "Disable shell integration" checkbox description               |
| 11  | [`TerminalSettings.tsx:264`](../webview-ui/src/components/settings/TerminalSettings.tsx:264)           | `features/shell-integration`                            | —                                       | `settings_terminal_profile`                    | Terminal profile dropdown description                          |
| 12  | [`TerminalSettings.tsx:295`](../webview-ui/src/components/settings/TerminalSettings.tsx:295)           | `features/shell-integration`                            | `#inherit-environment-variables`        | `settings_terminal_inherit_env`                | "Inherit environment variables" checkbox description           |
| 13  | [`TerminalSettings.tsx:333`](../webview-ui/src/components/settings/TerminalSettings.tsx:333)           | `features/shell-integration`                            | `#terminal-shell-integration-timeout`   | `settings_terminal_shell_integration_timeout`  | Shell-integration timeout slider description                   |
| 14  | [`TerminalSettings.tsx:369`](../webview-ui/src/components/settings/TerminalSettings.tsx:369)           | `features/shell-integration`                            | `#terminal-command-delay`               | `settings_terminal_command_delay`              | Command delay slider description                               |
| 15  | [`TerminalSettings.tsx:397`](../webview-ui/src/components/settings/TerminalSettings.tsx:397)           | `features/shell-integration`                            | `#enable-powershell-counter-workaround` | `settings_terminal_powershell_counter`         | PowerShell counter-workaround checkbox description             |
| 16  | [`TerminalSettings.tsx:425`](../webview-ui/src/components/settings/TerminalSettings.tsx:425)           | `features/shell-integration`                            | `#clear-zsh-eol-mark`                   | `settings_terminal_zsh_clear_eol_mark`         | "Clear Zsh EOL mark" checkbox description                      |
| 17  | [`TerminalSettings.tsx:449`](../webview-ui/src/components/settings/TerminalSettings.tsx:449)           | `features/shell-integration`                            | `#enable-oh-my-zsh-integration`         | `settings_terminal_zsh_oh_my`                  | "Oh My Zsh integration" checkbox description                   |
| 18  | [`TerminalSettings.tsx:473`](../webview-ui/src/components/settings/TerminalSettings.tsx:473)           | `features/shell-integration`                            | `#enable-powerlevel10k-integration`     | `settings_terminal_zsh_p10k`                   | "Powerlevel10k integration" checkbox description               |
| 19  | [`TerminalSettings.tsx:497`](../webview-ui/src/components/settings/TerminalSettings.tsx:497)           | `features/shell-integration`                            | `#enable-zdotdir-handling`              | `settings_terminal_zdotdir`                    | "ZDOTDIR handling" checkbox description                        |
| 20  | [`SkillsSettings.tsx:225`](../webview-ui/src/components/settings/SkillsSettings.tsx:225)               | `features/skills`                                       | —                                       | `skills_settings`                              | Skills settings description → "Docs"                           |
| 21  | [`CheckpointSettings.tsx:50`](../webview-ui/src/components/settings/CheckpointSettings.tsx:50)         | `features/checkpoints`                                  | —                                       | `settings_checkpoints`                         | "Enable checkpoints" description                               |
| 22  | [`CommandExecutionError.tsx:32`](../webview-ui/src/components/chat/CommandExecutionError.tsx:32)       | `troubleshooting/shell-integration/` _(trailing slash)_ | —                                       | `error_tooltip`                                | Chat shell-integration error → "troubleshooting" link          |
| 23  | [`CodeIndexPopover.tsx:722`](../webview-ui/src/components/chat/CodeIndexPopover.tsx:722)               | `features/experimental/codebase-indexing`               | —                                       | `settings`                                     | Codebase-indexing popover description                          |
| 24  | [`ContextMenu.tsx:301`](../webview-ui/src/components/chat/ContextMenu.tsx:301)                         | `features/slash-commands`                               | —                                       | `slash_commands_settings`                      | "/" slash-command context menu → "Docs"                        |

> Note: campaigns `#3/#4` and `#8/#24` intentionally reuse campaigns across call sites; campaigns
> are telemetry-only and do not affect resolution.

### 1.3 Slug → target page → upstream source

Target path is the call-site slug mapped onto `docs/help/` (directory structure preserved so the
CI mapping is a pure string transform). Upstream source is the file in the docs-site repo
**`Zoo-Code-Org/Zoo-Code-Docs`**, `docs/` tree (the code repo `Zoo-Code-Org/Zoo-Code` contains only
`docs/architecture/**` — no user-facing content, verified against `upstream/main`).

| Slug                                      | Proposed title                    | Target repo path                                       | Upstream source (Zoo-Code-Docs)                                            | Referenced by |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------- |
| `features/mcp/using-mcp-in-roo`           | Using MCP in Roo+                 | `docs/help/features/mcp/using-mcp-in-roo.md`           | `docs/features/mcp/using-mcp-in-roo.mdx`                                   | #1, #2        |
| `basic-usage/using-modes`                 | Using Modes                       | `docs/help/basic-usage/using-modes.md`                 | `docs/basic-usage/using-modes.md`                                          | #3            |
| `features/custom-modes`                   | Custom Modes                      | `docs/help/features/custom-modes.md`                   | `docs/features/custom-modes.mdx`                                           | #4            |
| `features/custom-instructions`            | Custom Instructions & Rules       | `docs/help/features/custom-instructions.md`            | `docs/features/custom-instructions.md`                                     | #5, #6, #7    |
| `features/slash-commands`                 | Slash Commands                    | `docs/help/features/slash-commands.md`                 | `docs/features/slash-commands.mdx`                                         | #8, #24       |
| `features/shell-integration`              | Terminal Shell Integration        | `docs/help/features/shell-integration.md`              | `docs/features/shell-integration.mdx`                                      | #10–#19       |
| `features/skills`                         | Skills                            | `docs/help/features/skills.md`                         | `docs/features/skills.mdx`                                                 | #20           |
| `features/checkpoints`                    | Checkpoints                       | `docs/help/features/checkpoints.md`                    | `docs/features/checkpoints.mdx`                                            | #21           |
| `features/experimental/codebase-indexing` | Codebase Indexing                 | `docs/help/features/experimental/codebase-indexing.md` | `docs/features/codebase-indexing.mdx` _(path drifted upstream — see §3)_   | #23           |
| `troubleshooting/shell-integration`       | Troubleshooting Shell Integration | `docs/help/troubleshooting/shell-integration.md`       | **none** (upstream keeps this as a section inside `shell-integration.mdx`) | #22           |
| `providers/<slug>` _(dynamic)_            | Provider setup: `<label>`         | `docs/help/providers/<slug>.md`                        | `docs/providers/<slug>.md` (mostly)                                        | #9            |

### 1.4 Dynamic provider slug expansion (`providers/<slug>`)

Call site #9 passes `` `providers/${slug}` `` where `slug = getProviderDocsSlug(provider.value)`
([`providerModelConfig.ts:173`](../webview-ui/src/components/settings/utils/providerModelConfig.ts:173)),
which defaults to the provider identifier with only two overrides
([`PROVIDER_DOCS_SLUGS`](../webview-ui/src/components/settings/utils/providerModelConfig.ts:168)):
`openai-native → openai`, `openai → openai-compatible`.

The concrete provider set is [`PROVIDERS`](../webview-ui/src/components/settings/constants.ts:46)
(**32** entries). Mapping to upstream provider docs:

| Provider (`PROVIDERS.value`) | Resolved slug       | Target path                                | Upstream page exists?                            |
| ---------------------------- | ------------------- | ------------------------------------------ | ------------------------------------------------ |
| `openrouter`                 | `openrouter`        | `docs/help/providers/openrouter.md`        | ✅                                               |
| `anthropic`                  | `anthropic`         | `docs/help/providers/anthropic.md`         | ✅                                               |
| `gemini`                     | `gemini`            | `docs/help/providers/gemini.md`            | ✅                                               |
| `deepseek`                   | `deepseek`          | `docs/help/providers/deepseek.md`          | ✅                                               |
| `moonshot`                   | `moonshot`          | `docs/help/providers/moonshot.md`          | ✅                                               |
| `kimi-code`                  | `kimi-code`         | `docs/help/providers/kimi-code.md`         | ✅                                               |
| `openai-native`              | `openai`            | `docs/help/providers/openai.md`            | ✅                                               |
| `openai-codex`               | `openai-codex`      | `docs/help/providers/openai-codex.md`      | ❌ upstream file is `openai-chatgpt-plus-pro.md` |
| `openai`                     | `openai-compatible` | `docs/help/providers/openai-compatible.md` | ✅                                               |
| `qwen-code`                  | `qwen-code`         | `docs/help/providers/qwen-code.md`         | ✅                                               |
| `vertex`                     | `vertex`            | `docs/help/providers/vertex.md`            | ✅                                               |
| `bedrock`                    | `bedrock`           | `docs/help/providers/bedrock.md`           | ✅                                               |
| `vscode-lm`                  | `vscode-lm`         | `docs/help/providers/vscode-lm.md`         | ✅                                               |
| `mistral`                    | `mistral`           | `docs/help/providers/mistral.md`           | ✅                                               |
| `lmstudio`                   | `lmstudio`          | `docs/help/providers/lmstudio.md`          | ✅                                               |
| `ollama`                     | `ollama`            | `docs/help/providers/ollama.md`            | ✅                                               |
| `requesty`                   | `requesty`          | `docs/help/providers/requesty.md`          | ✅                                               |
| `xai`                        | `xai`               | `docs/help/providers/xai.md`               | ✅                                               |
| `litellm`                    | `litellm`           | `docs/help/providers/litellm.md`           | ✅                                               |
| `sambanova`                  | `sambanova`         | `docs/help/providers/sambanova.md`         | ✅                                               |
| `zai`                        | `zai`               | `docs/help/providers/zai.md`               | ✅                                               |
| `fireworks`                  | `fireworks`         | `docs/help/providers/fireworks.md`         | ✅                                               |
| `friendli`                   | `friendli`          | `docs/help/providers/friendli.md`          | ✅                                               |
| `vercel-ai-gateway`          | `vercel-ai-gateway` | `docs/help/providers/vercel-ai-gateway.md` | ✅                                               |
| `opencode-go`                | `opencode-go`       | `docs/help/providers/opencode-go.md`       | ❌ no upstream page                              |
| `kenari`                     | `kenari`            | `docs/help/providers/kenari.md`            | ✅                                               |
| `nanogpt`                    | `nanogpt`           | `docs/help/providers/nanogpt.md`           | ❌ no upstream page                              |
| `minimax`                    | `minimax`           | `docs/help/providers/minimax.md`           | ✅                                               |
| `mimo`                       | `mimo`              | `docs/help/providers/mimo.md`              | ✅                                               |
| `baseten`                    | `baseten`           | `docs/help/providers/baseten.md`           | ✅                                               |
| `unbound`                    | `unbound`           | `docs/help/providers/unbound.md`           | ❌ no upstream page                              |
| `poe`                        | `poe`               | `docs/help/providers/poe.md`               | ❌ no upstream page                              |

Summary: **27/32** provider slugs have an upstream page; **5** do not
(`openai-codex` — resolvable by mapping to upstream `openai-chatgpt-plus-pro`, plus `opencode-go`,
`nanogpt`, `unbound`, `poe`). Upstream also ships `docs/providers/trustedrouter.md` with no Roo+
provider — upstream-only, ignore.

---

## 2. Per-page content outlines

Each page: audience, one-line purpose, section outline (adapted from the upstream headings
recovered in §1.3), improvements over upstream, Roo+ specifics, and TODO assets. Upstream pages are
long (289–687 lines); Phase 2 should produce a **concise in-product help page (~80–150 lines)**,
deep-linking to the fuller upstream narrative only where the narrative is still accurate — and
**never** to a non-GitHub host.

### 2.1 `features/mcp/using-mcp-in-roo` — "Using MCP in Roo+"

- **Audience:** users wiring external tools; the link sits at the top of the MCP view.
- **Purpose:** explain what MCP is and how to configure/edit servers in Roo+ without leaving the editor.
- **Outline:** What MCP is → Configuring servers (global vs project precedence) → Editing settings files (`mcp_settings.json`, `.roo/mcp.json`) → Limiting MCP access by mode → Managing servers (enable/disable, restart, delete, network timeout, auto-approve) → Using tools in a task.
- **Improvements over upstream:** keep the anchor headings stable (see §4.4); drop the "install from a marketplace" framing that Roo+ does not ship; tighten the platform-specific Windows/macOS config examples.
- **Roo+ notes:** MCP Marketplace entry points may differ; no Zoo Gateway references; auto-approve wording must match Roo+ settings labels.
- **TODO:** screenshots of the Roo+ MCP view + settings buttons (flag as TODO; do not reuse upstream branding images).

### 2.2 `basic-usage/using-modes` — "Using Modes"

- **Audience:** all users; entry from the create-mode dialog.
- **Purpose:** explain built-in modes and switching.
- **Outline:** Why modes → Switching modes → Built-in modes (Code, Ask, Architect, Debug, Orchestrator) → Customizing modes (tool groups).
- **Improvements:** Roo+ built-in mode set/slugs must be verified against `custom-modes/SOTA_MASTER_REGISTRY.md` rather than copied from upstream.
- **Roo+ notes:** Roo+ ships extra custom modes; links should describe where modes live in Roo+.
- **TODO:** none.

### 2.3 `features/custom-modes` — "Custom Modes"

- **Audience:** users extending behavior; entry from create-mode dialog.
- **Purpose:** create/import/export modes and understand precedence.
- **Outline:** What a mode contains → Import/export → Creating (Ask Roo / Modes page / YAML+JSON) → Property reference → Mode-specific instruction files → Configuration precedence & overriding → Regex rules.
- **Improvements:** cut the 687-line upstream page down; keep YAML as the canonical format; remove stale "Ask Zoo" naming.
- **Roo+ notes:** Roo+ ships a canonical custom-modes catalog (`custom-modes/`) — reference it; do **not** point at `docs/custom-modes-canonical-catalog` ADR (guardrail artifact) from within the help page.
- **TODO:** diagram of precedence order.

### 2.4 `features/custom-instructions` — "Custom Instructions & Rules"

- **Audience:** users setting global/workspace rules; three distinct anchors point here.
- **Purpose:** how global custom instructions, the global rules directory, and AGENTS.md interact.
- **Outline:** Setting custom instructions → **Global rules directory** → Workspace-level instructions → How instructions combine → `.rules`/AGENTS.md support → Examples.
- **Improvements:** upstream jumps to 334 lines; Roo+ needs the two anchor headings present verbatim (see §4.4). Ensure the `.roo/rules/` path examples are correct for Roo+.
- **Roo+ notes:** `AGENTS.md` "Agent Rules Standard" is a first-class Roo+ convention (see repo `AGENTS.md`).
- **TODO:** none.

### 2.5 `features/slash-commands` — "Slash Commands"

- **Audience:** users creating reusable prompts; entry from settings and from the `/` context menu.
- **Purpose:** create/run/manage custom slash commands.
- **Outline:** Overview → Creating commands → Management → Using them → Argument hints → Examples → Built-in `init` → Troubleshooting.
- **Improvements:** Roo+ uses project (`.roo/commands`) and global command locations — verify against Roo+ source; keep it short.
- **Roo+ notes:** confirm global vs project paths used by `SlashCommandsSettings`.
- **TODO:** screenshot of the command list UI.

### 2.6 `features/shell-integration` — "Terminal Shell Integration"

- **Audience:** users troubleshooting terminal behavior; **10 call sites**, 9 of them anchored.
- **Purpose:** what shell integration is and what each Roo+ terminal setting controls.
- **Outline (must include all anchored headings):** What is shell integration → **Use inline terminal (recommended)** → **Inherit environment variables** → **Terminal shell integration timeout** → **Terminal command delay** → **Enable PowerShell counter workaround** → **Clear Zsh EOL mark** → **Enable Oh My Zsh integration** → **Enable Powerlevel10k integration** → **Enable ZDOTDIR handling** → How it works → FAQ.
- **Improvements:** upstream is 543 lines and duplicates config in multiple places; Roo+ page must present a **settings table** mapping each control → effect → default, matching Roo+ labels (`settings:terminal.*`).
- **Roo+ notes:** defaults in Roo+ differ from text (verify against `TerminalSettings` defaults; e.g. inherit-env, clear-EOL-mark default `true`).
- **TODO:** per-setting screenshots (optional; flag as TODO).

### 2.7 `features/skills` — "Skills"

- **Audience:** users adding packaged capability instructions.
- **Purpose:** define skills and how Roo+ discovers them.
- **Outline:** Why skills → What you can do → How they work → Creating your first skill → Directory structure & override priority → Discovery → Troubleshooting → Skills vs custom instructions vs slash commands.
- **Improvements:** keep the "vs" comparison table; ensure OS-specific paths match Roo+ conventions.
- **Roo+ notes:** Roo+ ships skill tooling (`.roo/skills/`); confirm the on-disk roots.
- **TODO:** directory-tree diagram.

### 2.8 `features/checkpoints` — "Checkpoints"

- **Audience:** users relying on checkpoint restore.
- **Purpose:** what checkpoints capture and how to restore.
- **Outline:** Configuration options → How checkpoints work → Viewing diffs/restoring → Limitations → Storage & exclusions → Git installation per-OS.
- **Improvements:** trim the deep "Technical Implementation" detail into a short "under the hood" box.
- **Roo+ notes:** Roo+ checkpoint services are shared-type derived (`src/services/checkpoints/**`) — describe behavior, do not deep-link source.
- **TODO:** none.

### 2.9 `features/experimental/codebase-indexing` — "Codebase Indexing"

- **Audience:** users enabling semantic search; entry from the index popover.
- **Purpose:** set up the vector DB + embedder and understand indexing state.
- **Outline:** What it does → Quick start (DB + embedder + save) → Managing the indexer → Configuration fields → How files are processed → Best practices → Troubleshooting → Privacy.
- **Improvements:** upstream path is now `features/codebase-indexing` (Roo+ calls `features/experimental/codebase-indexing`); page content must match Roo+ embedder providers and defaults.
- **Roo+ notes:** Roo+ code-index lives in `src/services/code-index/**` (guardrail — do not modify; describing it is fine).
- **TODO:** screenshots of the Roo+ indexing popover.

### 2.10 `troubleshooting/shell-integration` — "Troubleshooting Shell Integration"

- **Audience:** users hitting terminal command failures mid-task (link appears in a chat error).
- **Purpose:** a focused, actionable troubleshooting checklist (not a duplicate of §2.6).
- **Outline:** Symptoms → Quick checks (shell integration enabled? inline terminal? timeout too low?) → Per-shell fixes (bash/zsh/PowerShell) → Diagnostic logging → When to open a GitHub issue.
- **Improvements:** upstream buries this inside `shell-integration.mdx`; a **standalone, task-oriented page** is a genuine Roo+ improvement (error-tooltip context is a different intent than settings reference).
- **Roo+ notes:** all escalation links must remain GitHub (issues/discussions).
- **TODO:** none.

### 2.11 `providers/<slug>` — per-provider setup pages

- **Audience:** users configuring a model provider; entry from the provider docs button.
- **Purpose:** obtain a key / point at a base URL / pick a model, per provider.
- **Outline (per page):** What this provider is → Get an API key (direct link to vendor console — see caveat) → Configure in Roo+ → Recommended models → Pricing notes.
- **Improvements:** normalize every page to the same template; upstream provider pages vary wildly in shape.
- **Roo+ notes / caveat:** the vendor "get key" destinations are **third-party, non-GitHub URLs** that already exist in provider components. Per the GitHub-only guardrail, these help pages must **not** introduce new non-GitHub links; where a provider already links its console in-product, the help page may reference the provider name without restating the vendor URL, and the owner must confirm (§6).
- **TODO:** standardize template; screenshots optional.

---

## 3. Pages with no upstream counterpart

| Slug                                      | Situation                                                                    | Recommendation                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `troubleshooting/shell-integration`       | No standalone upstream page (only a section in `shell-integration.mdx`).     | **Author** (§2.10) — high value, appears in an error context.                                           |
| `features/experimental/codebase-indexing` | Slug drifted; upstream now at `features/codebase-indexing`.                  | **Author** from upstream content under the Roo+ slug (or re-point the call site in Phase 2 — §6).       |
| `providers/openai-codex`                  | Upstream page exists but under a different name (`openai-chatgpt-plus-pro`). | **Fix mapping** (`getProviderDocsSlug` → `openai-chatgpt-plus-pro`) and author page at the mapped slug. |
| `providers/opencode-go`                   | No upstream page.                                                            | **Discussions-search fallback candidate** (or author a short page).                                     |
| `providers/nanogpt`                       | No upstream page.                                                            | **Discussions-search fallback candidate**.                                                              |
| `providers/unbound`                       | No upstream page.                                                            | **Discussions-search fallback candidate**.                                                              |
| `providers/poe`                           | No upstream page.                                                            | **Discussions-search fallback candidate**.                                                              |

**Discussions-search fallback** means: no local page exists, so `buildDocLink()` resolves to a
GitHub Discussions search (defined in §4). These four provider slugs are the explicit
fallback set; everything else should have a real page.

---

## 4. Link-resolution design (critical)

### 4.1 Constraint

The **shipped extension cannot check repo-file existence at runtime** (no network probe on click,
no filesystem access to the repo). Therefore resolution must be driven by a **static, deterministic
map that is generated at build/test time and shipped with the bundle**.

### 4.2 Canonical URL formats

Base repository constant (already in
[`externalLinks.ts`](../webview-ui/src/constants/externalLinks.ts:3)):
`https://github.com/xavier-arosemena/roo-plus`

**A. Help page (slug present in the generated map):**

```
https://github.com/xavier-arosemena/roo-plus/blob/master/docs/help/<slug>.md?utm_source=extension&utm_medium=ide&utm_campaign=<campaign>[#<anchor>]
```

Example (call site #11):

```
https://github.com/xavier-arosemena/roo-plus/blob/master/docs/help/features/shell-integration.md?utm_source=extension&utm_medium=ide&utm_campaign=settings_terminal_profile
```

Example with anchor (call site #19):

```
https://github.com/xavier-arosemena/roo-plus/blob/master/docs/help/features/shell-integration.md?utm_source=extension&utm_medium=ide&utm_campaign=settings_terminal_zdotdir#enable-zdotdir-handling
```

**B. Fallback (slug absent from the map) — GitHub Discussions search:**

```
https://github.com/xavier-arosemena/roo-plus/discussions?discussions_q=<encoded-query>&utm_source=extension&utm_medium=ide&utm_campaign=<campaign>
```

Query derivation (deterministic): take the normalised slug, strip a leading `providers/`, then
replace every run of `-` or `/` with a single space and trim. Example: slug
`providers/poe` → query `poe`.

### 4.3 Normalisation + resolution rule (exact)

```
resolve(path, campaign):
  1. s = path
  2. s = s.replace(/^\/+/, "")          // strip leading slashes
  3. [slug, anchor] = s.split("#")       // anchor optional
  4. slug = slug.replace(/\/+$/, "")     // strip TRAILING slash  (handles #22)
  5. slug = slug.trim().toLowerCase()
  6. if slug in DOC_LINK_MAP:            // generated, see §4.4
        url = BASE + "/blob/master/docs/help/" + DOC_LINK_MAP[slug].path + ".md"
        url += "?utm_source=extension&utm_medium=ide&utm_campaign=" + encodeURIComponent(campaign)
        if anchor: url += "#" + anchor
        return url
  7. else:                               // deterministic fallback
        q = slug.replace(/^providers\//, "").replace(/[-/]+/g, " ").trim()
        return BASE + "/discussions?discussions_q=" + encodeURIComponent(q)
             + "&utm_source=extension&utm_medium=ide&utm_campaign=" + encodeURIComponent(campaign)
```

Property: **every call site returns a valid GitHub URL** (blob or discussions), and the decision is
a pure function of the static map — no network, no file I/O at runtime.

### 4.4 Generated map (the shipped artifact)

Generate `webview-ui/src/utils/docLinkMap.generated.ts` from the `docs/help/**` tree:

```ts
// AUTO-GENERATED by scripts/generate-doc-link-map.mjs — do not edit by hand.
export const DOC_LINK_MAP: Record<string, { path: string }> = {
	"features/shell-integration": { path: "features/shell-integration" },
	"providers/anthropic": { path: "providers/anthropic" },
	// ...one entry per existing docs/help/<slug>.md
} as const
```

- Keys are normalised slugs (anchor-stripped, trailing-slash-stripped, lowercased).
- Values store the repo-relative path **without** the `docs/help/` prefix and **without** `.md`.
- Providers are enumerated from `PROVIDERS` + the extended `PROVIDER_DOCS_SLUGS` mapping so the
  generated file covers all 32 provider slugs whose page exists.

`buildDocLink()` then becomes a thin wrapper over `resolve()`. The `_path`-is-ignored behaviour is
replaced; the UTM convention is preserved exactly.

### 4.5 Anchor ↔ heading contract

GitHub generates blob anchors from **heading text** (lowercase, spaces→`-`, punctuation dropped),
not from Docusaurus ids. Each anchor currently referenced must correspond to a real heading in the
authored page. Required headings (verbatim text) per anchor:

| Anchor (from call site)                 | Required heading text in the page      |
| --------------------------------------- | -------------------------------------- |
| `#editing-mcp-settings-files`           | `Editing MCP Settings Files`           |
| `#global-rules-directory`               | `Global Rules Directory`               |
| `#setting-up-global-rules`              | `Setting Up Global Rules`              |
| `#use-inline-terminal-recommended`      | `Use inline terminal (recommended)`    |
| `#inherit-environment-variables`        | `Inherit environment variables`        |
| `#terminal-shell-integration-timeout`   | `Terminal shell integration timeout`   |
| `#terminal-command-delay`               | `Terminal command delay`               |
| `#enable-powershell-counter-workaround` | `Enable PowerShell counter workaround` |
| `#clear-zsh-eol-mark`                   | `Clear Zsh EOL mark`                   |
| `#enable-oh-my-zsh-integration`         | `Enable Oh My Zsh integration`         |
| `#enable-powerlevel10k-integration`     | `Enable Powerlevel10k integration`     |
| `#enable-zdotdir-handling`              | `Enable ZDOTDIR handling`              |

Phase 2 must author these headings (or the anchors silently land at the top of the page). The CI
check (§5) should verify heading presence on a best-effort basis.

---

## 5. CI check spec — `scripts/verify-doc-links.mjs`

Follows the structure of
[`verify-locale-readmes.mjs`](../scripts/verify-locale-readmes.mjs:1): a pure
`verifyDocLinks({...})` function, a `main()` with `logStep/logError/logSuccess`, `process.exit(1)`
on failure, env-var overrides for fixtures, and a sibling `node --test` spec.

### 5.1 Purpose

Fail the build if any real `buildDocLink` call site references a slug whose
`docs/help/<slug>.md` is missing (and is not on the explicit fallback allowlist). Also fail if the
generated `docLinkMap.generated.ts` is out of sync with `docs/help/**`.

### 5.2 Inputs

| Input              | Source                                                                    | Notes                                                              |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Source candidates  | glob `webview-ui/src/**/*.{ts,tsx}`                                       | **Exclude** `**/__tests__/**`, `**/*.spec.*`                       |
| Slug literals      | regex/AST over the candidates for `buildDocLink(` args                    | first arg; string or template literal                              |
| Dynamic prefixes   | constant `DYNAMIC_PREFIXES = ["providers/"]`                              | template `` `providers/${slug}` `` expanded from the provider list |
| Provider slug list | generated alongside §4.4 (or read from `providerModelConfig`/`constants`) | 32 concrete slugs                                                  |
| Page tree          | `docs/help/**/*.md`                                                       | env override `ROO_HELP_ROOT` for fixtures                          |
| Fallback allowlist | `FALLBACK_ALLOWLIST` (constant in the script)                             | the 4 provider slugs in §3                                         |

### 5.3 Checks

1. **Enumerate** all static slug literals (expect 10 distinct) and expand `providers/*` (expect 32).
2. **Existence:** for each enumerated slug, `docs/help/<slug>.md` must exist **or** the slug must be
   in `FALLBACK_ALLOWLIST`.
3. **Map sync:** the keys of `docLinkMap.generated.ts` must equal the set of existing
   `docs/help/<slug>.md` pages (regenerate if not).
4. **Anchor/heading (best-effort):** every anchor referenced by a call site must have a matching
   slugified heading in the target page.
5. **No stale slugs:** every enumerated slug must be reachable — i.e. no page exists under
   `docs/help` that is not referenced by a call site (prevents rot). _(Optional; recommend as a
   warning, not a hard failure.)_

### 5.4 Failure message (example)

```
[VERIFY:DOC-LINKS] ERROR: missing help page for slug "features/skills"
  referenced by webview-ui/src/components/settings/SkillsSettings.tsx:225
  expected docs/help/features/skills.md
  fix: author the page (see docs/help-pages-plan.md §2.7), OR add the slug to
       FALLBACK_ALLOWLIST in scripts/verify-doc-links.mjs with a justification comment.
[VERIFY:DOC-LINKS] 1 problem(s) found across 42 enumerated slugs.
```

### 5.5 Wiring

- Add `scripts/verify-doc-links.spec.mjs` (node `--test`) and append it to the `test:scripts`
  list in [`package.json`](../package.json:29).
- Add a step to the static-analysis job in
  [`.github/workflows/code-qa.yml`](../.github/workflows/code-qa.yml:73) (alongside
  `verify-docs-no-public-ip.mjs`) invoking `node scripts/verify-doc-links.mjs`.
- Add a `verify:doc-links` script entry to [`package.json`](../package.json:32) for local use.
- The map generator (`scripts/generate-doc-link-map.mjs`) runs the `--check`/write mode; CI uses
  `--check` (mirrors `generate-announcements` + `verify-announcement-version`).

---

## 6. Open questions / risks for owner confirmation

1. **Slug-with-anchor path shape.** Confirm pages keep upstream directory structure
   (`docs/help/features/mcp/using-mcp-in-roo.md`) rather than a flat `docs/help/<dashed-slug>.md`.
   Directory-preserving was assumed here because the CI mapping is a pure string transform.
2. **Provider coverage policy.** Are the 4 fallback providers (`opencode-go`, `nanogpt`, `unbound`,
   `poe`) acceptable as Discussions-search fallbacks, or must all 32 providers get authored pages?
3. **`openai-codex` mapping.** Phase 2 should extend `PROVIDER_DOCS_SLUGS` with
   `openai-codex → openai-chatgpt-plus-pro` (a runtime-code change) so the page resolves. Confirm.
   **Resolved (Phase 2):** keep the slug as `openai-codex` (no `PROVIDER_DOCS_SLUGS` change) and
   author `docs/help/providers/openai-codex.md`. Renaming the user-visible doc path to
   `openai-chatgpt-plus-pro` would diverge from the provider's own label ("OpenAI - ChatGPT
   Plus/Pro") and require a runtime change for no benefit; the page content carries the upstream
   `openai-chatgpt-plus-pro` material.
4. **`features/experimental/codebase-indexing` drift.** Keep the Roo+ slug (author the page under
   it) or re-point the call site to `features/codebase-indexing`? Either way a page must exist.
   **Resolved (Phase 2):** keep the Roo+ slug and author
   `docs/help/features/experimental/codebase-indexing.md` — no call-site change, so every existing
   link keeps working.
5. **Third-party vendor links inside provider help pages.** The GitHub-only guardrail forbids new
   non-GitHub URLs; provider pages normally want a "get key" console link. Confirm the policy
   (omit vendor URLs, or allow-list specific vendor consoles).
6. **CI strictness on anchor/heading matching.** GitHub heading slugification is client-side and
   could change; confirm anchor-check is best-effort (warn) vs hard-fail.
7. **`main` branch assumption.** Base URLs assume `blob/main`; confirm `main` is the canonical
   branch for shipped docs (this repo's default branch shown locally is `master`). **This is a
   blocking naming decision:** the documented base uses `main`, but the working branch is `master`.
   **Resolved (Phase 2):** the ref is `blob/master` (see the §4 base URLs, updated).
8. **Extra non-`buildDocLink` fix scope.** [`ChatRow.tsx:1119`](../webview-ui/src/components/chat/ChatRow.tsx:1119)
   hardcodes a `cline/cline` GitHub **wiki** URL for the PowerShell error "Learn more". Should
   Phase 2 route it through `buildDocLink("troubleshooting/shell-integration", "error_powershell")`?
   **Resolved (Phase 2):** yes — the hardcoded stale `cline/cline` wiki URL was replaced with
   `buildDocLink("troubleshooting/shell-integration", "error_powershell")`.
9. **In-product anchor stability.** Anchor suffixes are part of the _call site_ (not the page). If a
   page heading is reworded in future, anchors break silently; confirm the CI anchor check guards it.

---

## Appendix A — Non-`buildDocLink` user-facing "docs" links (inventory)

These do **not** pass through `buildDocLink` and are therefore out of the slug catalog, but are
inventoried because they are user-facing "learn more"/docs destinations:

| Location                                                                                                                                                                                                                            | Destination today                                                                                                                                                                           | Category                | Note                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| [`ChatRow.tsx:1119`](../webview-ui/src/components/chat/ChatRow.tsx:1119)                                                                                                                                                            | `github.com/cline/cline/wiki/...` (PowerShell troubleshooting)                                                                                                                              | **Stale upstream link** | Only remaining non-Roo help link; §6 Q8.        |
| [`ApiOptions.tsx:815`](../webview-ui/src/components/settings/ApiOptions.tsx:815) / [`845`](../webview-ui/src/components/settings/ApiOptions.tsx:845)                                                                                | OpenRouter provider-routing docs (vendor)                                                                                                                                                   | Third-party vendor      | Pre-existing; not a Roo help page.              |
| [`CodeIndexPopover.tsx:1493`](../webview-ui/src/components/chat/CodeIndexPopover.tsx:1493)                                                                                                                                          | OpenRouter provider-routing docs (vendor)                                                                                                                                                   | Third-party vendor      | Pre-existing.                                   |
| Provider components (`providers/*.tsx`)                                                                                                                                                                                             | Vendor console / model docs (e.g. Anthropic, Gemini, xAI, Fireworks, Mistral, LM Studio, Nanobot, Kimi, Unbound, SambaNova, Vercel, Kenari, Poe, Requesty, LiteLLM, Vertex/GCP, VS Code LM) | Third-party vendor      | "Get API key"/"Docs" links; not Roo help pages. |
| [`About.tsx:124`](../webview-ui/src/components/settings/About.tsx:124) (+ `:133`, `:142`, `:153`)                                                                                                                                   | `EXTERNAL_LINKS` bug/feature/security/discussions                                                                                                                                           | GitHub support          | Already GitHub-only.                            |
| [`ErrorBoundary.tsx:66`](../webview-ui/src/components/ErrorBoundary.tsx:66)                                                                                                                                                         | `EXTERNAL_LINKS.GITHUB_ISSUES`                                                                                                                                                              | GitHub support          | Already GitHub-only.                            |
| [`ChatRow.tsx:1148`](../webview-ui/src/components/chat/ChatRow.tsx:1148)                                                                                                                                                            | `EXTERNAL_LINKS.GITHUB_ISSUES` (generic API error)                                                                                                                                          | GitHub support          | Already GitHub-only.                            |
| [`RooTips.tsx`](../webview-ui/src/components/welcome/RooTips.tsx:17), [`Announcement.tsx`](../webview-ui/src/components/chat/Announcement.tsx:82), [`IssueFooter.tsx`](../webview-ui/src/components/marketplace/IssueFooter.tsx:11) | GitHub / Marketplace / Open VSX                                                                                                                                                             | Support & marketing     | Out of scope; already documented targets.       |
| `ErrorRow.tsx` / `WarningRow.tsx`                                                                                                                                                                                                   | generic optional `docsURL` prop                                                                                                                                                             | Component API           | Caller-supplied; consumers may pass any URL.    |

## Appendix B — Method / provenance

- Call sites: repository-wide search for `buildDocLink(` (see §1.1 for scope/exclusions).
- Upstream code repo `Zoo-Code-Org/Zoo-Code` (`upstream` git remote): `docs/` contains only
  `docs/architecture/**` — **no user-facing content**.
- Upstream docs-site source: `Zoo-Code-Org/Zoo-Code-Docs` (Docusaurus; `docs/` tree = 528 files),
  read via the GitHub tree API + `raw.githubusercontent.com` at `main`.
- The retired `docs.roo.plus` / `docs.zoocode.dev` / `docs.roocode.com` hosts were confirmed only in
  `git log --follow webview-ui/src/utils/docLinks.ts` history; they are **not** referenced or linked
  from this plan.
