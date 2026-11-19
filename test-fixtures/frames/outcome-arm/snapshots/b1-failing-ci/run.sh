#!/bin/sh
# Run the incident-rollup suite the way CI runs it (default), the way a
# developer machine runs it (--local), or restore the bundled git history.
set -eu

cd "$(dirname "$0")"

usage() {
	cat >&2 <<'EOF'
usage: ./run.sh [--local | --init-history]

  (no argument)    run the suite with the CI environment
  --local          run the suite with the office environment
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

run_ci() {
	TZ=UTC CI=1 LANG=C.UTF-8 node --test
}

run_local() {
	TZ=America/Sao_Paulo node --test
}

if [ "$#" -gt 1 ]; then
	usage
	exit 2
fi

case "${1:-}" in
	"")
		run_ci
		;;
	--local)
		run_local
		;;
	--init-history)
		init_history
		;;
	*)
		usage
		exit 2
		;;
esac
