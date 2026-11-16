#!/bin/sh
# =============================================================================
# run-b1-pilot.sh — B1 ("failing CI") pilot harness + blinded scoring material
# =============================================================================
#
# WHAT THIS DOES
#   Runs the B1 outcome-arm pilot (six runs: three per arm) and prepares the
#   blind-scored material. It scores nothing and it measures nothing by itself.
#   Per run:
#     1. copies the B1 snapshot into a fresh working directory at
#        <out>/<run-id>/workspace (refuses to reuse one unless --force);
#     2. restores the bundled history, runs the snapshot's own run.sh and
#        captures pre-state.log + pre-state.exit (the run must be red first);
#     3. installs exactly one arm's .roomodes as <workspace>/.roomodes and
#        asserts the selected slug is present;
#     4. writes prompt.txt holding the B1 brief verbatim and nothing else;
#     5. executes the operator-supplied runner template with the temperature
#        pinned to 0 and the tool grants read from the installed arm file;
#     6. writes meta.json for the run.
#   Afterwards every produced transcript is blinded into <out>/_blinded/case-NN.md
#   and the case -> run-id mapping is written to a file scorers must not open.
#
# WHY THE ORDER IS FIXED (a b b a a b)
#   The pre-registration (section 2 "Controls", section 4 step 2) pins the
#   interleaving "A, B, B, A, ..." so that model drift cancels across arms. The
#   six-run pilot order is therefore a hard-coded string, not randomised and not
#   configurable: a different order would be a different experiment from the one
#   that was registered. --runs exists only to reject a value other than 3.
#
# WHY THE BLINDING IS A PERMUTATION
#   The execution order is public (a b b a a b), so case ids that tracked
#   execution order would de-blind the sheet at once: cases 1/4/5 would be arm A
#   and cases 2/3/6 arm B. Case ids are therefore assigned by sorting the run-ids
#   on sha256(run_id + BLIND_SEED): reproducible, independent of execution order,
#   and recorded in the blind map alongside the seed.
#
# WHAT IS PINNED, AND WHAT IS NOT
#   - temperature: 0, overridable only by $PILOT_TEMPERATURE and recorded anyway;
#   - tool grants: parsed out of the installed .roomodes, never assumed;
#   - brief text:  the B1 sentence, recorded byte-for-byte in meta.json and
#                  written into prompt.txt with no trailing newline so the two
#                  agree exactly. It is NOT pre-registered: see brief_source.
#   - model/runner: supplied by the operator. No model is defaulted.
#
# THE RUNNER CONTRACT
#   $PILOT_RUNNER_CMD / --runner is a shell command template executed with
#   `sh -c` from inside the run's workspace. These placeholders are replaced by
#   the harness, and each substituted value is SHELL-SINGLE-QUOTED so that paths
#   containing spaces survive. Write the placeholder bare (not already quoted):
#
#     %WORKSPACE%       absolute path of this run's working copy
#     %PROMPT_FILE%     absolute path of prompt.txt (the brief, verbatim)
#     %MODE%            selected slug: debug (arm-a) or bug-report (arm-b)
#     %MODEL%           the --model value
#     %TEMPERATURE%     the pinned temperature (0 unless $PILOT_TEMPERATURE)
#     %OUT_FILE%        absolute path the runner MUST write the transcript to
#     %TRANSCRIPT_DIR%  absolute path of an empty scratch directory for the run
#
#   The runner must write a non-empty transcript to %OUT_FILE%. Nothing is
#   synthesised: if %OUT_FILE% is never written the run is recorded UNRUN with
#   "transcript": null — never a placeholder, never a synthetic transcript.
#
#   Worked example against this repository's own CLI (apps/cli), documented
#   rather than runnable here:
#
#     PILOT_MODEL=<model-id>
#     PILOT_RUNNER_CMD='node /abs/path/to/apps/cli/dist/index.js \
#         --print "$(cat %PROMPT_FILE%)" --mode %MODE% -w %WORKSPACE% \
#         --output-format stream-json > %OUT_FILE%'
#
#   apps/cli exposes --print, --mode, -w/--workspace and
#   --output-format stream-json (see apps/cli/README.md, "Print Mode"). It must
#   be BUILT first (pnpm --dir apps/cli build) and it needs a configured provider
#   and API key, so it will NOT work offline; this pilot environment has no
#   node_modules and no network. The command runs from the workspace, so the
#   path to the CLI build must be absolute.
#
# STEP-5 RECONCILIATION (two rules met at once)
#   No runner configured, or the runner wrote no %OUT_FILE% at all -> UNRUN
#   (nothing was produced to score). %OUT_FILE% exists but is empty -> INVALID
#   (the harness/runner misbehaved). Neither ever yields a transcript.
#
# EXIT STATUS
#   0  the batch completed and every run was recorded (RUN, UNRUN or INVALID)
#   2  a precondition failed: missing node/git/arms/snapshot, missing --model
#      outside --dry-run, bad arguments, unsafe --out
#   1  the blinder failed: arm/mode/run-id residue survived in a blinded file
#
# This script never deletes a run directory except with --force on the identical
# run-id, and it never invents a transcript, score, duration or exit code.
# =============================================================================

set -u

# ---------------------------------------------------------------------------
# Fixed paths and pinned facts
# ---------------------------------------------------------------------------
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd -P)

SNAPSHOT_NAME="b1-failing-ci"
SNAPSHOT_DIR="$SCRIPT_DIR/snapshots/$SNAPSHOT_NAME"
BRIEF_ID="B1"
BRIEF_TEXT='CI is red on a test that passes locally. I have no idea why.'
BRIEF_SOURCE='docs/reviews/2026-11-09-frame-bakeoff-run.md (Step 2 brief table, line ~146; NOT pre-registered — the pre-registration contains no brief text)'
PILOT_ORDER='a b b a a b'

die() {
	printf 'run-b1-pilot: %s\n' "$*" >&2
	exit 2
}

note() {
	printf 'run-b1-pilot: %s\n' "$*"
}

iso_now() {
	date -u +%Y-%m-%dT%H:%M:%SZ
}

stamp_now() {
	date -u +%Y%m%dT%H%M%SZ
}

# sha256 of a string / of a file's bytes, via node (node is a hard requirement).
sha_str() {
	node -e 'const c=require("node:crypto");process.stdout.write(c.createHash("sha256").update(process.argv[1],"utf8").digest("hex"))' "$1"
}

sha_file() {
	node -e 'const c=require("node:crypto"),f=require("node:fs");process.stdout.write(c.createHash("sha256").update(f.readFileSync(process.argv[1])).digest("hex"))' "$1"
}

usage() {
	cat <<'USAGE'
usage: ./run-b1-pilot.sh [options]

  --model <id>         model id recorded in meta.json (default: $PILOT_MODEL).
                       Required for a real sweep; NOT required with --dry-run.
  --runner <template>  runner command template (default: $PILOT_RUNNER_CMD).
                       See the contract at the top of this script for the
                       placeholders. If empty, every run is recorded UNRUN and
                       no transcript is invented.
  --out <dir>          output directory (default: <script dir>/runs)
  --runs <n>           runs per arm; the B1 pilot order is pinned at 3
                       (a b b a a b), so any value other than 3 is rejected
  --force              overwrite a run directory that has the identical run-id
  --dry-run            build all six run directories, run the snapshot
                       pre-state, install the modes, write prompt.txt and
                       meta.json with status UNRUN, write DRY-RUN.txt, exit 0.
                       No runner is executed and nothing is blinded.
  --blinder-only       re-run blinding over an existing --out tree; executes
                       no run and requires no runner or model
  --help               print this text

Run order is fixed and not configurable: a b b a a b (pre-registration
section 2 "Controls" / section 4 step 2).
USAGE
}

# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

# Shell-single-quote a value so `sh -c` sees it as one literal word.
shq() {
	SHQ_IN=$1
	SHQ_OUT=
	while :; do
		case $SHQ_IN in
			*\'*)
				SHQ_OUT=$SHQ_OUT${SHQ_IN%%\'*}"'\\''"
				SHQ_IN=${SHQ_IN#*\'}
				;;
			*) break ;;
		esac
	done
	printf "'%s'" "$SHQ_OUT$SHQ_IN"
}

# Replace the FIRST occurrence of $2 in $1 with $3; prints the result.
replace_first() {
	case $1 in
		*"$2"*) printf '%s' "${1%%"$2"*}$3${1#*"$2"}" ;;
		*) printf '%s' "$1" ;;
	esac
}

# Expand every placeholder in $1 from the WP/PF/MD/ML/TP/OF/TD globals.
# One placeholder per pass, repeated until the template stops changing (30-pass
# ceiling), so repeated placeholders and odd characters are handled without sed
# pattern or delimiter hazards.
subst_template() {
	ST_TPL=$1
	ST_I=0
	while [ "$ST_I" -lt 30 ]; do
		ST_I=$((ST_I + 1))
		ST_PREV=$ST_TPL
		ST_TPL=$(replace_first "$ST_TPL" '%WORKSPACE%' "$(shq "$WP")")
		ST_TPL=$(replace_first "$ST_TPL" '%PROMPT_FILE%' "$(shq "$PF")")
		ST_TPL=$(replace_first "$ST_TPL" '%TRANSCRIPT_DIR%' "$(shq "$TD")")
		ST_TPL=$(replace_first "$ST_TPL" '%TEMPERATURE%' "$(shq "$TP")")
		ST_TPL=$(replace_first "$ST_TPL" '%OUT_FILE%' "$(shq "$OF")")
		ST_TPL=$(replace_first "$ST_TPL" '%MODEL%' "$(shq "$ML")")
		ST_TPL=$(replace_first "$ST_TPL" '%MODE%' "$(shq "$MD")")
		if [ "$ST_TPL" = "$ST_PREV" ]; then
			break
		fi
	done
	printf '%s' "$ST_TPL"
}

# Print the `groups:` list of the mode named $2 in the .roomodes file $1,
# one entry per line. Tolerant of YAML indentation; scoped to one mode block so
# a multi-mode file cannot mix grants across modes.
parse_grants() {
	awk -v want="$2" '
		/^[[:space:]]*-[[:space:]]*slug:[[:space:]]*/ {
			v = $0
			sub(/^[[:space:]]*-[[:space:]]*slug:[[:space:]]*/, "", v)
			sub(/[[:space:]]*#.*$/, "", v)
			sub(/[[:space:]]+$/, "", v)
			inslug = (v == want)
			next
		}
		inslug && /^[[:space:]]*groups:[[:space:]]*$/ { ingroups = 1; next }
		ingroups && /^[[:space:]]*$/ { next }
		ingroups && /^[[:space:]]*-[[:space:]]*/ {
			g = $0
			sub(/^[[:space:]]*-[[:space:]]*/, "", g)
			sub(/[[:space:]]*#.*$/, "", g)
			sub(/[[:space:]]+$/, "", g)
			print g
			next
		}
		ingroups { ingroups = 0 }
	' "$1"
}

# JSON array literal of the grants of mode $2 in file $1.
grants_to_json() {
	GTJ_LINES=$(parse_grants "$1" "$2" | awk 'NF')
	if [ -z "$GTJ_LINES" ]; then
		printf '[]'
		return 0
	fi
	GTJ_OUT=
	while IFS= read -r GTJ_LINE; do
		if [ -z "$GTJ_OUT" ]; then
			GTJ_OUT="\"$GTJ_LINE\""
		else
			GTJ_OUT="$GTJ_OUT,\"$GTJ_LINE\""
		fi
	done <<GRANTS_EOF
$GTJ_LINES
GRANTS_EOF
	printf '[%s]' "$GTJ_OUT"
}

# ---------------------------------------------------------------------------
# meta.json writer: TAB-separated key/type/value triples -> stable key order,
# 2-space indent, valid JSON, no trailing commas. Types: s=string, n=number
# (empty => null), j=raw JSON.
# ---------------------------------------------------------------------------
kv() {
	printf '%s\t%s\t%s\n' "$1" "$2" "$3" >>"$RUN_DIR/.meta.kv"
}

kv_opt() {
	if [ -n "$2" ]; then
		kv "$1" s "$2"
	else
		kv "$1" j null
	fi
}

write_meta() {
	: >"$RUN_DIR/.meta.kv"
	kv run_id s "$RUN_ID"
	kv brief s "$BRIEF_ID"
	kv brief_text s "$BRIEF_TEXT"
	kv brief_source s "$BRIEF_SOURCE"
	kv arm s "$R_ARM"
	kv mode s "$R_MODE"
	kv_opt model "$MODEL"
	kv temperature n "$TEMPERATURE"
	kv tool_grants j "$GRANTS_JSON"
	kv snapshot s "$SNAPSHOT_NAME"
	kv_opt snapshot_commit "$SNAP_COMMIT"
	kv arm_file s "test-fixtures/frames/outcome-arm/$R_ARM.roomodes"
	kv_opt arm_file_sha256 "$ARM_SHA"
	kv_opt runner "$RUNNER"
	kv status s "$STATUS"
	kv_opt reason "$REASON"
	kv_opt invalid_reason "$INVALID_REASON"
	kv exit_code n "$EXIT_CODE"
	kv started_at s "$STARTED_AT"
	kv finished_at s "$FINISHED_AT"
	kv duration_s n "$DURATION_S"
	kv pre_state_exit n "$PRE_EXIT"
	kv_opt transcript "$TRANSCRIPT"
	kv blinded_as j null
	if ! node "$TMPD/meta_write.mjs" "$RUN_DIR/.meta.kv" "$RUN_DIR/meta.json"; then
		printf 'run-b1-pilot: could not write %s/meta.json\n' "$RUN_DIR" >&2
	fi
	rm -f "$RUN_DIR/.meta.kv"
}

# ---------------------------------------------------------------------------
# One run: steps 1-6
# ---------------------------------------------------------------------------
run_one() {
	R_IDX=$1
	R_ARM=$2
	R_MODE=$3
	R_TS=$4

	RUN_ID="b1-r$R_IDX-$R_ARM-$R_TS"
	RUN_DIR="$OUT/$RUN_ID"
	WORKSPACE="$RUN_DIR/workspace"

	if [ -e "$RUN_DIR" ]; then
		if [ "$FORCE" -eq 1 ]; then
			note "--force: removing existing run directory $RUN_DIR"
			rm -rf "$RUN_DIR"
		else
			printf 'run-b1-pilot: refusing to reuse existing run dir (use --force): %s\n' "$RUN_DIR" >&2
			REFUSED_N=$((REFUSED_N + 1))
			return 0
		fi
	fi

	STATUS=UNRUN
	REASON=
	INVALID_REASON=
	EXIT_CODE=
	TRANSCRIPT=
	PRE_EXIT=
	SNAP_COMMIT=
	ARM_SHA=
	GRANTS_JSON='[]'
	STARTED_AT=$(iso_now)
	START_EPOCH=$(date -u +%s)

	# --- step 1: fresh working directory -------------------------------------
	mkdir -p "$RUN_DIR" || {
		printf 'run-b1-pilot: cannot create %s\n' "$RUN_DIR" >&2
		return 1
	}
	if ! cp -R "$SNAPSHOT_DIR" "$WORKSPACE"; then
		STATUS=INVALID
		INVALID_REASON="could not copy the snapshot into the workspace"
		FINISHED_AT=$(iso_now)
		DURATION_S=$(( $(date -u +%s) - START_EPOCH ))
		write_meta
		INVALID_N=$((INVALID_N + 1))
		printf '%s\n' "$RUN_DIR" >>"$TMPD/runs.txt"
		return 0
	fi
	chmod +x "$WORKSPACE/run.sh" 2>/dev/null || :

	# --- step 2: prepare, and capture the pre-state --------------------------
	( cd "$WORKSPACE" && ./run.sh --init-history ) >"$RUN_DIR/init-history.log" 2>&1
	( cd "$WORKSPACE" && ./run.sh ) >"$RUN_DIR/pre-state.log" 2>&1
	PRE_EXIT=$?
	printf '%s\n' "$PRE_EXIT" >"$RUN_DIR/pre-state.exit"
	SNAP_COMMIT=$(git -C "$WORKSPACE" rev-parse HEAD 2>/dev/null) || SNAP_COMMIT=

	if [ "$PRE_EXIT" -eq 0 ]; then
		STATUS=INVALID
		INVALID_REASON="snapshot not red before the run"
	fi

	# --- step 3: install exactly one arm, verify the slug, hash it -----------
	cp "$SCRIPT_DIR/$R_ARM.roomodes" "$WORKSPACE/.roomodes" 2>/dev/null || :
	if [ -f "$WORKSPACE/.roomodes" ]; then
		cp "$WORKSPACE/.roomodes" "$RUN_DIR/mode.roomodes" 2>/dev/null || :
		ARM_SHA=$(sha_file "$WORKSPACE/.roomodes")
		GRANTS_JSON=$(grants_to_json "$RUN_DIR/mode.roomodes" "$R_MODE")
	else
		if [ -z "$INVALID_REASON" ]; then
			STATUS=INVALID
			INVALID_REASON="could not install the arm .roomodes into the workspace"
		fi
	fi

	if [ -f "$RUN_DIR/mode.roomodes" ]; then
		if ! grep -q -E "^[[:space:]]*-[[:space:]]*slug:[[:space:]]*$R_MODE[[:space:]]*\$" "$RUN_DIR/mode.roomodes"; then
			if [ -z "$INVALID_REASON" ]; then
				STATUS=INVALID
				INVALID_REASON="installed .roomodes does not contain the selected slug ($R_MODE)"
			fi
		fi
	fi

	# --- step 4: the prompt file, verbatim and nothing else ------------------
	printf '%s' "$BRIEF_TEXT" >"$RUN_DIR/prompt.txt"

	# --- step 5: run, or record honestly that nothing ran --------------------
	if [ -n "$INVALID_REASON" ]; then
		:
	elif [ "$DRY" -eq 1 ]; then
		STATUS=UNRUN
		REASON="no runner configured (--dry-run)"
	elif [ -z "$RUNNER" ]; then
		STATUS=UNRUN
		REASON="no runner configured (PILOT_RUNNER_CMD / --runner is empty)"
	else
		PF="$RUN_DIR/prompt.txt"
		WP="$WORKSPACE"
		MD="$R_MODE"
		ML="$MODEL"
		TP="$TEMPERATURE"
		TD="$RUN_DIR/transcript.d"
		OF="$RUN_DIR/transcript.md"
		mkdir -p "$TD"
		RUN_CMD=$(subst_template "$RUNNER")
		printf '%s\n' "$RUN_CMD" >"$RUN_DIR/runner.cmd"
		( cd "$WORKSPACE" && sh -c "$RUN_CMD" ) >"$RUN_DIR/runner.log" 2>&1
		EXIT_CODE=$?
		if [ -f "$OF" ] && [ -s "$OF" ]; then
			STATUS=RUN
			TRANSCRIPT="transcript.md"
		elif [ -f "$OF" ]; then
			STATUS=INVALID
			INVALID_REASON="runner produced no transcript (empty %OUT_FILE%)"
		else
			STATUS=UNRUN
			REASON="runner produced no transcript (%OUT_FILE% was never written)"
			TRANSCRIPT=
		fi
	fi

	# --- step 6: meta.json ---------------------------------------------------
	FINISHED_AT=$(iso_now)
	DURATION_S=$(( $(date -u +%s) - START_EPOCH ))
	write_meta

	case $STATUS in
		RUN) RUN_N=$((RUN_N + 1)) ;;
		UNRUN) UNRUN_N=$((UNRUN_N + 1)) ;;
		INVALID) INVALID_N=$((INVALID_N + 1)) ;;
	esac

	printf '%s\n' "$RUN_DIR" >>"$TMPD/runs.txt"
	return 0
}

# ---------------------------------------------------------------------------
# Embedded node programs (written into the scratch dir, never into the repo)
# ---------------------------------------------------------------------------
write_programs() {
	cat >"$TMPD/meta_write.mjs" <<'META_PROGRAM'
import fs from "node:fs"

const [kvPath, outPath] = process.argv.slice(2)
const obj = {}
for (const raw of fs.readFileSync(kvPath, "utf8").split("\n")) {
	if (raw === "") continue
	const i1 = raw.indexOf("\t")
	const i2 = raw.indexOf("\t", i1 + 1)
	const key = raw.slice(0, i1)
	const type = raw.slice(i1 + 1, i2)
	const value = raw.slice(i2 + 1)
	if (type === "s") obj[key] = value
	else if (type === "n") obj[key] = value === "" ? null : Number(value)
	else obj[key] = JSON.parse(value)
}
fs.writeFileSync(outPath, JSON.stringify(obj, null, 2) + "\n")
META_PROGRAM

	cat >"$TMPD/blind.mjs" <<'BLIND_PROGRAM'
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const [outDir, seed, listFile] = process.argv.slice(2)
const blindDir = path.join(outDir, "_blinded")
const sha = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex")

let runDirs
if (listFile && listFile !== "-" && fs.existsSync(listFile)) {
	const seen = new Set()
	runDirs = []
	for (const line of fs.readFileSync(listFile, "utf8").split("\n")) {
		const d = line.trim()
		if (d === "" || seen.has(d)) continue
		seen.add(d)
		if (fs.existsSync(path.join(d, "meta.json"))) runDirs.push(d)
	}
} else {
	runDirs = fs
		.readdirSync(outDir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== "_blinded")
		.map((e) => path.join(outDir, e.name))
		.filter((d) => fs.existsSync(path.join(d, "meta.json")))
}

// Arm and mode labels are matched as WHOLE WORDS, case-insensitively, so the
// standalone token "debug" is scrubbed while "debugging", "debugger",
// "debuggable" and "debugged" are left intact. A plain substring replacement
// would turn "debugging" into "MODE-Xging", which corrupts the material a
// scorer reads. Longest-first is kept so "Bug Report" is consumed before any
// shorter pattern could split it.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const LABELS = ["bug report", "bug-report", "arm a", "arm-a", "arm b", "arm-b", "debug"]
	.sort((a, b) => b.length - a.length)
	.map((pattern) => ({ pattern, re: new RegExp("\\b" + escapeRe(pattern) + "\\b", "gi") }))

const entries = runDirs.map((dir) => ({ dir, meta: JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")) }))
entries.sort((a, b) => {
	const ka = sha(a.meta.run_id + seed)
	const kb = sha(b.meta.run_id + seed)
	return ka < kb ? -1 : ka > kb ? 1 : 0
})

fs.mkdirSync(blindDir, { recursive: true })
const cases = []
const failures = []

entries.forEach((entry, index) => {
	const caseId = "case-" + String(index + 1).padStart(2, "0")
	const hasTranscript = entry.meta.status === "RUN" && typeof entry.meta.transcript === "string" && entry.meta.transcript !== ""
	cases.push({ case_id: caseId, run_id: entry.meta.run_id, blinded: hasTranscript })

	if (!hasTranscript) {
		entry.meta.blinded_as = null
	} else {
		const workspace = path.join(entry.dir, "workspace")
		let text = fs.readFileSync(path.join(entry.dir, entry.meta.transcript), "utf8")
		// Order matters: scrub the identifying PATHS before the label patterns.
		// Replacing "arm-a" first would rewrite "<out>/b1-r01-arm-a-<ts>/workspace"
		// as "<out>/b1-r01-MODE-X-<ts>/workspace", after which neither the
		// workspace nor the run-id scrub could match and the arm label would
		// survive as a path fragment. Found by the out-of-repo fixture test.
		text = text.split(workspace).join("<WORKSPACE>")
		text = text.split(entry.dir).join("<WORKSPACE>")
		text = text.split(entry.meta.run_id).join("<RUN-ID>")
		for (const label of LABELS) text = text.replace(label.re, "MODE-X")
		fs.writeFileSync(path.join(blindDir, caseId + ".md"), text)
		entry.meta.blinded_as = caseId
		// "-arm-" is a catch-all for an arm-bearing path fragment that survived a
		// partial replacement, which an exact whole-string check cannot see.
		// Label residue is re-tested with the same word-boundary regex, so a
		// legitimate word such as "debugging" is not mistaken for a leak.
		const residue = []
		for (const value of [workspace, entry.dir, entry.meta.run_id, "-arm-", "-ARM-"]) {
			if (text.includes(value)) residue.push(value)
		}
		for (const label of LABELS) {
			label.re.lastIndex = 0
			if (label.re.test(text)) residue.push(label.pattern)
		}
		if (residue.length > 0) failures.push(caseId + " (" + entry.meta.run_id + "): residue " + JSON.stringify(residue))
	}

	fs.writeFileSync(path.join(entry.dir, "meta.json"), JSON.stringify(entry.meta, null, 2) + "\n")
})

fs.writeFileSync(
	path.join(blindDir, "BLIND-MAP-DO-NOT-SHOW-SCORERS.json"),
	JSON.stringify(
		{
			blind_seed: seed,
			generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
			cases,
		},
		null,
		2,
	) + "\n",
)

if (failures.length > 0) {
	console.error("run-b1-pilot: BLINDER FAILED — arm, mode or run-id residue survived in a blinded transcript:")
	for (const f of failures) console.error("  " + f)
	process.exit(1)
}

const blinded = cases.filter((c) => c.blinded).length
console.log(
	"run-b1-pilot: blinded " +
		blinded +
		" transcript(s) into " +
		blindDir +
		"; " +
		(cases.length - blinded) +
		" run(s) left unblinded (UNRUN/INVALID).",
)
BLIND_PROGRAM

	cat >"$TMPD/summary.mjs" <<'SUMMARY_PROGRAM'
import fs from "node:fs"
import path from "node:path"

const [outDir, listFile] = process.argv.slice(2)
const mapPath = path.join(outDir, "_blinded", "BLIND-MAP-DO-NOT-SHOW-SCORERS.json")
const caseByRun = new Map()
let seedShown = "n/a"
if (fs.existsSync(mapPath)) {
	const map = JSON.parse(fs.readFileSync(mapPath, "utf8"))
	if (map.blind_seed) seedShown = map.blind_seed
	for (const c of map.cases || []) caseByRun.set(c.run_id, c.blinded ? c.case_id : "-")
}

let dirs = []
if (listFile && listFile !== "-" && fs.existsSync(listFile)) {
	dirs = fs
		.readFileSync(listFile, "utf8")
		.split("\n")
		.map((s) => s.trim())
		.filter((s) => s !== "")
} else if (fs.existsSync(outDir)) {
	dirs = fs
		.readdirSync(outDir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== "_blinded")
		.map((e) => path.join(outDir, e.name))
}

const rows = dirs
	.map((d) => path.join(d, "meta.json"))
	.filter((p) => fs.existsSync(p))
	.map((p) => JSON.parse(fs.readFileSync(p, "utf8")))

const pad = (s, n) => String(s).padEnd(n)
console.log("")
console.log(
	pad("case_id", 8) + " " + pad("run_id", 38) + " " + pad("arm", 7) + " " + pad("mode", 11) + pad("status", 8) + "exit",
)
console.log("-".repeat(80))
for (const r of rows) {
	const c = caseByRun.has(r.run_id) ? caseByRun.get(r.run_id) : "-"
	const exit = r.exit_code === null || r.exit_code === undefined ? "-" : r.exit_code
	console.log(
		pad(c, 8) + " " + pad(r.run_id, 38) + " " + pad(r.arm, 7) + " " + pad(r.mode, 11) + pad(r.status, 8) + exit,
	)
}
console.log("")
console.log("blind_seed: " + seedShown + "   runs recorded: " + rows.length)
SUMMARY_PROGRAM
}

# Blinding: over an explicit run list, or over everything under $OUT.
blind_runs() {
	BLIND_LIST=$1
	if ! node "$TMPD/blind.mjs" "$OUT" "$BLIND_SEED" "$BLIND_LIST"; then
		return 1
	fi
	return 0
}

# Dry-run: an empty case map plus a plain-text notice. No blinded copies.
write_dry_map() {
	node -e '
const fs = require("node:fs"), path = require("node:path");
const [dir, seed] = process.argv.slice(1);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
	path.join(dir, "BLIND-MAP-DO-NOT-SHOW-SCORERS.json"),
	JSON.stringify({ blind_seed: seed, note: "dry run: no run produced a transcript, so nothing was blinded", cases: [] }, null, 2) + "\n",
);
' "$OUT/_blinded" "$BLIND_SEED"
}

write_dry_run_notice() {
	{
		printf '%s\n' "DRY RUN — NOT A MEASUREMENT"
		printf '%s\n' "==========================="
		printf '%s\n' ""
		printf '%s\n' "Every run directory under this tree was built by run-b1-pilot.sh --dry-run."
		printf '%s\n' "The snapshot pre-state was executed, the arm modes were installed and the"
		printf '%s\n' "prompt files were written, but NO model was run. Every meta.json says"
		printf '%s\n' "status UNRUN with transcript null and the reason"
		printf '%s\n' "\"no runner configured (--dry-run)\"."
		printf '%s\n' ""
		printf '%s\n' "Nothing here is a result, a score, a duration of model work, or evidence"
		printf '%s\n' "about either frame. Do not score these directories and do not pool them"
		printf '%s\n' "with real runs. The _blinded case map is deliberately empty."
		printf '%s\n' ""
		printf '%s\n' "This file is .txt on purpose: it is not documentation and no .md gate"
		printf '%s\n' "should read it as prose."
		printf '%s\n' ""
		printf 'runs recorded: %s   unrun: %s   invalid: %s\n' "$((RUN_N + UNRUN_N + INVALID_N))" "$UNRUN_N" "$INVALID_N"
	} >"$OUT/DRY-RUN.txt"
}

print_unrun_instructions() {
	printf '\n'
	printf '%s\n' "NOTHING WAS MEASURED for $UNRUN_N run(s): recorded UNRUN with transcript null."
	cat <<'TXT'

To produce real records a human must supply a model and a runner, e.g.:
  export PILOT_MODEL='<model-id>'
  export PILOT_RUNNER_CMD='node /abs/path/to/apps/cli/dist/index.js --print "$(cat %PROMPT_FILE%)" --mode %MODE% -w %WORKSPACE% --output-format stream-json > %OUT_FILE%'
TXT
	printf "  %s --model \"\$PILOT_MODEL\" --runner \"\$PILOT_RUNNER_CMD\" --out '%s'\n" "$0" "$OUT"
	cat <<'TXT'

The CLI must be built first (pnpm --dir apps/cli build) and needs a provider
key, so it will not work offline. Placeholders are substituted single-quoted
and the template runs with `sh -c` from inside the run's workspace.
TXT
	printf '\n'
}

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------
OUT="$SCRIPT_DIR/runs"
RUNS=3
FORCE=0
DRY=0
BLINDER_ONLY=0
MODEL=${PILOT_MODEL:-}
RUNNER=${PILOT_RUNNER_CMD:-}
TEMPERATURE=${PILOT_TEMPERATURE:-0}
BLIND_SEED=${PILOT_BLIND_SEED:-2026-11-09}

while [ "$#" -gt 0 ]; do
	case $1 in
		--model)
			[ "$#" -ge 2 ] || die "--model requires a value"
			MODEL=$2
			shift 2
			;;
		--runner)
			[ "$#" -ge 2 ] || die "--runner requires a value"
			RUNNER=$2
			shift 2
			;;
		--out)
			[ "$#" -ge 2 ] || die "--out requires a value"
			OUT=$2
			shift 2
			;;
		--runs)
			[ "$#" -ge 2 ] || die "--runs requires a value"
			RUNS=$2
			shift 2
			;;
		--force)
			FORCE=1
			shift
			;;
		--dry-run)
			DRY=1
			shift
			;;
		--blinder-only)
			BLINDER_ONLY=1
			shift
			;;
		--help | -h)
			usage
			exit 0
			;;
		*)
			usage >&2
			die "unknown argument: $1"
			;;
	esac
done

command -v node >/dev/null 2>&1 || die "node is required and was not found on PATH"

# Everything written under the repository root must stay inside this directory
# (pre-registration section 4 step 6 fixes runs/ under outcome-arm/).
OUT_ABS=$(node -e 'process.stdout.write(require("node:path").resolve(process.argv[1]))' "$OUT")
OUT_SCOPE=$(node -e '
const p = require("node:path");
const rel = p.relative(p.resolve(process.argv[1]), p.resolve(process.argv[2]));
process.stdout.write(rel === "" || (!rel.startsWith("..") && !p.isAbsolute(rel)) ? "inside" : "outside");
' "$REPO_ROOT" "$OUT_ABS")
if [ "$OUT_SCOPE" = "inside" ]; then
	case $OUT_ABS in
		"$SCRIPT_DIR" | "$SCRIPT_DIR"/*) : ;;
		*) die "--out is inside the repository but outside test-fixtures/frames/outcome-arm/: $OUT_ABS" ;;
	esac
fi

TMPD=$(mktemp -d "${TMPDIR:-/tmp}/b1-pilot.XXXXXX") || die "mktemp failed"
trap 'rm -rf "$TMPD"' 0 1 2 15
write_programs

# ---------------------------------------------------------------------------
# --blinder-only: re-blind an existing tree, execute nothing
# ---------------------------------------------------------------------------
if [ "$BLINDER_ONLY" -eq 1 ]; then
	[ -d "$OUT" ] || die "--blinder-only: --out does not exist: $OUT"
	if ! blind_runs -; then
		exit 1
	fi
	node "$TMPD/summary.mjs" "$OUT" -
	exit 0
fi

# ---------------------------------------------------------------------------
# Preconditions for a sweep (checked before anything is written)
# ---------------------------------------------------------------------------
case $RUNS in
	*[!0-9]*) die "--runs must be a number (got: $RUNS)" ;;
esac
if [ "$RUNS" -ne 3 ]; then
	die "the B1 pilot order (a b b a a b) is pinned at 3 runs per arm; --runs must be 3 (got: $RUNS)"
fi

[ -f "$SCRIPT_DIR/arm-a.roomodes" ] || die "missing arm file: $SCRIPT_DIR/arm-a.roomodes"
[ -f "$SCRIPT_DIR/arm-b.roomodes" ] || die "missing arm file: $SCRIPT_DIR/arm-b.roomodes"
[ -d "$SNAPSHOT_DIR" ] || die "missing snapshot directory: $SNAPSHOT_DIR"
[ -x "$SNAPSHOT_DIR/run.sh" ] || die "missing executable snapshot runner: $SNAPSHOT_DIR/run.sh"
command -v git >/dev/null 2>&1 || die "git is required and was not found on PATH"

if [ "$DRY" -eq 0 ] && [ -z "$MODEL" ]; then
	printf '%s\n' "run-b1-pilot: --model (or PILOT_MODEL) is required for a real run — nothing was written." >&2
	printf '%s\n' "run-b1-pilot: use --dry-run to build the tree without a model, or see --help." >&2
	exit 2
fi

mkdir -p "$OUT" || die "cannot create --out directory: $OUT"
: >"$TMPD/runs.txt"
RUN_N=0
UNRUN_N=0
INVALID_N=0
REFUSED_N=0

# ---------------------------------------------------------------------------
# The six runs, in the pre-registered order
# ---------------------------------------------------------------------------
note "order: $PILOT_ORDER   out: $OUT   model: ${MODEL:-<none>}   temperature: $TEMPERATURE   dry-run: $DRY"

RUN_INDEX=0
for TOKEN in $PILOT_ORDER; do
	RUN_INDEX=$((RUN_INDEX + 1))
	RUN_SEQ=$(printf '%02d' "$RUN_INDEX")
	case $TOKEN in
		a)
			ARM_NAME="arm-a"
			MODE_SLUG="debug"
			;;
		b)
			ARM_NAME="arm-b"
			MODE_SLUG="bug-report"
			;;
		*)
			die "internal: unexpected order token: $TOKEN"
			;;
	esac
	run_one "$RUN_SEQ" "$ARM_NAME" "$MODE_SLUG" "$(stamp_now)"
done

# ---------------------------------------------------------------------------
# Blind (step 7) and report
# ---------------------------------------------------------------------------
if [ "$DRY" -eq 1 ]; then
	write_dry_map
	write_dry_run_notice
else
	if ! blind_runs "$TMPD/runs.txt"; then
		printf 'run-b1-pilot: blinding failed; run directories were left in place for inspection.\n' >&2
		exit 1
	fi
fi

node "$TMPD/summary.mjs" "$OUT" "$TMPD/runs.txt"

printf 'run-b1-pilot: RUN=%s UNRUN=%s INVALID=%s REFUSED=%s\n' "$RUN_N" "$UNRUN_N" "$INVALID_N" "$REFUSED_N"

if [ "$UNRUN_N" -gt 0 ]; then
	print_unrun_instructions
fi

if [ "$DRY" -eq 1 ]; then
	printf 'run-b1-pilot: dry run complete — nothing was measured; see %s/DRY-RUN.txt\n' "$OUT"
fi

exit 0
