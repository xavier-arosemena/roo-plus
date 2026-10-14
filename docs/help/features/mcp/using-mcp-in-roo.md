# Using MCP in Roo+

The Model Context Protocol (MCP) lets Roo+ use external tools and services beyond the
built-in ones. You configure each MCP server once, then let Roo+ call its tools during a
task.

## What MCP is

MCP is an open protocol for exposing tools to an AI assistant. An MCP server advertises a
set of tools (for example: query a database, read a browser page, call an internal API),
and Roo+ can invoke those tools on your behalf. Servers can run locally as child
processes or be reached over a URL.

Roo+ ships without any MCP servers enabled. You add the ones you trust, and you control
exactly which modes may use them.

## Configuring servers

MCP servers can be defined at two levels, with project-level entries taking precedence
over global ones:

- **Global** — available in every workspace. Stored in the global `mcp_settings.json`.
- **Project** — available only in the current workspace. Stored in `.roo/mcp.json` at the
  repository root, so it can be committed and shared with your team.

Add a server with the **Add Server** flow in the MCP view, or edit the settings file
directly (see below). Each entry names the server, the command or URL used to start it,
and any arguments or environment variables it needs.

## Editing MCP Settings Files

The MCP view has an **Edit MCP Settings** action that opens the global settings file in
your editor. To add a project-scoped server, create or edit `.roo/mcp.json` in the
workspace root instead.

A minimal server entry looks like this:

```json
{
	"mcpServers": {
		"my-server": {
			"command": "npx",
			"args": ["-y", "@example/mcp-server"],
			"env": {
				"EXAMPLE_TOKEN": "your-token-here"
			},
			"disabled": false
		}
	}
}
```

Keep secrets such as tokens out of committed files where possible; prefer an environment
variable your shell already provides. The same shape applies to `.roo/mcp.json` for
project-scoped servers.

## Limiting MCP access by mode

Each mode has a set of allowed tool groups. MCP servers can be enabled or disabled per
mode, so a read-only mode (such as Ask) can be kept away from servers that mutate state,
while Code or a custom mode can use them fully. Configure this on the mode itself in
**Settings → Modes**.

## Managing servers

The MCP view lists every configured server and its current state:

- **Enable / disable** a server without deleting its configuration.
- **Restart** a server after changing its settings or updating its package.
- **Delete** a server you no longer need.
- **Network timeout** — how long Roo+ waits for an MCP call before giving up.
- **Auto-approve** — allow specific tools to run without a confirmation prompt. Use this
  only for tools you have reviewed and trust; it removes the per-call confirmation.

## Using tools in a task

Once a server is enabled for the active mode, its tools are available to Roo+ while it
works. When Roo+ wants to call a tool, it shows the request in the chat; depending on the
auto-approve settings, you either confirm it or it proceeds. Tool results are returned to
Roo+ and appear in the task transcript.

If a tool is missing from a task, check that the server is enabled **and** that the
current mode is allowed to use it.
