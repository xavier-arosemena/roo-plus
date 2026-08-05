#!/usr/bin/env python3
"""
DEPRECATED — replaced by scripts/ensure_descriptions.py.

The former .roomodes description injector (CURATED_DESCRIPTIONS map) is obsolete:
.roomodes is now generated from the curated agent source (custom-modes/agents/)
by scripts/sync-custom-modes.mjs using SOURCE-WINS merge semantics, so the
canonical descriptions always flow into .roomodes (and pre-installed-modes.yml).

This wrapper keeps legacy invocations working by delegating to the consolidated,
deterministic, idempotent tool (which covers agents/, custom_modes.d/ and
vs-code/converted_modes.d/). After running it, regenerate .roomodes with:

    node scripts/sync-custom-modes.mjs

Usage (unchanged from before):
    python3 scripts/add_descriptions.py
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONSOLIDATED = ROOT / "scripts" / "ensure_descriptions.py"


def main() -> int:
    print("⚠ add_descriptions.py is deprecated — delegating to scripts/ensure_descriptions.py", file=sys.stderr)
    return subprocess.call([sys.executable, str(CONSOLIDATED), "--dir", "all"] + sys.argv[1:])


if __name__ == "__main__":
    sys.exit(main())
