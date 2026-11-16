# Incident rollup — B1 workspace snapshot

A small dependency-free Node.js tool that rolls timestamped incident events up into one bucket per
calendar day: how many events landed on that day, a breakdown by severity, and the days ordered
busiest first. The suite uses `node:test` and `node:fs` only.

Nothing is installed and nothing is downloaded: Node 22 and the files in this directory are enough.

## What is here

| Path                                           | Purpose                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| [`src/events.mjs`](src/events.mjs)             | loads and validates [`data/events.json`](data/events.json)     |
| [`src/dates.mjs`](src/dates.mjs)               | turns an incident timestamp into a day label                   |
| [`src/rollup.mjs`](src/rollup.mjs)             | day buckets, totals, ordering                                  |
| [`test/rollup.test.mjs`](test/rollup.test.mjs) | the suite                                                      |
| [`data/events.json`](data/events.json)         | the fixed fixture: eight events from an on-call export         |
| [`ci/pipeline.yml`](ci/pipeline.yml)           | how CI runs the suite                                          |
| [`ci/last-failure.log`](ci/last-failure.log)   | captured output of the last failing CI run                     |
| [`history.bundle`](history.bundle)             | the project history, restorable with `./run.sh --init-history` |

## The observation

`./run.sh` fails. `./run.sh --local` passes. Same commit, same data file, same assertions, no edits
in between. The captured output of a real failing run is in [`ci/last-failure.log`](ci/last-failure.log).

## Reproduce each side

| Command            | Environment                                                                           | Expected result                        |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------- |
| `./run.sh`         | the CI environment pinned by [`ci/pipeline.yml`](ci/pipeline.yml)                     | non-zero exit, four of five tests fail |
| `./run.sh --local` | a developer machine in the São Paulo office (the office zone is pinned by the script) | zero exit, five of five tests pass     |

Both commands can be run from this directory or from any other directory, and they keep working after
the directory has been copied elsewhere. `run.sh` is POSIX `sh`.

`./run.sh --init-history` restores the commit history into `.git` (see below). Running it twice is
harmless. The default `./run.sh` does **not** touch history; it only reads the working tree.

## What "fixed" means

`./run.sh` exits 0 **and** `./run.sh --local` still exits 0, with the fixture data, the module
behaviour and the existing assertions unchanged. Deleting, weakening or environment-gating an
assertion is not a fix. Both environments must agree on which day each event belongs to and on the
order of the days.

## Git history

`history.bundle` is a real `git bundle` of the project's five commits, and the last of those commits
adds the bundle itself. After `./run.sh --init-history` the usual tools work: `git log`, `git blame`,
`git bisect`, `git fsck`. A bundle cannot carry the bytes of the commit that adds it, so
`git status --porcelain` names `history.bundle` as modified and nothing else.

## Determinism

The input is a fixed, hand-written export and the assertions are literal, so consecutive runs print
identical results apart from the `duration_ms` fields that Node's test runner reports for each test
and for the run as a whole. Those durations are not part of any assertion.
