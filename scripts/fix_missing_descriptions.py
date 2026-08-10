#!/usr/bin/env python3
"""
DEPRECATED — replaced by scripts/ensure_descriptions.py.

The former agents/-only description injector (which derived a description from
the roleDefinition first line) is superseded by the consolidated tool, which
covers the canonical custom_modes.d/ set with:

  * a canonical store of curated descriptions,
  * a deterministic derivation fallback (whenToUse -> roleDefinition first line),
  * idempotency (safe to re-run; never destroys a good description).

This wrapper keeps legacy invocations working by delegating to that tool.

Usage (unchanged from before):
    python3 scripts/fix_missing_descriptions.py
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONSOLIDATED = ROOT / "scripts" / "ensure_descriptions.py"


def main() -> int:
    print("[FIX-MISSING-DESCRIPTIONS] ⚠ fix_missing_descriptions.py is deprecated — delegating to scripts/ensure_descriptions.py", file=sys.stderr)
    return subprocess.call([sys.executable, str(CONSOLIDATED), "--dir", "all"] + sys.argv[1:])


if __name__ == "__main__":
    sys.exit(main())
