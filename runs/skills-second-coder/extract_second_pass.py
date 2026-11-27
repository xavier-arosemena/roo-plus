#!/usr/bin/env python3
"""Independent second-coder extractor for the agent-skills field survey.

Deliberately does NOT reuse the original awk/find/grep pipeline in
scripts/skills-survey-extract.sh. Language: Python 3 + pathlib/os.walk + PyYAML.
Nothing from the clones is executed, imported or modified; only text is read.

Definitions (as specified by the task brief):
  skill            file named SKILL.md (case-insensitive), outside .git
  units_with_code  skill has a .py/.sh/.js/.mjs/.ts/.ps1 file within 2
                   directory levels of the skill directory (depth 1 and 2)
  units_with_refs  skill has a references/ or reference/ directory beside SKILL.md
  over_500_lines   SKILL.md has more than 500 lines (splitlines count)
  name_fail        frontmatter name !~ ^[a-z0-9]+(-[a-z0-9]+)*$ or len > 64
                   (a missing name also fails)
  extra_field      any top-level frontmatter key outside the allowed set
  license          top-level `license` key present
"""

import json
import os
import re
import statistics
import sys
from pathlib import Path

try:
    import yaml
    HAVE_YAML = True
except ImportError:  # pragma: no cover
    HAVE_YAML = False

CLONE_ROOT = Path("/tmp/skills-second-coder")
OUT = Path("/root/roo-plus/runs/skills-second-coder/derived.json")

REPOS = [
    ("mattpocock/skills", "mattpocock_skills", "6f7f7831a625f040a8e06a0e7954826b87ce775a"),
    ("anthropics/skills", "anthropics_skills", "e4bb5d960d87126ff3b3a8af1a104b7db67560ba"),
    ("vercel-labs/skills", "vercel-labs_skills", "57217cf86ba38148a57af9e90d14a4c049558330"),
    ("openai/skills", "openai_skills", "49f948faa9258a0c61caceaf225e179651397431"),
    ("google/skills", "google_skills", "c413c1fdc1714f2e4ae44a449b9744348197119c"),
    ("MiniMax-AI/skills", "MiniMax-AI_skills", "02853d885acb1abc157477ce00c4d98a8ed14a71"),
    ("slavingia/skills", "slavingia_skills", "eb9f57fba03ddb0382ed3bfe6654d3d7df128c70"),
    ("MengTo/Skills", "MengTo_Skills", "a5b1d3d28bd72b206a28e4a76b653792fc7b4859"),
    ("obra/superpowers", "obra_superpowers", "22f0b463e7a5e579904dd6211a520321035526f7"),
    ("huggingface/skills", "huggingface_skills", "c158db6f839c65fe3234f0baa743f5e2c8d4ec13"),
    ("android/skills", "android_skills", "7f7b21730a605d112ca9f79b6e40105ce7b670ee"),
    ("multica-ai/andrej-karpathy-skills", "multica-ai_andrej-karpathy-skills", "2c606141936f1eeef17fa3043a72095b4765b9c2"),
    ("VoltAgent/awesome-openclaw-skills", "VoltAgent_awesome-openclaw-skills", "2ddb4d0ee520904c49cfd7f857535174cbd7669b"),
    ("addyosmani/agent-skills", "addyosmani_agent-skills", "e997ac5b9a74eab332d5e9793bb38a38c8cfdd74"),
    ("NVIDIA/skills", "NVIDIA_skills", "c0a412757e52d60cb427de92a06b878785801c71"),
    ("ComposioHQ/awesome-claude-skills", "ComposioHQ_awesome-claude-skills", "be2a406907dbc61b73e6827ded415c96139d13a2"),
    ("cloudflare/skills", "cloudflare_skills", "ff191de7d903788eceaf516a514ae7d3b56b924a"),
    ("microsoft/skills", "microsoft_skills", "47eb3888eb42aef074fcb617931bf6e5934e45d9"),
    ("K-Dense-AI/scientific-agent-skills", "K-Dense-AI_scientific-agent-skills", "c21d13b3cc2894680229ba9959a53281acb9200e"),
    ("VoltAgent/awesome-agent-skills", "VoltAgent_awesome-agent-skills", "20c57162c790d59d35e47c1538dc534c5c59e60d"),
    ("agentskills/agentskills", "agentskills_agentskills", "83021e2be457a9b6679148719c1f6074f0ad975e"),
    ("NVIDIA/SkillSpector", "NVIDIA_SkillSpector", "02894ec5b8a0a70637df5a6b45763de92940cedd"),
]

CODE_SUFFIXES = {".py", ".sh", ".js", ".mjs", ".ts", ".ps1"}
ALLOWED_KEYS = {"name", "description", "license", "allowed-tools", "metadata", "compatibility"}
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
BLOCK_INDICATORS = {">", ">-", "|", "|-", ">+", "|+"}
TOP_KEY_RE = re.compile(r"^([A-Za-z0-9_][A-Za-z0-9_.-]*)[ \t]*:(.*)$")


def find_skill_files(repo_dir: Path):
    """All SKILL.md (case-insensitive) outside .git, sorted by relative posix path."""
    found = []
    for dirpath, dirnames, filenames in os.walk(repo_dir):
        dirnames[:] = sorted(d for d in dirnames if d != ".git")
        for fn in sorted(filenames):
            if fn.lower() == "skill.md":
                found.append(Path(dirpath) / fn)
    return sorted(found, key=lambda p: p.relative_to(repo_dir).as_posix())


def split_frontmatter(text: str):
    """Return the raw frontmatter block (without delimiters) or None.

    Only a block that starts at the very first line and is closed by a line
    consisting solely of '---' is accepted.
    """
    lines = text.splitlines()
    if not lines:
        return None
    first = lines[0].lstrip("\ufeff").strip()
    if first != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


def scan_top_level_keys(block: str):
    """Top-level keys by indentation: a line with no leading whitespace, key: value."""
    keys = []
    for line in block.splitlines():
        if not line or line[0] in " \t#-":
            continue
        m = TOP_KEY_RE.match(line)
        if m:
            keys.append(m.group(1))
    return keys


def raw_value_for_key(block: str, key: str):
    """The raw text after '<key>:' on its top-level line, or None."""
    for line in block.splitlines():
        if not line or line[0] in " \t#-":
            continue
        m = TOP_KEY_RE.match(line)
        if m and m.group(1) == key:
            return m.group(2).strip()
    return None


def parse_frontmatter(text: str):
    """Return (keys, values, parse_mode).

    keys   - ordered top-level keys (never nested ones)
    values - dict of top-level key -> python value where resolvable
    """
    block = split_frontmatter(text)
    if block is None:
        return [], {}, "no-frontmatter"

    keys = scan_top_level_keys(block)
    values = {}
    mode = "scan"
    if HAVE_YAML:
        try:
            loaded = yaml.safe_load(block)
            if isinstance(loaded, dict):
                values = loaded
                # YAML's own key set is authoritative for top-level keys, but
                # fall back to the scanner if YAML saw nothing.
                ykeys = [str(k) for k in loaded.keys()]
                if ykeys:
                    keys = ykeys
                mode = "yaml"
        except Exception:
            mode = "scan-yaml-error"

    # Fill gaps from the raw scanner (malformed blocks, odd quoting).
    for k in keys:
        if k not in values:
            raw = raw_value_for_key(block, k)
            if raw is not None:
                v = raw
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                values[k] = v
    return keys, values, mode


def describe_description(block: str, values: dict):
    """Classify the description value.

    Returns ("folded", None) | ("single", length) | ("missing", None) | ("other", None)
    """
    if block is None:
        return "missing", None
    raw = raw_value_for_key(block, "description")
    if raw is None:
        return "missing", None
    if raw == "":
        # value is on following (indented) lines: not a single-line value
        return "other", None
    first_token = raw.split()[0]
    if first_token in BLOCK_INDICATORS:
        return "folded", None
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        return "single", len(raw) - 2
    # A plain scalar that continues on indented following lines is multi-line.
    lines = block.splitlines()
    for idx, line in enumerate(lines):
        if not line or line[0] in " \t#-":
            continue
        m = TOP_KEY_RE.match(line)
        if m and m.group(1) == "description":
            nxt = lines[idx + 1] if idx + 1 < len(lines) else ""
            if nxt[:1] in (" ", "\t"):
                return "other", None
            return "single", len(raw)
    return "other", None


def has_code_within(skill_dir: Path, max_parts: int = 2) -> bool:
    """Any code file whose path relative to the skill dir has <= max_parts components.

    max_parts=2 counts `tool.py` (1 component) and `scripts/tool.py` (2
    components) — i.e. "within 2 directory levels of the skill's directory".
    """
    for dirpath, _dirnames, filenames in os.walk(skill_dir):
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() not in CODE_SUFFIXES:
                continue
            rel = Path(dirpath) / fn
            try:
                rel = rel.relative_to(skill_dir)
            except ValueError:
                continue
            if len(rel.parts) <= max_parts:
                return True
    return False


def percentile(sorted_vals, q):
    """Linear-interpolation percentile (same convention as numpy's default)."""
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return float(sorted_vals[0])
    pos = (len(sorted_vals) - 1) * (q / 100.0)
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = pos - lo
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * frac


def main():
    per_repo = {}
    all_rows = []
    globals_ = {
        "skills_total": 0,
        "units_with_code": 0,
        "units_with_refs": 0,
        "units_over_500_lines": 0,
        "name_fail": 0,
        "extra_field_files": 0,
        "license_declared": 0,
        "name_differs_from_dir": 0,
        "name_missing": 0,
    }
    desc_single = []          # (repo, relpath, length)
    desc_folded = []          # (repo, relpath)
    desc_other = []           # (repo, relpath)
    desc_missing = []
    parse_modes = {}
    aux = {"units_with_code_depth3": 0, "over_500_by_newline_count": 0}

    for repo_name, dirname, sha in REPOS:
        repo_dir = CLONE_ROOT / dirname
        if not repo_dir.is_dir():
            per_repo[repo_name] = {"error": "clone-missing"}
            print("MISSING", repo_dir, file=sys.stderr)
            continue

        files = find_skill_files(repo_dir)
        stats = {
            "sha": sha,
            "skills_total": len(files),
            "units_with_code": 0,
            "units_with_refs": 0,
            "units_over_500_lines": 0,
            "name_fail": 0,
            "name_differs_from_dir": 0,
            "name_missing": 0,
            "extra_field_files": 0,
            "license_declared": 0,
            "desc_single_measurable": 0,
            "desc_folded": 0,
            "skills_zip_member": 0,  # diagnostics: always 0, placeholder
        }

        for path in files:
            rel = path.relative_to(repo_dir).as_posix()
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError as exc:
                print("READ_ERROR", rel, exc, file=sys.stderr)
                continue
            skill_dir = path.parent
            line_count = len(text.splitlines())
            nl_count = text.count("\n")

            if line_count > 500:
                stats["units_over_500_lines"] += 1
            if nl_count > 500:
                aux["over_500_by_newline_count"] += 1

            code = has_code_within(skill_dir, 2)
            if code:
                stats["units_with_code"] += 1
            if has_code_within(skill_dir, 3):
                aux["units_with_code_depth3"] += 1

            refs = (skill_dir / "references").is_dir() or (skill_dir / "reference").is_dir()
            if refs:
                stats["units_with_refs"] += 1

            block = split_frontmatter(text)
            keys, values, mode = parse_frontmatter(text)
            parse_modes[mode] = parse_modes.get(mode, 0) + 1

            name_val = values.get("name")
            name_str = str(name_val).strip() if name_val is not None else None
            if not name_str:
                stats["name_missing"] += 1
                name_ok = False
            else:
                name_ok = bool(NAME_RE.match(name_str)) and len(name_str) <= 64
            if not name_ok:
                stats["name_fail"] += 1
            if name_str and name_str != skill_dir.name:
                stats["name_differs_from_dir"] += 1

            extras = [k for k in keys if k not in ALLOWED_KEYS]
            if extras:
                stats["extra_field_files"] += 1

            license_present = "license" in keys
            if license_present:
                stats["license_declared"] += 1

            dkind, dlen = describe_description(block, values)
            if dkind == "folded":
                stats["desc_folded"] += 1
                desc_folded.append((repo_name, rel))
            elif dkind == "single":
                stats["desc_single_measurable"] += 1
                desc_single.append((repo_name, rel, dlen))
            elif dkind == "missing":
                desc_missing.append((repo_name, rel))
            else:
                desc_other.append((repo_name, rel))

            all_rows.append(
                {
                    "repo": repo_name,
                    "path": rel,
                    "name": name_str,
                    "desc_kind": dkind,
                    "desc_len": dlen,
                    "lines": line_count,
                    "has_code": code,
                    "has_refs": refs,
                    "name_ok": name_ok,
                    "extra_fields": extras,
                    "license_present": license_present,
                }
            )

        del stats["skills_zip_member"]
        per_repo[repo_name] = stats
        for k in globals_:
            globals_[k] += stats.get(k, 0)

    # ---- description statistics over single-line descriptions ----
    lengths = sorted(r[2] for r in desc_single)
    desc_stats = {
        "measurable": len(lengths),
        "mean": round(statistics.fmean(lengths), 2) if lengths else None,
        "median": round(statistics.median(lengths), 2) if lengths else None,
        "p90": round(percentile(lengths, 90), 2) if lengths else None,
        "max": lengths[-1] if lengths else None,
        "min": lengths[0] if lengths else None,
        "folded": len(desc_folded),
        "other_multiline_or_empty": len(desc_other),
        "missing": len(desc_missing),
        "percentile_method": "linear interpolation (numpy default)",
    }

    # ---- subsample: every 10th SKILL.md by sorted path, per repo ----
    sample = []
    for repo_name, _dirname, _sha in REPOS:
        rows = [r for r in all_rows if r["repo"] == repo_name]
        for i in range(0, len(rows), 10):
            r = rows[i]
            sample.append(
                {
                    "repo": r["repo"],
                    "path": r["path"],
                    "name": r["name"],
                    "description_length": "folded" if r["desc_kind"] == "folded" else r["desc_len"],
                    "line_count": r["lines"],
                    "has_code": r["has_code"],
                    "has_refs": r["has_refs"],
                    "name_ok": r["name_ok"],
                    "extra_fields": r["extra_fields"],
                    "license_present": r["license_present"],
                }
            )

    out = {
        "meta": {
            "pass": "second-coder",
            "generated_utc": "2026-11-26",
            "python": sys.version.split()[0],
            "yaml_available": HAVE_YAML,
            "yaml_version": getattr(yaml, "__version__", None) if HAVE_YAML else None,
            "clone_root": str(CLONE_ROOT),
            "definitions": {
                "skill": "file named SKILL.md (case-insensitive), outside .git",
                "units_with_code": "code file (.py/.sh/.js/.mjs/.ts/.ps1) whose path relative to the skill dir has <=2 components (tool.py or scripts/tool.py)",
                "units_with_refs": "references/ or reference/ directory beside SKILL.md",
                "units_over_500_lines": "SKILL.md splitlines() > 500",
                "name_fail": "name !~ ^[a-z0-9]+(-[a-z0-9]+)*$ or len(name) > 64; missing name fails",
                "allowed_keys": sorted(ALLOWED_KEYS),
            },
            "frontmatter_parse_modes": parse_modes,
        },
        "repositories": per_repo,
        "globals": globals_,
        "descriptions": desc_stats,
        "diagnostics": {
            "units_with_code_depth3": aux["units_with_code_depth3"],
            "over_500_by_newline_count": aux["over_500_by_newline_count"],
            "desc_other_paths": [f"{r}/{p}" for r, p in desc_other],
            "desc_missing_paths": [f"{r}/{p}" for r, p in desc_missing],
            "desc_folded_count_by_repo": {
                repo: sum(1 for r, _ in desc_folded if r == repo) for repo, _, _ in REPOS
            },
        },
        "sample_rows": sample,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, sort_keys=False) + "\n", encoding="utf-8")

    g = out["globals"]
    print("total SKILL.md:", g["skills_total"])
    print("with code:", g["units_with_code"], "| depth3 variant:", aux["units_with_code_depth3"])
    print("with refs:", g["units_with_refs"])
    print("over 500 lines:", g["units_over_500_lines"], "| newline-count variant:", aux["over_500_by_newline_count"])
    print("name_fail:", g["name_fail"], "| name_missing:", g["name_missing"], "| name_differs_from_dir:", g["name_differs_from_dir"])
    print("extra_field_files:", g["extra_field_files"])
    print("license_declared:", g["license_declared"])
    print("desc single measurable:", desc_stats["measurable"], "folded:", desc_stats["folded"],
          "other:", desc_stats["other_multiline_or_empty"], "missing:", desc_stats["missing"])
    print("desc mean/median/p90/max:", desc_stats["mean"], desc_stats["median"], desc_stats["p90"], desc_stats["max"])
    print("sample rows:", len(sample))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
