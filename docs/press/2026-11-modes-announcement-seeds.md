# Press seeds — modes catalogue and modes architecture (2026-11)

| Field                       | Value                                                                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this file is**       | **Seed material, not a press release.** Two briefers: one for the catalogue work, one for the architecture work. An agent (or a writer) turns a seed into prose.                                      |
| **Audience for the output** | Existing Roo+ users and evaluators, via Github "Discussions" / changelog / Open VSX listing notes / social. Not a technical deep-dive — that comes after the work lands.                              |
| **Hard rule**               | Everything an agent writes from this file must trace to a **fact row** in §0. If it is not in §0, it is not publishable.                                                                              |
| **Status**                  | Draft seeds, 2026-11-10. They will go in the "Announcements" section of the repo, so users can get familiar with what we are working on before it is finished. The work they describe is in progress. |

---

## 0. Fact table — the only claims an agent may use

Status vocabulary: **SHIPPED** (a user can use it today), **IN PROGRESS** (being built now, could still
change), **PLANNED** (decided direction, not started). Never write an IN PROGRESS or PLANNED item as if it
shipped.

| #   | Fact                                                                                                                                                                                             | Status               | Safe phrasing                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------- |
| F1  | Roo+ ships a modes catalogue of **300+ installable modes**, with a curated set pre-installed. **Valid only until the catalogue migration ships; after that this row is retracted, not reworded** | SHIPPED (time-bound) | "300+ modes you can install today"                                                    |
| F2  | The **catalogue as a whole** is being restructured around jobs, not mode count; the pre-installed set changes first                                                                              | IN PROGRESS          | "we are restructuring the catalogue around jobs, starting with what ships by default" |
| F3  | There is **no per-mode usage telemetry** and none is being added                                                                                                                                 | SHIPPED              | "we do not track which modes you use"                                                 |
| F4  | Retired modes will get **aliases** so saved selections keep working                                                                                                                              | PLANNED              | "nothing you rely on will just disappear"                                             |
| F5  | Mode instructions get **explicit budgets** (shorter contracts, procedures moved out of the prompt)                                                                                               | IN PROGRESS          | "shorter, sharper mode instructions"                                                  |
| F6  | Modes will **declare what they may touch** (paths, commands, MCP servers) more precisely                                                                                                         | IN PROGRESS          | "each mode tells you what it can and cannot touch"                                    |
| F7  | Behaviour will be **measured** (routing and task evals), not just described                                                                                                                      | IN PROGRESS          | "we are building the tests that prove a mode does its job"                            |
| F8  | Roo+ remains **local-first, bring-your-own-model, no mandatory cloud**                                                                                                                           | SHIPPED              | "no cloud, no lock-in"                                                                |
| F9  | The **frame structure of the catalogue is not yet decided**                                                                                                                                      | PENDING              | _do not claim a new structure exists_                                                 |
| F10 | **Help choosing a mode** — a way to ask the catalogue which mode fits a job — is being designed; the mechanism is not chosen                                                                     | PLANNED              | "we are working out how to help you choose"                                           |
| F11 | A **public view of catalogue coverage** (counts and categories, never usage) will be published                                                                                                   | PLANNED              | "we will publish what the catalogue covers"                                           |
| F12 | **Efficiency** — token, context and turn cost — is an explicit design constraint on contracts and routing                                                                                        | IN PROGRESS          | "we treat token and context cost as a design constraint"                              |

**Banned claims** (any of these makes the draft unpublishable):

- Any number we have not measured in public (e.g. "40% fewer tokens", "3× better results").
- "Every mode is tested" / "all modes are verified" — the coverage is being built, not complete.
- A count for the future catalogue ("it will have ~40 modes") — the number is an output, not a decision yet.
- Superlatives about quality: "SOTA", "elite", "best-in-class", "world-class".
- Any comparison that disparages another extension by name.
- Timelines or release dates.
- Any implication that usage data is collected.
- Any claim that the number of available modes stays the same or grows — the migration reduces the catalogue
  itself, not only the default set.

---

## Seed A — the modes catalogue

### Working title

> **A shorter list, a sharper catalogue: what is changing about modes in Roo+**

### Suggested hook (one sentence)

Three hundred modes is a search problem, not an advantage — so we are curating the catalogue with a focus on functionality, and making sure nothing you rely on disappears.

### Who this is for

People who installed Roo+, opened the mode picker, and closed it again because 300 entries told them
nothing about which one to pick.

### What is coming (user-facing, no internals)

- **A smaller, curated catalogue.** Fewer modes ship at all, and the ones that stay are chosen on one rule:
  one good mode per job rather than several near-duplicates. A smaller default set is the first visible step,
  not the whole change.
- **Modes organised by what you are doing.** Expect a catalogue you can navigate without a manual, and expect
  progress on the harder half: helping you choose. Additional help will be available by starting with the planning mode, which works out the steps and points you at the right specialist. The mechanism for "which mode should I use?" is
  not settled yet.
- **Nothing silently disappears.** Every mode we retire will keep working through an alias, so your saved
  selections and habits are not broken.
- **A public view of what we ship.** We will publish what the catalogue covers and what it does not — as
  counts and categories, never as usage data (because we collect none).

_Fact coverage (for the writer, not for the prose):_ bullet 1 → F1, F2; bullet 2 → F2, F10; bullet 3 → F4;
bullet 4 → F11. A bullet with no row here must be cut.

### The proof point we can honestly make

> We are reducing both the _default_ set and the whole _available_ set. We are not losing functionality or
> expertise; we are aiming for stronger capabilities per mode.

### What NOT to say

- Do not claim a target number of modes. The structure is still being decided (F9).
- Do not claim modes are being "replaced by" or "merged into" anything specific yet.
- Do not promise a date for the curated set.

### Suggested shape

150–250 words. Hook → the problem (too many, too similar) → three things changing → reassurance (aliases) → one line on transparency → call to action ("tell us which mode you actually use" — but note
we cannot see it ourselves, F3).

---

## Seed B — the modes architecture

### Working title

> **Modes that behave: measurement, budgets, and boundaries**

### The hook (one sentence)

A mode is not a personality — it is a contract with a job, a budget, and a boundary, and we are rebuilding
ours around those three things.

### Who this is for

Anyone who has watched an assistant drift off the task, ignore what its mode told it to do, or spend a
context window on prose that was meant to help — and quietly stopped trusting the picker afterwards.

### What is coming (user-facing, no internals)

- **Shorter instructions that hold.** Mode guidance is being cut to what changes behaviour, removing what research says hinders performance, with the rest moved to material that loads only when it is needed. Long is not thorough; long is unread.
- **Explicit boundaries.** A mode will say what it may read, change, run, and call.
- **Behaviour we can point at.** We are building tests that ask a simple question about every mode: given a
  realistic task, does it do the job? A mode that cannot answer that question is a candidate for merging or
  retirement.
- **Nothing about your work leaves your machine.** These measurements run locally, on demand. No telemetry
  is being added (F3, F8).
- **Efficiency.** Token, context and turn cost are treated as a design constraint, not an afterthought.

_Fact coverage (for the writer, not for the prose):_ bullet 1 → F5; bullet 2 → F6; bullet 3 → F7;
bullet 4 → F3, F8; bullet 5 → F12. A bullet with no row here must be cut.

### The proof point we can honestly make

> Better modes, not better documentation about modes: sharper instructions, boundaries you can see, and less
> of your context spent getting there. The checks exist to keep us honest — the improvement is what you use.

### What NOT to say

- Do not claim a percentage improvement. None is measured yet (F7 is in progress).
- Do not claim every mode is tested.
- Do not describe internal structures (stances, axes, frames, gates) — users do not need the vocabulary, and
  it may still change.
- Do not promise cross-tool portability of permission rules; that is not settled.

### Suggested shape

150–250 words. Hook → the failure people recognise → changes → the local-only reassurance.

---

## Shared boilerplate (both announcements)

> **About Roo+.** Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring
> the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files
> and your conversations stay yours.

**Voice rules for whoever writes the prose:**

1. Concrete over clever. Name the thing the reader will notice.
2. No exclamation marks, no "excited to announce", no "revolutionary".
3. Every sentence that contains a number must be traceable to §0.
4. If a fact is IN PROGRESS, write "we are" — never "we have".
5. Short sentences. The reader is a developer skimming a changelog.

---

## Hand-off note for the drafting agent

1. Read §0 first; treat it as the only source of claims. Each seed carries a **fact-coverage** line naming the
   row behind every bullet — if you add a bullet, add its row or delete the bullet.
2. Pick one seed. Do not merge A and B — they answer different questions ("which modes?" vs "how do modes
   behave?").
3. Draft to the suggested shape; keep the working title or improve it.
4. Run the banned-claims list over your draft **before** returning it, and list any sentence you removed and
   why.
5. Flag anything in the draft that will need updating once the catalogue structure is decided (F9).
