#!/usr/bin/env python3
"""Phase B helper: dump every derived per-file row to all_rows.json.

This is a mechanical re-run of the same extraction code used for derived.json
(deterministic, reads only the clones) so the comparison can be done per path.
It takes no input from the published CSV.

    python3 runs/skills-second-coder/dump_rows.py
"""

import importlib.util
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_extractor():
    spec = importlib.util.spec_from_file_location("extract", HERE / "extract_second_pass.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    m = load_extractor()
    rows = []
    for repo_name, dirname, sha in m.REPOS:
        repo_dir = m.CLONE_ROOT / dirname
        for path in m.find_skill_files(repo_dir):
            rel = path.relative_to(repo_dir).as_posix()
            text = path.read_text(encoding="utf-8", errors="replace")
            skill_dir = path.parent
            block = m.split_frontmatter(text)
            keys, values, mode = m.parse_frontmatter(text)
            name_val = values.get("name")
            name_str = str(name_val).strip() if name_val is not None else None
            name_ok = bool(name_str) and bool(m.NAME_RE.match(name_str)) and len(name_str) <= 64
            kind, dlen = m.describe_description(block, values)
            rows.append(
                {
                    "repo": repo_name,
                    "sha": sha,
                    "path": rel,
                    "file_name": path.name,
                    "name": name_str,
                    "name_ok": name_ok,
                    "desc_kind": kind,
                    "desc_len": dlen,
                    "lines_splitlines": len(text.splitlines()),
                    "lines_newlines": text.count("\n"),
                    "has_code": m.has_code_within(skill_dir, 2),
                    "has_code_d3": m.has_code_within(skill_dir, 3),
                    "has_refs": (skill_dir / "references").is_dir()
                    or (skill_dir / "reference").is_dir(),
                    "extra_fields": [k for k in keys if k not in m.ALLOWED_KEYS],
                    "top_keys": keys,
                    "license_present": "license" in keys,
                    "parse_mode": mode,
                }
            )

    out = HERE / "all_rows.json"
    out.write_text(json.dumps(rows, indent=1) + "\n", encoding="utf-8")
    odd = [r for r in rows if r["file_name"] != "SKILL.md"]
    print("rows:", len(rows), "| non-canonical file names:", len(odd))
    for r in odd[:10]:
        print("   ", r["repo"], r["path"])
    print("wrote", out)


if __name__ == "__main__":
    main()
