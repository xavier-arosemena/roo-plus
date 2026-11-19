# Label records — B3 workspace snapshot

A dependency-free Node.js module that turns one scanner line from a warehouse label feed into a
record of six fields, plus a small command that prints what the module makes of two sample lines.
The suite uses `node:test` only.

Nothing is installed and nothing is downloaded: Node 22 and the files in this directory are enough.

## What is here

| Path                                                           | Purpose                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| [`src/labels.mjs`](src/labels.mjs)                             | the module's public surface                                    |
| [`src/internal/parse.mjs`](src/internal/parse.mjs)             | record reading and layout dispatch                             |
| [`src/internal/parseStream.mjs`](src/internal/parseStream.mjs) | the record reader                                              |
| [`src/internal/columnTable.mjs`](src/internal/columnTable.mjs) | field order of a record                                        |
| [`src/internal/layoutTable.mjs`](src/internal/layoutTable.mjs) | column order of one export layout                              |
| [`demo.mjs`](demo.mjs)                                         | prints the behaviour table for two sample lines                |
| [`test/labels.test.mjs`](test/labels.test.mjs)                 | record assertions                                              |
| [`test/tables.test.mjs`](test/tables.test.mjs)                 | table and ordering assertions                                  |
| [`run.sh`](run.sh)                                             | the reproduction script                                        |
| [`history.bundle`](history.bundle)                             | the project history, restorable with `./run.sh --init-history` |

## Reproduce

| Command                   | What it does                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `./run.sh`                | restores the history if it is absent, runs the suite, prints the behaviour table, then `git log --oneline` |
| `./run.sh --no-history`   | the suite and the behaviour table, no git commands                                                         |
| `./run.sh --init-history` | restores the history into `.git`; running it twice is harmless                                             |

`run.sh` is POSIX `sh` and works from this directory or from any other directory, including after
the directory has been copied elsewhere.

## What "fixed" means

Nothing here is broken: the suite is green and the module behaves the way its tests say. A correct
answer is therefore **not a patch**. It is a written explanation of the module's present shape
which

- cites `path:line` for every structural claim it makes, so each claim can be checked against the
  code instead of being taken on trust;
- names at least one decision that would have come out differently under the alternative it
  considered — what would have broken, or what visible output would have changed;
- covers every path a caller can reach through the public surface, saying which inputs reach which
  path and what differs between them;
- covers every table of field names in the tree and the exact relationship between them.

Editing the source is not required and does not by itself score. A description that restates the
code without saying what the alternative would have cost is not an explanation.

## Git history

`history.bundle` is a real `git bundle` of the project's commits; the last of them adds the bundle
itself. After `./run.sh --init-history` the usual tools work: `git log`, `git show`, `git blame`,
`git fsck`. A bundle cannot carry the bytes of the commit that adds it, so `git status --porcelain`
names `history.bundle` as modified and nothing else.

## Determinism

The sample lines are literals and nothing reads the clock or the environment, so consecutive runs
print identical output apart from the `duration_ms` fields that Node's test runner reports for each
test and for the run as a whole. Those durations are not part of any assertion.
