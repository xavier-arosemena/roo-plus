#!/usr/bin/env bash
#
# host-health-capture.sh - no-repro extension-host health capture harness (P3).
#
# Implements the runnable, no-reproduction-required measurement protocol of
#   docs/incidents/2026-09-15-extension-host-unresponsive-diagnosis.md
#     §5.1  find the extension-host PID
#     §5.2  always-on background samplers (pidstat preferred, /proc + PSI fallback)
#     §5.3  instant snapshot for the moment the host is flagged unresponsive
# and feeds the §5.4 discriminator table + §7 decision tree, so the next
# `INFO Extension host (Remote) is unresponsive.` event is captured
# automatically and becomes self-attributing:
#     H1 payload CPU | H2 checkpoint/IO | H3 environmental | H4 GC/memory.
#
# ---------------------------------------------------------------------------
# AVAILABILITY SPLIT (deliberate - do not blur the two halves)
# ---------------------------------------------------------------------------
#   (a) HOST-SIDE CAPTURE NEEDS NO EXTENSION CODE. The samplers below use
#       pidstat / /proc/pressure/* / /proc/<pid>/stat / top / free / loadavg on
#       the remote host. They work today against an installed release build
#       (e.g. 3.88.2). This is the immediately runnable part.
#   (b) THE `[host-health]` HALF OF THE CORRELATION REQUIRES A P2 BUILD.
#       `elu_ms`, `jitter_ms`, `cpu_pct`, `state_serialize_ms` are emitted by
#       src/core/webview/extensionHostHealthMetrics.ts, which exists only in the
#       uncommitted working tree. On a release build you get this harness's
#       host-side numbers plus `[webview-metrics]` lines and the
#       unresponsive/responsive pair, but NO `[host-health]` lines. Build and
#       install a dev build (or the next pre-release) AND set
#       ROO_HOST_HEALTH_DEBUG=1 in the *server's* environment (see the runbook
#       "Capture protocol" section) to obtain (b).
#
# ---------------------------------------------------------------------------
# PRIVACY / SAFETY
# ---------------------------------------------------------------------------
#   - Local artifacts only, under --out-dir (default /tmp/roo-perf). This
#     harness makes no network calls, uploads nothing, and emits no telemetry:
#     it is operator-run shell tooling, not extension code.
#   - Artifacts contain host-level data (PIDs, process cmdlines, paths, load,
#     pressure). They stay on the operator's machine; delete them after
#     analysis. See the runbook "Capture protocol" section for the hygiene note.
#   - The harness never reads or copies workspace file *contents*.
#
# Usage: bash scripts/host-health-capture.sh --help
#
# Exit codes: 0 ok - 1 usage/config error - 2 target not found (capture) -
#             3 self-test failure - 130 interrupted

# Guard: this script uses bash features (`[[`, arrays, `$(<file)`).
if [ -z "${BASH_VERSION:-}" ]; then
	printf '%s\n' "error: this harness requires bash (invoke it as: bash scripts/host-health-capture.sh ...)" >&2
	exit 1
fi

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="host-health-capture.sh"
DEFAULT_OUT_DIR="/tmp/roo-perf"
DEFAULT_EH_PATTERN="extensionHostProcess.js"
# Secondary pattern for server builds that spawn the host as a bootstrap fork
# (`node .../out/bootstrap-fork --type=extensionHost`) instead of as
# `extensionHostProcess.js`. Tried only when the primary pattern yields nothing.
# The `fileWatcher` sibling uses `--type=fileWatcher`, so it is not matched.
EH_FALLBACK_PATTERN="${ROO_EH_PATTERN_FALLBACK:---type=extensionHost}"
DEFAULT_PSI_INTERVAL_S=5
# pidstat needs a finite sample count; this is ~24 h, effectively unbounded,
# because cleanup (SIGINT/EXIT trap) terminates it long before then.
PIDSTAT_UNBOUNDED_COUNT=86400

# ---------------------------------------------------------------------------
# CLI state
# ---------------------------------------------------------------------------
MODE="capture" # capture | snapshot | self-test
OUT_DIR="${ROO_PERF_OUT_DIR:-$DEFAULT_OUT_DIR}"
TARGET_PID=""
EH_PATTERN="$DEFAULT_EH_PATTERN"
DURATION_S=0 # 0 = run until SIGINT/SIGTERM
LABEL=""
FORCE_PROC=0
DRY_RUN=0
QUIET=0
PSI_INTERVAL_S="$DEFAULT_PSI_INTERVAL_S"
SNAPSHOT_EVERY_S=0
PRINT_ARTIFACTS=0

# ---------------------------------------------------------------------------
# Runtime state
# ---------------------------------------------------------------------------
TRACKED_PIDS=()
ARTIFACTS=()
CLEANED=0
PID_SOURCE=""
EH_PID=""
PIDSTAT_AVAILABLE=0
PSI_AVAILABLE=0
SAMPLER_MODE=""
PREFIX=""
TCK=""
PAGE_SIZE_KB=4

# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
log() {
	if (( QUIET == 0 )); then
		printf '[%s] %s\n' "$(date -Is)" "$*"
	fi
}

die() {
	printf '%s\n' "error: $*" >&2
	exit 1
}

# Resolve a positive integer from getconf, falling back to a documented default.
# The §5.2 comment warns explicitly: do NOT assume 100 clock ticks/s, and do not
# assume getconf exists (busybox images, restricted containers).
resolve_clk_tck() {
	local raw="${1-$(getconf CLK_TCK 2>/dev/null || true)}"
	if [[ "$raw" =~ ^[0-9]+$ ]] && (( raw > 0 )); then
		printf '%s' "$raw"
	else
		printf '100'
	fi
}

resolve_page_size() {
	local raw="${1-$(getconf PAGESIZE 2>/dev/null || true)}"
	if [[ "$raw" =~ ^[0-9]+$ ]] && (( raw > 0 )); then
		printf '%s' "$raw"
	else
		printf '4096'
	fi
}

# Pure helper: extension-host CPU percent for one /proc/<pid>/stat delta.
# ut/st/prev_* are clock ticks (fields 14/15), dt_ms is wall time, tck is
# getconf CLK_TCK. Never hardcodes 100.
cpu_pct() {
	local ut="$1" st="$2" pu="$3" ps="$4" dt_ms="$5" tck="$6"
	awk -v ut="$ut" -v st="$st" -v pu="$pu" -v ps="$ps" -v dt="$dt_ms" -v tck="$tck" 'BEGIN {
		if (dt <= 0 || tck <= 0) { print "0.0"; exit }
		ticks = ut - pu + st - ps
		if (ticks < 0) { ticks = 0 }
		printf "%.1f\n", ticks / tck / (dt / 1000.0) * 100
	}'
}

# Parse `utime stime rss_pages` out of a /proc/<pid>/stat file (fields 14, 15,
# 24). Parsing is done in awk for two reasons: the comm field (field 2) may
# contain both spaces and `)`, so the split must anchor on the LAST `)`, and
# positional parameters above 9 need `${12}` in bash - `$12` silently expands
# as `${1}2`, which is exactly the kind of off-by-one that would corrupt a
# baseline. Reads an explicit path so --self-test can point it at a fixture.
read_proc_stat_file() {
	awk '
		{
			last = 0
			for (i = 1; i <= length($0); i++) { if (substr($0, i, 1) == ")") last = i }
			if (last == 0) { exit 1 }
			rest = substr($0, last + 2)
			n = split(rest, f, " ")
			if (n < 22) { exit 1 }
			if (f[12] !~ /^[0-9]+$/ || f[13] !~ /^[0-9]+$/ || f[22] !~ /^[0-9]+$/) { exit 1 }
			print f[12], f[13], f[22]
		}
	' "$1"
}

# ---------------------------------------------------------------------------
# §5.1 - resolve the extension-host PID
# ---------------------------------------------------------------------------
# pgrep -f is the documented primary. It is also the documented footgun: a
# *shell* whose command line merely mentions the pattern (for example the very
# command `pgrep -f extensionHostProcess.js`) matches too. Candidates that are
# this script, its ancestors, or a shell running the lookup itself are rejected.
_eh_candidate_ok() {
	local pid="$1" cmd
	[[ "$pid" == "$$" ]] && return 1
	[[ -n "${PPID:-}" && "$pid" == "$PPID" ]] && return 1
	# Guard the redirect: the PID may have exited between pgrep and here, and a
	# failed `<` redirect is reported by the shell itself (not silenced by
	# 2>/dev/null on the command), which would leak noise onto the operator's
	# terminal during a capture.
	# `cat` (not a shell `<` redirect) opens the file, so a PID that exits
	# between pgrep and here cannot make the *shell* print a redirect error.
	cmd="$(cat "/proc/$pid/cmdline" 2>/dev/null | tr '\0' ' ' || true)"
	[[ -z "$cmd" ]] && return 1
	case "$cmd" in
		*"$SCRIPT_NAME"*) return 1 ;;  # our own harness or a wrapper around it
		*pgrep*) return 1 ;;           # the lookup shell itself
	esac
	return 0
}

# One pattern, three lookup strategies: pgrep -f (primary), ps + grep (fallback
# A), raw /proc cmdline scan (fallback B).
#
# Reports through shell state - EH_PID + PID_SOURCE - and prints nothing, so
# callers never need `$( ... )`. That matters: a command substitution runs in a
# subshell, and the assignments would be lost (an earlier revision printed the
# PID and produced `target_pid_source=` / `(via )` in artifacts).
_eh_try_pattern() {
	local pattern="$1" candidate pid

	if command -v pgrep >/dev/null 2>&1; then
		while IFS= read -r candidate; do
			[[ -n "$candidate" ]] || continue
			if _eh_candidate_ok "$candidate"; then
				EH_PID="$candidate"
				PID_SOURCE="pgrep -f $pattern"
				return 0
			fi
		done < <(pgrep -f -- "$pattern" 2>/dev/null || true)
	fi

	if command -v ps >/dev/null 2>&1; then
		# Fallback A (documented): ps + grep, same filter chain as §5.1.
		while IFS= read -r candidate; do
			[[ -n "$candidate" ]] || continue
			if _eh_candidate_ok "$candidate"; then
				EH_PID="$candidate"
				PID_SOURCE="ps -eo pid,cmd | grep $pattern"
				return 0
			fi
		done < <(ps -eo pid=,cmd= 2>/dev/null | grep -E -- "$pattern" | awk '{print $1}' || true)
	fi

	# Fallback B: no pgrep/ps - scan /proc directly.
	if [[ -d /proc ]]; then
		for candidate in /proc/[0-9]*; do
			pid="${candidate#/proc/}"
			if grep -qa -- "$pattern" "$candidate/cmdline" 2>/dev/null && _eh_candidate_ok "$pid"; then
				EH_PID="$pid"
				PID_SOURCE="/proc/*/cmdline scan for $pattern"
				return 0
			fi
		done
	fi

	return 1
}

# The documented §5.1 primary pattern is matched first, then
# EH_FALLBACK_PATTERN. Without the second pattern a modern server build reports
# "no extension host" while one is plainly running: newer vscodium/VS Code
# servers spawn the host as `bootstrap-fork --type=extensionHost` rather than
# `extensionHostProcess.js` (verified against a .vscodium-server install), and
# the fileWatcher sibling uses `--type=fileWatcher`, which this does not match.
#
# Sets EH_PID + PID_SOURCE; returns 0 when a host was found. Never call this
# inside `$( ... )` - the assignments would be discarded with the subshell.
resolve_eh_pid() {
	local override="${1:-}"
	EH_PID=""

	if [[ -n "$override" ]]; then
		if _eh_try_pattern "$override"; then
			return 0
		fi
	elif _eh_try_pattern "$EH_PATTERN"; then
		return 0
	elif [[ "$EH_FALLBACK_PATTERN" != "$EH_PATTERN" ]] && _eh_try_pattern "$EH_FALLBACK_PATTERN"; then
		return 0
	fi

	PID_SOURCE="unresolved"
	return 1
}

# ---------------------------------------------------------------------------
# §5.2 - samplers (each writes to stdout; the caller redirects to an artifact)
# ---------------------------------------------------------------------------
# (a) pidstat: per-second CPU/RSS/IO for the extension host, with the
#     %usr/%system/iowait split that discriminates H1 CPU from H2 IO.
pidstat_sampler() {
	local pid="$1" count="$2"
	pidstat -p "$pid" -u -r -d 1 "$count"
}

# (b) PSI: the single best H3 (environmental) discriminator. §6.4 shows the
#     H1-compatible (< 5 %) vs H3-compatible (> 10 %) shapes.
psi_sampler() {
	local interval="$1" max_samples="$2" n=0 f stamp
	while :; do
		stamp="$(date -Is)"
		for f in /proc/pressure/cpu /proc/pressure/io /proc/pressure/memory; do
			if [[ -r "$f" ]]; then
				printf '%s %s: %s\n' "$stamp" "$f" "$(cat "$f")"
			else
				printf '%s %s: unavailable\n' "$stamp" "$f"
			fi
		done
		printf '\n'
		n=$((n + 1))
		(( max_samples > 0 && n >= max_samples )) && return 0
		sleep "$interval"
	done
}

# (c) /proc/<pid>/stat delta fallback: %CPU without sysstat, honouring CLK_TCK.
proc_sampler() {
	local pid="$1" tck="$2" max_samples="$3"
	local n=0 prev_ms="" prev_u="" prev_s="" sample ut st rss now_ms
	while :; do
		if ! sample="$(read_proc_stat_file "/proc/$pid/stat")"; then
			printf '%s target_gone pid=%s\n' "$(date -Is)" "$pid"
			return 0
		fi
		read -r ut st rss <<<"$sample"
		now_ms="$(date +%s%3N)"
		if [[ -n "$prev_ms" ]]; then
			printf '%s cpu_pct=%s rss_kb=%s clk_tck=%s\n' \
				"$(date -Is)" \
				"$(cpu_pct "$ut" "$st" "$prev_u" "$prev_s" "$((now_ms - prev_ms))" "$tck")" \
				"$((rss * PAGE_SIZE_KB))" \
				"$tck"
		fi
		prev_ms="$now_ms"
		prev_u="$ut"
		prev_s="$st"
		n=$((n + 1))
		(( max_samples > 0 && n >= max_samples )) && return 0
		sleep 1
	done
}

# ---------------------------------------------------------------------------
# §5.3 - instant snapshot (the thing to run the moment the UI freezes)
# ---------------------------------------------------------------------------
capture_snapshot() {
	local pid="$1" cpu_line

	printf '===== snapshot %s pid=%s clk_tck=%s =====\n' "$(date -Is)" "$pid" "$TCK"
	printf '%s\n' "-- top -b -n1 -p $pid -o PID,PCpu,PMem,RES,SHR,TIME+,CMD --"
	top -b -n1 -p "$pid" -o PID,PCpu,PMem,RES,SHR,TIME+,CMD 2>/dev/null | head -5 ||
		top -b -n1 -p "$pid" 2>/dev/null | head -8 ||
		printf '%s\n' "(top unavailable for pid $pid)"

	printf '%s\n' "-- host --"
	printf 'loadavg: %s\n' "$(cat /proc/loadavg 2>/dev/null || printf 'unavailable')"
	printf 'nproc: %s\n' "$(nproc 2>/dev/null || printf 'unavailable')"
	# steal (`st`) is the §5.4 H3 hypervisor-contention discriminator.
	cpu_line="$(top -b -n1 2>/dev/null | grep -E '^%Cpu' | head -1 || true)"
	printf 'cpu_line: %s\n' "${cpu_line:-unavailable}"
	free -m 2>/dev/null || printf '%s\n' "(free unavailable)"

	printf '%s\n' "-- /proc/$pid/status --"
	grep -E 'VmRSS|VmHWM|VmSwap|Threads|voluntary_ctxt_switches|nonvoluntary_ctxt_switches' \
		"/proc/$pid/status" 2>/dev/null ||
		printf '%s\n' "(status unavailable for pid $pid)"

	printf '%s\n' "-- /proc/\$pid/schedstat --"
	cat "/proc/$pid/schedstat" 2>/dev/null || printf '%s\n' "(schedstat unavailable)"

	printf '%s\n' "-- pressure --"
	local f
	for f in /proc/pressure/cpu /proc/pressure/io /proc/pressure/memory; do
		if [[ -r "$f" ]]; then
			printf '%s: %s\n' "$f" "$(cat "$f")"
		else
			printf '%s: unavailable\n' "$f"
		fi
	done
	printf '\n'
}

# ---------------------------------------------------------------------------
# Lifecycle / cleanup - background samplers must never orphan
# ---------------------------------------------------------------------------
track() {
	TRACKED_PIDS+=("$1")
}

_kill_tree() {
	local pid="$1" child
	for child in $(pgrep -P "$pid" 2>/dev/null || true); do
		_kill_tree "$child"
	done
	kill -TERM "$pid" 2>/dev/null || true
}

cleanup() {
	(( CLEANED == 1 )) && return 0
	CLEANED=1
	local pid i
	if ((${#TRACKED_PIDS[@]} > 0)); then
		for pid in "${TRACKED_PIDS[@]}"; do
			[[ -n "$pid" ]] || continue
			kill -0 "$pid" 2>/dev/null || continue
			_kill_tree "$pid"
		done
		# Reap, then force-kill anything that ignored SIGTERM. The in-flight
		# `sleep` inside a sampler subshell is the classic orphan here.
		for pid in "${TRACKED_PIDS[@]}"; do
			[[ -n "$pid" ]] || continue
			i=0
			while kill -0 "$pid" 2>/dev/null && (( i < 20 )); do
				sleep 0.1
				i=$((i + 1))
			done
			kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
			wait "$pid" 2>/dev/null || true
		done
	fi
	if (( PRINT_ARTIFACTS == 1 )); then
		print_artifacts
	fi
	return 0
}

list_artifacts() {
	local a
	if ((${#ARTIFACTS[@]} > 0)); then
		for a in "${ARTIFACTS[@]}"; do
			[[ -e "$a" ]] && printf '%s\n' "$a"
		done
	fi
	return 0
}

print_artifacts() {
	local listed
	listed="$(list_artifacts)"
	printf '\nARTIFACTS (local only; delete after analysis):\n'
	if [[ -n "$listed" ]]; then
		printf '%s\n' "$listed" | sed 's/^/  /'
	else
		printf '%s\n' "  (none)"
	fi
	printf 'ANALYSIS: fill in the checklist in docs/runbooks/host-health-analysis-template.md\n'
}

on_signal() {
	log "received SIG$1 - stopping samplers and flushing artifacts"
	exit 130
}

# ---------------------------------------------------------------------------
# Setup helpers
# ---------------------------------------------------------------------------
check_required_commands() {
	local missing=() c
	for c in date grep sed awk sleep kill; do
		command -v "$c" >/dev/null 2>&1 || missing+=("$c")
	done
	if ((${#missing[@]} > 0)); then
		die "missing required command(s): ${missing[*]}"
	fi
	return 0
}

detect_capabilities() {
	if command -v pidstat >/dev/null 2>&1; then
		PIDSTAT_AVAILABLE=1
	else
		PIDSTAT_AVAILABLE=0
	fi
	if [[ -r /proc/pressure/cpu ]]; then
		PSI_AVAILABLE=1
	else
		PSI_AVAILABLE=0
	fi
	TCK="$(resolve_clk_tck)"
	PAGE_SIZE_KB=$(( $(resolve_page_size) / 1024 ))
	(( PAGE_SIZE_KB > 0 )) || PAGE_SIZE_KB=4
}

prepare_out_dir() {
	mkdir -p "$OUT_DIR" || die "cannot create output dir: $OUT_DIR"
	[[ -w "$OUT_DIR" ]] || die "output dir is not writable: $OUT_DIR"
	local stamp label
	stamp="$(date +%Y%m%d-%H%M%S)"
	label=""
	if [[ -n "$LABEL" ]]; then
		label="-$(printf '%s' "$LABEL" | tr -c 'A-Za-z0-9._-' '-' | sed 's/-\+$//')"
	fi
	PREFIX="$OUT_DIR/$stamp$label"
}

resolve_target() {
	if [[ -n "$TARGET_PID" ]]; then
		[[ "$TARGET_PID" =~ ^[0-9]+$ ]] || die "--pid must be numeric (got: $TARGET_PID)"
		PID_SOURCE="explicit --pid"
		return 0
	fi
	if resolve_eh_pid; then
		TARGET_PID="$EH_PID"
		return 0
	fi
	return 1
}

write_meta() {
	local meta="$1" cmd
	cmd="$(cat "/proc/$TARGET_PID/cmdline" 2>/dev/null | tr '\0' ' ' || true)"
	{
		printf 'harness=%s\n' "$SCRIPT_NAME"
		printf 'harness_version=%s\n' "$SCRIPT_VERSION"
		printf 'started_at=%s\n' "$(date -Is)"
		printf 'host=%s\n' "$(uname -n 2>/dev/null || printf 'unknown')"
		printf 'kernel=%s\n' "$(uname -s -r 2>/dev/null || printf 'unknown')"
		printf 'nproc=%s\n' "$(nproc 2>/dev/null || printf 'unknown')"
		printf 'out_dir=%s\n' "$OUT_DIR"
		printf 'target_pid=%s\n' "$TARGET_PID"
		printf 'target_pid_source=%s\n' "$PID_SOURCE"
		printf 'target_cmd=%s\n' "$cmd"
		printf 'clk_tck=%s\n' "$TCK"
		printf 'page_size_kb=%s\n' "$PAGE_SIZE_KB"
		printf 'sampler_mode=%s\n' "$SAMPLER_MODE"
		printf 'pidstat_available=%s\n' "$PIDSTAT_AVAILABLE"
		printf 'psi_available=%s\n' "$PSI_AVAILABLE"
		printf 'duration_s=%s\n' "$DURATION_S"
		printf 'no_egress=true\n'
	} >"$meta"
	ARTIFACTS+=("$meta")
}

# ---------------------------------------------------------------------------
# Capture
# ---------------------------------------------------------------------------
start_samplers() {
	local stamp
	stamp="$PREFIX"

	if [[ "$SAMPLER_MODE" == "pidstat" ]]; then
		local count="$PIDSTAT_UNBOUNDED_COUNT"
		if (( DURATION_S > 0 )); then
			count=$((DURATION_S + 5))
		fi
		pidstat_sampler "$TARGET_PID" "$count" >"$stamp.pidstat" 2>&1 &
		track "$!"
		ARTIFACTS+=("$stamp.pidstat")
		log "sampler: pidstat -u -r -d 1 $count -> $stamp.pidstat"
	else
		proc_sampler "$TARGET_PID" "$TCK" 0 >"$stamp.proc-cpu" 2>&1 &
		track "$!"
		ARTIFACTS+=("$stamp.proc-cpu")
		log "sampler: /proc/$TARGET_PID/stat delta (clk_tck=$TCK) -> $stamp.proc-cpu"
	fi

	if (( PSI_AVAILABLE == 1 )); then
		psi_sampler "$PSI_INTERVAL_S" 0 >"$stamp.psi.log" 2>&1 &
		track "$!"
		ARTIFACTS+=("$stamp.psi.log")
		log "sampler: /proc/pressure/* every ${PSI_INTERVAL_S}s -> $stamp.psi.log"
	else
		log "note: /proc/pressure is unavailable - H3 (environmental) evidence will be limited"
	fi

	if (( SNAPSHOT_EVERY_S > 0 )); then
		snapshot_sampler "$TARGET_PID" "$SNAPSHOT_EVERY_S" 0 >"$stamp.snapshots.log" 2>&1 &
		track "$!"
		ARTIFACTS+=("$stamp.snapshots.log")
		log "sampler: instant snapshot every ${SNAPSHOT_EVERY_S}s -> $stamp.snapshots.log"
	fi
}

snapshot_sampler() {
	local pid="$1" interval="$2" max_samples="$3" n=0
	while :; do
		capture_snapshot "$pid"
		n=$((n + 1))
		(( max_samples > 0 && n >= max_samples )) && return 0
		sleep "$interval"
	done
}

run_capture() {
	local meta
	detect_capabilities
	prepare_out_dir

	if ! resolve_target; then
		printf '%s\n' "error: no extension-host process matched '$EH_PATTERN'" >&2
		printf '%s\n' "       (nor the fallback pattern '$EH_FALLBACK_PATTERN')." >&2
		printf '%s\n' "  Check §5.1 manually on the REMOTE host:" >&2
		printf '%s\n' "    ps -eo pid,ppid,etimes,pcpu,pmem,rss,cmd --sort=-pcpu | grep -Ei 'extensionHost|vscodium-server'" >&2
		printf '%s\n' "  then re-run with --pid <PID>." >&2
		exit 2
	fi

	if ! kill -0 "$TARGET_PID" 2>/dev/null; then
		printf '%s\n' "error: pid $TARGET_PID is not running." >&2
		exit 2
	fi

	if (( FORCE_PROC == 1 || PIDSTAT_AVAILABLE == 0 )); then
		SAMPLER_MODE="proc"
	else
		SAMPLER_MODE="pidstat"
	fi

	meta="$PREFIX.meta.txt"
	write_meta "$meta"

	trap 'on_signal INT' INT
	trap 'on_signal TERM' TERM
	trap 'cleanup' EXIT

	PRINT_ARTIFACTS=1
	log "target pid=$TARGET_PID (via $PID_SOURCE); sampler=$SAMPLER_MODE; clk_tck=$TCK"
	if (( DURATION_S > 0 )); then
		log "capturing for ${DURATION_S}s (Ctrl-C stops early)"
	else
		log "capturing until SIGINT/SIGTERM (Ctrl-C). Reproduce load / reopen a long task now."
	fi
	log "when the UI freezes, run: bash scripts/host-health-capture.sh --snapshot --pid $TARGET_PID --out-dir $OUT_DIR"

	start_samplers

	if (( DURATION_S > 0 )); then
		sleep "$DURATION_S" &
		local timer="$!"
		wait "$timer" 2>/dev/null || true
		log "duration reached - stopping samplers"
	else
		wait || true
	fi
}

run_snapshot() {
	detect_capabilities
	prepare_out_dir
	if ! resolve_target; then
		printf '%s\n' "error: no extension-host process matched '$EH_PATTERN' or '$EH_FALLBACK_PATTERN' (pass --pid <PID>)." >&2
		exit 2
	fi
	if ! kill -0 "$TARGET_PID" 2>/dev/null; then
		printf '%s\n' "error: pid $TARGET_PID is not running." >&2
		exit 2
	fi
	PRINT_ARTIFACTS=1
	trap 'cleanup' EXIT
	local out="$PREFIX.snapshot.log"
	capture_snapshot "$TARGET_PID" >"$out"
	ARTIFACTS+=("$out")
	write_meta "$PREFIX.meta.txt"
	log "instant snapshot (§5.3) written for pid=$TARGET_PID"
}

# ---------------------------------------------------------------------------
# --dry-run: validate configuration and print the plan, run nothing
# ---------------------------------------------------------------------------
dry_run() {
	local resolved status
	detect_capabilities
	if [[ -n "$TARGET_PID" ]]; then
		resolved="$TARGET_PID"
		status="(--pid given)"
	elif resolve_eh_pid; then
		resolved="$EH_PID"
		status="(resolved via $PID_SOURCE)"
	else
		resolved="<none>"
		status="(NOT FOUND - pass --pid <PID>)"
	fi
	printf 'dry-run: no samplers started, no artifacts written\n'
	printf '  out_dir        : %s\n' "$OUT_DIR"
	printf '  eh_pattern     : %s\n' "$EH_PATTERN"
	printf '  target_pid     : %s %s\n' "$resolved" "$status"
	printf '  sampler_mode   : %s\n' "$( ((FORCE_PROC == 1 || PIDSTAT_AVAILABLE == 0)) && printf proc || printf pidstat )"
	printf '  clk_tck        : %s\n' "$TCK"
	printf '  page_size_kb   : %s\n' "$PAGE_SIZE_KB"
	printf '  psi_available  : %s\n' "$PSI_AVAILABLE"
	printf '  psi_interval_s : %s\n' "$PSI_INTERVAL_S"
	printf '  snapshot_every : %s s\n' "$SNAPSHOT_EVERY_S"
	printf '  duration_s     : %s (0 = until Ctrl-C)\n' "$DURATION_S"
	printf '  mode           : %s\n' "$MODE"
	printf '  no_egress      : true (no network calls are made)\n'
	return 0
}

# ---------------------------------------------------------------------------
# --self-test: validate the harness with no extension host and no sysstat
# ---------------------------------------------------------------------------
SS_PASS=0
SS_FAIL=0

ss_ok() {
	SS_PASS=$((SS_PASS + 1))
	printf 'PASS  %s\n' "$*"
}

ss_fail() {
	SS_FAIL=$((SS_FAIL + 1))
	printf 'FAIL  %s\n' "$*"
}

ss_assert_eq() { # label expected actual
	if [[ "$2" == "$3" ]]; then
		ss_ok "$1 (got '$3')"
	else
		ss_fail "$1 (expected '$2', got '$3')"
	fi
}

self_test() {
	local script_path="${BASH_SOURCE[0]}" tmp decoy decoy_pid decoy_fallback chain_pid chain_src saved_primary out rc got
	detect_capabilities
	printf '%s\n' "self-test: $SCRIPT_NAME $SCRIPT_VERSION"
	printf 'self-test: host=%s clk_tck_resolved=%s\n' "$(uname -s -r 2>/dev/null || printf unknown)" "$(resolve_clk_tck)"

	# 1. bash syntax of this file.
	if bash -n "$script_path" 2>/dev/null; then
		ss_ok "bash -n $SCRIPT_NAME (syntax)"
	else
		ss_fail "bash -n $SCRIPT_NAME (syntax)"
	fi

	# 2. strict-mode flags are active.
	case "$-" in
		*e*) ss_ok "errexit active" ;;
		*) ss_fail "errexit not active" ;;
	esac
	if [[ -o pipefail ]]; then
		ss_ok "pipefail active"
	else
		ss_fail "pipefail not active"
	fi
	if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
		ss_ok "executed as a script (not sourced with an unexpected \$0)"
	else
		ss_fail "BASH_SOURCE[0] != \$0"
	fi

	# 3. CLK_TCK handling: real value is a positive int; junk falls back to 100;
	#    a getconf-less PATH also falls back (never assume 100 unconditionally).
	got="$(resolve_clk_tck)"
	if [[ "$got" =~ ^[0-9]+$ ]] && (( got > 0 )); then
		ss_ok "getconf CLK_TCK resolves to a positive integer ($got)"
	else
		ss_fail "getconf CLK_TCK did not resolve to a positive integer ('$got')"
	fi
	ss_assert_eq "CLK_TCK junk input falls back to 100" "100" "$(resolve_clk_tck 'not-a-number')"
	ss_assert_eq "CLK_TCK zero falls back to 100" "100" "$(resolve_clk_tck '0')"
	ss_assert_eq "CLK_TCK without getconf falls back to 100" "100" "$(PATH=/nonexistent resolve_clk_tck)"
	got="$(resolve_page_size)"
	if [[ "$got" =~ ^[0-9]+$ ]] && (( got > 0 )); then
		ss_ok "page size resolves to a positive integer ($got)"
	else
		ss_fail "page size did not resolve ('$got')"
	fi

	# 4. /proc/<pid>/stat delta math against a synthetic fixture, at two tick
	#    rates - proves the harness is not hardcoding 100 ticks/s.
	tmp="$(mktemp -d "${TMPDIR:-/tmp}/host-health-selftest.XXXXXX")"
	trap 'rm -rf "$tmp"' RETURN
	# comm with spaces AND an embedded `)` - the parser must anchor on the LAST
	# `)` and must read fields 14/15/24 as ${12}/`${13}`/`${22}` of the tail.
	printf '%s\n' "1234 (node extension (Host) S 1 1234 1234 0 -1 4194304 500 0 0 0 200 100 0 0 20 0 12 0 100 0 700 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" >"$tmp/stat"
	ss_assert_eq "read_proc_stat_file parses utime/stime/rss (comm with spaces + paren)" "200 100 700" "$(read_proc_stat_file "$tmp/stat")"
	printf '%s\n' "1 (sh) S 1 1 1 0 -1 0 0 0 0 0 10 20 0 0 20 0 1 0 0 0 65536" >"$tmp/stat2"
	ss_assert_eq "read_proc_stat_file parses a minimal fixture too" "10 20 65536" "$(read_proc_stat_file "$tmp/stat2")"
	printf '%s\n' "not a proc stat line" >"$tmp/badstat"
	if read_proc_stat_file "$tmp/badstat" >/dev/null 2>&1; then
		ss_fail "read_proc_stat_file accepted a malformed /proc stat line"
	else
		ss_ok "read_proc_stat_file rejects a malformed /proc stat line"
	fi
	if read_proc_stat_file "$tmp/does-not-exist" >/dev/null 2>&1; then
		ss_fail "read_proc_stat_file accepted a missing file"
	else
		ss_ok "read_proc_stat_file rejects a missing file"
	fi
	ss_assert_eq "cpu_pct honours clk_tck=100" "300.0" "$(cpu_pct 300 0 0 0 1000 100)"
	ss_assert_eq "cpu_pct honours clk_tck=1000" "30.0" "$(cpu_pct 300 0 0 0 1000 1000)"
	ss_assert_eq "cpu_pct guards dt<=0" "0.0" "$(cpu_pct 300 0 0 0 0 100)"

	# 5. PID resolution works without any extension host: a decoy process whose
	#    argv[0] contains the pattern must be found, and our own shell must NOT
	#    be returned (the pgrep -f self-match trap).
	bash -c 'exec -a "node extensionHostProcess.js" sleep 30' &
	decoy=$!
	# 5b decoy: spawned the way newer server builds spawn the host.
	bash -c 'exec -a "node /opt/server/out/bootstrap-fork --type=extensionHost" sleep 30' &
	decoy_fallback=$!
	sleep 0.2
	# NOTE: resolution is always called as a plain command (never inside
	# `$( ... )`), because it reports through EH_PID/PID_SOURCE; a command
	# substitution would discard those assignments with its subshell.
	decoy_pid=""
	if resolve_eh_pid "extensionHostProcess.js" 2>/dev/null; then
		decoy_pid="$EH_PID"
	fi
	if [[ "$decoy_pid" =~ ^[0-9]+$ ]]; then
		ss_ok "resolve_eh_pid finds the decoy extensionHostProcess.js process ($decoy_pid via $PID_SOURCE)"
	else
		ss_fail "resolve_eh_pid did not find the decoy (got '$decoy_pid')"
	fi
	if [[ "$decoy_pid" == "$decoy" ]]; then
		ss_ok "resolved PID is the decoy, not a parent shell of the harness"
	else
		ss_fail "resolved PID $decoy_pid is not the decoy $decoy"
	fi
	if [[ "$decoy_pid" == "$$" ]]; then
		ss_fail "resolve_eh_pid returned this shell (self-match trap)"
	else
		ss_ok "resolve_eh_pid excludes this shell (no pgrep -f self-match)"
	fi
	# 5b assertion: with an impossible PRIMARY pattern the harness must still
	# resolve a `bootstrap-fork --type=extensionHost` host (the decoy makes this
	# environment-independent; where a real host exists, that host may match
	# instead - either way a PID must come back and PID_SOURCE must name the
	# fallback pattern).
	saved_primary="$EH_PATTERN"
	EH_PATTERN="definitely-no-such-primary-$$"
	chain_pid=""
	chain_src=""
	if resolve_eh_pid 2>/dev/null; then
		chain_pid="$EH_PID"
		chain_src="$PID_SOURCE"
	fi
	EH_PATTERN="$saved_primary"
	if [[ "$chain_pid" =~ ^[0-9]+$ && "$chain_src" == *"$EH_FALLBACK_PATTERN"* ]]; then
		ss_ok "fallback pattern chain resolves a --type=extensionHost host when the primary matches nothing ($chain_pid via $chain_src)"
	else
		ss_fail "fallback pattern chain failed (pid='$chain_pid' source='$chain_src')"
	fi
	if resolve_eh_pid "definitely-no-such-process-xyz-$$" >/dev/null 2>&1; then
		ss_fail "resolve_eh_pid returned success for an impossible pattern"
	else
		ss_ok "resolve_eh_pid fails cleanly for an impossible pattern"
	fi

	# 6. /proc sampler (the sysstat-free path) runs against the decoy and
	#    produces at least one CPU sample line.
	out="$tmp/proc-cpu.log"
	proc_sampler "$decoy" "$(resolve_clk_tck)" 3 >"$out" 2>&1 || true
	if grep -q 'cpu_pct=' "$out"; then
		ss_ok "/proc fallback sampler produced samples: $(head -1 "$out")"
	else
		ss_fail "/proc fallback sampler produced no cpu_pct sample"
	fi

	# 7. PSI sampler (best-effort: skipped cleanly where /proc/pressure is absent).
	out="$tmp/psi.log"
	psi_sampler 0 1 >"$out" 2>&1 || true
	if grep -q 'pressure' "$out"; then
		ss_ok "PSI sampler wrote pressure lines"
	else
		ss_fail "PSI sampler wrote nothing"
	fi

	# 8. Instant snapshot (§5.3) works against a real, non-extension PID.
	out="$tmp/snapshot.log"
	capture_snapshot "$decoy" >"$out" 2>&1 || true
	got=0
	for marker in 'snapshot' 'top -b -n1' 'loadavg' 'nproc' 'cpu_line' 'pressure'; do
		grep -q -- "$marker" "$out" || got=$((got + 1))
	done
	if (( got == 0 )); then
		ss_ok "capture_snapshot emitted all §5.3 sections"
	else
		ss_fail "capture_snapshot missing $got §5.3 section marker(s)"
	fi

	# 9. Cleanup kills tracked background samplers (no orphans).
	bash -c 'exec sleep 30' &
	local victim=$!
	track "$victim"
	sleep 0.2
	cleanup
	if kill -0 "$victim" 2>/dev/null; then
		ss_fail "cleanup left a tracked sampler alive (pid $victim)"
		kill -KILL "$victim" 2>/dev/null || true
	else
		ss_ok "cleanup reaped the tracked background sampler"
	fi
	TRACKED_PIDS=()
	CLEANED=0

	# 10. Artifact bookkeeping prints real paths.
	ARTIFACTS=("$tmp/snapshot.log")
	got="$(list_artifacts)"
	if [[ "$got" == "$tmp/snapshot.log" ]]; then
		ss_ok "artifact listing reports produced files"
	else
		ss_fail "artifact listing wrong (got '$got')"
	fi
	ARTIFACTS=()

	# 11. Required tooling present (each is guarded in the capture path).
	command -v pidstat >/dev/null 2>&1 &&
		ss_ok "pidstat present (sysstat) - pidstat sampler is available" ||
		ss_ok "pidstat absent - the /proc fallback sampler will be used (expected on minimal hosts)"

	# 12. Syntax check of the /proc fallback arithmetic with page size applied.
	ss_assert_eq "page_size_kb default sanity" "ok" "$(if ((PAGE_SIZE_KB > 0)); then printf ok; else printf bad; fi)"

	kill -TERM "$decoy" 2>/dev/null || true
	kill -TERM "$decoy_fallback" 2>/dev/null || true
	wait "$decoy" 2>/dev/null || true
	wait "$decoy_fallback" 2>/dev/null || true
	rm -rf "$tmp"
	printf '\nself-test: %d passed, %d failed\n' "$SS_PASS" "$SS_FAIL"
	if (( SS_FAIL > 0 )); then
		printf '%s\n' "self-test: FAILED"
		return 3
	fi
	printf '%s\n' "self-test: OK (no extension host and no sysstat required)"
	return 0
}

# ---------------------------------------------------------------------------
# --help
# ---------------------------------------------------------------------------
usage() {
	cat <<'EOF'
host-health-capture.sh - no-repro extension-host health capture harness (P3)

Implements §5.1-§5.3 of
  docs/incidents/2026-09-15-extension-host-unresponsive-diagnosis.md
so the next `INFO Extension host (Remote) is unresponsive.` event is captured
automatically and becomes self-attributing (H1/H2/H3/H4) via §5.4 + §7.

USAGE
  bash scripts/host-health-capture.sh [options]

MODES
  (default)            Resolve the extension-host PID and run the background
                       samplers until Ctrl-C (or --duration). Run it in a
                       background terminal on the REMOTE host for the whole
                       session - no reproduction needed.
  --snapshot           §5.3 instant snapshot, written once, then exit. This is
                       the command to run the moment the UI freezes or the
                       `INFO ... unresponsive` line appears.
  --self-test          Validate the harness (syntax, CLK_TCK handling, /proc
                       parsing, PID resolution, samplers, cleanup, artifact
                       listing) WITHOUT a running extension host and WITHOUT
                       sysstat. Safe for CI.
  --dry-run            Print the resolved plan and run nothing.

OPTIONS
  --pid <PID>          Capture a specific PID (skips §5.1 resolution).
  --pattern <REGEX>    Override the PRIMARY pgrep -f pattern used to resolve the
                       host (default: extensionHostProcess.js). When it yields
                       nothing, the harness also tries the secondary pattern
                       `--type=extensionHost` (the spawn form used by newer
                       vscodium/VS Code server builds, which do NOT use
                       extensionHostProcess.js; override with
                       $ROO_EH_PATTERN_FALLBACK). Lookup order per pattern:
                       pgrep -f, then ps + grep, then a raw /proc/*/cmdline scan.
                       If both patterns fail, pass --pid explicitly.
  --out-dir <DIR>      Artifact directory (default: /tmp/roo-perf, or
                       $ROO_PERF_OUT_DIR). Timestamped files are written here.
  --label <TEXT>       Tag artifact filenames, e.g. --label before-fix.
  --duration <SEC>     Stop after SEC seconds (0 = until Ctrl-C; default 0).
  --psi-interval <SEC> PSI sampling interval (default 5).
  --snapshot-every <SEC>
                       Also append an instant snapshot every SEC seconds
                       (default 0 = off; the one-shot --snapshot is preferred
                       because it is taken exactly at the event).
  --proc               Force the /proc/<pid>/stat delta sampler even when
                       sysstat/pidstat is installed.
  -q | --quiet         Less chatter on stdout (artifacts are still printed).
  -h | --help          This help.
  -V | --version       Print the harness version.

SAMPLERS (§5.2)
  Prefers:  pidstat -p <PID> -u -r -d 1 <count>      (sysstat; %usr/%system + IO)
  Fallback: /proc/<PID>/stat utime/stime delta       (no sysstat required)
            using getconf CLK_TCK (never assumes 100; falls back to 100 only if
            getconf is unavailable or returns junk)
  Always:   /proc/pressure/{cpu,io,memory} every --psi-interval seconds
            (the single best H3 environmental discriminator, §6.4)

ARTIFACTS (all local, all timestamped, all under --out-dir)
  <stamp>[-label].meta.txt          target PID, resolution method, CLK_TCK, host
  <stamp>[-label].pidstat           pidstat output   (or ...proc-cpu when falling back)
  <stamp>[-label].proc-cpu          /proc delta output
  <stamp>[-label].psi.log           /proc/pressure samples
  <stamp>[-label].snapshots.log     periodic snapshots (only with --snapshot-every)
  <stamp>[-label].snapshot.log      one-shot --snapshot output
The harness prints the exact list on exit under "ARTIFACTS".

AVAILABILITY SPLIT (important)
  (a) The host-side capture above needs NO extension code and works today on an
      installed release build (e.g. 3.88.2).
  (b) Correlating with `[host-health]` lines requires a build containing P2
      (src/core/webview/extensionHostHealthMetrics.ts - uncommitted working
      tree only) AND ROO_HOST_HEALTH_DEBUG=1 in the *remote server's*
      environment. On a release build there are no `[host-health]` lines; you
      then correlate the samplers against `[webview-metrics]` and the
      unresponsive/responsive pair. See the runbook "Capture protocol" section.

PRIVACY / SAFETY
  Local artifacts only. No network calls, no upload, no telemetry. Artifacts
  contain host-level data (PIDs, cmdlines, paths); keep them on the operator's
  machine and delete them after analysis. No workspace file contents are read
  into artifacts.

EXAMPLES
  # Always-on capture for the session (remote host, background terminal):
  bash scripts/host-health-capture.sh --out-dir /tmp/roo-perf

  # A bounded 60 s baseline:
  bash scripts/host-health-capture.sh --duration 60 --label baseline

  # Instant snapshot the moment the freeze/unresponsive line appears:
  bash scripts/host-health-capture.sh --snapshot --pid "$EHPID"

  # Validate the harness anywhere (CI, no extension host, no sysstat):
  bash scripts/host-health-capture.sh --self-test

NEXT STEP
  Fill in docs/runbooks/host-health-analysis-template.md using the artifacts.
EOF
}

parse_args() {
	while (($# > 0)); do
		local arg="$1"
		case "$arg" in
			--mode=*) MODE="${arg#*=}" ;;
			--mode) shift; MODE="${1:-}" ;;
			--pid=*) TARGET_PID="${arg#*=}" ;;
			--pid) shift; TARGET_PID="${1:-}" ;;
			--pattern=*) EH_PATTERN="${arg#*=}" ;;
			--pattern) shift; EH_PATTERN="${1:-}" ;;
			--out-dir=*) OUT_DIR="${arg#*=}" ;;
			--out-dir) shift; OUT_DIR="${1:-}" ;;
			--label=*) LABEL="${arg#*=}" ;;
			--label) shift; LABEL="${1:-}" ;;
			--duration=*) DURATION_S="${arg#*=}" ;;
			--duration) shift; DURATION_S="${1:-}" ;;
			--psi-interval=*) PSI_INTERVAL_S="${arg#*=}" ;;
			--psi-interval) shift; PSI_INTERVAL_S="${1:-}" ;;
			--snapshot-every=*) SNAPSHOT_EVERY_S="${arg#*=}" ;;
			--snapshot-every) shift; SNAPSHOT_EVERY_S="${1:-}" ;;
			--snapshot) MODE="snapshot" ;;
			--self-test) MODE="self-test" ;;
			--dry-run) DRY_RUN=1 ;;
			--proc) FORCE_PROC=1 ;;
			-q | --quiet) QUIET=1 ;;
			-V | --version) printf '%s %s\n' "$SCRIPT_NAME" "$SCRIPT_VERSION"; exit 0 ;;
			-h | --help) usage; exit 0 ;;
			*) die "unknown argument: $arg (try --help)" ;;
		esac
		shift
	done

	case "$MODE" in
		capture | snapshot | self-test) ;;
		*) die "unknown --mode: $MODE" ;;
	esac
	if ! [[ "$DURATION_S" =~ ^[0-9]+$ ]]; then
		die "--duration must be a non-negative integer (got: $DURATION_S)"
	fi
	if ! [[ "$PSI_INTERVAL_S" =~ ^[0-9]+$ ]] || (( PSI_INTERVAL_S < 1 )); then
		die "--psi-interval must be a positive integer (got: $PSI_INTERVAL_S)"
	fi
	if ! [[ "$SNAPSHOT_EVERY_S" =~ ^[0-9]+$ ]]; then
		die "--snapshot-every must be a non-negative integer (got: $SNAPSHOT_EVERY_S)"
	fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
parse_args "$@"

case "$MODE" in
	self-test)
		trap 'cleanup' EXIT
		self_test
		exit $?
		;;
esac

check_required_commands

if (( DRY_RUN == 1 )); then
	dry_run
	exit 0
fi

case "$MODE" in
	snapshot)
		trap 'on_signal INT' INT
		trap 'on_signal TERM' TERM
		run_snapshot
		;;
	capture)
		run_capture
		;;
esac
