# Submission pack — _AI and Applications_

Everything needed to submit one Research Article, the compliance evidence, and the short list of what is still open.

## 0. Pending before submission

> **The venue is undecided.** _AI and Applications_ charges $2,000 / €1,900 for a Research Article (Type A), which is out of scope. The zero-fee alternatives and their reformatting costs are in [`../venues-2026-11-24.md`](../venues-2026-11-24.md). **Do not do further venue-specific formatting until a venue is chosen.** The manuscript remains a correct, complete draft in the Academia.edu form, and every shortlisted venue accepts its structure, tables, figures and statements with hours of adaptation, not days.

Two placeholders remain in the manuscript, and the eight items below follow.

| #   | Item                                                   | Placeholder | Where                             | Status                                             |
| --- | ------------------------------------------------------ | ----------- | --------------------------------- | -------------------------------------------------- |
| 1   | Archived release DOI for the data                      | `[[DOI]]`   | Data availability statement       | Open — mint on Zenodo or OSF from a frozen release |
| 2   | DOI for the supplementary materials                    | `[[DOI]]`   | Supplementary materials statement | Open — may be the same DOI as item 1               |
| 3   | APC payment and waiver decision                        | —           | Pre-submission checklist          | Open — see §9                                      |
| 4   | Figures 1–3 as image files                             | —           | `figures/`                        | Open — 600 dpi, RGB, no colour, no border          |
| 5   | Reference metadata verification                        | —           | References                        | Open — check 11, 12, 13, 19, 28, 29, 33 first      |
| 6   | Retrospective timestamped deposit of the registrations | —           | Cover letter                      | Recommended — see §3                               |
| 7   | One sentence on the correspondence address             | —           | Cover letter                      | Recommended — see §2                               |
| 8   | `.docx` conversion and table styling                   | —           | Output                            | Open — see §6                                      |

Resolved in this revision: author name, affiliation, corresponding email, ORCID, funding statement, repository URL, reference 1 (corporate author plus commit), reference 6 (authors supplied), and the AI disclosure (client, version and model).

## 1. What is in this folder

| Path                                     | What it is                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`manuscript.md`](manuscript.md:1)       | The submission-formatted manuscript: title, structured abstract, numbered sections, 8 tables, 3 figure captions, statements, 33 references. ~5,850 words of main text, ~7,900 including abstract, statements, references and captions.                                                                                      |
| [`supplementary.md`](supplementary.md:1) | Supplementary materials S1–S12: reporting checklist, cost and deviations, gate tables, complete outcome counts, registered readings, stationarity and dispersion, runs tests, cross-dispatch concordance, adjudication protocol and defects, the slot-occupant experiment in full, the second-model pilot, data dictionary. |
| `guides/`                                | The three documents supplied, renamed: [`author-guidelines.docx`](guides/author-guidelines.docx), [`style-guide.docx`](guides/style-guide.docx), [`academia-word-submission-template.docx`](guides/academia-word-submission-template.docx).                                                                                 |
| `figures/`                               | Empty, holding a `.gitkeep`. Figures are specified by caption, not drawn.                                                                                                                                                                                                                                                   |
| `archive/manuscript-v1-2026-11-19.md`    | The earlier draft, kept because the guidelines state that the journal may request timestamped records of earlier drafts. Not for submission: it predates the R0 round and asserts the position effect as a product finding.                                                                                                 |

## 2. The two judgement calls, now answered

**The AI disclosure names three different things, and none of them may be swapped for another.** The statement reads: Roo+ version 3.89.3, running in VSCodium, with deepseek-v4-flash as the underlying model. The distinctions that matter:

| Thing                 | What it is                                                                                                   | Why it is named, or not                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.89.3**            | The extension version in use throughout the research; 3.89.5 was installed only after the experiments closed | The disclosure must describe what did the work, not what is installed today                                                                                                                                                      |
| **VSCodium**          | The editor hosting the extension                                                                             | Included so the tool chain is unambiguous; an editor is not an AI tool and carries no disclosure obligation                                                                                                                      |
| **deepseek-v4-flash** | The assistant that edited prose and drafted analysis scripts                                                 | This is _the_ AI tool for disclosure purposes                                                                                                                                                                                    |
| **gemini-3.5-flash**  | The model tested in the experiments                                                                          | **Not** an AI tool used to produce the manuscript, and must not appear in the disclosure. Naming it would imply the tested model edited the paper, which would compromise both the disclosure and the study's independence claim |

That last row is the one worth remembering if the statement is ever revised: a paper about a model's behaviour, edited by that model, would need a different disclosure — and would raise a question about the results that no disclosure fixes.

**The affiliation stands as written, and the email needs one sentence.** "Audare est Facere" is the registered legal name at the Dutch chamber of commerce, so the style guide's translation rule does not apply to it: it is a proper noun, and the guide's affiliation format (institute, city, country) is satisfied. Keep the registration spelling exactly, because the article processing charge will be invoiced to that entity and the byline should match the entity that pays.

The correspondence address is an institutional address at a university where the author took a degree but holds no appointment, while the affiliation is a registered company in another country. Nothing in the guidelines forbids this — they require an institutional rather than personal or commercial address, and `espol.edu.ec` is institutional — but an editor who notices will ask, and the question is easier to answer before it is asked. One sentence in the cover letter does it: _"The corresponding address is the author's long-standing research correspondence address; the author is a graduate of that university and holds no appointment there, and the research was conducted and funded through the affiliation listed in the byline."_ If that sentence feels uncomfortable, use an address on the entity's own domain instead; the guide allows a commercial address "in special circumstances", and being the entity's principal is one.

## 3. Fixes before submission, in order

**Initials for reference 5.** "Li, Qiao, Gao" is three surnames and no initials; the journal's style requires Surname Initial for every author, and an editor will return the submission rather than guess. Take them from the arXiv record.

**Verify every reference against its DOI.** The metadata was written from the literature, not from a citation manager. Check 11, 12, 13, 19, 28, 29 and 33 first; the remainder are cited by arXiv identifier or URL and are self-verifying.

**Deposit the registrations for an independent timestamp.** Section 2.6 already discloses that the registration was first committed after the runs, and the guidelines state that the journal may request timestamped records of research protocols. A retrospective OSF or Zenodo deposit converts a confessed weakness into a documented one.

**Two references are now complete and worth knowing how.** Reference 1 cites the project as a corporate author with the commit that last changed the file (1b55142e05), not the branch, because a moving `master` link would be unverifiable within weeks. Reference 6 now carries Liu Y and Han Z. If the mode-list file changes before submission, update the commit hash in reference 1; the rendering itself is stable, the pointer must be.

## 4. Compliance with the three guides

| Requirement                                                                                          | Status                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Article type: Research Article                                                                       | Met. ~5,850 words of main text (recommended 4,000–8,000); 33 references (recommended 30–100)                                                                                             |
| Sections: structured abstract, Introduction, Materials and methods, Results, Discussion, Conclusions | Met                                                                                                                                                                                      |
| Structured abstract, bold headings on separate lines, no citations, no figure or table references    | Met, 347 words                                                                                                                                                                           |
| Keywords: 3–10, semicolons, no trailing period                                                       | Met, 6                                                                                                                                                                                   |
| Title under 100 characters, no trailing punctuation, keywords present                                | Met, 75 characters                                                                                                                                                                       |
| Running title                                                                                        | 55 characters; trim to 50 if the venue enforces it                                                                                                                                       |
| Headings bold, sentence case, numbered, maximum four levels                                          | Met                                                                                                                                                                                      |
| Tables in text below first citation, cited in order, no empty cells, no background colour            | Met for content; table _styling_ (10 pt, 0.5 pt rules) must be applied in Word after conversion                                                                                          |
| Figures: 600 dpi, RGB, non-editable, centred, no border                                              | Outstanding — captions only                                                                                                                                                              |
| References: modified Vancouver, numbered in citation order, full author list, DOI or URL             | Structure met; reference 5 lacks initials; metadata verification outstanding                                                                                                             |
| Self-citations ≤ 20%                                                                                 | Met, 1 of 33 (3%) — reference 1 cites the authors' own software, which is legitimate and now visible rather than anonymised                                                              |
| Works older than five years < 50%                                                                    | Met, roughly 36%                                                                                                                                                                         |
| No unpublished data, no personal communications, no retracted articles                               | Met                                                                                                                                                                                      |
| Mandatory statements                                                                                 | Met: Funding, Author contributions, Conflict of interest, Data availability, Acknowledgements                                                                                            |
| Institutional review board statement, with justification                                             | Met, using the "approval not sought" form                                                                                                                                                |
| Informed consent                                                                                     | Declared not applicable                                                                                                                                                                  |
| AI disclosure in the statements **and** in Materials and methods                                     | Met. Section 2.7 now declares AI-assisted drafting of the analysis scripts, which is required because a model wrote that code and "beyond language polishing" must appear in the methods |
| Single author                                                                                        | Author contributions written for one author; the guide requires it only for multi-author papers, so it may be dropped, but declaring sole authorship is never wrong                      |
| Document format: .docx or .tex, A4, 10 pt DM Sans, single-spaced                                     | Outstanding — see §6                                                                                                                                                                     |

## 5. What the revisions changed in the argument

| Was                                                        | Now                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Described the shipping template as what the model receives | Sections 2.2 and 4.3 treat layout as a factor and report both renderings                                                        |
| Reported a 30-point position effect as a finding           | Section 3.5 reports it in the experimental layout and shows it absent in the shipping layout                                    |
| Fisher intervals as the primary statistic                  | Section 2.7 makes the paired sign test primary and calls the exact intervals optimistic                                         |
| No product-rendering evidence                              | Sections 3.3, 3.5 and 3.6 carry it, including the 84-of-84 result and the 65-point token effect                                 |
| 11 references, APA author-date                             | 33 references, modified Vancouver, numbered in citation order                                                                   |
| No stability bound                                         | Section 3.7, measured, with its consequences                                                                                    |
| Unstructured declarations                                  | Journal templates for every mandatory statement                                                                                 |
| Analysis-code provenance unstated                          | Section 2.7 declares AI-assisted drafting, line-by-line review, execution against stored records and second-route re-derivation |

## 6. Producing the two submit-ready files

The Markdown master is the version-controlled source; the journal needs `.docx` or `.tex`. From this directory:

```bash
pandoc manuscript.md \
  --reference-doc=guides/academia-word-submission-template.docx \
  -o manuscript.docx

pandoc supplementary.md -o supplementary.docx
```

Then, in Word, before upload:

- Body text 10 pt DM Sans, single-spaced, no first-line indent, A4.
- Every table restyled to 10 pt, text left, cells middle-aligned, spacing 1 pt before and after, 0.5 pt rules, no shading.
- Figures inserted below their first citation, centred, no border, 600 dpi or better, RGB.
- Heading numbering checked: Pandoc does not number headings, so the numbers in the heading text are what will survive.

## 7. Cover letter — what each paragraph must do

Paste-ready text is in §10; this section explains why the paragraphs are in that order.

1. **What the paper is.** A pre-registered benchmark of how mode-list wording and layout change an autonomous coding agent's choice: one confirmatory result, one null, and a measured instrument-stability bound.
2. **Why it belongs here.** An empirical study of an interactive AI system's behaviour under a design change, with the measurement apparatus reported as part of the result. Section 3.7 is, to our knowledge, the first published bound on within-session drift for a commercial endpoint at this outcome granularity.
3. **Prior disclosure, stated plainly.** Two non-peer-reviewed project posts summarise the same experiments. This manuscript adds the second round of 1,588 calls in the shipping layout, the time-aware statistics, the corrected position result and the construct-sensitivity analysis, and it withdraws five earlier claims. Offer the URLs.
4. **Correspondence address**, in the one sentence given in §2.
5. **Conflict of interest, before the reviewer finds it.** The author maintains the software whose catalogue is evaluated, and the paper's central recommendation contradicts advice the same programme published five days earlier. That reversal is the clearest evidence of independence available and should be pointed at rather than hidden. The declarations now say so.

## 8. Two smaller notes

If the abstract limit is 300 words rather than 350, cut the second sentence of **Materials and methods** in the abstract: the counts are repeated in Results and the design is described in section 2.1. Do not cut the sentence about the shipping layout; it is the part a reader cannot get from the title.

Table 1 includes the E13-R batch, which contributes only the unambiguous-brief rate of 598 of 600 and no contrast in this paper. It is retained because a reader checking the basis of the "clarity decides the outcome" claim will look for it; the table note says so.

## 9. The article processing charge

**Yes, there is one, and it gates submission.** The submission checklist requires the author to "confirm that you have the means to pay an Article Processing Charge (APC), either directly or indirectly, or are eligible for a waiver". This is a checkbox at submission, not a surprise at acceptance.

**What it plausibly costs.** Every journal in this family publishes its own APC-and-waiver page under "About the journal". The page for a sibling journal lists a banded schedule whose top tier reads **$2,000 / €1,900**, with lower tiers at $900/€850 and $400/€375 and a full-waiver band; a separate published account of the same publisher also reports $2,000. I could not load the page for _AI and Applications_ itself, so treat **approximately US$2,000 or €1,900 for a Research Article** as the planning figure and confirm it on the journal's own page before submitting.

**Four terms that matter more than the headline number.**

1. **The price is fixed by the date of original submission**, not by the date of acceptance. A revision that stretches over months does not re-price.
2. **The invoice arrives after acceptance and is due within 30 days.** There is no refund after acceptance, including on retraction, and no refund on withdrawal once accepted.
3. **Taxes are the payer's responsibility**, explicitly and on top of the fee. An EU-based entity should expect VAT to be added unless a valid reverse-charge arrangement applies, so budget above the headline figure rather than at it.
4. **Waivers are discretionary**, and the publisher reserves the right to decline without giving a reason. The sibling journal's page says applicants "should" apply **before submission**, so a request made after acceptance is a weaker position.

**Two decisions, in this order.** First, open the _AI and Applications_ APC page and write down the Research Article figure and whether VAT applies to a Dutch entity. Second, decide whether to request a waiver before submitting: the affiliation is a small private entity, which is the kind of case a discretionary waiver exists for, but asking costs an email and a few days and must not delay the submission if the answer is no.

## 10. Cover letter — draft text

Ready to paste, with three bracketed fields.

> Dear Editors,
>
> Please consider the enclosed manuscript, **"Wording and layout of a mode list steer an autonomous coding agent's choice"**, for publication in _AI and Applications_ as a Research Article.
>
> **What the paper reports.** We tested whether the wording and the layout of a mode list change what an autonomous coding agent selects, on requests whose mode ownership is ambiguous. Across 4,179 output-producing calls in a pre-registered, interleaved design, we report one confirmatory result and one null. A descriptive line stating what an answer must **not** be produced commitment in 89.0% of replies against 61.5% for a length-matched line stating an evidence requirement — 27.5 percentage points, in the direction opposite to our registered prediction, and larger still in the layout the shipping product emits. Entry position produced a 30-point difference in the experimental layout and **no** difference in the shipping layout, so we report it as layout-specific rather than as a general finding. A further 100 calls with nothing varied established that identical requests move by 24 points within a single run, which bounds what any single-run percentage from this class of endpoint can mean.
>
> **Why it suits this journal.** The paper is an empirical study of an interactive AI system's behaviour under a design change, and it reports the measurement apparatus as part of the result: the scoring construct, the instrument's stability, the extractor's error rate and the five claims we withdrew. We believe the stability bound is the first published measurement of its kind for a commercial endpoint at this outcome granularity, and it is directly usable by other groups evaluating prompt or interface changes.
>
> **Prior disclosure.** Two non-peer-reviewed posts on the project's public discussion forum summarise the same experiments: [URL 1] and [URL 2]. Neither is a journal article or a preprint. This manuscript adds the second round of 1,588 calls in the shipping layout, the time-aware statistics, the corrected position result and the construct-sensitivity analysis, and it withdraws five claims from the earlier material. We disclose this so that the editorial decision is made with the full publication history in view.
>
> **Correspondence address.** The corresponding address is the author's long-standing research correspondence address; the author is a graduate of that university and holds no appointment there, and the research was conducted and funded through the affiliation listed in the byline.
>
> **Competing interests.** The author maintains the software whose mode catalogue is evaluated, and the paper's central recommendation contradicts advice the same programme published five days before this submission. We draw attention to that reversal rather than leaving it to be discovered, because it is the clearest evidence available of the independence of the analysis from the product's interests.
>
> The manuscript is original, is not under consideration elsewhere, and has not been published in any journal. All data, code and adjudication records are publicly available, and an archived release with a DOI will be deposited before publication.
>
> Yours sincerely,
> Xavier Arosemena
> Audare est Facere, Barendrecht, The Netherlands
> xaroseme@espol.edu.ec
