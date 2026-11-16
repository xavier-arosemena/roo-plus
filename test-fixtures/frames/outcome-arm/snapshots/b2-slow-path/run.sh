#!/bin/sh
# Run the order-summary suite and the benchmark (default), the benchmark alone
# (--bench), or restore the bundled git history (--init-history).
set -eu

cd "$(dirname "$0")"

usage() {
	cat >&2 <<'EOF'
usage: ./run.sh [--bench | --init-history]

  (no argument)    run the test suite, then the benchmark
  --bench          run the benchmark only
  --init-history   restore the bundled git history into .git
EOF
}

init_history() {
	if [ -d .git ]; then
		printf '%s\n' "history: .git already present, nothing to do"
		return 0
	fi

	if [ ! -f history.bundle ]; then
		printf '%s\n' "history: history.bundle not found" >&2
		return 1
	fi

	work=$(mktemp -d)
	trap 'rm -rf "$work"' 0 1 2 15

	git clone --quiet history.bundle "$work/repo"
	mv "$work/repo/.git" .git
	printf '%s\n' "history: restored from history.bundle"
}

run_suite() {
	node --test
}

run_bench() {
	node bench/bench.mjs
}

if [ "$#" -gt 1 ]; then
	usage
	exit 2
fi

case "${1:-}" in
	"")
		run_suite
		run_bench
		;;
	--bench)
		run_bench
		;;
	--init-history)
		init_history
		;;
	*)
		usage
		exit 2
		;;
esac
