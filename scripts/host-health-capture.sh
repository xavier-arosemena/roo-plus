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
# ---------------------------------------------------------------------------
# TARGET LOSS / WATCHDOG (default on) - this is the gap-G2 fix
# ---------------------------------------------------------------------------
#   An armed window is only valid while the *same* process is being measured. An
#   extension-host restart produces a new host with a new PID, and the kernel may
#   even recycle the old PID - so `kill -0` alone is unsound: after a restart it
#   can succeed against an unrelated process and pidstat would silently measure
#   the wrong one. Both failure modes were hit for real (incident §11 Finding 2:
#   the Pass B host 1208955 exited at 14:21:41Z, the harness PSI loop kept
#   running under the same parent and the replacement host 1290741 went
#   uncaptured; the 2026-09-17 replay left a window PSI-only for ~13 h).
#
#   The harness therefore polls the target and compares /proc/<pid>/stat field 22
#   (`starttime`) with the value captured at arm time and recorded in meta.txt
#   (`target_starttime=`). starttime is the PID's *identity*: while it is
#   unchanged, the process is provably still the one that was armed. On exit, or
#   on any starttime change, the window is CLOSED rather than left running:
#     - a machine-greppable `TARGET_GONE ts=… pid=… reason=exit|pid_reused`
#       marker is printed and appended to `<stamp>[-label].target-gone.log`
#       (plus `TARGET_REPLACED new_pid=…` when a replacement host is resolvable);
#     - the samplers are torn down through cleanup() (nothing may outlive the
#       parent - the orphaned PSI loop is the exact bug being fixed) and the
#       artifact list is printed;
#     - the harness exits 4 (see "Exit codes" below).
#   It never silently continues, because correlating across a restart is the
#   invalid stale-window correlation the runbook forbids.
#
#   `--follow` opts into automatic re-arming: the replacement host is captured in
#   a *fresh* artifact set whose name carries a `-tN` suffix (t2, t3, …). Two
#   different PIDs are never mixed inside one .pidstat/.proc-cpu file.
#   Env: ROO_PERF_WATCH_INTERVAL_S overrides the watchdog poll interval (2 s).
#
# Usage: bash scripts/host-health-capture.sh --help
#
# Exit codes: 0 ok - 1 usage/config error - 2 target not found (capture) -
#             3 self-test failure - 4 target disappeared (window closed) -
#             130 interrupted

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
# Watchdog poll interval. "Every few seconds" bounds a stale window to a couple
# of seconds while staying negligible next to the 1 s pidstat sampling.
# Overridable for tests with ROO_PERF_WATCH_INTERVAL_S.
DEFAULT_WATCH_INTERVAL_S=2
# Documented exit code: the armed target disappeared mid-capture (see TARGET
# LOSS above). Distinct from 2 (never found) and 130 (operator interrupt).
EXIT_TARGET_GONE=4

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
FOLLOW=0 # opt-in: re-resolve + re-arm on target loss (default off)
WATCH_INTERVAL_S="${ROO_PERF_WATCH_INTERVAL_S:-$DEFAULT_WATCH_INTERVAL_S}"

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
# Identity of the armed target: starttime ticks captured at arm time (see the
# TARGET LOSS header section). Empty when /proc/<pid>/stat could not be read.
ARMED_STARTTIME=""
# Watchdog outcome: "" = duration timer fired / healthy stop, else exit|pid_reused.
WATCH_REASON=""
# Replacement-host lookup results (record-only unless --follow re-arms).
REPLACEMENT_PID=""
REPLACEMENT_SOURCE=""
# Duration timer (kept out of TRACKED_PIDS so a --follow re-arm restarts only the
# samplers while the overall --duration budget keeps running).
TIMER_PID=""
# Run-level artifact base: <stamp><label>, with a -tN suffix per --follow target.
RUN_STAMP=""
RUN_LABEL=""

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

# Pure helper: PID start time (field 22, `starttime`, in clock ticks since boot)
# out of a /proc/<pid>/stat file. Same last-`)` anchoring as read_proc_stat_file,
# but kept separate because that helper's 3-field output (utime/stime/rss) is part
# of the already-tested contract. Takes an explicit path so --self-test can point
# it at a fixture.
read_proc_starttime_file() {
	awk '
		{
			last = 0
			for (i = 1; i <= length($0); i++) { if (substr($0, i, 1) == ")") last = i }
			if (last == 0) { exit 1 }
			rest = substr($0, last + 2)
			n = split(rest, f, " ")
			# starttime is field 22 of the full line -> f[20] of the tail
			# (field 2 `comm` and field 3 `state` are stripped by the anchor).
			if (n < 20) { exit 1 }
			if (f[20] !~ /^[0-9]+$/) { exit 1 }
			print f[20]
		}
	' "$1"
}

# Current starttime for a PID; prints nothing when the process is gone or
# /proc/<pid>/stat is unreadable, so callers treat "no output" as gone.
read_proc_starttime() {
	local pid="$1"
	read_proc_starttime_file "/proc/$pid/stat" 2>/dev/null || true
}

# Pure classifier (reads no /proc, so --self-test can drive it directly, including
# the fixture-backed PID-reuse case). expected is the starttime captured at arm
# time; current is "" when the PID has vanished. A *changed* starttime is reported
# as `pid_reused` - never as alive - because that is exactly the case `kill -0`
# cannot see, and the case that would attribute an unrelated process's workload to
# the extension host.
classify_target_identity() { # expected_starttime current_starttime
	local expected="$1" current="$2"
	if [[ -z "$current" ]]; then
		printf 'exit'
	elif [[ -n "$expected" && "$current" != "$expected" ]]; then
		printf 'pid_reused'
	else
		printf 'alive'
	fi
}

# alive | exit | pid_reused for the armed target. The single /proc/<pid>/stat read
# covers BOTH required checks: a missing/unreadable file means the PID is gone,
# and field 22 identifies the process that currently owns the number.
target_identity() { # pid expected_starttime
	local pid="$1" expected="$2" current=""
	current="$(read_proc_starttime "$pid")"
	classify_target_identity "$expected" "$current"
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

# Kill + reap every tracked sampler PID. Shared by cleanup() (the exit path,
# including the watchdog path) and by the --follow re-arm, which must close the
# previous target's artifact set without ending the run.
stop_tracked_pids() {
	local pid i
	((${#TRACKED_PIDS[@]} > 0)) || return 0
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
	TRACKED_PIDS=()
	return 0
}

stop_duration_timer() {
	[[ -n "$TIMER_PID" ]] || return 0
	kill -TERM "$TIMER_PID" 2>/dev/null || true
	wait "$TIMER_PID" 2>/dev/null || true
	TIMER_PID=""
	return 0
}

# Per-target teardown for the --follow re-arm: the samplers of the target that
# just disappeared are fully stopped BEFORE a new target's samplers start, so a
# .pidstat/.proc-cpu file can never hold two different PIDs.
stop_samplers() {
	stop_tracked_pids
	return 0
}

cleanup() {
	(( CLEANED == 1 )) && return 0
	CLEANED=1
	stop_tracked_pids
	stop_duration_timer
	if (( PRINT_ARTIFACTS == 1 )); then
		print_artifacts
	fi
	return 0
}

# Close the current window with the machine-greppable target-loss annotation. The
# marker goes to stdout (always - deliberately NOT gated by -q, because it records
# an abnormal end of the capture window, not chatter) AND into
# <prefix>.target-gone.log, so the event survives both the terminal and the
# artifact set. This never re-binds a sampler - the caller decides (see --follow).
annotate_target_gone() { # reason [replacement_pid]
	local reason="$1" repl="${2:-}" ts lines=() f="$PREFIX.target-gone.log"
	ts="$(date -Is)"
	lines+=("$(printf 'TARGET_GONE ts=%s pid=%s reason=%s' "$ts" "$TARGET_PID" "$reason")")
	if [[ -n "$repl" ]]; then
		lines+=("$(printf 'TARGET_REPLACED ts=%s old_pid=%s new_pid=%s' "$ts" "$TARGET_PID" "$repl")")
	fi
	lines+=("$(printf 'WINDOW_CLOSED ts=%s note=%s' "$(date -Is)" "identity lost - do not correlate this window with a later host")")
	printf '%s\n' "${lines[@]}" >>"$f"
	printf '%s\n' "${lines[@]}"
	ARTIFACTS+=("$f")
	return 0
}

# Poll the armed target until it exits or its PID is reused, or until the
# --duration timer fires. This runs in the FOREGROUND of the parent shell on
# purpose: it replaces the bare `wait` that blocked on *all* children while the
# pidstat sampler had already exited and the PSI loop kept running forever (the
# orphan in incident §11 Finding 2). When this loop returns, the next thing the
# parent does is tear every sampler down, so nothing can outlive it.
# Sets WATCH_REASON to "" (healthy stop, i.e. the duration timer fired) or to the
# loss reason (`exit` | `pid_reused`).
watchdog_loop() { # pid expected_starttime [timer_pid] interval_s
	local pid="$1" expected="$2" timer="${3:-}" interval="$4" reason
	while :; do
		reason="$(target_identity "$pid" "$expected")"
		if [[ "$reason" != "alive" ]]; then
			WATCH_REASON="$reason"
			return 0
		fi
		if [[ -n "$timer" ]] && ! kill -0 "$timer" 2>/dev/null; then
			WATCH_REASON=""
			return 0
		fi
		sleep "$interval"
	done
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
	RUN_STAMP="$(date +%Y%m%d-%H%M%S)"
	RUN_LABEL=""
	if [[ -n "$LABEL" ]]; then
		RUN_LABEL="-$(printf '%s' "$LABEL" | tr -c 'A-Za-z0-9._-' '-' | sed 's/-\+$//')"
	fi
	set_attempt_prefix 1
}

# One arm = one artifact set. A --follow re-arm gets a fresh set with a -tN suffix
# (<stamp><label>-t2.*), so the closed target's .pidstat/.proc-cpu files are never
# reopened and can never contain a second PID.
set_attempt_prefix() { # attempt_number
	local n="$1" suffix=""
	if (( n > 1 )); then
		suffix="-t$n"
	fi
	PREFIX="$OUT_DIR/$RUN_STAMP$RUN_LABEL$suffix"
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

# Look up a replacement extension host, for the target-loss annotation and for the
# --follow re-arm. Reports through shell state - never `$( ... )`, whose subshell
# would discard the assignment (same convention as resolve_eh_pid): sets
# REPLACEMENT_PID ("" when none is found, or when the lookup still resolves to the
# target we just lost) plus REPLACEMENT_SOURCE. EH_PID/PID_SOURCE are restored, so
# an already-written meta.txt keeps describing the real arm.
resolve_replacement_pid() {
	local saved_pid="$EH_PID" saved_src="$PID_SOURCE"
	REPLACEMENT_PID=""
	REPLACEMENT_SOURCE=""
	if resolve_eh_pid >/dev/null 2>&1; then
		if [[ -n "$EH_PID" && "$EH_PID" != "$TARGET_PID" ]]; then
			REPLACEMENT_PID="$EH_PID"
			REPLACEMENT_SOURCE="$PID_SOURCE"
		fi
	fi
	EH_PID="$saved_pid"
	PID_SOURCE="$saved_src"
	return 0
}

write_meta() {
	local meta="$1" cmd starttime
	cmd="$(cat "/proc/$TARGET_PID/cmdline" 2>/dev/null | tr '\0' ' ' || true)"
	# Arm-time identity: /proc/<pid>/stat field 22 (`starttime`). Captured here so
	# the armed window is self-documenting and so the watchdog has the value it
	# compares against (see the TARGET LOSS header section). Also side-effects
	# ARMED_STARTTIME, which is what makes meta.txt and the watchdog agree.
	starttime="$(read_proc_starttime "$TARGET_PID")"
	ARMED_STARTTIME="$starttime"
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
		printf 'target_starttime=%s\n' "${starttime:-unknown}"
		printf 'clk_tck=%s\n' "$TCK"
		printf 'page_size_kb=%s\n' "$PAGE_SIZE_KB"
		printf 'sampler_mode=%s\n' "$SAMPLER_MODE"
		printf 'pidstat_available=%s\n' "$PIDSTAT_AVAILABLE"
		printf 'psi_available=%s\n' "$PSI_AVAILABLE"
		printf 'duration_s=%s\n' "$DURATION_S"
		printf 'follow=%s\n' "$FOLLOW"
		printf 'watchdog_interval_s=%s\n' "$WATCH_INTERVAL_S"
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
	local meta attempt=1
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

	trap 'on_signal INT' INT
	trap 'on_signal TERM' TERM
	trap 'cleanup' EXIT

	PRINT_ARTIFACTS=1

	# --duration bounds the whole run, not each target, so a --follow re-arm cannot
	# silently extend the watch window. The timer is kept out of TRACKED_PIDS so
	# stop_samplers() - which runs on every target loss - leaves it alone.
	if (( DURATION_S > 0 )); then
		sleep "$DURATION_S" &
		TIMER_PID="$!"
	fi

	while :; do
		# One target per iteration: its own meta.txt (own target_pid + arm-time
		# starttime) and its own samplers. write_meta sets ARMED_STARTTIME for us.
		set_attempt_prefix "$attempt"
		meta="$PREFIX.meta.txt"
		write_meta "$meta"

		log "target pid=$TARGET_PID (via $PID_SOURCE); sampler=$SAMPLER_MODE; clk_tck=$TCK; target #$attempt"
		if [[ -n "$ARMED_STARTTIME" ]]; then
			log "identity armed on starttime=$ARMED_STARTTIME (/proc/$TARGET_PID/stat field 22); a change means this PID was reused"
		else
			log "warning: cannot read /proc/$TARGET_PID/stat starttime - PID reuse cannot be detected for this window"
		fi
		log "watchdog: identity-checked liveness every ${WATCH_INTERVAL_S}s; on loss: annotate + stop + exit $EXIT_TARGET_GONE"
		if (( attempt == 1 )); then
			if (( DURATION_S > 0 )); then
				log "capturing for ${DURATION_S}s (Ctrl-C stops early)"
			else
				log "capturing until SIGINT/SIGTERM (Ctrl-C). Reproduce load / reopen a long task now."
			fi
			log "when the UI freezes, run: bash scripts/host-health-capture.sh --snapshot --pid $TARGET_PID --out-dir $OUT_DIR"
		fi

		start_samplers

		WATCH_REASON=""
		watchdog_loop "$TARGET_PID" "$ARMED_STARTTIME" "$TIMER_PID" "$WATCH_INTERVAL_S"

		if [[ -z "$WATCH_REASON" ]]; then
			log "duration reached - stopping samplers"
			cleanup
			return 0
		fi

		# The armed target is gone (exit) or the PID now belongs to another process
		# (pid_reused): close the window, never keep sampling through it. Resolve a
		# replacement first so the annotation can record it.
		resolve_replacement_pid
		annotate_target_gone "$WATCH_REASON" "$REPLACEMENT_PID"
		stop_samplers

		if (( FOLLOW == 1 )) && [[ -n "$REPLACEMENT_PID" ]]; then
			TARGET_PID="$REPLACEMENT_PID"
			PID_SOURCE="$REPLACEMENT_SOURCE"
			attempt=$((attempt + 1))
			log "follow: re-armed against replacement pid $TARGET_PID as target #$attempt (artifact set ${RUN_STAMP}${RUN_LABEL}-t$attempt.*)"
			continue
		fi

		if (( FOLLOW == 1 )); then
			printf '%s\n' "note: --follow is set, but no replacement extension host could be resolved; stopping." >&2
		fi
		log "stopping samplers - the recorded window is CLOSED (reason=$WATCH_REASON)"
		cleanup
		exit "$EXIT_TARGET_GONE"
	done
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
	local resolved status identity
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
	identity="(no target)"
	if [[ "$resolved" =~ ^[0-9]+$ ]]; then
		identity="$(read_proc_starttime "$resolved")"
		[[ -n "$identity" ]] || identity="unavailable (starttime read failed)"
	fi
	printf 'dry-run: no samplers started, no artifacts written\n'
	printf '  out_dir        : %s\n' "$OUT_DIR"
	printf '  eh_pattern     : %s\n' "$EH_PATTERN"
	printf '  target_pid     : %s %s\n' "$resolved" "$status"
	printf '  target_identity: starttime=%s\n' "$identity"
	printf '  sampler_mode   : %s\n' "$( ((FORCE_PROC == 1 || PIDSTAT_AVAILABLE == 0)) && printf proc || printf pidstat )"
	printf '  clk_tck        : %s\n' "$TCK"
	printf '  page_size_kb   : %s\n' "$PAGE_SIZE_KB"
	printf '  psi_available  : %s\n' "$PSI_AVAILABLE"
	printf '  psi_interval_s : %s\n' "$PSI_INTERVAL_S"
	printf '  snapshot_every : %s s\n' "$SNAPSHOT_EVERY_S"
	printf '  duration_s     : %s (0 = until Ctrl-C)\n' "$DURATION_S"
	printf '  mode           : %s\n' "$MODE"
	printf '  watchdog       : identity-checked (starttime) every %ss; loss => TARGET_GONE + stop + exit %s\n' "$WATCH_INTERVAL_S" "$EXIT_TARGET_GONE"
	printf '  follow         : %s\n' "$( ((FOLLOW == 1)) && printf '1 (auto re-resolve, fresh -tN artifact set per target)' || printf '0 (stop on target loss)')"
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

# Print the first existing path among the (glob-expanded) candidates; prints
# nothing and still succeeds when none exist, so callers can safely use it inside
# `$( ... )` under errexit.
ss_first_match() {
	local f
	for f in "$@"; do
		if [[ -e "$f" ]]; then
			printf '%s' "$f"
			return 0
		fi
	done
	return 0
}

self_test() {
	local script_path="${BASH_SOURCE[0]}" tmp decoy decoy_pid decoy_fallback chain_pid chain_src saved_primary out rc got
	local e2e_dir e2e_decoy child child_rc waited ann psi_file psi_before psi_after
	local follow_dir follow_marker fa fb follow_child meta_t1 meta_t2 t1_base t2_base t1_pid t2_pid
	local sampler_t1 sampler_t2 s1 s2 g1 g2 help_out dry_out dry_follow absent
	local started_ms end_ms elapsed_ms
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
	# 4b. Target identity: starttime is field 22 -> the previously-built fixtures
	#     carry known values ($tmp/stat: 100, $tmp/stat2: 0), which pins the field
	#     offset. A changed starttime MUST classify as pid_reused, never as alive:
	#     that is the whole reason existence (`kill -0`) is not enough.
	ss_assert_eq "read_proc_starttime_file parses starttime=100 from the paren fixture (field 22)" "100" "$(read_proc_starttime_file "$tmp/stat")"
	ss_assert_eq "read_proc_starttime_file parses starttime=0 from the minimal fixture" "0" "$(read_proc_starttime_file "$tmp/stat2")"
	if read_proc_starttime_file "$tmp/badstat" >/dev/null 2>&1; then
		ss_fail "read_proc_starttime_file accepted a malformed /proc stat line"
	else
		ss_ok "read_proc_starttime_file rejects a malformed /proc stat line"
	fi
	if read_proc_starttime_file "$tmp/does-not-exist" >/dev/null 2>&1; then
		ss_fail "read_proc_starttime_file accepted a missing file"
	else
		ss_ok "read_proc_starttime_file rejects a missing file"
	fi
	printf '%s\n' "1 (sh) S 1 1 1 0 -1 0" >"$tmp/shortstat"
	if read_proc_starttime_file "$tmp/shortstat" >/dev/null 2>&1; then
		ss_fail "read_proc_starttime_file accepted a truncated stat line (no field 22)"
	else
		ss_ok "read_proc_starttime_file rejects a truncated stat line (no field 22)"
	fi
	ss_assert_eq "identity: unchanged starttime is alive" "alive" "$(classify_target_identity 100 100)"
	ss_assert_eq "identity: CHANGED starttime is pid_reused (not alive, unlike kill -0)" "pid_reused" "$(classify_target_identity 100 101)"
	ss_assert_eq "identity: emptied starttime (PID gone) is exit" "exit" "$(classify_target_identity 100 "")"
	# The same decision, end to end through the /proc-reading wrapper: this shell is
	# alive with its own starttime, and this shell + 1 tick is a reuse.
	got="$(read_proc_starttime "$$")"
	if [[ -n "$got" && "$(target_identity "$$" "$got")" == "alive" ]]; then
		ss_ok "target_identity reports this live shell as alive for its own starttime ($got)"
	else
		ss_fail "target_identity did not report this live shell as alive (starttime read '$got')"
	fi
	ss_assert_eq "target_identity reports a live PID with a stale starttime as pid_reused" "pid_reused" "$(target_identity "$$" "$((got + 1))")"
	absent="$(cat /proc/sys/kernel/pid_max 2>/dev/null || printf '')"
	if [[ "$absent" =~ ^[0-9]+$ ]]; then
		ss_assert_eq "target_identity reports an absent PID as exit" "exit" "$(target_identity "$((absent + 1))" "12345")"
	else
		ss_fail "could not read /proc/sys/kernel/pid_max for the absent-PID assertion"
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

	# 13. LIVE end-to-end watchdog: arm the harness against a decoy, kill the decoy,
	#     and assert it annotates (TARGET_GONE ... reason=exit), stops every sampler
	#     and exits 4 within the poll interval. Bounded and non-racy: it first waits
	#     for meta.txt (proof the harness armed while the target was alive), then
	#     polls for the child's exit with a generous cap instead of assuming a
	#     fixed wall-clock delay.
	e2e_dir="$tmp/e2e"
	mkdir -p "$e2e_dir"
	bash -c 'exec -a "node extensionHostProcess.js" sleep 30' &
	e2e_decoy=$!
	sleep 0.2
	ROO_PERF_WATCH_INTERVAL_S=1 bash "$script_path" --pid "$e2e_decoy" \
		--out-dir "$e2e_dir" --label e2e --psi-interval 1 >"$e2e_dir/stdout.log" 2>&1 &
	child=$!
	meta_t1=""
	waited=0
	while (( waited < 80 )) && [[ -z "$meta_t1" ]]; do
		meta_t1="$(ss_first_match "$e2e_dir"/*.meta.txt)"
		if [[ -z "$meta_t1" ]]; then
			sleep 0.1
			waited=$((waited + 1))
		fi
	done
	if [[ -n "$meta_t1" ]]; then
		ss_ok "live watchdog: harness armed against the decoy (${meta_t1##*/})"
	else
		ss_fail "live watchdog: harness never wrote meta.txt (never armed)"
	fi
	if [[ -n "$meta_t1" ]] && grep -q '^target_starttime=[0-9]' "$meta_t1"; then
		ss_ok "live watchdog: meta.txt records the arm-time identity ($(sed -n 's/^target_starttime=//p' "$meta_t1"))"
	else
		ss_fail "live watchdog: meta.txt does not record target_starttime"
	fi
	# Kill the target and reap it, then wait (bounded) for the watchdog to react.
	kill -TERM "$e2e_decoy" 2>/dev/null || true
	wait "$e2e_decoy" 2>/dev/null || true
	started_ms="$(date +%s%3N)"
	waited=0
	while (( waited < 80 )) && kill -0 "$child" 2>/dev/null; do
		sleep 0.1
		waited=$((waited + 1))
	done
	end_ms="$(date +%s%3N)"
	elapsed_ms=$((end_ms - started_ms))
	if kill -0 "$child" 2>/dev/null; then
		ss_fail "live watchdog: harness still running ${elapsed_ms}ms after the target died (orphan)"
		kill -KILL "$child" 2>/dev/null || true
		wait "$child" 2>/dev/null || true
		child_rc=""
	else
		child_rc=0
		wait "$child" 2>/dev/null || child_rc=$?
	fi
	ss_assert_eq "live watchdog: exits 4 when the armed target disappears" "4" "$child_rc"
	if (( elapsed_ms <= 15000 )); then
		ss_ok "live watchdog: noticed the loss and stopped within the bound (${elapsed_ms}ms <= 15000ms cap)"
	else
		ss_fail "live watchdog: took ${elapsed_ms}ms to stop (> 15000ms cap)"
	fi
	e2e_base="${meta_t1%.meta.txt}"
	ann="$(ss_first_match "$e2e_base.target-gone.log")"
	if [[ -n "$ann" ]] && grep -q 'TARGET_GONE' "$ann"; then
		ss_ok "live watchdog: wrote the greppable marker to an artifact (${ann##*/})"
	else
		ss_fail "live watchdog: no TARGET_GONE marker in a target-gone artifact"
	fi
	if [[ -n "$ann" ]] && grep -q 'reason=exit' "$ann"; then
		ss_ok "live watchdog: marker records reason=exit for a killed target"
	else
		ss_fail "live watchdog: marker did not record reason=exit"
	fi
	if grep -q 'TARGET_GONE' "$e2e_dir/stdout.log" 2>/dev/null; then
		ss_ok "live watchdog: TARGET_GONE is also printed on stdout (greppable in the terminal)"
	else
		ss_fail "live watchdog: TARGET_GONE was not printed on stdout"
	fi
	# The exact orphan of incident §11 Finding 2: the PSI loop must be dead. With
	# --psi-interval 1 a surviving loop would grow the file within ~1 s.
	psi_file="$(ss_first_match "$e2e_base.psi.log")"
	if [[ -n "$psi_file" ]]; then
		psi_before="$(<"$psi_file")"
		sleep 1.3
		psi_after="$(<"$psi_file")"
		if [[ "$psi_before" == "$psi_after" ]]; then
			ss_ok "live watchdog: no orphaned sampler (psi.log stopped growing after exit)"
		else
			ss_fail "live watchdog: psi.log kept growing after the harness exited (orphan not fixed)"
		fi
	else
		ss_ok "live watchdog: /proc/pressure unavailable - orphan PSI check skipped"
	fi

	# 14. LIVE --follow: on target loss the replacement host must be captured in a
	#     SECOND, separately named artifact set (-t2), and the closed target's files
	#     must receive nothing further - one file never holds two PIDs. A unique
	#     --pattern keeps the re-resolve deterministic.
	follow_dir="$tmp/follow"
	mkdir -p "$follow_dir"
	follow_marker="roo-selftest-eh-$$"
	bash -c "exec -a \"node extensionHostProcess.js $follow_marker\" sleep 30" &
	fa=$!
	bash -c "exec -a \"node extensionHostProcess.js $follow_marker\" sleep 30" &
	fb=$!
	sleep 0.2
	ROO_PERF_WATCH_INTERVAL_S=1 bash "$script_path" --pid "$fa" --follow \
		--pattern "$follow_marker" --out-dir "$follow_dir" --label follow --psi-interval 1 \
		>"$follow_dir/stdout.log" 2>&1 &
	follow_child=$!
	meta_t1=""
	waited=0
	while (( waited < 80 )) && [[ -z "$meta_t1" ]]; do
		meta_t1="$(ss_first_match "$follow_dir"/*.meta.txt)"
		if [[ -z "$meta_t1" ]]; then
			sleep 0.1
			waited=$((waited + 1))
		fi
	done
	if [[ -n "$meta_t1" ]]; then
		ss_ok "--follow: first target armed (${meta_t1##*/})"
	else
		ss_fail "--follow: first target never armed"
	fi
	# Kill target 1 and reap it immediately, so the re-resolve cannot see a zombie.
	kill -TERM "$fa" 2>/dev/null || true
	wait "$fa" 2>/dev/null || true
	meta_t2=""
	waited=0
	while (( waited < 120 )) && [[ -z "$meta_t2" ]]; do
		meta_t2="$(ss_first_match "$follow_dir"/*-t2.meta.txt)"
		if [[ -z "$meta_t2" ]]; then
			sleep 0.1
			waited=$((waited + 1))
		fi
	done
	if [[ -n "$meta_t2" ]]; then
		ss_ok "--follow: replacement captured in a second, separately named artifact set (${meta_t2##*/})"
	else
		ss_fail "--follow: no -t2 artifact set was created for the replacement target"
	fi
	t1_pid=""
	t2_pid=""
	if [[ -n "$meta_t1" ]]; then
		t1_pid="$(sed -n 's/^target_pid=//p' "$meta_t1")"
	fi
	if [[ -n "$meta_t2" ]]; then
		t2_pid="$(sed -n 's/^target_pid=//p' "$meta_t2")"
	fi
	ss_assert_eq "--follow: set 1 records the killed target" "$fa" "$t1_pid"
	ss_assert_eq "--follow: set 2 records the replacement target" "$fb" "$t2_pid"
	ss_assert_eq "--follow: the two sets cover two different PIDs" "different" \
		"$(if [[ -n "$t1_pid" && "$t1_pid" != "$t2_pid" ]]; then printf different; else printf same; fi)"
	# The closed target's sampler artifact must be frozen while the replacement's
	# own artifact keeps growing: that is the no-mixed-PID contract, asserted on the
	# files themselves rather than on log wording.
	t1_base="${meta_t1%.meta.txt}"
	t2_base="${meta_t2%.meta.txt}"
	sampler_t1="$(ss_first_match "$t1_base.pidstat" "$t1_base.proc-cpu")"
	sampler_t2="$(ss_first_match "$t2_base.pidstat" "$t2_base.proc-cpu")"
	if [[ -n "$sampler_t1" ]]; then
		s1="$(<"$sampler_t1")"
		sleep 1.2
		s2="$(<"$sampler_t1")"
		if [[ "$s1" == "$s2" ]]; then
			ss_ok "--follow: closed target's sampler artifact receives no new samples (${sampler_t1##*/})"
		else
			ss_fail "--follow: closed target's sampler artifact kept growing (two PIDs in one file)"
		fi
	else
		ss_fail "--follow: no sampler artifact for the first target"
	fi
	if [[ -n "$sampler_t2" ]]; then
		g1="$(<"$sampler_t2")"
		sleep 1.5
		g2="$(<"$sampler_t2")"
		if [[ "$g1" != "$g2" ]]; then
			ss_ok "--follow: replacement target's sampler artifact is growing (${sampler_t2##*/})"
		else
			ss_fail "--follow: replacement target's sampler artifact did not grow"
		fi
	else
		ss_fail "--follow: no sampler artifact for the replacement target"
	fi
	kill -TERM "$fb" 2>/dev/null || true
	kill -TERM "$follow_child" 2>/dev/null || true
	waited=0
	while (( waited < 80 )) && kill -0 "$follow_child" 2>/dev/null; do
		sleep 0.1
		waited=$((waited + 1))
	done
	if kill -0 "$follow_child" 2>/dev/null; then
		kill -KILL "$follow_child" 2>/dev/null || true
	fi
	wait "$follow_child" 2>/dev/null || true
	wait "$fb" 2>/dev/null || true

	# 15. CLI/documentation surface: --follow, the documented exit code, and the
	#     unchanged --dry-run plan (which starts no samplers).
	help_out="$tmp/help.txt"
	bash "$script_path" --help >"$help_out" 2>&1 || true
	if grep -q -- '--follow' "$help_out"; then
		ss_ok "--help documents --follow"
	else
		ss_fail "--help does not document --follow"
	fi
	if grep -q 'target disappeared' "$help_out"; then
		ss_ok "--help documents exit code 4 (target disappeared)"
	else
		ss_fail "--help does not document exit code 4"
	fi
	dry_out="$tmp/dry.txt"
	bash "$script_path" --dry-run >"$dry_out" 2>&1 || true
	if grep -q 'dry-run: no samplers started' "$dry_out" && grep -q 'watchdog' "$dry_out"; then
		ss_ok "--dry-run still prints the plan (now including the watchdog line)"
	else
		ss_fail "--dry-run output is missing the plan or the watchdog line"
	fi
	dry_follow="$tmp/dry-follow.txt"
	bash "$script_path" --dry-run --follow >"$dry_follow" 2>&1 || true
	if grep -q 'follow *: 1' "$dry_follow"; then
		ss_ok "--dry-run reports --follow as enabled"
	else
		ss_fail "--dry-run did not report --follow"
	fi

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
                       session - no reproduction needed. An identity-checked
                       watchdog (below) ends the run if the host restarts.
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
                       The budget covers the whole run, not each target.
  --follow             On target loss, re-resolve the extension host and keep
                       capturing it in a FRESH artifact set named with a -tN
                       suffix (<stamp><label>-t2.pidstat, ...). Default OFF: a
                       silent re-bind is itself a correlation hazard, because a
                       window that spans a restart must never be correlated
                       across one. Two different PIDs are never mixed in one
                       .pidstat/.proc-cpu file.
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
  <stamp>[-label].meta.txt          target PID, how it was resolved, arm-time
                                    target_starttime (PID identity), CLK_TCK, host
  <stamp>[-label].pidstat           pidstat output   (or ...proc-cpu when falling back)
  <stamp>[-label].proc-cpu          /proc delta output
  <stamp>[-label].psi.log           /proc/pressure samples
  <stamp>[-label].snapshots.log     periodic snapshots (only with --snapshot-every)
  <stamp>[-label].snapshot.log      one-shot --snapshot output
  <stamp>[-label].target-gone.log   target-loss annotation (only when the target
                                    exits / its PID is reused mid-capture)
With --follow each re-armed target gets its own set: <stamp><label>-tN.*
The harness prints the exact list on exit under "ARTIFACTS".

TARGET LOSS (watchdog, default on)
  The samplers are only meaningful while they measure the SAME process. The
  harness polls the target and compares /proc/<pid>/stat field 22 (`starttime`)
  with the value recorded at arm time in meta.txt (`target_starttime=`), because
  existence alone is unsound: after a restart the kernel can hand the old PID to
  an unrelated process and `kill -0` would still succeed. starttime is the PID's
  identity, so an unchanged value proves the process is the one that was armed.

  On exit or PID reuse the window is CLOSED rather than left running:
    TARGET_GONE ts=... pid=... reason=exit|pid_reused
    TARGET_REPLACED ts=... old_pid=... new_pid=...      (when resolvable)
  These lines are printed and appended to <stamp>[-label].target-gone.log, the
  samplers are stopped, the artifact list is printed, and the harness exits 4.
  Nothing is left running (the orphaned PSI loop of incident §11 Finding 2 is
  exactly the bug this fixes), and the stale window is never silently extended.
  Poll interval: ROO_PERF_WATCH_INTERVAL_S (default 2 s).

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

EXIT CODES
  0    normal stop (Ctrl-C after the `is responsive` line, or --duration reached)
  1    usage / configuration error
  2    target not found (nothing matched --pattern, or --pid is not running)
  3    --self-test failure
  4    target disappeared mid-capture (window closed; see TARGET LOSS above)
  130  interrupted by SIGINT/SIGTERM (traps; samplers stopped, artifacts flushed)

EXAMPLES
  # Always-on capture for the session (remote host, background terminal):
  bash scripts/host-health-capture.sh --out-dir /tmp/roo-perf

  # A bounded 60 s baseline:
  bash scripts/host-health-capture.sh --duration 60 --label baseline

  # Keep watching across an extension-host restart (new -t2/-t3 artifact sets;
  # only where a window spanning a restart is explicitly NOT going to be
  # correlated across it):
  bash scripts/host-health-capture.sh --follow --label watch-3883-s3

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
			--follow) FOLLOW=1 ;;
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
	if ! [[ "$WATCH_INTERVAL_S" =~ ^[0-9]+$ ]] || (( WATCH_INTERVAL_S < 1 )); then
		die "ROO_PERF_WATCH_INTERVAL_S must be a positive integer (got: $WATCH_INTERVAL_S)"
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
