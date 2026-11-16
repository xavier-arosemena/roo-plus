# Order summary — B2 workspace snapshot

A dependency-free Node.js service module with one read-only endpoint,
`GET /summary`. It returns a per-region summary of a batch of orders: order count, units, gross,
discount and net amounts in integer cents, the leading product category for the region, and the
totals for the whole batch. Each order is costed against the reference tables (customers, discount
tiers, products) supplied by [`src/dataset.mjs`](src/dataset.mjs).

Nothing is installed and nothing is downloaded: Node 22 and the files in this directory are enough.

## What is here

| Path                                                 | Purpose                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [`src/dataset.mjs`](src/dataset.mjs)                 | the fixed sample data: reference tables plus a batch of orders |
| [`src/stats.mjs`](src/stats.mjs)                     | the work counter reported by the benchmark                     |
| [`src/summarise.mjs`](src/summarise.mjs)             | the aggregation and its ordering rules                         |
| [`src/httpHandler.mjs`](src/httpHandler.mjs)         | request validation and the channel filter                      |
| [`bench/bench.mjs`](bench/bench.mjs)                 | the benchmark                                                  |
| [`test/summarise.test.mjs`](test/summarise.test.mjs) | aggregation assertions                                         |
| [`test/endpoint.test.mjs`](test/endpoint.test.mjs)   | request handling and data reproducibility                      |
| [`history.bundle`](history.bundle)                   | the project history, restorable with `./run.sh --init-history` |

## Reproduce

| Command                   | Expected result                                                       |
| ------------------------- | --------------------------------------------------------------------- |
| `./run.sh`                | the suite passes, then one benchmark line is printed; exit 0          |
| `./run.sh --bench`        | the benchmark line only                                               |
| `./run.sh --init-history` | restores the commit history into `.git`; running it twice is harmless |

Both commands can be run from this directory or from any other directory, and they keep working
after the directory has been copied elsewhere. `run.sh` is POSIX `sh`.

The benchmark prints one line:

```
bench orders=<n> work=<count> elapsed_ms=<ms> net_cents=<total>
```

## What "fixed" means

`./run.sh` still exits 0, `./run.sh --bench` prints a `net_cents` total equal to the baseline below,
and the measured `elapsed_ms` is at least **3×** smaller than the baseline, on the same workload and
the same fixed input. Every existing assertion must still pass.

The baseline recorded on the machine this snapshot was built on:

```
bench orders=70000 work=315172190 elapsed_ms=1762.8 net_cents=53808472913
```

Shrinking the workload, skipping orders, memoising results between runs, or dropping fields from the
response is not a fix: the returned summary must stay identical for every input, including the small
hand-written tables in the suite.

## Determinism

The batch is generated from a fixed seed, never from the clock, so `work` and `net_cents` are
identical on every run and every host. Only `elapsed_ms` is wall-clock and therefore varies slightly
between runs; it is not part of any assertion.
