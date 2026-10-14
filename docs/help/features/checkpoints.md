# Checkpoints

Checkpoints let you rewind your workspace to a known-good state. Roo+ records a snapshot
as it works, so if a change goes wrong you can restore the files to an earlier point
without reaching for your own backups.

## Configuration options

Checkpoints are controlled from **Settings → Checkpoints**:

- **Enable automatic checkpoints** — turn the feature on or off. When on, Roo+ creates
  checkpoints automatically during a task; when off, no snapshots are taken and no
  checkpoint controls appear.
- **Checkpoint initialization timeout (seconds)** — the maximum time Roo+ waits for the
  checkpoint service to initialize before it reports a failure. The default is 15 seconds
  and the range is 10–60 seconds; raise it on very large repositories or slow disks.

Checkpoints require Git; Roo+ uses it under the hood to store snapshots. If Git is not
installed, the feature is unavailable until you install it.

## How checkpoints work

Each checkpoint captures the state of your workspace files at a point in the task. Roo+
creates them automatically as it makes changes, and you can also create one on demand.
Snapshots are stored in a dedicated area separate from your project's own Git history, so
they never appear in your commits or branches.

## Viewing diffs and restoring

From a checkpoint in the task you can:

- **View the diff** — see exactly what changed between the checkpoint and now.
- **Restore** — roll the workspace files back to that checkpoint.

Restoring affects workspace files; it does not change your Git history or push anything.

## Limitations

- Checkpoints track workspace files, not your Git branches, commits, or remotes.
- Large binary files and generated directories may be excluded to keep snapshots small.
- Files ignored by your project (for example dependency folders) are generally not
  captured, so restoring will not bring them back.
- A restore is not a substitute for committing work you want to keep — treat it as an
  undo, not as backup.

## Storage and exclusions

Snapshots live outside your tracked files, so they do not pollute `git status`. To keep
them manageable, Roo+ excludes typical generated and vendored paths (dependency folders,
build output) from snapshots. If a directory you care about is excluded, add it to your
project's tracked files so it is captured.

## Installing Git per OS

Checkpoints need the `git` binary on your `PATH`:

- **macOS** — install the Xcode command-line tools, or install Git from your package
  manager of choice.
- **Linux** — install `git` from your distribution's package manager.
- **Windows** — install Git for Windows and ensure it is on `PATH` (the installer offers
  this option).

After installing, restart VS Code so Roo+ picks up the updated `PATH`, then confirm
checkpoints are enabled.

## Under the hood

Roo+ maintains a lightweight shadow repository to store snapshots. It commits your
workspace state into that repository at each checkpoint so restores are fast and
diffable. Your own repository is untouched; the shadow repository is an implementation
detail you do not need to manage.
