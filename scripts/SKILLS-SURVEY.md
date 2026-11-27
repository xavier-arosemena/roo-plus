# Skills survey extraction — the contract

Companion to [`skills-survey-extract.sh`](skills-survey-extract.sh:1), the assembled record of the commands that produced the published CSV. The record is a transcript, not a tool; this file states what its output must mean.

Published artefacts:

- [`docs/research/2026-11-25-skills-inventory.csv`](../docs/research/2026-11-25-skills-inventory.csv:1) — 2,676 data rows (2,677 lines including the header).
- [`docs/research/2026-11-25-agent-skills-landscape.md`](../docs/research/2026-11-25-agent-skills-landscape.md:1) — internal evidence report; §0.6 covers this CSV. **Not for publication.**
- [`docs/research/2026-11-26-agent-skills-field-survey.md`](../docs/research/2026-11-26-agent-skills-field-survey.md:1) — the public report.

## What the recording is, and is not

There was never a saved script. The survey ran as inline shell invocations in one dash session (2026-11-26, 08:00–08:25 UTC), each block writing an intermediate file in `/tmp` that the next block consumed. [`skills-survey-extract.sh`](skills-survey-extract.sh:1) is those commands reassembled **in execution order**, with comments added. Two honest caveats, both carried in the file header:

1. Each block was run separately and depends on the previous block's intermediate file. It has not been re-run end-to-end as a single unit.
2. It is therefore evidence, not automation. Do not wire it into CI, and do not "fix" it in place while citing the published numbers.

## Safety rules (non-negotiable)

| Rule                                              | Why                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Clone only into `/tmp`, never into the repository | The survey is read-only evidence; it must not become vendored content                                                    |
| Never execute anything from a clone               | No `npm`, `pip`, `make`, `node`, `python`, `bash`, `eval` against cloned files. 546 skills ship code; none of it was run |
| Never modify a clone                              | Quotations must stay checkable against the pinned SHA                                                                    |
| Emit CSV through a CSV writer                     | `licence_verbatim` and `notes` contain commas and quotes; string concatenation corrupts them silently                    |

## Output contract

One file, two `record_type` values, **exactly** this column order:

|   # | Column                   | `repo` row                                                   | `skill` row                                                                                                                                                                                                |
| --: | ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `repo`                   | `org/name`                                                   | `org/name`                                                                                                                                                                                                 |
|   2 | `record_type`            | `repo`                                                       | `skill`                                                                                                                                                                                                    |
|   3 | `path`                   | empty                                                        | path to `SKILL.md` relative to the clone root                                                                                                                                                              |
|   4 | `name`                   | empty                                                        | frontmatter `name`, verbatim (empty if absent)                                                                                                                                                             |
|   5 | `sha12`                  | first 12 chars of the pinned commit                          | same as the repo row                                                                                                                                                                                       |
|   6 | `last_commit_utc`        | committer date, ISO 8601 with offset                         | same as the repo row                                                                                                                                                                                       |
|   7 | `skills_total`           | count of `SKILL.md` in the clone                             | `1`                                                                                                                                                                                                        |
|   8 | `units_with_code`        | count of skills with bundled code                            | `1` / `0` — a `.py .sh .js .mjs .ts .ps1` file **within 2 directory levels** of the skill directory                                                                                                        |
|   9 | `units_with_refs`        | count of skills with a reference directory                   | `1` / `0` — a `references/` **or** `reference/` directory beside the file                                                                                                                                  |
|  10 | `units_over_500_lines`   | count of `SKILL.md` over 500 lines                           | `y` / `n`                                                                                                                                                                                                  |
|  11 | `name_conformance`       | `pass` / `fail` / `n/a`                                      | `pass` / `fail` — matches `^[a-z0-9]+(-[a-z0-9]+)*$` **and** is ≤ 64 characters                                                                                                                            |
|  12 | `spec_extra_fields`      | `yes` / `no` / `n/a`                                         | `y` / `n` — any top-level key outside `{name, description, license, allowed-tools, metadata, compatibility}`                                                                                               |
|  13 | `license_field`          | `yes` / `no` / `n/a`                                         | `y` / `n`                                                                                                                                                                                                  |
|  14 | `version_declared`       | `no` / `yes` / `n/a`                                         | **empty by design**                                                                                                                                                                                        |
|  15 | `licence_verbatim`       | licence text as found, verbatim (may be a sentence of prose) | **empty by design**                                                                                                                                                                                        |
|  16 | `script_files_in_skills` | count                                                        | **empty by design**                                                                                                                                                                                        |
|  17 | `tests_or_evals`         | `yes` / `no`                                                 | **empty by design**                                                                                                                                                                                        |
|  18 | `pass_depth`             | `1`, `1+`, `2`                                               | inherited from the repo row                                                                                                                                                                                |
|  19 | `adoptability_tier`      | `A` `B` `C` `D` / `n/a`                                      | inherited from the repo row                                                                                                                                                                                |
|  20 | `description_chars`      | empty                                                        | character count of the raw single-line `description:` scalar. For a folded block this is the **literal length of the sentinel** — `>` is 1, `>-` is 2 — because that is what the line contains (see below) |
|  21 | `skill_md_lines`         | empty                                                        | line count of the file                                                                                                                                                                                     |
|  22 | `notes`                  | free text, quoted                                            | `desc_chars=N` and any anomaly                                                                                                                                                                             |

Two definitions worth separating, because the report reports them separately: `name_conformance` tests the **grammar and length** rule only. Whether a name also **equals its parent directory** is a separate measure — 2,511 of 2,654 (94.6%), with 143 exceptions, 43 of them in one catalogue that uses prefixed names inside differently-named folders. Conflating the two overstates the failure rate.

### Folded descriptions, and the two sums that both look right

A `description: >-` block cannot be measured by a single-line extractor. **611 rows carry `description_chars` of `1` or `2`** — not a placeholder, but the literal length of the YAML block sentinel (`>` or `>-`) that the line contains. 23.0% of the corpus writes its description this way.

This produces two defensible sums per catalogue, and the difference between them is exactly the sentinel characters:

| Convention                       | What it measures                                 | NVIDIA  |
| -------------------------------- | ------------------------------------------------ | ------- |
| Raw scalar, folded rows included | Length of every `description:` scalar as written | 88,039  |
| Text only, folded rows excluded  | Length of real description text                  | 87,635  |
| Difference                       | 124 rows at 2 chars + 156 rows at 1 char         | **404** |

The same reconciliation holds for google (213×2 + 3×1 = **429**), microsoft (6×2 + 86×1 = **98**), K-Dense (**4**) and anthropics (**4**). Both numbers are correct; they answer different questions. **Any published table must label which convention it uses**, because a reader who recomputes will otherwise land on the other one and read a 404-character delta as an error.

Percentages over descriptions always state `n = 2,043`, the text-only denominator. A parser upgrade that measures folded blocks must add a flag and announce the denominator change; changing it silently is not permitted.

### Negative scope

Counted as one of five phrases — `when not to use`, `not for use`, `do not use this skill`, `when to skip`, `do not invoke this` / `do not use this` — searched over prose. This is a **lower bound** and is published as one (3.4%). Repositories that express exclusions inside the description, or as a YAML field, are only partly captured.

## Invariants a regeneration must assert before writing

1. `record_type` counts are `repo: 22` and `skill: 2,654` (or the numbers for the cohort being regenerated, stated in the report).
2. Every row has exactly 22 fields.
3. `skills_total` on each repo row equals the number of skill rows for that repository.
4. Columns 14–17 are empty on every skill row.
5. No duplicate `(repo, path)` pair.
6. UTF-8, no BOM, LF line endings.
7. The three repositories that publish no `SKILL.md` have a repo row and no skill rows.

The current file satisfies all seven. Audit on 2026-11-26: 2,676 data rows, 22 columns on every row, 0 non-blank cells in columns 14–17, 0 duplicate pairs, no BOM, no CRLF, per-repo totals matching on all 22.

## Sampling

The cohort is **purposive and discretionary**. The surveyor searched GitHub for "skills", read the results, and chose 22 repositories by judgement — one person's list, not a query, with no automated filter and no saved shortlist. Prominence is a **property** of the chosen set, not the rule that produced it: the submissions were never ranked or filtered by star count, which is why there is no selection-time star measurement to recover. Seed repositories were cloned `--depth 1` on 2026-11-26, 08:00–08:25 UTC.

Scope, as decided for the public report: **agent-tooling collections weighted toward software engineering**, not "software engineering only". Three collections outside software engineering are included knowingly — a design catalogue (223 skills), a scientific-research catalogue (177 skills), and platform-documentation sets (Android, Cloudflare, MiniMax) — because prominence, not subject matter, decided inclusion.

Two consequences to keep in front of readers:

- Percentages describe **this 22-repository corpus**, not the ecosystem. Five catalogues hold 81.7% of the 2,654 files; one holds 32.6%.
- Star counts exist for **15 of 22**, read 2026-11-26T15:59–16:02Z, and 7 are unmeasured (HTTP 403 when the hourly quota ran out). They are **not** selection-time values: the cohort was never filtered by stars, so no such measurement exists. The figure moves — one repository gained 287 stars in the 7.7 hours between two reads — so an undated count describes an hour, not a repository.

## Known fragility

The census loops use `for f in $(find …)`, which word-splits on whitespace. The survey reconciled four independent inventory files (`names`, `lines`, `flags`, `extras`) at **2,654 keys each with zero unmatched rows and zero empty SHAs**, which also demonstrates that no path in this corpus contains whitespace. A corpus with spaces in paths would break these loops silently.

## Clone directory naming

Clone directories are `<org>_<repo>` with a **single** underscore — `NVIDIA_skills`, `K-Dense-AI_scientific-agent-skills`, `mattpocock_skills`. The transcript builds them with `tr '/' '__'`, which looks like it would produce a double underscore but does not: `tr` maps **character sets**, and the replacement set is truncated to the length of the search set, so `/` → `_` and the second `_` is discarded.

```
printf 'NVIDIA/skills' | tr '/' '__'   # -> NVIDIA_skills
```

Two traps this creates for anyone re-running the record:

- A reader who "corrects" `tr '/' '__'` to `sed 's|/|__|'` gets `NVIDIA__skills` and fails on the first `find`. Zero directories contain `__`.
- `NVIDIA_skills` sits beside `NVIDIA_SkillSpector`, so a `NVIDIA*` glob matches two repositories. Use the exact directory name.

## Provenance

The survey and both deliverables were produced in the origin repository at commit **`fc3a769`**; `HEAD` there has since moved (`7f8cf01`). Cite the commit, not the branch, when pointing at the internal report or the CSV. The copies in this repository are the versions under maintenance now.

## Open work

- Re-run the transcript end-to-end as one script against a pinned cohort, and assert the seven invariants before writing.
- Decide whether folded descriptions become a measured value (with a `folded` flag) or keep the sentinel-length convention. Either is defensible; changing it silently is not, and the column must stay labelled either way.
- Complete the star table for the 7 repositories blocked by the 403, so §3 can state the cohort's prominence without a hole in it.
