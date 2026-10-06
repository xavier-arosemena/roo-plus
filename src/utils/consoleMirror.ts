/**
 * Console-mirror gate for the extension host.
 *
 * `ClineProvider.log()` writes every message to the Roo+ Output channel — the
 * surface the operator/runbook workflow reads — and historically ALSO mirrored
 * every message to the extension-host DevTools console. That mirror is the
 * dominant source of Developer-console noise: it converts all Output-channel
 * traffic (metrics, checkpoints, lifecycle chatter) into `console.log` lines.
 *
 * The mirror is now opt-in. By default only the runbook-critical SLI prefixes
 * remain in the DevTools console so existing watch/debug procedures keep
 * working; everything else is Output-channel-only. Setting `ROO_DEBUG_CONSOLE`
 * to `1`/`true` restores the previous mirror-everything behaviour.
 */
export const CONSOLE_MIRROR_DEBUG_ENV = "ROO_DEBUG_CONSOLE"

/**
 * SLI prefixes consumed by the gray-webview runbook / post-deploy watch
 * workflow. These stay mirrored to the DevTools console by default.
 */
export const CONSOLE_MIRROR_PREFIXES: readonly string[] = [
	"[webview-metrics]",
	"[host-health]",
	"[webview-liveness]",
	"[webview-boot]",
]

/** Pure gate: `"1"` or `"true"` (case-insensitive) enables full mirroring. */
export function isConsoleMirrorDebugEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	const raw = env[CONSOLE_MIRROR_DEBUG_ENV]
	return raw === "1" || raw?.toLowerCase() === "true"
}

/** Decides whether one Output-channel line should also hit `console.log`. */
export function shouldMirrorToConsole(message: string, env: NodeJS.ProcessEnv = process.env): boolean {
	if (isConsoleMirrorDebugEnabled(env)) {
		return true
	}
	const trimmed = message.trimStart()
	return CONSOLE_MIRROR_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}
