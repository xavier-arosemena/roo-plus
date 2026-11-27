# Independent second-coder pass on the agent-skills field survey

**Date:** 2026-11-26
**Scope:** independent re-derivation of the counts in [`2026-11-25-skills-inventory.csv`](../research/2026-11-25-skills-inventory.csv:1) by a second implementation, then a field-by-field and path-by-path comparison.
**Status:** Phase A completed blind. `runs/skills-second-coder/derived.json` was written at **2026-11-26T20:38:28Z** (sha256 `226a7405…4b1d`), which is **before** the inventory CSV, the field survey or the landscape note was opened, and before `scripts/skills-survey-extract.sh` was read.

---

## 1. What I did

### 1.1 Environment

| Item                   | Value                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python                 | 3.12.3                                                                                                                                                                                                  |
| YAML library           | **PyYAML 6.0.3 available** (`python3 -c "import yaml"` → no fallback parser needed)                                                                                                                     |
| Frontmatter parse path | `yaml.safe_load` on 2,641 files, hand-written top-level-key scanner on 13 files where `safe_load` raised                                                                                                |
| Clone root             | `/tmp/skills-second-coder/<org>_<repo>` (single underscore, outside the repository)                                                                                                                     |
| Extractor              | [`runs/skills-second-coder/extract_second_pass.py`](../../runs/skills-second-coder/extract_second_pass.py:1) — `os.walk` + `pathlib`, no `awk`, no `grep`, no `find`, no reuse of the original pipeline |

### 1.2 Pins

All 22 SHAs resolved and all 22 working trees end at the pinned commit.

- **18 repositories** were already at the pin after `git clone --depth 1` — no fetch needed.
- **4 repositories** had moved past the pin and needed an explicit fetch:
  `google/skills`, `MengTo/Skills`, `huggingface/skills`, `NVIDIA/skills`.
- The first fetch attempt failed on all four, and the reason is worth recording because it is a trap for anyone re-running this: **`git fetch --depth 1 origin <12-char-sha>` cannot work.** A short SHA is not a refspec; the client can only abbreviate an object it already has. The fix was to expand each pin through the GitHub API and fetch the full 40-character SHA:

```sh
curl -sS "https://api.github.com/repos/google/skills/commits/c413c1fdc171"   # -> full sha
git fetch --depth 1 origin c413c1fdc1714f2e4ae44a449b9744348197119c
git checkout --detach c413c1fdc1714f2e4ae44a449b9744348197119c
```

Resolved full SHAs: google `c413c1fdc1714f2e4ae44a449b9744348197119c`, MengTo `a5b1d3d28bd72b206a28e4a76b653792fc7b4859`, huggingface `c158db6f839c65fe3234f0baa743f5e2c8d4ec13`, NVIDIA `c0a412757e52d60cb427de92a06b878785801c71`.

The brief's corrected rows were used as given (the duplicated `microsoft/skills` row collapsed, `K-Dense-AI/scientific-agent-skills` at `c21d13b3cc28`, plus `VoltAgent/awesome-agent-skills`, `agentskills/agentskills`, `NVIDIA/SkillSpector`), giving 22 distinct repositories.

### 1.3 Commands, in order

```sh
python3 --version && python3 -c "import yaml; print(yaml.__version__)"
sh /tmp/skills-second-coder/clone_all.sh                 # clone + pin; prints PIN_OK / PIN_FETCHED per repo
python3 runs/skills-second-coder/extract_second_pass.py  # Phase A -> runs/skills-second-coder/derived.json
# ---- Phase B starts here ----
python3 runs/skills-second-coder/dump_rows.py            # all 2,654 per-file rows -> all_rows.json
python3 runs/skills-second-coder/compare_second_pass.py  # -> comparison.json + printed tables
```

Three further scratch probes in `/tmp/skills-second-coder/` (`probe_desc.py`, `probe2.py`…`probe8.py`) inspect individual files; they read text only.

### 1.4 Safety

Nothing in any clone was executed, imported or modified. No `.py`/`.sh` from a clone was run, no package manager was invoked against a clone, and no clone was added to this repository. The extractor reads `SKILL.md` as text and stats directories; that is the entire interaction with clone content.

### 1.5 Definitions used, and where they were ambiguous

The brief's definitions were implemented literally, with the ambiguous ones resolved as follows (all recorded in `derived.json.meta.definitions`):

| Measure                 | Implemented as                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| skill                   | file named `SKILL.md`, case-insensitive, `.git` directories pruned                                                                  |
| `units_with_code`       | a `.py .sh .js .mjs .ts .ps1` file whose path **relative to the skill directory has ≤ 2 components** (`tool.py`, `scripts/tool.py`) |
| `units_with_refs`       | `references/` or `reference/` directory directly beside `SKILL.md`                                                                  |
| over 500 lines          | `len(text.splitlines()) > 500`                                                                                                      |
| `name_fail`             | `name` fails `^[a-z0-9]+(-[a-z0-9]+)*$` **or** is longer than 64 characters; a missing name also fails                              |
| extra field             | any top-level key outside `{name, description, license, allowed-tools, metadata, compatibility}`                                    |
| folded description      | the value line begins with `>`, `>-`, `>+`, `\|`, `\|-` or `\|+`                                                                    |
| single-line description | an inline value that is not a block indicator and is not continued by indented following lines                                      |

The one definition I could not pin down from the brief alone is "within 2 directory levels". I ran both readings: the primary (≤ 2 path components) gives **546**, the wider one (≤ 3 components) gives 590. 546 is the reading that agrees, so this is a resolved ambiguity rather than a live risk, but it is the single definition in this pass whose answer could have gone the other way by 44 units.

---

## 2. Comparison table

### 2.1 Per repository

`mine / CSV`. The CSV figures are recomputed from its own 2,654 `skill` rows, which is stricter than comparing only the repo-level verdict columns.

| repo                               | skills            | code          | refs              | >500        | name_fail   | extra             | license           | folded        |
| ---------------------------------- | ----------------- | ------------- | ----------------- | ----------- | ----------- | ----------------- | ----------------- | ------------- |
| mattpocock/skills                  | 39 / 39           | 3 / 3         | 0 / 0             | 0 / 0       | 0 / 0       | 24 / 24           | 0 / 0             | 0 / 0         |
| anthropics/skills                  | 20 / 20           | 10 / 10       | 2 / 2             | 1 / 1       | 0 / 0       | 0 / 0             | 17 / 17           | 3 / 3         |
| vercel-labs/skills                 | 5 / 5             | 0 / 0         | 0 / 0             | 0 / 0       | 0 / 0       | 0 / 0             | 0 / 0             | 0 / 0         |
| openai/skills                      | 44 / 44           | 22 / 22       | 30 / 30           | 3 / 3       | 0 / 0       | 0 / 0             | 0 / 0             | 0 / 0         |
| google/skills                      | 226 / 226         | 54 / 54       | 218 / 218         | 9 / 9       | 0 / 0       | 0 / 0             | 8 / 8             | 216 / 216     |
| MiniMax-AI/skills                  | 23 / 23           | 6 / 6         | 13 / 13           | 3 / 3       | 0 / 0       | 1 / 1             | 19 / 19           | 14 / 14       |
| slavingia/skills                   | 10 / 10           | 0 / 0         | 0 / 0             | 0 / 0       | 0 / 0       | 1 / 1             | 0 / 0             | 0 / 0         |
| MengTo/Skills                      | 223 / 223         | 58 / 58       | 59 / 59           | 1 / 1       | 0 / 0       | 0 / 0             | 0 / 0             | 0 / 0         |
| obra/superpowers                   | 15 / 15           | 3 / 3         | 4 / 4             | 0 / 0       | 0 / 0       | 0 / 0             | 0 / 0             | 0 / 0         |
| huggingface/skills                 | 25 / 25           | 10 / 10       | 15 / 15           | 4 / 4       | **0 / 1**   | 0 / 0             | 4 / 4             | 1 / 1         |
| android/skills                     | 42 / 42           | 2 / 2         | 38 / 38           | 6 / 6       | 0 / 0       | 0 / 0             | 42 / 42           | 0 / 0         |
| multica-ai/andrej-karpathy-skills  | 1 / 1             | 0 / 0         | 0 / 0             | 0 / 0       | 0 / 0       | 0 / 0             | 1 / 1             | 0 / 0         |
| VoltAgent/awesome-openclaw-skills  | 0 / 0             | 0 / 0         | 0 / 0             | 0 / 0       | n/a         | 0 / 0             | 0 / 0             | 0 / 0         |
| addyosmani/agent-skills            | 26 / 26           | 3 / 3         | 13 / 13           | 0 / 0       | 0 / 0       | 0 / 0             | 0 / 0             | 0 / 0         |
| NVIDIA/skills                      | 641 / 641         | 198 / 198     | 395 / 395         | 7 / 7       | 0 / 0       | 298 / 298         | 607 / 607         | 280 / 280     |
| ComposioHQ/awesome-claude-skills   | 864 / 864         | 10 / 10       | 1 / 1             | 2 / 2       | 92 / 92     | 832 / 832         | 15 / 15           | 0 / 0         |
| cloudflare/skills                  | 24 / 24           | 1 / 1         | 24 / 24           | 0 / 0       | 0 / 0       | 0 / 0             | 0 / 0             | 0 / 0         |
| microsoft/skills                   | 215 / 215         | 31 / 31       | 147 / 147         | 8 / 8       | 0 / 0       | 3 / 3             | 196 / 196         | 92 / 92       |
| K-Dense-AI/scientific-agent-skills | 177 / 177         | 122 / 122     | 176 / 176         | 0 / 0       | 0 / 0       | 0 / 0             | 173 / 173         | 3 / 3         |
| VoltAgent/awesome-agent-skills     | 0 / 0             | 0 / 0         | 0 / 0             | 0 / 0       | n/a         | 0 / 0             | 0 / 0             | 0 / 0         |
| agentskills/agentskills            | 0 / 0             | 0 / 0         | 0 / 0             | 0 / 0       | n/a         | 0 / 0             | 0 / 0             | 0 / 0         |
| NVIDIA/SkillSpector                | 34 / 34           | 13 / 13       | 0 / 0             | 0 / 0       | 1 / 1       | 18 / 18           | 0 / 0             | 1 / 1         |
| **total**                          | **2,654 / 2,654** | **546 / 546** | **1,135 / 1,135** | **44 / 44** | **93 / 94** | **1,177 / 1,177** | **1,082 / 1,082** | **610 / 610** |

**175 of 176 repo-level count cells agree.** The single exception is `huggingface/skills name_fail` (§3.1).

The CSV's own repo-level verdict columns (`name_conformance`, `spec_extra_fields`, `license_field`, plus `skills_total`, `units_with_code`, `units_with_refs`, `units_over_500_lines` and the per-repo skill-row count) agree with mine on **176 of 176 checks** — every verdict cell is consistent with my counts.

Three repositories publish no `SKILL.md` at all (`VoltAgent/awesome-agent-skills`, `VoltAgent/awesome-openclaw-skills`, `agentskills/agentskills`). I verified this by inspection rather than by inference: they contain 4, 35 and 141 files respectively, none named `skill.md` in any case. The CSV records the same three as `n/a` on the field verdicts.

### 2.2 Globals

| measure                           | mine   | CSV                         | agree                                  |
| --------------------------------- | ------ | --------------------------- | -------------------------------------- |
| total `SKILL.md` files            | 2,654  | 2,654                       | yes                                    |
| skills with code (≤2 levels)      | 546    | 546                         | yes                                    |
| skills with a reference directory | 1,135  | 1,135                       | yes                                    |
| `SKILL.md` over 500 lines         | 44     | 44                          | yes                                    |
| name failures                     | **93** | **94**                      | **no** — see §3.1                      |
| files with ≥1 extra field         | 1,177  | 1,177                       | yes                                    |
| skills declaring `license`        | 1,082  | 1,082                       | yes                                    |
| folded descriptions               | 610    | 610                         | yes (the survey prose says 611 — §3.5) |
| names ≠ parent directory          | 142    | not in CSV (prose says 143) | prose off by one — §3.1                |

### 2.3 Per-file agreement (all 2,654 matched paths, zero unmatched on either side)

| field                          | agreement         |
| ------------------------------ | ----------------- |
| `units_with_code` (1/0)        | **2,654 / 2,654** |
| `units_with_refs` (1/0)        | **2,654 / 2,654** |
| `units_over_500_lines` (y/n)   | **2,654 / 2,654** |
| `spec_extra_fields` (y/n)      | **2,654 / 2,654** |
| `license_field` (y/n)          | **2,654 / 2,654** |
| `name` verbatim                | 2,653 / 2,654     |
| `name_conformance` (pass/fail) | 2,653 / 2,654     |
| `skill_md_lines`               | 2,625 / 2,654     |
| `description_chars`            | 1,471 / 2,654     |

The two 2,653s and the `skill_md_lines`/`description_chars` gaps are all explained in §3; none of them is a disagreement about what the corpus contains.

### 2.4 Description statistics

The brief asks for mean/median/p90/max of single-line descriptions. The CSV has no cell for these, so the comparison is: my values, the values recomputed from the CSV's own `description_chars` column, and the published prose.

| statistic    | mine (parsed value, quotes stripped, plain multi-line excluded) | recomputed from CSV (raw scalar, quotes counted, first line only) | published prose |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- | --------------- |
| measurable n | 1,919                                                           | 2,044 (2,043 excluding the one `0` row)                           | 2,043           |
| folded rows  | 610                                                             | 610                                                               | 611             |
| mean         | 234.19                                                          | 226.57 (226.69 excl. the `0`)                                     | 227             |
| median       | 157                                                             | 144                                                               | 144             |
| p90          | 480.2                                                           | 462.8                                                             | ≈460            |
| max          | 1,691                                                           | 1,691                                                             | —               |
| min          | 25                                                              | 0                                                                 | —               |

**These tables are not measuring the same thing, and the difference is fully explained.** Re-measuring my corpus under the first pass's own convention — raw scalar as written, quotes kept, first physical line only, folded sentinels excluded — reproduces the published column **to 2,043 of 2,044 rows**, with mean 226.67, median 144.5, p90 462.8, max 1,691. The single remaining cell is the CRLF file in §3.1.

p90 is method-sensitive by about one character on this distribution: linear interpolation gives 480.2, nearest-rank gives 481. Both conventions are stated here so a reader can tell which one they are recomputing.

---

## 3. Every disagreement, with cause

### 3.1 `skills/huggingface-datasets/SKILL.md` — **miscount (first pass)**

The only CRLF file in the corpus of 2,654. The first pass recorded three wrong cells for it:

| field               | mine                   | CSV                         | file evidence                                       |
| ------------------- | ---------------------- | --------------------------- | --------------------------------------------------- |
| `name`              | `huggingface-datasets` | _(empty)_                   | line 2 is `name: huggingface-datasets`              |
| `name_conformance`  | pass                   | fail                        | the name satisfies the grammar and is 20 characters |
| `description_chars` | 189                    | `0` (notes: `desc_chars=0`) | line 3 is a 189-character plain scalar              |

The file's line count (107) is recorded correctly by both passes, so the failure is specific to the frontmatter-value extraction, not to file reading. A trailing `\r` on each line is the obvious candidate: `wc -l` is indifferent to it, a scalar-length or grammar test is not.

Consequences, all one row wide:

- global `name_fail` is 94 in the CSV and 93 in my pass;
- the prose's "2,511 of 2,654 names equal their directory" is one short — my pass finds 2,512 conforming, 142 exceptions; adding this file (whose CSV name is empty, hence ≠ its directory) to the first pass's 142 gives the published 143;
- the description distribution carries a spurious `0`, which drags the CSV's mean down by 0.10 characters and its median down by 0.5.

Classification: **miscount**. One file, three cells, one cause.

### 3.2 Quoted descriptions — 1,057 rows — **definitional difference**

For 1,057 rows the CSV's `description_chars` is exactly my value + 2. All 1,057 are descriptions written as a quoted scalar (1,050 double-quoted, 7 single-quoted), e.g.

```yaml
description: "Automate 21risk tasks via Rube MCP (Composio). Always search tools first for current schemas."
```

The CSV counts the **quote characters** because it measures the raw scalar as written; I measure the **parsed value** with the quotes removed. Both are internally consistent. The consequence is not small at the aggregate: on the same 1,919 single-line rows, counting the quotes raises the mean from 234.19 to 235.29 and the median from 157 to 159.

This also explains the prose's "thirteen files exceed 1,024 characters". Thirteen is correct under the quote-counting convention; quotes-stripped it is twelve, because the smallest offender, `microsoft/skills/.github/plugins/aks-skills/skills/aks-troubleshooting/SKILL.md` at 1,026, is 1,024 once its quotes are removed. The claim is not wrong, but it is convention-dependent and the prose does not say which convention it uses — the same omission the definitions document warns about for folded blocks.

### 3.3 Plain multi-line descriptions — 125 rows — **definitional difference**

125 skills write `description:` as an unquoted scalar continued on indented following lines, e.g. `android/skills/camera/camerax/SKILL.md` in the pinned clone:

```yaml
description: Provide technical guidance for Android camera development with CameraX.
    Use when implementing camera features, handling asynchronous recording lifecycles,
    wiring low-level hardware interop using CameraX, or integrating ML Kit or Media3
    effects.
```

The CSV records the length of the **first physical line only** (in all 125 cases the recorded value equals exactly that). My pass classifies these as "not a single-line value" and excludes them from the distribution, which is why my measurable denominator is 1,919 rather than 2,044.

Classification: **definitional difference** — but the definition is one the first pass states and then does not apply. The inventory contract says `description_chars` is the length of a "raw **single-line** `description:` scalar"; these are not single-line scalars. The first pass's single-line extractor cannot tell the difference, so it records a truncated value rather than an unmeasurable one. The number is a lower bound on the true description length, not a measurement of it.

### 3.4 Line counts — 29 rows — **definitional difference**

In 29 cases my count is exactly one more than the CSV's. Every one of the 29 is a file whose final line has no trailing newline: the CSV counts newline characters (`wc -l`), I count logical lines. All 29 are explained by this; none is left over.

This is immaterial to the `>500` measure: the two conventions both give 44, because no file sits at the 501 boundary. It is material to extremes, which the prose gets wrong in both directions — see §3.6.

### 3.5 Folded count: 611 in the prose, 610 in the CSV and in my pass — **prose error**

The survey and the definitions document both say "611 rows (23.0%)" carry a folded sentinel. The CSV itself contains **610** rows with `description_chars` of `1` or `2` (264 × `1`, 346 × `2`), and my independent count of block-scalar descriptions is also **610**. The row-level sets match exactly: no file is folded in one pass and not the other.

The arithmetic is consistent with 611 = 610 folded + the one `description_chars=0` row from §3.1 being swept into the "not measurable" bucket and then reported as folded: 611 + 2,043 = 2,654. So the prose's pair of numbers sums correctly but the label on one of them is wrong.

Per-catalogue reconciliation, which the prose states explicitly, does hold and is a good check on both passes: NVIDIA 156 × 1 + 124 × 2 = 280 rows, 404 characters; google 3 + 213 = 216 rows, 429 characters; microsoft 86 + 6 = 92 rows, 98 characters; K-Dense 3 rows, 4 characters; anthropics 3 rows, 4 characters. My per-repo folded counts are identical to the CSV's in all 22 rows.

### 3.6 Line-count extremes in the prose — **prose error**

The survey says "line counts run from 7 to 1,037". Both ends are wrong in the CSV as well as in my pass: the CSV's own `skill_md_lines` column runs from **6** (`ComposioHQ/awesome-claude-skills/template-skill/SKILL.md`) to **1,313** (`microsoft/skills/.github/skills/skill-creator/SKILL.md`). 1,037 is the largest MiniMax body, not the largest body. My counts agree with the CSV in both places, so the error is in the prose, not in the extraction.

Classification: **miscount (prose)**. Not one of the two arithmetic errors the brief mentions, but the same class.

### 3.7 What I could not classify

Nothing. Every one of the 1,183 description mismatches, 29 line mismatches and 1 name mismatch is resolved above to a specific cause, verified against the file itself. No mismatch is left as _undetermined_.

---

## 4. Sampled-row agreement

275 sampled rows (every 10th `SKILL.md` by sorted path within each repository).

| criterion                                                         | rows in full agreement |
| ----------------------------------------------------------------- | ---------------------- |
| every field, strictly as specified in the brief                   | **153 / 275 (55.6%)**  |
| every field, after normalising the three conventions in §3.2–§3.4 | **274 / 275 (99.6%)**  |

The strict figure is low for one reason only: `description_length` differs on most sampled rows because of the quote-counting and first-line-only conventions. Breakdown of the 122 strict failures:

| repository                         | sampled rows | strict failures | of which `desc` only |
| ---------------------------------- | -----------: | --------------: | -------------------: |
| ComposioHQ/awesome-claude-skills   |           87 |              84 |                   83 |
| NVIDIA/skills                      |           65 |              14 |                   14 |
| microsoft/skills                   |           22 |              10 |                   10 |
| android/skills                     |            5 |               5 |                    5 |
| MengTo/Skills                      |           23 |               3 |                    3 |
| openai/skills                      |            5 |               2 |                    2 |
| huggingface/skills                 |            3 |               2 |                    1 |
| obra/superpowers                   |            2 |               1 |                    1 |
| K-Dense-AI/scientific-agent-skills |           18 |               1 |                    1 |
| the other 13 repositories          |           45 |               0 |                    0 |

120 of the 122 are `desc`-only and definitional (§3.2, §3.3). The two that are not:

- `huggingface/skills/skills/huggingface-datasets/SKILL.md` — fails `name`, `name_conformance` and `desc`; this is the CRLF row of §3.1, and it is the single row that still disagrees after normalising the conventions.
- `ComposioHQ/awesome-claude-skills/artifacts-builder/SKILL.md` — `skill_md_lines` 74 vs 73; a file whose last line has no trailing newline (§3.4).

The full list, with both values for every field, is in [`comparison.json`](../../runs/skills-second-coder/comparison.json:1) under `sample.disagreements`.

---

## 5. What this pass does and does not establish

**It establishes:**

1. **Two independent implementations agree on the structural counts.** Skill counts (2,654), code-bearing skills (546), reference directories (1,135), over-500-line files (44), non-specification fields (1,177) and licence declarations (1,082) agree at the repository level for all 22 repositories and at the file level for all 2,654 files. Those six measures survive a complete re-implementation with a different language, parser and traversal, which is the strongest kind of agreement available here.
2. **The one count-level disagreement is a single file, and it is the first pass that is wrong.** `skills/huggingface-datasets/SKILL.md` is CRLF; the first pass recorded an empty name and a zero-length description. The correct values are `huggingface-datasets` and 189 characters. This shifts global `name_fail` from 94 to 93 and the name-equals-directory count from 2,511 to 2,512.
3. **The large apparent disagreement in the description column is definitional, not arithmetic.** 1,057 rows differ by exactly the two quote characters, and 125 by taking one line of a multi-line scalar. Adopting the first pass's convention reproduces its published column to 2,043 of 2,044 cells.
4. **Two published prose claims are inconsistent with the published CSV**, and my pass sides with the CSV both times: the folded count is 610, not 611; the line-count range is 6–1,313, not 7–1,037.

**It does not establish:**

1. **That the numbers are true.** This measures agreement between two implementations over one corpus at fixed SHAs. Where both passes share a definition — `.git` pruned, case-insensitive `SKILL.md`, "≤ 2 directory levels", the allowed-key set, "top-level only" — agreement is silent about whether the definition is the right one. If the original pass mis-parsed all 610 folded descriptions, my pass made the same class of choice and would not catch it. Shared error is invisible here by construction.
2. **That either pass is reproducible by a third party.** I did not re-run `scripts/skills-survey-extract.sh`; I deliberately did not read it. This pass validates the corpus and the published table, not that script.
3. **Anything about content beyond these measures.** Nothing was executed, no skill was judged for quality, no claim about what a skill does was checked. Line counts, description lengths and frontmatter keys are surface properties; they are cheap to check and they bound only arithmetic and parsing error.
4. **Anything outside this cohort.** 2,654 files from 22 purposively chosen repositories. Three of the 22 contribute nothing, and five contribute 81.7%. A parser fix here says nothing about repositories not in the list.
5. **Statistical precision on the description distribution.** The mean and median move by ~10 characters and ~13 characters respectively depending on whether quotes are counted and whether multi-line scalars are included; p90 moves by ~18. Any published percentage over descriptions must state its denominator and its convention, and 2,043 is not the number my convention produces (1,919) — the difference is the 125 truncated multi-line values, which the first pass counts and I exclude.

---

## 6. Artefacts

| Path                                                                                                         | Contents                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`runs/skills-second-coder/derived.json`](../../runs/skills-second-coder/derived.json:1)                     | Phase A output: 22 repo rows, globals, description statistics, 275 sampled rows, definitions, parse-mode counts. Written before any published artefact was opened. |
| [`runs/skills-second-coder/extract_second_pass.py`](../../runs/skills-second-coder/extract_second_pass.py:1) | The extractor (Python 3 + PyYAML + `os.walk`).                                                                                                                     |
| [`runs/skills-second-coder/dump_rows.py`](../../runs/skills-second-coder/dump_rows.py:1)                     | Dumps all 2,654 per-file rows from the clones (no CSV input).                                                                                                      |
| [`runs/skills-second-coder/all_rows.json`](../../runs/skills-second-coder/all_rows.json:1)                   | Those rows: path, name, description kind/length, line counts under two conventions, code/refs flags, extra fields, parse mode.                                     |
| [`runs/skills-second-coder/compare_second_pass.py`](../../runs/skills-second-coder/compare_second_pass.py:1) | The comparison: per-repo checks, per-file agreement, sample scoring, globals recomputed from the CSV.                                                              |
| [`runs/skills-second-coder/comparison.json`](../../runs/skills-second-coder/comparison.json:1)               | Machine-readable result of that comparison, including every mismatch with both values.                                                                             |
| `/tmp/skills-second-coder/clone_all.sh`                                                                      | The clone/pin script (outside the repository, as required).                                                                                                        |

No file under `docs/research/`, `docs/press/` or `scripts/` was modified, no changeset was created and `CHANGELOG.md` was not touched.
