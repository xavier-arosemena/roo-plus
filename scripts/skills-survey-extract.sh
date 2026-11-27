#!/bin/sh
# skills-survey-extract.sh — the commands that produced
# docs/research/2026-11-25-skills-inventory.csv, in execution order.
#
# WHAT THIS IS: an assembled record, not a runnable unit. Each block was run
# separately in a single dash session (2026-11-26T08:00:11Z .. 08:25Z) and
# depended on the previous block's intermediate file in /tmp. It has not been
# re-run end-to-end as one script. Kept verbatim so the numbers in the field
# survey can be traced to the commands that made them.
#
# WHAT IT IS NOT: a tool. Do not wire it into CI. Re-running it will re-clone
# 22 repositories and overwrite /tmp intermediates.
#
# SAFETY (properties of the published survey, not preferences):
#   1. Clones go to /tmp only, never into the repository.
#   2. Nothing from a clone is executed: only find/grep/wc/awk/sort/md5sum/du,
#      plus one read-only python3 that parses the OUTPUT csv.
#   3. Nothing in a clone is modified.
#
# KNOWN FRAGILITY: the census loops use `for f in $(find ...)`, which
# word-splits on whitespace. The survey reconciled four independent inventory
# files (names/lines/flags/extras) at 2,654 keys each with zero unmatched rows,
# which also demonstrates that no path in the corpus contained whitespace.
# A corpus with spaces in paths would break these loops.
#
# Column contract and invariants: scripts/SKILLS-SURVEY.md
# ---------------------------------------------------------------------------
# Agent-skills survey — extraction commands, in execution order.
# Survey: 2026-11-26T08:00:11Z .. 08:25Z.  Shell: dash.  Nothing below executes
# any cloned file: only find/grep/wc/awk/sort/md5sum/du and one read-only
# python3 that parses the OUTPUT CSV.

# ---------------------------------------------------------------- 0. GATE
# Method gate: one shallow clone. Proceed only if it succeeds.
mkdir -p /tmp/skills-survey
git clone --depth 1 https://github.com/anthropics/skills.git \
    /tmp/skills-survey/anthropics-skills
# -> "Cloning into ..." EXIT_STATUS=0  (gate passed)

# ---------------------------------------------------------------- 1. CLONE ALL 22
# URL normalisation: everything to https://github.com/<org>/<repo>.git.
# org-14957082@github.com:openai/skills.git  ->  openai/skills
cd /tmp/skills-survey
rm -f clone-log.txt
for r in mattpocock/skills anthropics/skills vercel-labs/skills openai/skills \
         google/skills MiniMax-AI/skills slavingia/skills MengTo/Skills \
         obra/superpowers huggingface/skills android/skills \
         multica-ai/andrej-karpathy-skills VoltAgent/awesome-openclaw-skills \
         addyosmani/agent-skills NVIDIA/skills ComposioHQ/awesome-claude-skills \
         cloudflare/skills microsoft/skills K-Dense-AI/scientific-agent-skills \
         VoltAgent/awesome-agent-skills agentskills/agentskills NVIDIA/SkillSpector
do
  d=$(printf '%s' "$r" | tr '/' '__')
  if [ -d "/tmp/skills-survey/$d" ]; then
    echo "RC=SKIP REPO=$r :: already cloned" >> clone-log.txt; continue
  fi
  GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/bin/true \
    timeout 150 git clone --depth 1 "https://github.com/$r.git" \
    "/tmp/skills-survey/$d" >/tmp/clone-out.txt 2>&1
  rc=$?
  msg=$(tr '\n' ' ' < /tmp/clone-out.txt | cut -c1-300)
  echo "RC=$rc REPO=$r :: $msg" >> clone-log.txt
done
cat clone-log.txt                 # 22 x RC=0, zero 404 / private / archived

# ---------------------------------------------------------------- 2. PINNING + COUNTS
# Per repo: commit SHA, committer date, file/extension counts, size.
for d in */; do
  d=${d%/}
  sha=$(git -C "$d" rev-parse HEAD 2>/dev/null | cut -c1-12)
  date=$(git -C "$d" log -1 --format=%cI 2>/dev/null)
  files=$(find "$d" -type f -not -path '*/.git/*' | wc -l)
  md=$(find "$d" -name '*.md' -not -path '*/.git/*' | wc -l)
  skillmd=$(find "$d" -iname 'skill.md' -not -path '*/.git/*' | wc -l)
  code=$(find "$d" -type f \( -name '*.py' -o -name '*.js' -o -name '*.ts' \
         -o -name '*.sh' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ps1' \
         -o -name '*.go' -o -name '*.rs' \) -not -path '*/.git/*' | wc -l)
  size=$(du -sh "$d" 2>/dev/null | cut -f1)
  printf '%-42s %-13s %-26s files=%-6s md=%-6s skillmd=%-5s code=%-5s size=%s\n' \
    "$d" "$sha" "$date" "$files" "$md" "$skillmd" "$code" "$size"
done

# ---------------------------------------------------------------- 3. TOP-LEVEL SHAPE
for d in */; do
  d=${d%/}; echo "=== $d"
  echo "  FILES: $(find "$d" -maxdepth 1 -mindepth 1 -type f -not -name '.git*' -printf '%f ')"
  for sub in $(find "$d" -maxdepth 1 -mindepth 1 -type d -not -name '.git' -printf '%f\n'); do
    cnt=$(find "$d/$sub" -type f -not -path '*/.git/*' | wc -l)
    echo "  DIR $sub ($cnt)"
  done
done

# ---------------------------------------------------------------- 4. FRONTMATTER CENSUS
# Emits "<path>|<top-level-key>" for every key in the YAML frontmatter, or
# "<path>|__NOFM__" when the file does not open with ---. Indented (nested)
# keys are ignored by the ^[A-Za-z0-9_.-]+: anchor, so metadata.version is
# counted separately in step 6.
find . -iname 'SKILL.md' -not -path '*/.git/*' -print0 | xargs -0 awk '
  FNR==1 {
    if ($0 ~ /^---[ \t]*$/) { infm=1 }
    else { infm=0; print FILENAME "|__NOFM__" }
    next
  }
  {
    if (infm) {
      if ($0 ~ /^---[ \t]*$/) { infm=0 }
      else if ($0 ~ /^[A-Za-z0-9_.-]+:/) {
        k=$0; sub(/:.*/,"",k); print FILENAME "|" k
      }
    }
  }' > /tmp/fm.txt

# Field frequency over distinct files (NOT over lines).
awk -F'|' '!seen[$1]++{tot++} $2!="__NOFM__"{c[$2]++}
  END{printf "TOTAL_SKILLS=%d\n", tot;
      for(k in c) printf "%-32s %5d  %.1f%%\n", k, c[k], 100*c[k]/tot}' /tmp/fm.txt | sort -k2 -nr

# Nested metadata keys (context window of 6 lines after "metadata:").
grep -rh -A6 '^metadata:' --include=SKILL.md . 2>/dev/null \
  | grep -E '^  [a-z_-]+:' | sed 's/:.*//' | sort | uniq -c | sort -rn | head -15

# Files carrying metadata.version (indented key).
grep -rl -E '^  version:' --include=SKILL.md . | wc -l     # -> 903

# ---------------------------------------------------------------- 5. NON-SPEC FIELD UNION
# 1,177 of 2,654 files (44.3%) declare >=1 field outside the reference
# validator's closed set.
awk -F'|' '
  BEGIN{split("name description license allowed-tools metadata compatibility",a," ");
        for(i in a) ok[a[i]]=1}
  {f=$1; files[f]=1; if($2!="__NOFM__" && !($2 in ok)) bad[f]=1}
  END{t=0;b=0; for(f in files){t++; if(f in bad) b++}
      printf "files=%d non_spec_union=%d pct=%.1f\n", t, b, 100*b/t}' /tmp/fm.txt

# Per-repo boolean of the same test (feeds the CSV).
awk -F'|' '
  BEGIN{split("name description license allowed-tools metadata compatibility",a," ");
        for(i in a) ok[a[i]]=1}
  {split($1,p,"/"); r=p[2]; files[r]=1;
   if ($2!="__NOFM__" && !($2 in ok)) bad[r]=1}
  END{for(r in files) printf "%s %d\n", r, (r in bad)?1:0}' /tmp/fm.txt | sort

# ---------------------------------------------------------------- 6. NAME / DESCRIPTION CONFORMANCE
# Extracts name, description, license per file (single-line YAML only).
find . -iname 'SKILL.md' -not -path '*/.git/*' -print0 | xargs -0 awk '
  function flush(){ if (f!="") print f "\t" name "\t" desc "\t" lic }
  FNR==1 { flush(); f=FILENAME; name=""; desc=""; lic=""; infm=0; seen=0 }
  /^---[ \t]*$/ { if (seen==0) { infm=1; seen=1; next } else { infm=0; next } }
  { if (infm) {
      if ($0 ~ /^name:/)        { name=$0; sub(/^name:[ \t]*/,"",name) }
      else if ($0 ~ /^description:/) { d=$0; sub(/^description:[ \t]*/,"",d); desc=d }
      else if ($0 ~ /^license:/)     { l=$0; sub(/^license:[ \t]*/,"",l); lic=l }
  } }
  END { flush() }' > /tmp/names.tsv

# name grammar / dir match / description length per repo.
awk -F'\t' '
  { split($1,p,"/"); repo=p[2]; n=split($1,q,"/"); d=q[n-1];
    nm=$2; gsub(/^["'\'']|["'\'']$/,"",nm); tot[repo]++;
    if (nm=="") noname[repo]++
    else {
      if (nm ~ /^[a-z0-9]+(-[a-z0-9]+)*$/ && length(nm)<=64) okname[repo]++
      else badname[repo]++
      if (nm==d) matchdir[repo]++
    }
    dl=length($3)
    if (dl==0) nodesc[repo]++
    else if (dl>1024) longdesc[repo]++
    if ($4!="") haslic[repo]++
  }
  END{ printf "%-38s %5s %6s %6s %6s %6s %6s %6s\n","REPO","n","nameOK","nameBAD","dirOK","noDesc","desc>1k","lic";
       for (r in tot) printf "%-38s %5d %6d %6d %6d %6d %6d %6d\n",
         r, tot[r], okname[r], badname[r], matchdir[r], nodesc[r], longdesc[r], haslic[r] }' \
  /tmp/names.tsv | sort

# Description-length distribution. 611 files use folded YAML (">"), which a
# single-line extractor cannot measure: they are excluded, not imputed.
awk -F'\t' '{d=$3; gsub(/[ \t]/,"",d);
  if (d==">"||d=="|"||d==">-"||d=="|-"||d=="") next;
  l=length($3); n++; a[n]=l; s+=l}
  END{asort(a); printf "n=%d mean=%.0f p50=%d p90=%d max=%d\n",
       n, s/n, a[int(n*0.5)], a[int(n*0.9)], a[n]}' /tmp/names.tsv
# -> n=2043 mean=227 p50=144 p90=460 max=1691

# ---------------------------------------------------------------- 7. PER-SKILL STRUCTURE
# lines, code-in-skill-dir, references/ dir, negative-scope phrase, examples.
for d in */; do
  n=${d%/}; tot=0; code=0; ref=0; notuse=0; ex=0
  for f in $(find "$n" -iname 'SKILL.md' -not -path '*/.git/*'); do
    tot=$((tot+1)); dir=$(dirname "$f")
    if find "$dir" -maxdepth 2 -type f \( -name '*.py' -o -name '*.sh' -o -name '*.js' \
         -o -name '*.mjs' -o -name '*.ts' -o -name '*.ps1' \) 2>/dev/null | grep -q .; then
      code=$((code+1)); fi
    if [ -d "$dir/references" ] || [ -d "$dir/reference" ]; then ref=$((ref+1)); fi
    if grep -qiE 'when not to use|do not use this skill|not for use|when to skip|do not (invoke|use) this' "$f"; then
      notuse=$((notuse+1)); fi
    if grep -qiE '^#{1,3} *(example|examples|usage|workflow)' "$f"; then ex=$((ex+1)); fi
  done
  t=no; if [ -d "$n/tests" ] || [ -d "$n/evals" ]; then t=yes; fi
  printf '%-38s %5s %5s %5s %6s %5s %5s\n' "$n" "$tot" "$code" "$ref" "$notuse" "$ex" "$t"
done

# SKILL.md bodies over the spec's 500-line recommendation (per file, not per batch).
for d in */; do
  n=${d%/}
  c=$(find "$n" -iname 'SKILL.md' -not -path '*/.git/*' -exec sh -c \
        'for f do L=$(wc -l < "$f"); if [ "$L" -gt 500 ]; then echo "$f"; fi; done' _ {} + \
      | wc -l)
  t=$(find "$n" -iname 'SKILL.md' -not -path '*/.git/*' | wc -l)
  echo "$c/$t $n"
done

# ---------------------------------------------------------------- 8. CODE SURFACE / RISK TRIAGE
# Builds, per repo, the list of executable files INSIDE skill directories
# (<=3 levels below a SKILL.md), then greps that list for capability patterns.
for d in */; do
  n=${d%/}; list=/tmp/cf-$n.txt; : > "$list"
  for f in $(find "$n" -iname 'SKILL.md' -not -path '*/.git/*'); do
    dir=$(dirname "$f")
    find "$dir" -maxdepth 3 -type f \( -name '*.py' -o -name '*.sh' -o -name '*.js' \
      -o -name '*.mjs' -o -name '*.ts' \) >> "$list" 2>/dev/null
  done
  sort -u -o "$list" "$list"
  total=$(wc -l < "$list"); [ "$total" -eq 0 ] && { echo "$n 0 0 0 0 0 0 0"; continue; }
  ev=$(tr '\n' '\0' < "$list" | xargs -0 grep -lE '\beval\(|\bexec\(|__import__|importlib|new Function' 2>/dev/null | wc -l)
  sh=$(tr '\n' '\0' < "$list" | xargs -0 grep -lE 'subprocess|os\.system|child_process|shell=True' 2>/dev/null | wc -l)
  net=$(tr '\n' '\0' < "$list" | xargs -0 grep -lE 'requests\.|urllib|fetch\(|axios|httpx' 2>/dev/null | wc -l)
  cr=$(tr '\n' '\0' < "$list" | xargs -0 grep -liE 'api[_-]?key|access[_-]?token|ANTHROPIC_|OPENAI_|Bearer ' 2>/dev/null | wc -l)
  ins=$(tr '\n' '\0' < "$list" | xargs -0 grep -lE 'pip install|npm install|apt-get install|brew install|uv pip|npm i ' 2>/dev/null | wc -l)
  fs=$(tr '\n' '\0' < "$list" | xargs -0 grep -lE '\.ssh|\.aws|/etc/|rm -rf|chmod 777|sudo ' 2>/dev/null | wc -l)
  ps=$(tr '\n' '\0' < "$list" | xargs -0 grep -lE 'curl [^|]*\| *(ba)?sh|wget [^|]*\| *(ba)?sh' 2>/dev/null | wc -l)
  printf '%-38s %5s %5s %6s %5s %5s %7s %6s\n' "$n" "$total" "$ev" "$sh" "$net" "$cr" "$ins" "$ps"
done

# ---------------------------------------------------------------- 9. INJECTION BAIT / SECRETS
# Injection-shaped phrasing, all markdown.
grep -rIn -iE 'ignore (all )?(previous|prior|earlier)|disregard (all )?(previous|prior)|do not tell the user|without telling the user|without (the )?user(.s)? (knowledge|consent)|exfiltrat|secretly' \
  --include='*.md' . | grep -v '/.git/' | cut -c1-200
for d in */; do n=${d%/}; c=$(grep -rIl -iE 'ignore (all )?(previous|prior)|disregard (all )?(previous|prior)|do not tell the user|without telling the user|exfiltrat|secretly' --include='*.md' "$n" 2>/dev/null | wc -l); echo "$n $c"; done

# Credential-SHAPED strings (never printed; only file names recorded).
grep -rIlE 'sk-ant-[A-Za-z0-9]|AKIA[0-9A-Z]{12}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{20}|xox[baprs]-[A-Za-z0-9]' . \
  | grep -v '/.git/'

# ---------------------------------------------------------------- 10. DUPLICATION
# Cross-repo byte identity of SKILL.md (result: zero).
find . -iname 'SKILL.md' -not -path '*/.git/*' -print0 | xargs -0 md5sum \
 | awk '{split($2,p,"/"); repo=p[2]; repos[$1]=repos[$1]" "repo; cnt[$1]++}
        END{for(h in cnt) if(cnt>1) print cnt[h]"\t"h"\t"repos[h]}' | sort -rn | head -25

# NVIDIA internal duplicate groups.
find NVIDIA_skills -iname 'SKILL.md' -print0 | xargs -0 md5sum \
 | awk '{c[$1]++} END{d=0;n=0; for(h in c) if(c[h]>1){d+=c[h]; n++}
        print "dup_files="d" dup_groups="n}'            # -> 166 / 83

# Derivative check: Composio document skills vs Anthropic originals.
for s in xlsx pptx pdf docx; do
  echo "$s: anthropic=$(wc -l < anthropics_skills/skills/$s/SKILL.md) \
composio=$(wc -l < ComposioHQ_awesome-claude-skills/document-skills/$s/SKILL.md)"
done
diff anthropics_skills/skills/xlsx/SKILL.md \
     ComposioHQ_awesome-claude-skills/document-skills/xlsx/SKILL.md | head -20

# ---------------------------------------------------------------- 11. LICENCES (VERBATIM)
for d in */; do
  n=${d%/}
  lic=$(ls "$n" 2>/dev/null | grep -iE '^licen[cs]e' | head -1)
  if [ -n "$lic" ]; then
    first=$(grep -v '^\s*$' "$n/$lic" | head -3 | tr '\n' ' ' | cut -c1-70)
  else first="(none at root)"; fi
  printf '%-40s %-28s %s\n' "$n" "${lic:-NONE}" "$first"
done
# Per-skill licence texts (anthropics: 3 variants, all Apache-2.0; openai: 9 variants).
for f in anthropics_skills/skills/*/LICENSE.txt; do
  printf '%s\t%s\t%s\n' "$(md5sum < "$f" | cut -c1-8)" \
    "$(head -3 "$f" | tr -d '\n' | cut -c1-60)" "$f"
done | sort
for f in $(find openai_skills -name 'LICENSE.txt' | sort); do
  printf '%s | %s\n' "$(head -4 "$f" | tr -s ' \n' ' ' | cut -c1-55)" \
    "$(dirname "$f" | sed 's|openai_skills/||')"
done | sort | uniq -c | sort -rn | head -20
grep -rh '^license:' anthropics_skills  --include=SKILL.md | sort | uniq -c
grep -rh '^license:' ComposioHQ_awesome-claude-skills --include=SKILL.md | sort | uniq -c

# ---------------------------------------------------------------- 12. BUILD THE CSV
# (a) header + 22 repo rows were authored from the above measurements;
# (b) 2,654 skill rows generated mechanically; (c) validated with csv.reader.
sed 's/^/N\t/' /tmp/names.tsv                 > /tmp/t1
awk -F'\t' '{print "L\t"$1"\t"$2}' /tmp/lines.txt > /tmp/t2
awk -F'\t' '{print "F\t"$1"\t"$2"\t"$3}' /tmp/flags.txt > /tmp/t3
awk -F'\t' '{print "X\t"$1"\t"$2}' /tmp/extra.txt  > /tmp/t4
cat /tmp/t1 /tmp/t2 /tmp/t3 /tmp/t4 | awk -F'\t' '
  BEGIN{ m["<dir>"]="<sha12>,<committer-date>,<tier>,<pass-depth>"; ... }
  $1=="N"{pt=$2; sub(/^\.\//,"",pt); nmarr[pt]=$3; darr[pt]=$4; larr[pt]=$5; have[pt]=1; next}
  $1=="L"{pt=$2; sub(/^\.\//,"",pt); lines[pt]=$3; next}
  $1=="F"{pt=$2; sub(/^\.\//,"",pt); c[pt]=$3; rf[pt]=$4; next}
  $1=="X"{pt=$2; sub(/^\.\//,"",pt); xf[pt]=$3; next}
  END{ for (pt in have) {
        if (!(pt in lines)) continue;
        n=split(pt,parts,"/"); dir=parts[1]; rel=pt; sub("^"dir"/","",rel)
        split(m[dir],z,",")
        repo=dir; sub(/_/,"/",repo)
        nm=nmarr[pt]; gsub(/"/,"",nm)
        okn="fail"; if (nm ~ /^[a-z0-9]+(-[a-z0-9]+)*$/ && length(nm)<=64) okn="pass"
        lic="n"; if (larr[pt] != "") lic="y"
        ov="n";  if (lines[pt]>500) ov="y"
        dl=length(darr[pt])
        printf "%s,skill,%s,\"%s\",%s,%s,1,%s,%s,%s,%s,%s,%s,,,,,%s,%s,%d,%d,\"desc_chars=%d\"\n",
          repo, rel, nm, z[1], z[2], c[pt]+0, rf[pt]+0, ov, okn, xf[pt], lic, z[4], z[3], dl, lines[pt], dl
      } }' | sort -t, -k1,1 -k3,3 > /tmp/skillrows.csv

# Validate: 2,677 rows, every row exactly 22 columns.
python3 -c "
import csv
rows=list(csv.reader(open('/tmp/final.csv')))
print('rows',len(rows))
print('bad-width rows',[i for i,r in enumerate(rows) if len(r)!=22])
print('skill rows',sum(1 for r in rows if r[1]=='skill'))
print('repo rows', sum(1 for r in rows if r[1]=='repo'))
"

# ---------------------------------------------------------------- 13. MAINTENANCE (partial)
# 3 of 22 succeeded before the unauthenticated rate limit; the other 19 are
# recorded as "unverified", never estimated.
for r in mattpocock/skills vercel-labs/skills cloudflare/skills; do
  curl -s -m 25 "https://api.github.com/repos/$r" \
   | grep -oE '"(stargazers_count|open_issues_count|pushed_at|archived|fork)":[^,]*' \
   | tr '\n' ' '; echo " <- $r"
done
