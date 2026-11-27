#!/usr/bin/env python3
"""Phase B comparison: second-coder derivation vs the published CSV.

Inputs:
  runs/skills-second-coder/derived.json   (blind derivation, written first)
  runs/skills-second-coder/all_rows.json  (same code, per-file rows)
  docs/research/2026-11-25-skills-inventory.csv

Outputs:
  runs/skills-second-coder/comparison.json
  a printed summary

Mapping of the CSV's repo-level verdict columns to counts:
  name_conformance pass/fail  ->  expects name_fail == 0 / > 0
  spec_extra_fields yes/no    ->  expects extra_field_files > 0 / == 0
  license_field yes/no        ->  expects license_declared > 0 / == 0
"""

import csv
import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("/root/roo-plus")
HERE = ROOT / "runs/skills-second-coder"
CSV_PATH = ROOT / "docs/research/2026-11-25-skills-inventory.csv"


def percentile(sorted_vals, q):
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return float(sorted_vals[0])
    pos = (len(sorted_vals) - 1) * (q / 100.0)
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (pos - lo)


def main():
    derived = json.loads((HERE / "derived.json").read_text())
    mine = json.loads((HERE / "all_rows.json").read_text())

    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        raw = list(csv.DictReader(fh))
    repo_rows = [r for r in raw if r["record_type"] == "repo"]
    skill_rows = [r for r in raw if r["record_type"] == "skill"]

    print(f"CSV: {len(raw)} data rows ({len(repo_rows)} repo, {len(skill_rows)} skill)")
    print(f"mine: {len(mine)} file rows\n")

    # ---------- per-repo comparison ----------
    csv_repo = {r["repo"]: r for r in repo_rows}
    csv_by_path = {(r["repo"], r["path"]): r for r in skill_rows}
    mine_by_path = {(r["repo"], r["path"]): r for r in mine}

    only_csv = sorted(set(csv_by_path) - set(mine_by_path))
    only_mine = sorted(set(mine_by_path) - set(csv_by_path))
    print(f"paths only in CSV: {len(only_csv)} | only in mine: {len(only_mine)}")
    for k in only_csv[:10]:
        print("   CSV-only:", k)
    for k in only_mine[:10]:
        print("   MINE-only:", k)

    repo_table = []
    for repo, d in derived["repositories"].items():
        c = csv_repo.get(repo, {})
        checks = []

        def add(measure, myval, csvval, ok):
            checks.append(
                {"measure": measure, "mine": myval, "csv": csvval, "agree": bool(ok)}
            )

        add("skills_total", d["skills_total"], c.get("skills_total"), str(d["skills_total"]) == c.get("skills_total"))
        add("units_with_code", d["units_with_code"], c.get("units_with_code"), str(d["units_with_code"]) == c.get("units_with_code"))
        add("units_with_refs", d["units_with_refs"], c.get("units_with_refs"), str(d["units_with_refs"]) == c.get("units_with_refs"))
        add("units_over_500_lines", d["units_over_500_lines"], c.get("units_over_500_lines"), str(d["units_over_500_lines"]) == c.get("units_over_500_lines"))

        nc = c.get("name_conformance")
        nc_ok = (nc == "pass" and d["name_fail"] == 0) or (nc == "fail" and d["name_fail"] > 0) or nc == "n/a"
        add("name_conformance(verdict vs name_fail)", f"{d['name_fail']} fails", nc, nc_ok)

        ef = c.get("spec_extra_fields")
        ef_ok = (ef == "yes" and d["extra_field_files"] > 0) or (ef == "no" and d["extra_field_files"] == 0) or ef == "n/a"
        add("spec_extra_fields(verdict vs count)", f"{d['extra_field_files']} files", ef, ef_ok)

        lf = c.get("license_field")
        lf_ok = (lf == "yes" and d["license_declared"] > 0) or (lf == "no" and d["license_declared"] == 0) or lf == "n/a"
        add("license_field(verdict vs count)", f"{d['license_declared']} files", lf, lf_ok)

        row_count = len([1 for k in csv_by_path if k[0] == repo])
        add("skill rows in CSV", d["skills_total"], row_count, d["skills_total"] == row_count)

        repo_table.append({"repo": repo, "checks": checks})

    # ---------- per-file comparison ----------
    file_mismatch = defaultdict(list)
    per_file_fields = ["name", "lines", "desc", "code", "refs", "over500", "name_conf", "extra", "license"]
    agree_counts = Counter()

    for key in sorted(set(csv_by_path) & set(mine_by_path)):
        c = csv_by_path[key]
        m = mine_by_path[key]

        # name, verbatim
        cname = c["name"]
        if cname.startswith('"') and cname.endswith('"') and len(cname) > 1:
            cname = cname[1:-1]
        agree_counts["name"] += int((cname or "") == (m["name"] or ""))
        if (cname or "") != (m["name"] or ""):
            file_mismatch["name"].append((key, m["name"], c["name"]))

        # lines
        agree_counts["lines"] += int(str(m["lines_splitlines"]) == c["skill_md_lines"])
        if str(m["lines_splitlines"]) != c["skill_md_lines"]:
            file_mismatch["lines"].append((key, m["lines_splitlines"], c["skill_md_lines"]))

        # description
        cdesc = c["description_chars"]
        if m["desc_kind"] == "folded":
            ok = cdesc in ("1", "2")
            agree_counts["desc"] += int(ok)
            if not ok:
                file_mismatch["desc"].append((key, "folded", cdesc))
        elif m["desc_kind"] == "single":
            ok = cdesc == str(m["desc_len"])
            agree_counts["desc"] += int(ok)
            if not ok:
                file_mismatch["desc"].append((key, m["desc_len"], cdesc))
        else:  # other / missing
            if cdesc not in ("1", "2"):
                file_mismatch["desc"].append((key, f"other({m['desc_len']})", cdesc))

        # code / refs / over500
        ccode = c["units_with_code"]
        ok = (ccode == "1" and m["has_code"]) or (ccode == "0" and not m["has_code"])
        agree_counts["code"] += int(ok)
        if not ok:
            file_mismatch["code"].append((key, m["has_code"], ccode))

        cref = c["units_with_refs"]
        ok = (cref == "1" and m["has_refs"]) or (cref == "0" and not m["has_refs"])
        agree_counts["refs"] += int(ok)
        if not ok:
            file_mismatch["refs"].append((key, m["has_refs"], cref))

        c500 = c["units_over_500_lines"]
        my500 = "y" if m["lines_splitlines"] > 500 else "n"
        agree_counts["over500"] += int(c500 == my500)
        if c500 != my500:
            file_mismatch["over500"].append((key, my500, c500, m["lines_splitlines"]))

        # name conformance
        cconf = c["name_conformance"]
        myconf = "pass" if m["name_ok"] else "fail"
        agree_counts["name_conf"] += int(cconf == myconf)
        if cconf != myconf:
            file_mismatch["name_conf"].append((key, myconf, cconf, m["name"]))

        # extra fields
        cextra = c["spec_extra_fields"]
        myextra = "y" if m["extra_fields"] else "n"
        agree_counts["extra"] += int(cextra == myextra)
        if cextra != myextra:
            file_mismatch["extra"].append((key, myextra, cextra, m["extra_fields"]))

        # license
        clic = c["license_field"]
        mylic = "y" if m["license_present"] else "n"
        agree_counts["license"] += int(clic == mylic)
        if clic != mylic:
            file_mismatch["license"].append((key, mylic, clic))

    n_pairs = len(set(csv_by_path) & set(mine_by_path))

    # ---------- sampled rows (every 10th by sorted path) ----------
    sample_mine = derived["sample_rows"]
    sample_agree, sample_disagree = 0, []
    for s in sample_mine:
        key = (s["repo"], s["path"])
        c = csv_by_path.get(key)
        if c is None:
            sample_disagree.append({"key": key, "why": "absent from CSV"})
            continue
        cname = c["name"]
        if cname.startswith('"') and cname.endswith('"') and len(cname) > 1:
            cname = cname[1:-1]
        checks = {
            "name": (cname or "") == (s["name"] or ""),
            "lines": c["skill_md_lines"] == str(s["line_count"]),
            "code": c["units_with_code"] == ("1" if s["has_code"] else "0"),
            "refs": c["units_with_refs"] == ("1" if s["has_refs"] else "0"),
            "name_ok": c["name_conformance"] == ("pass" if s["name_ok"] else "fail"),
            "extra": c["spec_extra_fields"] == ("y" if s["extra_fields"] else "n"),
            "license": c["license_field"] == ("y" if s["license_present"] else "n"),
        }
        if s["description_length"] == "folded":
            checks["desc"] = c["description_chars"] in ("1", "2")
        else:
            checks["desc"] = c["description_chars"] == str(s["description_length"])
        if all(checks.values()):
            sample_agree += 1
        else:
            sample_disagree.append(
                {"key": key, "failed_fields": [k for k, v in checks.items() if not v],
                 "mine": s, "csv_desc_chars": c["description_chars"],
                 "csv_lines": c["skill_md_lines"], "csv_name": c["name"],
                 "csv_extra": c["spec_extra_fields"], "csv_license": c["license_field"],
                 "csv_code": c["units_with_code"], "csv_refs": c["units_with_refs"]}
            )

    # ---------- globals derived from the CSV ----------
    g = derived["globals"]
    csv_totals = {
        "skills_total": sum(int(r["skills_total"]) for r in repo_rows),
        "skill_rows": len(skill_rows),
        "units_with_code": sum(int(r["units_with_code"]) for r in repo_rows),
        "units_with_refs": sum(int(r["units_with_refs"]) for r in repo_rows),
        "units_over_500_lines": sum(int(r["units_over_500_lines"]) for r in repo_rows),
        "name_fail": sum(1 for r in skill_rows if r["name_conformance"] == "fail"),
        "name_pass": sum(1 for r in skill_rows if r["name_conformance"] == "pass"),
        "extra_field_files": sum(1 for r in skill_rows if r["spec_extra_fields"] == "y"),
        "license_declared": sum(1 for r in skill_rows if r["license_field"] == "y"),
        "desc_folded": sum(1 for r in skill_rows if r["description_chars"] in ("1", "2")),
    }
    csv_desc_all = [int(r["description_chars"]) for r in skill_rows if r["description_chars"] not in ("", None)]
    csv_desc_text = [int(r["description_chars"]) for r in skill_rows if r["description_chars"] not in ("1", "2", "", None)]
    s_all = sorted(csv_desc_all)
    s_text = sorted(csv_desc_text)
    csv_desc_stats = {
        "rows_with_length": len(s_all),
        "raw_mean": round(statistics.fmean(s_all), 2) if s_all else None,
        "raw_median": round(statistics.median(s_all), 2) if s_all else None,
        "raw_p90": round(percentile(s_all, 90), 2) if s_all else None,
        "raw_max": s_all[-1] if s_all else None,
        "text_only_n": len(s_text),
        "text_mean": round(statistics.fmean(s_text), 2) if s_text else None,
        "text_median": round(statistics.median(s_text), 2) if s_text else None,
        "text_p90": round(percentile(s_text, 90), 2) if s_text else None,
        "text_max": s_text[-1] if s_text else None,
    }

    out = {
        "csv_row_counts": {"repo": len(repo_rows), "skill": len(skill_rows)},
        "path_sets": {"pairs": n_pairs, "only_csv": len(only_csv), "only_mine": len(only_mine),
                      "only_csv_sample": [list(k) for k in only_csv[:20]],
                      "only_mine_sample": [list(k) for k in only_mine[:20]]},
        "repo_table": repo_table,
        "per_file_agreement": {k: {"agree": agree_counts[k], "of": n_pairs} for k in per_file_fields},
        "per_file_mismatches": {k: v for k, v in file_mismatch.items()},
        "sample": {"rows": len(sample_mine), "full_agreement": sample_agree, "disagreements": sample_disagree},
        "globals_mine": g,
        "globals_from_csv": csv_totals,
        "desc_mine": derived["descriptions"],
        "desc_from_csv": csv_desc_stats,
    }
    (HERE / "comparison.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")

    # ---------- print ----------
    print("PER-REPO CHECKS")
    total_checks = total_agree = 0
    for row in repo_table:
        bad = [c for c in row["checks"] if not c["agree"]]
        total_checks += len(row["checks"])
        total_agree += len(row["checks"]) - len(bad)
        flag = "" if not bad else "   <-- " + "; ".join(
            f"{c['measure']}: mine={c['mine']} csv={c['csv']}" for c in bad
        )
        print(f"  {row['repo']:40s} {'OK' if not bad else 'DIFF'}{flag}")
    print(f"  checks: {total_agree}/{total_checks} agree\n")

    print("PER-FILE AGREEMENT (over", n_pairs, "matched paths)")
    for k in per_file_fields:
        a = agree_counts[k]
        print(f"  {k:12s} {a:5d}/{n_pairs}  mismatch={len(file_mismatch.get(k, []))}")
    print()
    for k, v in file_mismatch.items():
        print(f"-- {k} mismatches ({len(v)}):")
        for item in v[:400]:
            print("   ", item)
        print()

    print("GLOBALS  mine:", g)
    print("GLOBALS  csv :", csv_totals)
    print("DESC mine:", derived["descriptions"])
    print("DESC csv :", csv_desc_stats)
    print("\nSAMPLE:", sample_agree, "/", len(sample_mine), "full agreement")
    for d in sample_disagree[:60]:
        print("   ", d["key"], d.get("failed_fields"), "mine:", (d.get("mine") or {}).get("description_length"),
              (d.get("mine") or {}).get("line_count"), "| csv:", d.get("csv_desc_chars"), d.get("csv_lines"))
    print("\nwrote", HERE / "comparison.json")


if __name__ == "__main__":
    main()
