# Agent skills in public repositories: a structured field survey of 22 collections

> **Reviewed three times before release.** An independent second-coder pass re-derived every count with a different implementation and agreed on 175 of 176 repository-level cells (§8.3). An adversarial review then found 28 issues and blocked publication on six (§2.8). A pre-publication gate re-checked the three sections those repairs rewrote — and found four more defects, which is why the gate existed. Fourteen corrections are listed in §2.7, each with its cause.
>
> **Two residual risks are named rather than hidden.** The token figures are characters ÷ 4, a ratio never validated against a tokenizer for this text, so treat them as order-of-magnitude (§5.2). And the licence observations in §6.5 describe what files say at pinned commits: they are not legal advice, and a qualified read remains the right step before anyone acts on them.
>
> The internal evidence record stays at [`2026-11-25-agent-skills-landscape.md`](2026-11-25-agent-skills-landscape.md:1) and is not for publication: it carries internal prompt sizes, proposed skills, per-agent recommendations and a ranking of named projects.

| Field               | Value                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**            | Structured field survey (technical report). Not a controlled study, not a benchmark.                                                                                                                                                                                                             |
| **Survey window**   | 2026-11-26, 08:00–08:25 UTC (single sitting)                                                                                                                                                                                                                                                     |
| **Corpus**          | 22 public repositories · 2,654 `SKILL.md` files · 2,676 inventory rows                                                                                                                                                                                                                           |
| **Data**            | [`2026-11-25-skills-inventory.csv`](2026-11-25-skills-inventory.csv:1) — 22 columns, one row per repository and per `SKILL.md`                                                                                                                                                                   |
| **Extraction**      | Read-only. `git clone --depth 1` into a temporary directory; nothing from a clone was executed, modified, or vendored. Command record: [`scripts/skills-survey-extract.sh`](../../scripts/skills-survey-extract.sh:1) · contract: [`scripts/SKILLS-SURVEY.md`](../../scripts/SKILLS-SURVEY.md:1) |
| **Evidence grades** | **T1** measured in a clone · **T2** repository documentation · **T3** promotional copy · **T4** inference                                                                                                                                                                                        |
| **Published**       | [Discussions #536 — Research Reports](https://github.com/xavier-arosemena/roo-plus/discussions/536), 2026-11-27. Split at §8 because a discussion body caps at 65,536 characters; §8–§9 are the first comment, verbatim                                                                          |
| **Status**          | Review copy v2 (2026-11-27). Every figure carries its denominator; unmeasurable values are marked `unverified` rather than estimated; fourteen corrections are listed in §2.7 and the three reviews that produced them in §2.8.                                                                  |

---

## 1. Purpose and scope

Agent Skills — a directory containing a `SKILL.md` file with a small YAML header — is now a publishing format with a specification, a governance body, and catalogues in the thousands. Practice has outrun documentation: there are opinions about how to write a skill, and very little measurement of what published skills actually contain.

This survey answers descriptive questions that can be answered by inspection alone:

1. What is published, by whom, and how concentrated is it?
2. How closely does published frontmatter follow the specification, and which non-specification fields does it use instead?
3. What does always-loaded skill metadata cost in context, bounded by measurement?
4. What safety-relevant surface ships inside skill directories — code, credentials, permission declarations, tests?
5. Which structural properties distinguish the strongest collections from the weakest?

**Out of scope, deliberately.** Nothing was executed, so this survey makes no claim about whether any skill improves task outcomes. It measures structure, language and packaging — not efficacy. Any statement of the form "skill X works" is outside the evidence.

## 2. Method

### 2.1 Sampling frame

The cohort is **purposive and discretionary**, not random. Inclusion was decided by the author of the survey as follows:

| Criterion                                         | Rule applied at selection                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prominence (a property of the cohort, not a rule) | Chosen from repositories a reader would call prominent — mostly well above 10,000 stars — or from first-party publishers of widely used agent products (Anthropic, Google, Microsoft, NVIDIA, OpenAI, Cloudflare, Hugging Face, Android, MiniMax, Vercel Labs, Composio, VoltAgent) |
| Availability                                      | Public and cloneable without credentials                                                                                                                                                                                                                                            |
| Scope                                             | Agent-tooling collections, **weighted toward** software engineering — not restricted to it                                                                                                                                                                                          |

**How the cohort was assembled.** One person searched GitHub for "skills", read the results, and chose 22 repositories by judgement. There was no query, no programmatic filter, and no saved shortlist. Prominence guided that judgement; no star threshold was applied as a rule.

**What that costs, and what it bought.** No selection-time star count exists, because none was taken — the cohort was never filtered on the metric, so there is nothing to recover. Post-hoc counts now cover **all 22**: fifteen read through the API on 2026-11-26 between 15:59Z and 16:02Z, seven read manually on 2026-11-27 between 08:16Z and 08:34Z as displayed values and transcribed by hand. **Eighteen are above 10,000 stars; four are below** — `NVIDIA/skills` 4.2k, `microsoft/skills` 3.3k, `MengTo/Skills` 8.4k, `cloudflare/skills` 3.5k.

Two things follow, and they matter more than the numbers. First, "mostly above 10,000 stars" is a fair description of the outcome and an unfaithful description of the method — eighteen of 22, with `NVIDIA/skills` at 4.2k and `microsoft/skills` at 3.3k. Second, **volume is not prominence**: the second-largest catalogue (641 skills) and the fifth-largest (215) sit among the four least-starred repositories, while the largest (864) is the most starred at 80.4k. Anyone using stars as a proxy for adoption would have mis-ranked this corpus in both directions. The counts also move — one repository gained 287 stars in the 7.7 hours between two reads — which is why every star figure here is dated.

**On the scope wording.** An earlier internal framing described the survey as software-engineering-only, with design and scientific collections excluded. That exclusion was never applied mechanically, so three collections outside software engineering are in the corpus: a design catalogue (223 skills), a scientific-research catalogue (177 skills), and platform-documentation sets (Android, Cloudflare, MiniMax). They are retained rather than dropped, because dropping them would change every percentage in this report and would remove one of the four collections that §7 treats as strong. The scope above states what was measured instead of a rule that was not followed; §3 gives their share of the corpus so a reader can judge any claim for themselves.

**Consequence for every claim in this report.** Five catalogues hold 81.7% of the 2,654 files, and one holds 32.6%. Percentages describe **this corpus**, not the ecosystem, and not "the community". A statement of the form "most skills do X" is a statement about five vendors' catalogues.

**Consequence for every claim in this report.** Five catalogues hold 81.7% of the 2,654 files, and one holds 32.6%. Percentages describe **this corpus**, not the ecosystem, and not "the community". A statement of the form "most skills do X" is a statement about five vendors' catalogues.

### 2.2 Unit of analysis and extraction

| Item                   | Value                                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                   | One `SKILL.md` file, and one repository, as separate record types in one CSV                                                                                                                                    |
| Clone                  | `git clone --depth 1`, all 22 into a temporary directory outside the repository, one sitting                                                                                                                    |
| Pinned identity        | 12-character commit SHA plus committer date per repository; recorded in every row                                                                                                                               |
| Derived per skill      | path, `name`, description length, `SKILL.md` line count, presence of code within two directory levels, presence of `references/`, name conformance, presence of non-specification fields, `license` declaration |
| Derived per repository | skill count, code and reference counts, over-length count, licence text verbatim, test/eval presence, maintenance date                                                                                          |
| Not derived            | commit counts, contributor counts, open issues (not resolvable from a `--depth 1` clone); per-skill versions (nested YAML not parsed for all files)                                                             |

**Operational definitions.** These decide every percentage in this report, so they are stated rather than assumed:

| Measure                 | Definition used                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "skill"                 | a file named `SKILL.md`, case-insensitive, outside `.git`                                                                                                                                                                                                                                                                                                                      |
| name conformance        | matches `^[a-z0-9]+(-[a-z0-9]+)*$` **and** ≤ 64 characters. Directory-name equality is a **separate** measure (2,512 of 2,654), not part of this one                                                                                                                                                                                                                           |
| non-specification field | any top-level key outside `{name, description, license, allowed-tools, metadata, compatibility}` — the exact set the reference validator accepts                                                                                                                                                                                                                               |
| bundled code            | a `.py .sh .js .mjs .ts .ps1` file within **2** directory levels of the skill directory                                                                                                                                                                                                                                                                                        |
| has references          | a `references/` **or** `reference/` directory beside `SKILL.md`                                                                                                                                                                                                                                                                                                                |
| negative scope          | one of five phrases — `when not to use`, `not for use`, `do not use this skill`, `when to skip`, `do not invoke this` / `do not use this` — searched over prose. A **lower bound**                                                                                                                                                                                             |
| description length      | characters on a **single-line** `description:` scalar. For a folded (`>-`) row the inventory records the **sentinel length** — `>` is 1 character, `>-` is 2 — because that is what the line contains. **610 rows (23.0%) are folded**, and one further file was unparsed by the first pass (§2.7). Folded text is **not** included in any character sum in this report (§5.3) |

**The extraction record.** There was never a saved script: the survey ran as inline shell invocations in one session, each block writing an intermediate file that the next block consumed. [`scripts/skills-survey-extract.sh`](../../scripts/skills-survey-extract.sh:1) is those commands reassembled in execution order. It is a transcript, not a tool — the blocks ran separately and it has not been re-run end-to-end as a single unit.

### 2.3 Evidence grades

Claims carry the grade of their source. **T1** — measured or quoted from a file read in the survey. **T2** — stated in repository documentation; normative, not measured. **T3** — appears only in promotional copy or badges; treated as unverified. **T4** — the author's judgement, and labelled as such wherever it appears.

### 2.4 Measurement limits

| Limit                                                 | Effect                                                                                                                       | Handling                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 25-minute window, single observer                     | Extraction errors are possible and their magnitude is unknown                                                                | SHA pinning, published CSV, invariant audit (§2.6)                                                                                                                                                                                                                                                                                                                                                     |
| 610 folded `description: >-` blocks (23.0%)           | Not measurable by a single-line extractor                                                                                    | Excluded from the distribution over descriptions and **not imputed**; the inventory records the sentinel length instead, and §5.3 parses the blocks for the cost table. Percentages over descriptions state `n = 2,044`. Two further conventions are disclosed in §2.7: quotation marks are counted in the raw scalar, and 125 plain multi-line descriptions are measured on their first physical line |
| Negative-scope detection is a five-phrase text search | Underestimates the true rate                                                                                                 | Reported as a **lower bound** (3.4%), and labelled as such                                                                                                                                                                                                                                                                                                                                             |
| "Has an example heading" is a heading search          | Says nothing about example quality                                                                                           | Used only as a structural signal, never as a quality score                                                                                                                                                                                                                                                                                                                                             |
| Star counts                                           | Measured for **all 22**, after the survey (15 by API on 2026-11-26T15:59–16:02Z, 7 read manually on 2026-11-27T08:16–08:34Z) | None is a selection-time value (§2.1); the manual seven carry a transcription risk that the API fifteen do not, and one read for a sibling repository was discarded before the correct one was taken                                                                                                                                                                                                   |
| No execution of any skill                             | No efficacy claim is possible                                                                                                | Stated in the abstract of every section that touches quality                                                                                                                                                                                                                                                                                                                                           |
| Date-bound                                            | Several repositories were pushed within 72 hours of the survey                                                               | Every count is tied to a SHA; a later reader can re-clone and diverge                                                                                                                                                                                                                                                                                                                                  |
| Shell word-splitting                                  | The census loops use `for f in $(find …)`, which breaks on whitespace in paths                                               | Four independent inventory files (`names`, `lines`, `flags`, `extras`) reconciled at 2,654 keys each, zero unmatched rows, zero empty SHAs — which also shows no path in this corpus contains whitespace. A corpus with spaced paths would fail silently                                                                                                                                               |

### 2.5 Threats to validity

This section states what would make the findings wrong or narrower than they look. It is analysis of the method, not a re-measurement; the second-coder check in §2.6 is the measurement counterpart.

**Construct validity.** "Quality" is operationalised as structure — line counts, presence of references, explicit exclusions, presence of tests. Those are proxies. A skill with 90 lines and an abstention rule may still be useless, and a 900-line manual may be excellent. The survey never measures task success, so no finding here transfers to efficacy.

**Internal validity.** One observer ran one extractor over one sitting. The audit of the delivered CSV already found two classes of error — a row total that counted the header line, and five catalogue sums off by 4–429 characters — both arithmetic, neither affecting a conclusion, and both only visible because the dataset is published. The same class of slip may remain in figures not re-derived.

**External validity.** The cohort is purposive, prominence-weighted, and concentrated: five catalogues are 81.7% of the files, one is 32.6%, and 832 of that one's 864 skills are generated API wrappers rather than authored procedures. Rates therefore describe a vendor-weighted corpus. They should not be read as prevalence in "the ecosystem", and they cannot support a claim about independent authors, who are a minority of the volume but are the entire top of the quality ranking.

**Measurement validity.** Three specific instruments are weak and their weaknesses are known: the description-length extractor (single-line only), the negative-scope search (five phrases, so a lower bound), and the code-presence rule (extensions within two directory levels, which misses compiled or vendored binaries and over-counts a single helper script).

**Sampling reproducibility.** The cohort was chosen by judgement, so no selection-time star count exists to recover — the selection was never filtered on the metric (§2.1). Post-hoc counts now exist for all 22, which says what the cohort looks like today but not how it was chosen. A reader still cannot reconstruct the selection from this report alone: that is a real limit, stated rather than papered over with a threshold that was not applied mechanically.

**Legal caution on licensing.** Licence findings quote in-tree licence text at a pinned commit. They are observations about what a repository says, not legal advice, and they do not establish what any party may redistribute. A frontmatter `license:` field is the republisher's claim, not the author's grant — that distinction is the finding, not an allegation about any named party.

### 2.6 Reproduction status

| Artefact                    | State                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Inventory CSV (2,676 rows)  | Published. Audited 2026-11-26: 22 columns on every row, per-repository totals matching on all 22, columns 14–17 empty by design, no duplicate `(repo, path)`, UTF-8, no BOM, no CRLF. **One row patched 2026-11-27** — `huggingface-datasets`: `name`, `name_conformance` and `description_chars` — so that the figures above recompute from the dataset itself (§2.7)                           |
| Extraction record           | Published as [`scripts/skills-survey-extract.sh`](../../scripts/skills-survey-extract.sh:1) — the executed commands, reassembled in order. A transcript, not a runnable unit; it has not been re-run end-to-end                                                                                                                                                                                  |
| Self-verification performed | Four independent inventory files reconciled at 2,654 keys each with zero unmatched rows and zero empty SHAs. Re-checked 2026-11-26T15:48Z against the clones: `find … -iname SKILL.md                                                                                                                                                                                                            | wc -l`= 2,654; non-specification union = 1,177;`,skill,` rows in the published CSV = 2,654 |
| Independent re-derivation   | **Done** — [`docs/reviews/2026-11-26-skills-second-coder.md`](../reviews/2026-11-26-skills-second-coder.md:1). A second implementation (Python, PyYAML, `os.walk`; no reuse of the original pipeline) agreed on **175 of 176** repository-level count cells and all six global totals, and found one genuine defect, corrected in §2.7. Agreement measures two implementations, not truth (§8.3) |
| Adversarial review          | **Done** — [`docs/reviews/2026-11-26-skills-survey-red-team.md`](../reviews/2026-11-26-skills-survey-red-team.md:1). 28 findings, six blockers, verdict _do not publish yet_; all six repaired and listed in §2.8. The three findings that changed a claim rather than a number are awaiting a re-review of their rewrites                                                                       |

### 2.7 Corrections carried into this report

Corrections are listed rather than absorbed, because a report whose numbers changed silently cannot be checked.

| Was                                                  | Now                                                                                                                                                                             | Cause                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| "2,677 rows"                                         | **2,676** data rows (2,677 lines including the header)                                                                                                                          | The total counted the header and contradicted its own split                                                                           |
| "19 of 22 star counts unavailable: rate limit"       | **All 22 measured**: 15 by API, 7 transcribed manually on 2026-11-27                                                                                                            | The original diagnosis was wrong — a `grep` pattern assumed minified JSON and GitHub served it pretty-printed                         |
| "3 confirmed `fork:false`"                           | **15 confirmed**, 7 unverified                                                                                                                                                  | Same parser bug                                                                                                                       |
| "903 files declare a version"                        | **890** on a full parse; the 903 was _higher_, so the "lower bound" framing was wrong                                                                                           | An indent-sensitive, first-match `grep`                                                                                               |
| Five catalogue sums "differ from the data"           | **Both conventions published**; deltas explained to the character                                                                                                               | The gap is YAML sentinels, not extraction error                                                                                       |
| NVIDIA duplication asserted as inference             | **Measured** by `md5sum` over `SKILL.md`; all 83 groups pair `skills/` with `plugins/`                                                                                          | The pairing had been inferred from tree shape                                                                                         |
| "94 name failures"                                   | **93**: 92 generated wrappers and 1 scanner fixture                                                                                                                             | A single CRLF file was unparsed by the first pass, so it was recorded as having no frontmatter. Found by the second-coder pass (§8.3) |
| "2,511 names match their directory (143 exceptions)" | **2,512** (142 exceptions)                                                                                                                                                      | Same file, same cause                                                                                                                 |
| "611 folded descriptions"                            | **610** folded, plus 1 unparsed file recorded as length 0                                                                                                                       | The earlier total combined folded blocks with the unparsed row                                                                        |
| "line counts run from 7 to 1,037"                    | **6 to 1,313**                                                                                                                                                                  | The first pass took its minimum and maximum from files it had already read closely, not from the full set                             |
| Description lengths counted "single-line scalars"    | **Disclosed deviation**: quotation marks are included for 1,057 quoted scalars (+2 characters each), and 125 plain multi-line scalars are measured on their first physical line | The column measures the raw scalar as written, not the parsed value that the contract's wording implies                               |
| The dataset still carried the CRLF defect            | **One row patched** 2026-11-27: `name`, `name_conformance` and `description_chars` for `huggingface-datasets`                                                                   | §8.2 promises any figure can be re-derived from the CSV; unpatched, it reproduced 94 and 143                                          |
| Catalogue cost ranking (folded text omitted)         | **Reordered** on parsed frontmatter; NVIDIA is the most expensive, not Composio (§5.3)                                                                                          | Neither description convention counted the _body_ of a folded block                                                                   |
| Negative-scope rate stated as one number             | **Three rates with their detectors**: 3 files use an invented machine-readable field, 90 match five phrases, 428 match eleven (§7.2)                                            | The five-phrase search excluded the corpus's dominant "Don't use for" form                                                            |

Fourteen rows, each traceable to an audit of the inventory, a correction commit, the second-coder pass, or one of the two reviews (§2.8). None changes a conclusion. Most change a number; three change a method definition; one is a disclosure rather than a correction — the description column measures something slightly different from what its contract said. The precise split between sources is deliberately not asserted: a decomposition that drifts is how the previous inconsistency happened.

### 2.8 The adversarial review, and its disposition

The report was attacked before publication by a review whose mandate was to break it rather than improve it: 28 findings, verdict **do not publish yet**, six blockers. That review is kept as a standalone document — [`docs/reviews/2026-11-26-skills-survey-red-team.md`](../reviews/2026-11-26-skills-survey-red-team.md:1) — because a report that claims to have been tested should show the test.

| Blocker                                                            | Disposition                                                                                                     |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Stale star counts in §2.4 and §2.5                                 | Corrected; counts now cover all 22 and the volume/prominence distinction is stated                              |
| Stale folded count in the §2.2 definitions table                   | Corrected to 610 plus one unparsed file                                                                         |
| "Zero byte-identical files across repositories" — false; six exist | Universal deleted, six groups named; §6.5's argument rebuilt without it                                         |
| Negative-scope rate measured the wrong thing                       | Reported as three rates with their detectors; the list of illustrations now marks the one no detector can match |
| Catalogue cost omitted 332,904 characters of folded text           | Table rebuilt on parsed frontmatter; the ranking claim inverted and was rewritten                               |
| The CSV was never regenerated                                      | One row patched; the figure family now recomputes from the dataset                                              |

Three findings changed what the report _claims_ rather than what it printed — the duplication universal, the metadata ranking, and the negative-scope rate. The rest sharpened phrases and added denominators. Two of the review's questions remain open and belong in §8: whether a 4-characters-per-token ratio holds for this text, and what a publisher's folded descriptions look like when a client loads them.

---

## 3. The corpus: what is published, and how concentrated

### 3.1 Six objects all called "a skill"

The corpus is not one genre. Six distinct artefacts are published under the same name, and a comparison that does not separate them will compare a procedure to an API wrapper.

| Object                        | What it actually is                                                                                    | Collections                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| A folder with `SKILL.md`      | Prose instructions plus optional scripts, references and assets — the object the specification defines | 17 of 22                             |
| A generated API wrapper       | A page documenting one third-party tool's parameters, declaring a dependency on an external MCP server | One collection: 832 of its 864 files |
| A plugin bundle               | A manifest (`plugin.json`, marketplace file) that _contains_ skills                                    | 9 collections                        |
| A CLI that installs skills    | Distribution infrastructure: 5 skills, 180 code files                                                  | 1                                    |
| A link index                  | Curated links to other people's skills; no `SKILL.md`                                                  | 2                                    |
| A specification and a scanner | Defines, or measures, other people's skills; publishes almost none                                     | 2                                    |

This taxonomy governs every later comparison, because the largest single share of conformance failures in §4 comes from one collection whose "skills" are generated wrappers rather than authored procedures.

### 3.2 Volume, and where it sits

| Repository                         | `SKILL.md` | all files |   size | pinned SHA     | last commit (UTC) |
| ---------------------------------- | ---------: | --------: | -----: | -------------- | ----------------- |
| ComposioHQ/awesome-claude-skills   |    **864** |     1,142 |  17 MB | `be2a406907db` | 2026-07-24        |
| NVIDIA/skills                      |    **641** |     9,433 | 137 MB | `c0a412757e52` | 2026-11-25        |
| google/skills                      |    **226** |     1,636 |  24 MB | `c413c1fdc171` | 2026-11-25        |
| MengTo/Skills                      |    **223** |     1,966 | 308 MB | `a5b1d3d28bd7` | 2026-11-25        |
| microsoft/skills                   |    **215** |     2,770 |  54 MB | `47eb3888eb42` | 2026-11-20        |
| K-Dense-AI/scientific-agent-skills |    **177** |     2,780 | 519 MB | `c21d13b3cc28` | 2026-11-23        |
| openai/skills                      |     **44** |       783 | 7.8 MB | `49f948faa925` | 2026-06-23        |
| android/skills                     |     **42** |       492 | 7.5 MB | `7f7b21730a60` | 2026-11-23        |
| mattpocock/skills                  |     **39** |       189 | 1.8 MB | `6f7f7831a625` | 2026-11-25        |
| NVIDIA/SkillSpector                |     **34** |       609 |  18 MB | `02894ec5b8a0` | 2026-11-25        |
| addyosmani/agent-skills            |     **26** |       279 | 2.8 MB | `e997ac5b9a74` | 2026-11-23        |
| huggingface/skills                 |     **25** |       204 | 3.0 MB | `c158db6f839c` | 2026-11-25        |
| cloudflare/skills                  |     **24** |       258 | 1.8 MB | `ff191de7d903` | 2026-11-24        |
| MiniMax-AI/skills                  |     **23** |       393 |  20 MB | `02853d885acb` | 2026-11-10        |
| anthropics/skills                  |     **20** |       448 |  17 MB | `e4bb5d960d87` | 2026-11-16        |
| obra/superpowers                   |     **15** |       236 | 2.9 MB | `22f0b463e7a5` | 2026-11-03        |
| slavingia/skills                   |     **10** |        13 | 216 KB | `eb9f57fba03d` | 2026-04-13        |
| vercel-labs/skills                 |      **5** |       220 | 3.0 MB | `57217cf86ba3` | 2026-11-17        |
| multica-ai/andrej-karpathy-skills  |      **1** |         9 | 196 KB | `2c606141936f` | 2026-04-20        |
| VoltAgent/awesome-agent-skills     |      **0** |         4 | 452 KB | `20c57162c790` | 2026-11-15        |
| VoltAgent/awesome-openclaw-skills  |      **0** |        35 | 1.5 MB | `2ddb4d0ee520` | 2026-11-18        |
| agentskills/agentskills            |      **0** |       141 | 2.7 MB | `83021e2be457` | 2026-11-04        |
| **Total**                          |  **2,654** |           |        |                |                   |

Three collections publish no `SKILL.md` at all — two indexes and the specification itself. That is the first taxonomic cut, and it means one of 22 "skill repositories" is not a skill repository.

### 3.3 Concentration

Five catalogues hold **2,169 of 2,654 files (81.7%)**. One holds **32.6%** of the entire corpus, and 832 of its 864 skills are generated wrappers around third-party SaaS tools.

That single fact governs how the rest of this report should be read: any statement of the form "most skills do X" is a statement about five vendors' catalogues. Percentages here are properties of a corpus, not prevalence in an ecosystem, and not evidence about independent authors — who are a minority of the volume and a majority of the strongest work in §7.

### 3.4 Naming, and the difference between two rules

| Measure                                                       | Denominator |        Conformant |
| ------------------------------------------------------------- | ----------: | ----------------: |
| Name matches the specification grammar and is ≤ 64 characters |       2,654 | **2,561 (96.5%)** |
| Name equals its parent directory name (a separate rule)       |       2,654 | **2,512 (94.6%)** |

The 93 grammar failures are not spread evenly: 92 are one collection's generated wrappers (`name: SEMrush Automation`) and one is a scanner's test fixture. The 142 directory-name mismatches likewise cluster — 42 in a single catalogue that uses prefixed names (`vss-ask-video`) inside differently named folders.

One caveat found by the second-coder pass: an earlier count of 94 failures included a file the first pass could not parse — the corpus's only CRLF file, whose frontmatter it recorded as absent. The file has a valid `name`. That defect and its two knock-on figures are corrected in §2.7.

Conflating the two rules nearly doubles the apparent failure rate — 3.5% on the grammar alone, 6.4% on the union of both rules. They are reported separately here for that reason.

### 3.5 Size

`SKILL.md` line counts run from **6 to 1,313**. Only **44 of 2,654 files (1.7%)** exceed the specification's 500-line recommendation, but they cluster by publisher: 3 of 23 (13%) in one catalogue, 6 of 42 (14%), 4 of 25 (16%), down to 7 of 641 (1.1%) in the largest. The recommendation is rarely broken, and where it is broken it is a publisher-level habit rather than a scattered error.

An earlier draft of this section gave the range as 7 to 1,037; both ends were wrong, and the second-coder pass found it (§2.7). The minimum is 6 lines, in a template file, and the maximum is 1,313, in one vendor's own meta-skill — which is worth noting, because a file large enough to justify the 500-line rule is also large enough to exceed whatever cut a client applies after compaction (§5.1).

### 3.6 Duplication inside collections

`md5sum` over `SKILL.md` bytes alone — never over skill directories, so bundled assets play no part — finds **83 groups of byte-identical files (166 files)** in the NVIDIA collection. Every group pairs one file under `skills/` with one under `plugins/*/skills/`; none is internal to either tree. Distinct `SKILL.md` content there is therefore **558**, not 641.

This is not a claim that either copy is stale: the bytes are identical at the pinned SHA. The wider census finds **96 duplicate-content groups covering 194 files** — 95 pairs and one group of four. Of those, 83 groups (166 files) are the NVIDIA mirror above, **5 groups (12 files: four pairs plus one group of four)** sit inside one platform catalogue, 1 pair each in two others, and **6 pairs span two repositories**: each a `ComposioHQ/awesome-claude-skills` file **byte-identical to** its `anthropics/skills` counterpart — `brand-guidelines`, `internal-comms`, `template-skill`, `webapp-testing`, `theme-factory`, `canvas-design`.

An earlier draft of this section claimed that no `SKILL.md` file was byte-identical across repositories. That was false at the pinned commits, and it mattered: §6.5 had used the absence of copies as the warrant for its provenance argument. Copying across publishers is visible in a hash listing; what is _not_ visible is a derivative that has been edited, which is the case §6.5 actually discusses.

## 4. Format conformance against the specification

### 4.1 What the specification actually requires

The format has a standards body — a 247-line specification under foundation governance since 2026-11-04, with two lead and five core maintainers from more than one organisation — and a reference validator. The specification permits **six** frontmatter fields: `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`. `name` and `description` are required; `allowed-tools` is marked experimental.

The validator implements exactly that closed set and **fails** a file declaring anything else:

> `Unexpected fields in frontmatter: … Only ['allowed-tools', 'compatibility', 'description', 'license', 'metadata', 'name'] are allowed.`

The validator's own README also disclaims production use, calling itself a demonstration. Both facts matter for what follows: the prohibition is real, and it is enforced by a tool its authors say should not be relied on.

### 4.2 What frontmatter actually contains

Denominator 2,654 `SKILL.md` files. Only fields used by more than 0.3% of files are shown; the long tail is in the inventory.

| Field                      | Files |  Share | In the specification?        |
| -------------------------- | ----: | -----: | ---------------------------- |
| `name`                     | 2,654 | 100.0% | yes (required)               |
| `description`              | 2,654 | 100.0% | yes (required)               |
| `metadata`                 | 1,245 |  46.9% | yes (optional)               |
| `license`                  | 1,082 |  40.8% | yes (optional)               |
| `requires`                 |   832 |  31.3% | **no** — one collection only |
| `compatibility`            |   506 |  19.1% | yes (optional)               |
| `allowed-tools`            |   317 |  11.9% | yes (experimental)           |
| `tags`                     |   171 |   6.4% | **no**                       |
| `version`                  |    83 |   3.1% | **no**                       |
| `when_to_use`              |    38 |   1.4% | **no**                       |
| `permissions`              |    30 |   1.1% | **no**                       |
| `disable-model-invocation` |    28 |   1.1% | **no**                       |
| `triggers`                 |    19 |   0.7% | **no**                       |

The pattern is unambiguous: the two required fields are universal, and the fields used _instead of_ the specification's closed set are the ones that carry machine-readable intent — a dependency (`requires`), an exclusion (`not-for`, 3 files), a permission list, a trigger set. Nobody is inventing decoration; publishers are inventing the fields that make a skill checkable.

### 4.3 Conformance, with denominators

| Measure                               |      Denominator |        Conformant | Note                                                        |
| ------------------------------------- | ---------------: | ----------------: | ----------------------------------------------------------- |
| Name matches the grammar (≤ 64 chars) |            2,654 | **2,561 (96.5%)** | 92 of 93 failures are one collection's wrappers             |
| Name equals its parent directory      |            2,654 | **2,512 (94.6%)** | 42 mismatches in one prefixed-name catalogue                |
| No field outside the closed set       |            2,654 | **1,477 (55.7%)** | **1,177 files (44.3%) declare at least one rejected field** |
| `description` ≤ 1,024 characters      | 2,044 measurable | **2,031 (99.4%)** | 610 folded descriptions are not measurable this way         |
| `SKILL.md` ≤ 500 lines                |            2,654 | **2,610 (98.3%)** | a recommendation, not a rule                                |
| `license` declared in frontmatter     |            2,654 | **1,082 (40.8%)** | §6 shows why the field is not a grant                       |

### 4.4 Versioning happens in three places, one of which the specification defines

Rows **overlap** — a collection can version at more than one level, and NVIDIA appears in three — so they sum to more than 22 and are not a partition.

| Mechanism                                                | Collections using it      | Note                                                                                                         |
| -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Per-skill `metadata.version`                             | 6, covering **890 files** | parsed count; the first pass's `grep` reported 903, which is higher than a full parse                        |
| Top-level `version:` (not in the specification)          | 1, 83 files               | NVIDIA only                                                                                                  |
| Plugin-level `version` in `plugin.json` / `package.json` | 6                         | —                                                                                                            |
| Content digest per skill (sha256 + last commit)          | **1**                     | NVIDIA's `versions.json`                                                                                     |
| No version anywhere                                      | **4 of 19**               | frontmatter, `plugin.json` and `package.json` all checked; the other three collections publish no `SKILL.md` |

Roughly a third of the corpus versions its skills, in three places, two of which the specification does not define. The earlier "903 at minimum" framing asserted the true count could only be higher; a full parse finds **fewer**, so the direction of that error was wrong and is corrected here.

Only one collection answers the question a consumer of a vendored skill actually asks — _what exactly did I install?_ — by pinning a content digest and the source commit per skill. It is also the only mechanism in the corpus that survives a force-push.

### 4.5 What conformance means here

There is a de-facto format with genuine governance, and **naming** conforms to it almost universally. What does not conform is the **extension surface**, and the extensions are the useful part.

So the honest summary is: the format is adopted, the prohibition on extra fields is not, and a project that adopted the reference validator as its authority would reject precisely the fields that make a catalogue auditable — while accepting a tool that its own authors describe as a demonstration. Adopting the format and writing a policy of one's own are separable decisions, and the data says they should be separated.

## 5. Context economics: what metadata costs

A skill has two costs: the instructions, paid when it fires, and the description, paid **always** — every installed skill's `name` and `description` sits in the context window whether or not anything uses it. The second cost is the one nobody budgets.

### 5.1 What published loading models claim

| Source                            | Claim                                                                                                                                                        | Unit                 | Evidence offered                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------- |
| The specification                 | metadata ≈ 100 tokens; body < 5,000 tokens; `SKILL.md` under 500 lines                                                                                       | tokens               | none stated                                                 |
| One vendor's authoring skill      | metadata ≈ **100 words**; "these word counts are approximate and you can feel free to go longer"                                                             | words                | none stated                                                 |
| A second vendor's authoring skill | "the context window is a public good"; challenge whether each paragraph justifies its token cost                                                             | a rule, not a number | none stated                                                 |
| One process collection            | distinguishes a _context pointer_ from _context load_; trades permanent load against discoverability for model-invoked skills                                | qualitative          | describes the mechanism, measures nothing                   |
| One catalogue                     | publishes a generated `index.json` of `{name, description, entrypoint}` per skill                                                                            | structure            | an artefact, not a claim                                    |
| One CI test                       | fails any `SKILL.md` at 20,000 **bytes**, explaining that past that cut "anything past the cut is gone from the agent's context for the rest of the session" | bytes                | cites a runtime issue number; not verifiable from the clone |

Two problems sit in that table. The specification says **tokens**, one vendor says **words**, and the ratio between them is roughly 1.3–2 depending on language — so the two are not the same budget expressed differently. And one text makes the budget advisory ("feel free to go longer") while the other makes it a constraint. Neither measured anything.

Only the last row is empirically grounded: it names a runtime, a failure mode and an issue, and it **enforces** the limit in CI. Everything else, including the specification's 5,000 tokens, is a recommendation with no stated measurement behind it.

### 5.2 Measured description lengths

Two denominators, and both matter. For the **distribution of text length**, 2,044 of 2,654 files are measurable; the 610 folded descriptions are excluded rather than imputed, because their text is not on the `description:` line. For **total metadata cost** (§5.3) nothing is excluded — folded blocks are parsed and counted, which is why that table is substantially larger than this one.

| Measure         | Value                |
| --------------- | -------------------- |
| Mean            | **227 characters**   |
| Median          | **144 characters**   |
| 90th percentile | **≈464 characters**  |
| Maximum         | **1,691 characters** |

_Every token figure in this report is characters ÷ 4. That ratio was **not validated** against a tokenizer for this text, which is unusually identifier-dense — product names, environment variables, URLs — where 3–3.5 characters per token is common. Treat the token column as an order-of-magnitude estimate, not a measurement; §5.4 criticises vendors for exactly this and the criticism applies here too._

At roughly four characters per token, the median skill costs **~36 tokens** of always-loaded metadata and the 90th percentile **~116 tokens**. Against the specification's "~100 tokens", the median is comfortably under and the p90 comfortably over. Thirteen files exceed the specification's 1,024-character limit under the inventory's raw-scalar convention, which counts quotation marks; twelve do once the quotations are stripped — twelve in one design catalogue, one in a vendor catalogue.

### 5.3 The cost that matters is the catalogue

Measured on **parsed frontmatter** — folded blocks joined, quotation marks stripped — so every row counts the text a client would actually receive:

| Catalogue  |    skills | characters in frontmatter |     ≈ tokens | characters a single-line reading would have missed |
| ---------- | --------: | ------------------------: | -----------: | -------------------------------------------------: |
| NVIDIA     |       641 |               **281,616** |  **~70,400** |                                            167,968 |
| google     |       226 |               **126,166** |  **~31,500** |                                            121,931 |
| Composio   |       864 |                    94,430 |      ~23,600 |                                                  0 |
| microsoft  |       215 |                    79,967 |      ~20,000 |                                             30,584 |
| MengTo     |       223 |                   ≥77,573 |      ≥19,400 |                                                  0 |
| K-Dense    |       177 |                    68,779 |      ~17,200 |                                              1,448 |
| **corpus** | **2,654** |              **≥824,868** | **≈206,000** |                                        **332,904** |

Every figure is parsed frontmatter, not a single-line reading. Two floors, both marked: MengTo parses **210 of its 223** blocks — 13 fail on its own YAML — so its row carries `≥` and the corpus total inherits that floor. Three small catalogues not shown: anthropics ~2,400 tokens, obra ~580, slavingia ~490.

An earlier version of this table carried a `measurable / total` column showing 361 of 641 for NVIDIA and 10 of 226 for google. That column described the _retired single-line_ method, so it no longer matched the figures beside it, and one sentence built on it ("a row with 10 of 226 measured is a floor") was therefore false. Removed rather than patched: a coverage column that describes a different measurement than the one printed is worse than no column.

Read the first row against §5.1: **one catalogue's descriptions hold ~281,600 characters of text — on the order of 70,000 tokens — before a single instruction loads.** That is roughly fourteen times the body budget the specification recommends for one skill, spent on metadata for 641 skills.

**The ranking in the previous draft was wrong, and this is the correction that matters most in the report.** Both earlier columns excluded the _body_ of every folded description — 332,904 characters corpus-wide, 167,968 of them in NVIDIA — and the note describing their difference as "exactly the sentinel bytes" was true and beside the point. On parsed text, NVIDIA is ~2.9× more expensive than Composio rather than 10% cheaper. Cost tracks **publisher style**, not inventory size: Composio has the most skills in the corpus and the third-highest metadata cost, because its descriptions are short and single-line while another publisher's are long and folded.

The practical consequence for anyone composing a roster: at the corpus median a 20-skill set costs ~720 tokens of permanent metadata; at the p90, ~2,300. Catalogue size is a context-window decision, and the corpus suggests most publishers never made it — they measured inventory, not cost.

### 5.4 Claims in this area that carry no evidence

| Claim                                                                           | Where it appears             | Evidence offered                                                                 |
| ------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| "agents can keep many skills on hand with only a small context footprint"       | one standards-body README    | none stated                                                                      |
| "Token efficient, deterministic, may be executed without loading into context"  | one vendor's authoring skill | none stated                                                                      |
| "26.1% of skills contain vulnerabilities and 5.2% show likely malicious intent" | a scanner vendor's README    | cites a 31,132-skill "analyzed subset"; **the dataset is not in the repository** |
| "1,497+ skills", "hand-picked, not AI-slop generated"                           | an index repository's README | none; unverifiable by inspection                                                 |

The vulnerability statistic is the most consequential unsourced number in this space. It is plausible, and it is exactly the number a scanning vendor has an incentive to publish. The repository contains the scanner, not the corpus that produced 31,132, so it is quoted here as an argument for scanning rather than as a measurement.

## 6. Safety-relevant surface

A skill is instructions plus, often, code that the agent is invited to run. This section reports what ships, in four parts: executable surface, credential-shaped material, prose that widens authority, and the licence observations that decide whether any of it may be reused.

Every quotation below is data, copied from a pinned commit and not obeyed.

### 6.1 Executable surface

**546 of 2,654 skills (20.6%)** ship code within two directory levels — `.py`, `.sh`, `.js`, `.mjs`, `.ts`, `.ps1`. A wider reading of "within two levels" gives 590; the two definitions differ by 44 files, and 546 is the one used throughout.

_Per-collection cells below come from a triage pass with a looser depth rule. They are indicative of relative code surface, not the rows of the 546 total, and the two readings differ by about 8%._

| Collection            | code files in skills | `eval`/`exec`/`importlib` | subprocess/shell | network | credential references | install commands |
| --------------------- | -------------------: | ------------------------: | ---------------: | ------: | --------------------: | ---------------: |
| NVIDIA                |            **1,125** |                       144 |              263 |     102 |                   117 |               31 |
| K-Dense               |              **536** |                        54 |               21 |      55 |                    37 |               66 |
| MengTo                |                  298 |                        43 |               64 |      51 |                     6 |               31 |
| google                |                  228 |                         6 |               43 |      34 |                    32 |               23 |
| microsoft             |                   90 |                         5 |                2 |       4 |                    15 |               11 |
| openai                |                   61 |                         2 |                9 |       7 |                     5 |                6 |
| Composio              |                   55 |                         0 |                6 |       0 |                     1 |                1 |
| anthropics            |                   50 |                         1 |               10 |       1 |                     3 |                1 |
| huggingface           |                   48 |                         1 |               10 |      19 |                     7 |               12 |
| MiniMax               |                   32 |                         6 |               10 |       6 |                     7 |                9 |
| 9 further collections |            0–13 each |                       0–1 |              0–4 |     0–5 |                   0–4 |              0–1 |

**A caveat that matters more than the table.** Pattern counts are a triage list, not a finding. In the sample read, the 64 files in one collection matching `~/.ssh|~/.aws|/etc/|rm -rf|chmod 777|sudo` were legitimate cluster plumbing: read-only container mounts, an `--ssh_key_path` argument for batch submission, a `sudo chown` inside a container. The finding is the **shape**, not the matches: over a thousand executable files inside one catalogue, most performing privileged operations on GPU hosts, distributed as a single digest-pinned release. Adopting one skill from such a catalogue means reviewing that skill's directory, not the repository.

### 6.2 Credential-shaped material

A pattern scan for vendor key prefixes, cloud access-key shapes, PEM private-key headers and chat-platform tokens returned **no live secret**. Hits fall into three categories: test fixtures in a scanner's own suite (including a redaction test, which is a good sign), documentation placeholders inside code examples, and educational material that describes prompt injection in order to teach detection.

One file is named so that a future auditor can check it rather than trust this paragraph: `anthropics/skills@e4bb5d960d87:skills/claude-api/shared/admin-api.md` contains credential-shaped identifiers in examples. They are placeholders at that commit, and any vendoring process should diff that file.

### 6.3 Prose that widens authority

Three mechanisms appear, in ascending order of concern.

**(a) An instruction to act rather than advise.** `ComposioHQ/awesome-claude-skills@be2a406907db:connect/SKILL.md:8`:

> "Connect Claude to any app. Stop generating text about what you could do - actually do it."

Nothing in the skill bounds _which_ app or _which_ action. It is the skill's marketing proposition and simultaneously an instruction addressed to whatever model loads it.

**(b) Self-service escalation.** `openai/skills@49f948faa925:skills/.system/skill-installer/SKILL.md:34`:

> "All of these scripts use network, so when running in the sandbox, request escalation when running them."

The skill's job is installing other skills, from a curated set **or** "another repo … (including private repos)". It is a clean example of supply-chain risk as architecture rather than malice: an in-context instruction that fetches code from an arbitrary repository, tells the agent to ask for wider permissions, and is itself the channel by which further skills arrive. The file is well written and permissively licensed; the risk is structural.

**(c) Command rewriting for telemetry.** **108 of the 226 skills** in one vendor's catalogue carry an attribution section requiring the agent to prefix commands — `CLOUDSDK_METRICS_REQUEST_ATTRIBUTION="agent-skills/1.0 (skill:spanner-basics)"` in every `gcloud` invocation. Defensible as vendor telemetry, and notable as a class: a skill that mutates the commands it emits is a place where an unreviewed change can redirect telemetry or credentials. An earlier draft said "every skill" in that catalogue; the mechanism covers 48%, not all of it.

On injection specifically, the finding is negative and precise: a phrase scan across all `.md` files found **no live bait in any authored skill body**. The only matches were deliberate fixtures in a scanner's test suite (one uses `evil.example` as the destination), defensive documentation describing the pattern, and sentences that say the opposite ("run the commands yourself; do not tell the user to run them"). The risk in this corpus is legitimately broad authority granted by helpful prose, not a poisoned file.

### 6.4 Test and evaluation practice

**6 of 22 collections (27%)** ship a test, eval or assertion directory. Of the 20 that ship skills, 14 ship none.

| Collection          | What it tests                            | Mechanism                                                                                                              |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| addyosmani          | **trigger precision in both directions** | eval cases with `prompt.md` plus separate `graders/*.md`, including two negative cases where the skill must _not_ fire |
| obra                | structural budgets                       | 20 test directories, including a 20,000-byte size test, layout, shell lint and version bump                            |
| microsoft           | behavioural scenarios                    | a scenario JSON schema, a runner, and an experiment-comparison script                                                  |
| K-Dense             | a security scan of its own skills        | an LLM analyzer with trigger and behaviour passes, cached by content hash                                              |
| NVIDIA/SkillSpector | the scanner itself                       | 329 test files with fixtures for each pattern family                                                                   |
| vercel-labs         | the CLI                                  | 83 test files, including a licence checker                                                                             |

The most transferable idea is the **negative case**: a test that asserts a skill stays silent when it should. Over-firing is the failure mode a roster can least afford, because an over-firing skill consumes context and attention invisibly, and it is the mechanism the corpus tests least.

### 6.5 Licence observations

Most collections carry a permissive licence in-tree — Apache-2.0, MIT, or Apache plus CC-BY-4.0 for content. Three do not, or do so ambiguously, and the pattern matters more than the names:

| Observation                                                                                                       | What the files say at the pinned SHA                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Licence text varies per skill, with no root licence                                                               | One vendor ships 9 distinct per-skill `LICENSE.txt` files, including third-party terms that reserve the right to modify or discontinue a feature at any time                                                                                            |
| A per-skill field with no licence instrument                                                                      | One 10-skill collection declares no `license:` in any file and ships no `LICENSE`                                                                                                                                                                       |
| Four files carrying a proprietary notice, where the original publisher's copies of the same skills are Apache-2.0 | `document-skills/{xlsx,pptx,pdf,docx}` in one collection carry `license: Proprietary` and a `LICENSE.txt` reading `© 2025 Anthropic, PBC. All rights reserved.`; the corresponding `skills/{xlsx,pptx,pdf,docx}` at `anthropics/skills` ship Apache-2.0 |

The last row is the actionable one, and it is a licensing fact rather than an accusation: **a `license:` field in frontmatter is a claim by the republisher, not a grant by the author.**

Evidence, so this is checkable rather than asserted. The four document skills are at `ComposioHQ/awesome-claude-skills@be2a406907db:document-skills/{xlsx,pptx,pdf,docx}/`, each carrying `license: Proprietary` and a `LICENSE.txt` with `© 2025 Anthropic, PBC. All rights reserved.`; the same four skills at `anthropics/skills@e4bb5d960d87:skills/{xlsx,pptx,pdf,docx}/` ship Apache-2.0. The unlicensed catalogue is `slavingia/skills@eb9f57fba03d`; the nine per-skill variants are under `openai/skills@49f948faa925`.

An earlier draft argued that the derivation was invisible because no `SKILL.md` was byte-identical across repositories. That premise was false — six files _are_ byte-identical across two of these repositories (§3.6) — and the argument does not need it. What matters is narrower and more useful: the four licensing files are **edited** derivatives, so they carry no matching hash either way, and a vendoring process that read the hash list would see nothing anomalous while inheriting a notice that forbids redistribution.

That is also why this section is written as observation. These are quotations from licence files at a pinned commit, not legal advice and not an assertion about any party's conduct or intent. A project that intends to redistribute any of this material should read the licence **at the author's repository** and pin the author's commit, which is precisely what a republisher's field cannot tell it.

## 7. Patterns that distinguish strong collections

Six properties separate the artefacts worth reusing from the ones worth reading once. Each is stated with the quotation that carries it, and each is a property of **text**, not of the publisher: the collections at the top of this section are mostly small and individually authored, while several of the largest optimise for volume instead.

### 7.1 A limit with a mechanism behind it

| Evidence                                                                                                                                                       | Source                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| "Keep your main `SKILL.md` under 500 lines. Move detailed reference material to separate files."                                                               | the specification            |
| A CI test fails any `SKILL.md` at 20,000 **bytes**, because past that cut "anything past the cut is gone from the agent's context for the rest of the session" | one process collection       |
| "Challenge each piece of information: 'Does Codex really need this explanation?'"                                                                              | one vendor's authoring skill |
| "For large reference files (>300 lines), include a table of contents"                                                                                          | one vendor's authoring skill |

The weakest artefacts state a **virtue** instead: "comprehensive", "production-grade", "1000+ services". A virtue cannot be checked, and it cannot be violated — which is precisely why it is popular.

### 7.2 Negative scope, inside the trigger

| Evidence                                                                                                                | Source                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| "Don't use for configuring Cloud Monitoring alert policies, modifying IAM policies or VPC Service Controls perimeters…" | one platform catalogue                                                                                                              |
| "Do NOT use for: simple questions, short tasks, one-off commands, linting, or code review."                             | one GPU vendor catalogue                                                                                                            |
| "Skip it when the user asked a trivial how-to or simple lookup… Do this at most once per conversation."                 | one vendor's authoring set — **matches none of the detectors**, and is listed precisely because it shows the limit of phrase search |
| `not-for:` as a YAML field listing the sibling skill to use instead                                                     | one GPU vendor catalogue                                                                                                            |

The rate depends entirely on the detector, so all three are published:

| Detector                                                                                                           |   Files | Share of 2,654 |
| ------------------------------------------------------------------------------------------------------------------ | ------: | -------------: |
| A machine-readable field one publisher invented (`not-for:`) — **not** one of the six the specification permits    |   **3** |           0.1% |
| Five-phrase prose search, as first run                                                                             |  **90** |           3.4% |
| Expanded phrase set — adds `don't use for`, `do not use for`, `not intended for`, `do not trigger`, `out of scope` | **428** |      **16.1%** |

The third figure is still a lower bound — it is a phrase list, not a semantic classifier — and the fourth example above is the proof: a skill that excludes a whole class of request in ordinary prose, matching none of the eleven phrases. The gap between the first row and the others _is_ the finding. The corpus expresses exclusions overwhelmingly in prose, and the one machine-readable slot anyone uses is a field the specification does not define, adopted by three files out of 2,654.

An earlier draft published only the middle row. That was accurate for its detector and misleading as a property of the corpus — and it quoted the sentence above ("Do NOT use for…") as an illustration, which that detector could not match. Over-firing is still the failure mode the corpus is least defended against, and at 16.7% the finding is stronger than the single number suggested, not weaker.

### 7.3 Reference by branch instead of inlining

One collection states the principle: "**one trigger per branch** — synonyms that rename a single branch are one branch written twice." Another demonstrates the structure: one deployment skill plus `references/{aws,gcp,azure}.md`, with the note that the agent "reads only the relevant reference file".

Measured: **1,135 of 2,654 skills (42.8%)** carry a reference directory, and the five largest account for **995 of those (87.7%)** — NVIDIA (395), google (218), K-Dense (176), microsoft (147), MengTo (59). An earlier draft counted a small catalogue's 24 in place of MengTo's 59, which both understated the concentration and made the "five largest" label false.

Reference discipline is concentrated in the collections that have the most content to hide — which is the honest reading of that number, and also its point: a 200-skill catalogue needs references _because_ it is large, not because it is well designed.

### 7.4 A stated failure mode

| Evidence                                                                                                                                             | Source                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| "Creating or reviewing an ethos.md does not authorize application changes… recording such a restriction does not grant permission to make a change." | one GPU vendor catalogue |
| "Shared reference that two user-invoked skills both need can live in neither"                                                                        | one process collection   |
| "The two files must always be generated together: the markdown links into the JSON for per-skill scan dates"                                         | one scientific catalogue |
| "If you skip this step and use outdated patterns, you will produce broken code."                                                                     | one vendor's skill set   |

Naming the failure mode is what turns a preference into a rule the reader can apply without the author present.

### 7.5 A bounded footprint

The strongest single example is a 209-line skill whose description specifies **when** to invoke, **what** to append, **how often** ("at most once per conversation"), and seven explicit reasons to skip. It is a behavioural nudge with a fuse.

The contrast is a skill whose body says "Stop generating text about what you could do - actually do it", with no bound on which app or which action.

The judgement, labelled as such: **a skill becomes a second, unaccountable system prompt exactly when it has no stated invocation bound and no stated output shape.** Every artefact that survived this survey's quality bar states both. That is a testable property, which is why it belongs here rather than in a preference list.

### 7.6 The anti-pattern: a hard-coded taxonomy presented as method

A lead-scoring skill in the largest collection evaluates prospects against fixed axes — industry, company size and location, technology stack, growth stage and funding, pain points — and "ranks companies based on fit score and relevance", with no evidence requirement, no provenance rule and no exclusion clause.

It reads as procedure and is in fact a market taxonomy plus an unvalidated score. This is the most common shape in the business-skills space, and the most consequential: a fixed enumeration that the model is expected to **fill** is indistinguishable, to a reader, from a question the model is expected to **ask**.

### 7.7 What the pattern set implies

Across every functional cluster examined, the best artefact was the **shortest one that stated a boundary**: 71 lines of judgement over 223 design recipes; a 209-line nudge with seven skip conditions over an unbounded "actually do it"; two files on context mechanics over a 485-line authoring meta-skill.

The implication for anyone building a catalogue is uncomfortable: the cheap improvement is **deletion and scoping**, not addition. Most catalogues here would read better with four fifths of their entries removed and their descriptions rewritten to say when _not_ to apply.

## 8. Open questions and how to answer them

Inspection settles structure and language. It cannot settle whether any of this works, and the difference matters because most public claims in this space are efficacy claims. Each question below is paired with the design that would answer it.

|   # | Question                                                     | Why inspection cannot settle it                                                                                                 | What would settle it                                                                                                                                                             |
| --: | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Does a skill improve task outcomes?                          | Nothing was executed; every quality claim in this report is structural                                                          | A/B runs with and without the skill on fixed fixtures, reporting pass^k rather than a single pass                                                                                |
|   2 | Do structured triggers beat prose triggers?                  | No collection publishes a trigger-precision evaluation; prose is the only mechanism the installed base reads                    | The same prompt set run against two variants of one skill — `description` only, then `description` plus `triggers`/`not-for` fields — scoring both **firing** and **non-firing** |
|   3 | What does a roster actually cost in a given runtime?         | The specification says tokens, one vendor says words, neither measured                                                          | Install an N-skill roster in the target client and read the prompt-token count; repeat at N = 5, 20, 100                                                                         |
|   4 | Where is the compaction cut on a given client?               | The 20,000-byte limit is one project's observation about a different runtime, cited from an issue that is not in its repository | Reproduce the truncation in the target client, record the byte offset, publish the fixture                                                                                       |
|   5 | Is the "26.1% of skills vulnerable" figure sound?            | The 31,132-skill dataset is not in the repository that cites it                                                                 | Obtain the dataset, or replicate the scan on a published corpus and compare rates                                                                                                |
|   6 | What is the true negative-scope rate?                        | 3.4% comes from a five-phrase prose search; descriptions are not parsed as data                                                 | Parse `description` as YAML across all files, classify sentences, publish the classifier and the disagreements                                                                   |
|   7 | Do generated API wrappers function at all?                   | They depend on an external MCP server that was never contacted                                                                  | Run one against a disposable account and record what fails                                                                                                                       |
|   8 | How many of these collections have more than one maintainer? | A `--depth 1` clone has one commit; contributors need history                                                                   | `git log` on a full clone, or the contributors endpoint                                                                                                                          |
|   9 | Is an unlicensed collection unlicensed deliberately?         | Intent is not in the tree; there is no `LICENSE` and no `license:` field                                                        | Ask the publisher; absence of a licence is itself the finding, and not a permission                                                                                              |

### 8.1 The two questions this survey was not designed to answer

It is worth being explicit about scope, because both are commonly assumed:

**This is not a prevalence estimate.** Nine questions above are about mechanisms; none is answered by counting files in 22 collections chosen by judgement. A reader who wants "how common is X in the ecosystem" needs a random or enumerated frame, and this cohort cannot supply one — five catalogues are 81.7% of it.

**This is not an efficacy study.** No skill was run. Where this report says an artefact is "strong", it means the artefact states a checkable boundary and ships evidence for its claims — not that it improves an agent's output. Those are different claims, and the second one requires the experiments in rows 1–2.

### 8.2 Reproduction

Three artefacts make the numbers checkable:

- **The inventory** — [`2026-11-25-skills-inventory.csv`](2026-11-25-skills-inventory.csv:1), 2,676 data rows, 22 columns, one row per collection and per `SKILL.md`.
- **The commands** — [`scripts/skills-survey-extract.sh`](../../scripts/skills-survey-extract.sh:1), the executed shell invocations in order. A transcript, not a tool: the blocks ran separately and it has not been re-run end-to-end.
- **The contract** — [`scripts/SKILLS-SURVEY.md`](../../scripts/SKILLS-SURVEY.md:1), the 22-column definitions, the seven invariants a regeneration must assert, and the two conventions for description length.

Everything quoted is pinned to a 12-character commit SHA per collection (§3.2), so any figure here can be re-derived from the files alone — including the ones this report got wrong and corrected in §2.7. That is not a claim about intent: it has been done. An independent implementation re-derived every count from the pinned clones and agreed on 175 of 176 repository-level cells (§8.3), and an adversarial review recomputed the figures and blocked publication on six defects it found (§2.8).

### 8.3 The second-coder pass, and what it changed

A second implementation — Python, PyYAML, `os.walk`, no reuse of the original `awk`/`grep` pipeline — re-derived every count blind, wrote its results to disk before opening any published artefact, and only then compared.

It agreed on **175 of 176** repository-level count cells and on all six global totals, and it found one genuine defect: the corpus's only CRLF file, whose frontmatter the first pass failed to parse. That file had been counted as a name failure, as a zero-length description, and as a directory-name mismatch. It has a valid name. Two comparisons changed in consequence, and one is now a disclosure rather than a correction — the description column counts quotation marks and measures 125 plain multi-line scalars on their first physical line, which is not what its contract's wording said. All of it is in §2.7.

The pass establishes agreement between two implementations, not truth: where both share a definition — `.git` pruning, case-insensitivity, the depth rule, the allowed-key set — agreement is silent about correctness, and a shared error would be invisible. What it does show is that the numbers are reproducible by someone who never saw them, which is the weaker and sufficient claim for a survey of this kind.

Full method, tables, and every disagreement with its classification: [`docs/reviews/2026-11-26-skills-second-coder.md`](../reviews/2026-11-26-skills-second-coder.md:1).

---

## 9. What this survey supports

### 9.1 Five claims the data carries

| Claim                                                         | Evidence                                                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| The format is adopted; the prohibition on extending it is not | 96.5% of names conform to the grammar, **44.3%** of files declare a field the reference validator rejects (§4.3)                         |
| The corpus is concentrated, not communal                      | Five catalogues hold **81.7%** of files; one holds **32.6%**, 832 of them generated wrappers (§3.3)                                      |
| Over-firing is the least-defended failure mode                | **3 files** use a machine-readable field and **428 (16.1%)** state an exclusion in prose; **6 of 22** test behaviour at all (§7.2, §6.4) |
| Metadata cost tracks publisher style, not inventory size      | NVIDIA's 641 skills hold ≈ **70,000 tokens** of description text; Composio's 864 hold ≈ 23,600; the median skill ≈ 36 tokens (§5.3)      |
| Provenance is nearly absent                                   | **1 of 22** pins a content digest per skill; **4 of 19** declare no version anywhere (§4.4)                                              |

Each of these is a property of the 22 collections examined, and each carries its denominator in the section cited.

### 9.2 Three claims it does not carry

**That skills improve agent output.** Nothing was executed. Structural quality — a stated boundary, a reference split, a test — is not efficacy, and the two are routinely conflated in vendor material (§5.4).

**That these rates generalise.** The cohort was chosen by judgement, is 81.7% concentrated in five publishers, and was never filtered by any documented rule. It supports statements about _this corpus_ and about mechanisms visible inside it (§2.1, §8.1).

**That any collection is safe or unsafe as a whole.** The report observes executable surface, credential-shaped strings, permission-widening prose and licence text. Those are inputs to a judgement about a specific skill at a specific commit, not a verdict on a repository.

### 9.3 Eight properties observed in the strongest artefacts

Not a prescription — a list of properties that recur in the artefacts this survey would reuse, each traceable to the section that measured or quoted it:

1. **Pinned identity** — a content digest and source commit per skill, so installed state is answerable (§4.4).
2. **A licence verified at the author's repository** — never the republisher's field (§6.5).
3. **Negative scope as a field**, not only as prose (§7.2).
4. **Ceilings that are enforced** — bytes, lines, description length — rather than recommended (§7.1).
5. **Graders separated from authors**, so no agent judges its own output (§6.4).
6. **Declared permissions and declared side-effects**, with `allowed-tools` treated as documentation rather than a control (§4.2, §6.3).
7. **Reference by branch** — one trigger per branch, detail moved to referenced files (§7.3).
8. **An abstention case per skill** — a test that the skill returns nothing when the evidence is absent (§7.5, §8 row 1).

Any of these can be turned into a testable requirement. That is the difference between this list and a style guide: each item can be checked against a file, and the corpus shows most publishers check none of them.

### 9.4 What would change the picture

Nothing in the eight sections above is settled by more inspection. The picture changes with the experiments in §8 — a negative-trigger evaluation, a roster measured in a real client, a reproduced compaction cut, and an independent extraction pass. Until then this remains what it says it is: a structured description of 2,654 files, with its method, its limits and its corrections in plain view.

---

> **About Roo+.** Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.
