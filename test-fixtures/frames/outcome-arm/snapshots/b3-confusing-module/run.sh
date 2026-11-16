#!/bin/sh
# Show what the label module does today and which commits produced it.
set -eu

cd "$(dirname "$0")"

usage() {
	cat >&2 <<'EOF'
usage: ./run.sh [--no-history | --init-history]

  (no argument)    restore history if absent, run the suite, print the
                   behaviour table and the commit log
  --no-history     run the suite and print the behaviour table only
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

behaviour() {
	node --test
	printf '\n'
	node demo.mjs
}

show_log() {
	printf '\n'
	git log --oneline
}

if [ "$#" -gt 1 ]; then
	usage
	exit 2
fi

case "${1:-}" in
	"")
		init_history
		behaviour
		show_log
		;;
	--no-history)
		behaviour
		;;
	--init-history)
		init_history
		;;
	*)
		usage
		exit 2
		;;
esac
