import { spawn, type ChildProcess } from "child_process"
import fs from "fs"

import { SembleSearchResult, SembleCheckResult, SembleContentType, SEMBLE_DEFAULTS } from "./types"

/**
 * Minimum semble release that advertises the `--max-snippet-lines` flag.
 * Verified in `semble search --help` for the reference v0.4.1 binary.
 *
 * Older binaries reject unknown flags, so this flag must never be sent to a
 * version below this threshold — an unsupported flag fails every search loudly.
 */
export const SEMBLE_MIN_MAX_SNIPPET_LINES_VERSION = "v0.4.1"

/**
 * Parses a semble version string into numeric parts, stripping an optional
 * leading "v" (e.g. "v0.4.1" → [0, 4, 1], "0.5.2" → [0, 5, 2]). Returns
 * undefined for empty or non-numeric input (including pre-release suffixes),
 * so callers can resolve an unknown version conservatively.
 */
function parseSembleVersion(version: string | undefined): number[] | undefined {
	if (!version) {
		return undefined
	}
	const normalized = version.trim().replace(/^v/i, "")
	// Require a strictly dotted-numeric string; reject pre-release suffixes.
	if (!/^\d+(\.\d+)*$/.test(normalized)) {
		return undefined
	}
	return normalized.split(".").map((part) => Number.parseInt(part, 10))
}

/**
 * Returns true when `version` is at least `minimum` (dotted-numeric versions,
 * optionally `v`-prefixed). Unknown/unparseable versions return false — the
 * conservative default, since a caller must never assume a newer capability
 * than what the installed binary advertises.
 */
export function isVersionAtLeast(version: string | undefined, minimum: string): boolean {
	const versionParts = parseSembleVersion(version)
	const minimumParts = parseSembleVersion(minimum)
	if (!versionParts || !minimumParts) {
		return false
	}
	const length = Math.max(versionParts.length, minimumParts.length)
	for (let i = 0; i < length; i++) {
		const a = versionParts[i] ?? 0
		const b = minimumParts[i] ?? 0
		if (a !== b) {
			return a > b
		}
	}
	return true
}

/**
 * Whether the installed semble binary supports the `--max-snippet-lines` flag.
 *
 * The flag was introduced in v0.4.1 (the documented minimum for the flat JSON
 * output + flag). Older binaries reject unknown flags and would fail every
 * search loudly, so the provider must version-gate before forwarding the flag —
 * never probe the runtime, always use the installed version metadata.
 *
 * Conservative default: unknown/unparseable versions return false so the flag
 * is never sent. Omitting it only means full-chunk snippets, which the provider
 * already hard-caps defensively (MAX_SNIPPET_CHARS).
 */
export function supportsMaxSnippetLinesFlag(version: string | undefined): boolean {
	return isVersionAtLeast(version, SEMBLE_MIN_MAX_SNIPPET_LINES_VERSION)
}

/**
 * Wraps the `semble` CLI for programmatic access.
 *
 * The semble binary is automatically downloaded on enablement via semble-downloader.ts.
 *
 * All methods spawn the semble process via child_process.spawn with array
 * arguments (no shell) to prevent shell injection.
 *
 * Semble CLI (v0.4.0+) subcommands:
 *   search <query> [path]             — search a codebase
 *   find-related <file> <line> [path] — find similar code
 *   clear [all|index|savings]         — clear cached indexes/savings
 *   install / uninstall               — configure coding-agent integrations
 *   savings                            — show token stats
 *
 * Common flags:
 *   -k, --top-k N                      — number of results (default: 5)
 *   --content TYPE [TYPE ...]          — content types: code, docs, config, all
 *   --max-snippet-lines N              — lines of source per result (default: full chunk)
 */
export class SembleCLI {
	private readonly semblePath: string

	/** The currently-spawned semble child process, if any. */
	private _activeChild?: ChildProcess

	/**
	 * Aborts the currently-tracked child: kills it and rejects its pending
	 * _spawn promise exactly once. Cleared when the child settles or is replaced.
	 */
	private _abortActiveChild?: () => void

	constructor(semblePath: string) {
		this.semblePath = semblePath

		// Ensure the binary is executable — fixes EACCES if downloader
		// couldn't set permissions (e.g. upgrade from older version).
		// Use synchronous chmod to guarantee permissions are set before
		// any spawn() call.
		if (process.platform !== "win32") {
			try {
				fs.chmodSync(semblePath, 0o755)
			} catch {
				// Silently ignore — spawn will surface the EACCES if it's real
			}
		}
	}

	/**
	 * Checks whether the semble binary is functional by running `semble --help`.
	 *
	 * Exit code 0 alone is not enough: a corrupted PyInstaller build (e.g. the
	 * v0.5.2 release) exits 0 on every invocation with no output. Require the
	 * help text to actually advertise the `search` subcommand so a silent-exit-0
	 * stub is reported as broken instead of "installed/ready".
	 */
	async checkInstalled(): Promise<SembleCheckResult> {
		try {
			const { stdout } = await this._spawn(["--help"], { timeout: 10_000 })

			// Case-insensitive check for the `search` subcommand in the trimmed
			// help output (reference v0.4.1 prints `usage: semble [-h] {search,...}`).
			const help = stdout.trim()
			if (!help.toLowerCase().includes("search")) {
				return {
					installed: false,
					error: "Semble binary is not functional: --help produced no usable output",
				}
			}

			return { installed: true }
		} catch (error: any) {
			return {
				installed: false,
				error: error?.stderr?.trim() || error?.message || "Failed to run semble",
			}
		}
	}

	/**
	 * Searches a codebase. Semble indexes on-the-fly during search.
	 *
	 * Usage: semble search <query> [path] [-k N] [--content TYPE [TYPE ...]] [--max-snippet-lines N]
	 */
	async search(
		query: string,
		repoPath: string,
		options?: { topK?: number; content?: SembleContentType; maxSnippetLines?: number },
	): Promise<SembleSearchResult[]> {
		const topK = options?.topK ?? SEMBLE_DEFAULTS.DEFAULT_TOP_K
		const args = ["search", query, repoPath, "-k", String(topK)]
		if (options?.content && options.content !== "code") {
			args.push("--content", options.content)
		}
		// Bound the per-result snippet size via --max-snippet-lines. Omitted when
		// not set so callers that opt out keep the CLI's full-chunk default.
		if (options?.maxSnippetLines !== undefined) {
			args.push("--max-snippet-lines", String(options.maxSnippetLines))
		}

		try {
			const { stdout } = await this._spawn(args, { timeout: 120_000 })
			return this._parseOutput(stdout)
		} catch (error: any) {
			const stderr = error?.stderr?.trim() || ""
			const message = error?.message || String(error)
			throw new Error(`Semble search failed: ${stderr || message}`)
		}
	}

	/**
	 * Terminates any in-flight semble child process (search/check). Safe no-op
	 * when no child is active. Kills the process and rejects its pending _spawn
	 * promise; the killed guard prevents the close/error handlers from
	 * double-settling the promise.
	 */
	abort(): void {
		const abortActive = this._abortActiveChild
		this._activeChild = undefined
		this._abortActiveChild = undefined
		abortActive?.()
	}

	/**
	 * Spawns the semble process and collects stdout/stderr.
	 * Uses spawn without shell — args are passed as an array, no injection risk.
	 * Caps stdout/stderr buffers at MAX_BUFFER_BYTES to prevent OOM in the extension host.
	 * Kills the process and rejects if the cap is exceeded.
	 */
	private _spawn(args: string[], options: { timeout: number }): Promise<{ stdout: string; stderr: string }> {
		const MAX_BUFFER_BYTES = 10 * 1024 * 1024 // 10 MB

		return new Promise((resolve, reject) => {
			const child = spawn(this.semblePath, args, {
				shell: false,
				timeout: options.timeout,
				stdio: ["ignore", "pipe", "pipe"],
			})

			let stdout = ""
			let stderr = ""
			let stdoutBytes = 0
			let stderrBytes = 0
			let killed = false

			// Track this child so abort() can terminate an in-flight search/check.
			// Searches are sequential, but guard against overlap by aborting any
			// previously-tracked child so it can't orphan if a new spawn starts.
			this.abort()
			this._activeChild = child
			this._abortActiveChild = () => {
				if (killed) {
					return // already settled (timeout / overflow / error)
				}
				killed = true
				child.kill()
				reject({ message: "Semble process aborted", stderr })
			}

			child.stdout?.on("data", (data: Buffer) => {
				stdoutBytes += data.length
				if (stdoutBytes <= MAX_BUFFER_BYTES) {
					stdout += data.toString()
				} else if (!killed) {
					killed = true
					child.kill()
					this._clearActiveChild(child)
					reject({
						message: `stdout exceeded ${MAX_BUFFER_BYTES} bytes — process killed to protect extension host`,
						stderr,
					})
				}
			})

			child.stderr?.on("data", (data: Buffer) => {
				stderrBytes += data.length
				if (stderrBytes <= MAX_BUFFER_BYTES) {
					stderr += data.toString()
				} else if (!killed) {
					killed = true
					child.kill()
					this._clearActiveChild(child)
					reject({
						message: `stderr exceeded ${MAX_BUFFER_BYTES} bytes — process killed to protect extension host`,
						stderr,
					})
				}
			})

			child.on("error", (err: Error) => {
				this._clearActiveChild(child)
				if (!killed) {
					reject({ message: err.message, stderr })
				}
			})

			child.on("close", (code: number | null) => {
				this._clearActiveChild(child)
				if (killed) {
					return // already rejected
				}
				if (code === 0) {
					resolve({ stdout, stderr })
				} else {
					reject({ message: `Process exited with code ${code}`, stderr, stdout })
				}
			})
		})
	}

	/**
	 * Clears the tracked child reference if it still refers to `child`, so a
	 * settled/aborted child never clobbers a newer spawn's reference.
	 */
	private _clearActiveChild(child: ChildProcess): void {
		if (this._activeChild === child) {
			this._activeChild = undefined
			this._abortActiveChild = undefined
		}
	}

	/**
	 * Parses semble CLI JSON output into structured results.
	 *
	 * Semble v0.4.0+ outputs JSON by default with a flat format (no `chunk`
	 * wrapper — the chunk fields are top-level on each result entry):
	 *   { "query": "...", "results": [{ "file_path": "...", "start_line": N, "end_line": M, "score": X, "content": "..." }] }
	 *
	 * If the query returns no results, semble outputs:
	 *   { "error": "No results found." }
	 */
	private _parseOutput(stdout: string): SembleSearchResult[] {
		const trimmed = stdout.trim()
		if (!trimmed) {
			return []
		}

		try {
			const parsed = JSON.parse(trimmed)

			// Handle error response: {"error": "No results found."}
			if (parsed.error) {
				return []
			}

			// Handle successful response: {query, results: [{file_path, start_line, end_line, score, content}]}
			if (parsed.results && Array.isArray(parsed.results)) {
				return parsed.results as SembleSearchResult[]
			}

			// Fallback: if it's a flat array of result entries
			if (Array.isArray(parsed)) {
				return parsed as SembleSearchResult[]
			}

			return []
		} catch {
			// Not JSON — this shouldn't happen with v0.4.0+ but handle gracefully
			console.warn("[SembleCLI] Unexpected non-JSON output from semble")
			return []
		}
	}
}
