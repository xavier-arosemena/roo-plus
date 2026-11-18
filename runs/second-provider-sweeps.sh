#!/bin/sh
# Second-provider replication sweeps. Run artefact, not a fixture.
# Extracts the three SECOND_PROVIDER_* values from .env in-shell, prints only the
# key's length, then runs E20-BC (800 calls) and, only if that completes, E20C-XZ
# (400 calls). One call in flight at a time: the executor is sequential and the
# second sweep starts only after the first exits 0.
set -u
cd /root/roo-plus || exit 2

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

export SECOND_PROVIDER_API_KEY="$(extract SECOND_PROVIDER_API_KEY)"
export SECOND_PROVIDER_BASE_URL="$(extract SECOND_PROVIDER_BASE_URL)"
export SECOND_PROVIDER_MODEL="$(extract SECOND_PROVIDER_MODEL)"

if [ "${#SECOND_PROVIDER_API_KEY}" -lt 20 ]; then
	echo "ABORT: SECOND_PROVIDER_API_KEY is empty or truncated (length ${#SECOND_PROVIDER_API_KEY})"
	exit 1
fi
echo "key length: ${#SECOND_PROVIDER_API_KEY}"

MODEL=deepseek-v4-pro
BC_OUT=/root/roo-plus/runs/e20-bc-2026-11-18
XZ_OUT=/root/roo-plus/runs/e20c-xz-2026-11-18

BC_RUNNER="node scripts/lib/openai-compatible-runner.mjs %PROMPT_FILE% %OUT_FILE% %MODEL% $BC_OUT/usage %RUN_ID% --max-output-tokens 4096"
XZ_RUNNER="node scripts/lib/openai-compatible-runner.mjs %PROMPT_FILE% %OUT_FILE% %MODEL% $XZ_OUT/usage %RUN_ID% --max-output-tokens 4096"

echo "sweep BC starting: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
node scripts/run-routing-round.mjs --plan test-fixtures/frames/e20-bc/plan.json --out "$BC_OUT" --run --runner "$BC_RUNNER" --model "$MODEL" >> runs/e20-bc-sweep.log 2>&1
BC_EXIT=$?
echo "BC_EXIT=$BC_EXIT at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
[ "$BC_EXIT" -eq 0 ] || exit "$BC_EXIT"

echo "sweep XZ starting: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
node scripts/run-routing-round.mjs --plan test-fixtures/frames/e20c-xz/plan.json --out "$XZ_OUT" --run --runner "$XZ_RUNNER" --model "$MODEL" >> runs/e20c-xz-sweep.log 2>&1
XZ_EXIT=$?
echo "XZ_EXIT=$XZ_EXIT at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
exit "$XZ_EXIT"
