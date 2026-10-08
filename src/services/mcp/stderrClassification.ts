/**
 * Classifies a spawned stdio MCP server's stderr chunk.
 *
 * MCP servers commonly print human-readable startup banners to stderr (for
 * example `Tavily MCP server running on stdio`). Treating every such line as an
 * error produced a false `ERR` in the Developer-console and pushed a benign
 * banner into the server's error state via `appendErrorMessage`.
 *
 * The classification is deliberately CONSERVATIVE and error-first:
 *  1. If the output mentions a failure (error/panic/fatal/crash/…), it is NEVER
 *     downgraded — even if it also contains a benign-looking token such as
 *     `info` or `listening on` (e.g. `fatal: server started but crashed`).
 *  2. Only then may an explicit benign allowlist classify it as informational.
 *
 * Genuine server failures therefore stay visible in the console and in the
 * server's error history.
 */
const ERROR_STDERR_PATTERN =
	/\b(error|exception|fatal|panic|fail(?:ed|ure)?|crash(?:ed)?|unhandled|denied|refused|econnrefused|eacces|enoent|traceback)\b/i

const BENIGN_STDERR_PATTERNS: readonly RegExp[] = [
	/INFO\b/i,
	/running on stdio/i,
	/^\s*(?:server\s+)?(?:started|listening on|ready)\b/im,
	/^\s*$/,
]

export function isBenignMcpStderr(output: string): boolean {
	// Error keywords veto a benign classification.
	if (ERROR_STDERR_PATTERN.test(output)) {
		return false
	}
	return BENIGN_STDERR_PATTERNS.some((pattern) => pattern.test(output))
}
