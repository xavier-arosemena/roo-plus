#!/bin/sh
# Task C final attempt, step 1: one screening brief. Run artefact, not a fixture.
# Extracts FRAMING_PRETEST_API_KEY from .env in-shell and prints only its length.
# Usage: runs/e20d-screen-2026-11-19.sh <1|2|3>
set -u
cd /root/roo-plus || exit 2

which=$1
case "$which" in
1) BRIEF='Why does this service handle retries in two different places?' ;;
2) BRIEF='Why is this module so hard to change?' ;;
3) BRIEF='Why does this subsystem have three layers of caching?' ;;
*) echo 'usage: runs/e20d-screen-2026-11-19.sh <1|2|3>'; exit 2 ;;
esac

extract() {
	node -e '
const fs = require("fs");
const name = process.argv[1];
const text = fs.readFileSync(".env", "utf8");
const m = text.match(new RegExp("^" + name + "=(.*)$", "m"));
if (!m) process.exit(1);
let value = m[1].replace(/#.*/, "").trim().replace(/^["\x27]|["\x27]$/g, "");
process.stdout.write(value);
' "$1"
}

KEY="$(extract FRAMING_PRETEST_API_KEY)"
if [ "${#KEY}" -lt 20 ]; then
	echo "ABORT: FRAMING_PRETEST_API_KEY is empty or truncated (length ${#KEY})"
	exit 1
fi
echo "key length: ${#KEY}"
export FRAMING_PRETEST_API_KEY="$KEY"

OUT=runs/e20d-screening-2026-11-19/brief-$which
mkdir -p "$OUT"
printf '%s\n' "$BRIEF" > "$OUT/brief.txt"

node scripts/generate-e20d-fixtures.mjs --brief "$BRIEF" --draws 5 \
	--fixture-dir "$OUT" --out "$OUT" > "$OUT/generate.log" 2>&1
GEN=$?
echo "generate exit: $GEN"
[ "$GEN" -eq 0 ] || { tail -5 "$OUT/generate.log"; exit "$GEN"; }

MODEL=gemini-3.5-flash
RUNNER="node scripts/lib/gemini-runner.mjs %PROMPT_FILE% %OUT_FILE% %MODEL% $OUT/transcripts %RUN_ID% --max-output-tokens 4096"
node scripts/run-routing-round.mjs --plan "$OUT/plan.json" --out "$OUT" --run \
	--runner "$RUNNER" --model "$MODEL" > "$OUT/run.log" 2>&1
RUN=$?
echo "run exit: $RUN"
tail -8 "$OUT/run.log"
exit "$RUN"
