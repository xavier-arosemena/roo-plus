# Data Retention and Deletion

**Scope**: everything Roo+ writes to disk or to VS Code storage, where it lives, what deletes it,
and what "delete" does not cover.

**Audience**: users asking "what do you keep?", support handling a deletion request, and
maintainers adding a new persisted artefact.

**Status**: living document. If you add a persisted artefact, add a row here in the same change.

---

## 1. Why this document exists

Roo+ is local-first: there is no server to delete data from, and therefore no server-side deletion
contract. Everything is on the user's machine, under their control — but distributed across four
different storage mechanisms with different lifetimes. Before this document, "delete my data" was
an undocumented filesystem exercise.

---

## 2. What is stored, and where

| Artefact                                         | Location                                                               | Contains                                       | Lifetime                     | Deleted by                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| **Conversations**                                | `<storage root>/tasks/<taskId>/`                                       | UI messages, API messages, task metadata       | Until the task is deleted    | Deleting the task from history; or deleting the directory     |
| **Task history index**                           | `<storage root>/tasks/_index.json` (managed by `TaskHistoryStore`)     | Task list, timestamps, cost summaries          | Until the task is deleted    | Task deletion, which updates the index atomically             |
| **Checkpoints**                                  | Per-task shadow git repository (`RepoPerTaskCheckpointService`)        | Workspace snapshots taken around edits         | With the task                | Task deletion / checkpoint cleanup                            |
| **Provider profiles**                            | `<storage root>/settings/`                                             | Base URLs, model ids, non-secret configuration | Until the profile is deleted | Deleting the profile in settings                              |
| **Secrets** (API keys, OAuth tokens)             | VS Code **SecretStorage**                                              | Credentials                                    | Until cleared                | Clearing the value in settings, or uninstalling the extension |
| **User settings / allow-lists / mode selection** | VS Code **global state**                                               | Preferences                                    | Until changed or reset       | Settings UI, or VS Code's own reset                           |
| **Skills and rules**                             | Workspace `.roo/`, `.agents/`, user Roo directory                      | Markdown procedures and rules                  | As long as the files exist   | Deleting the files (they are ordinary files you own)          |
| **Debug logs**                                   | Extension output channel + debug log file (`@roo-code/core` debug-log) | Diagnostic traces                              | Session/rotated              | Rotating or deleting the log file                             |

**Storage root** defaults to VS Code's extension global storage for this extension and can be
redirected with the `customStoragePath` setting. If the custom path is unusable, Roo+ falls back to
the default rather than failing — so check both locations before concluding data is gone.

---

## 3. Deleting a task

Deleting a task from the history UI removes its directory under `tasks/<taskId>/` and its entry in
the history index. Because the index update is atomic, an interrupted deletion leaves either the
previous state or the new one, never a half-updated index.

Deleting a task does **not** revert workspace edits. Checkpoints exist for that: restoring a
checkpoint is a separate, explicit action, and deleting the task removes the checkpoints with it.
If you want the workspace back, restore _before_ deleting the task.

---

## 4. Deleting everything

Roo+ has no "erase all data" button. The complete procedure is:

1. Delete the conversations you care about, or remove the whole `tasks/` directory under the
   storage root (and under any previously configured custom storage path).
2. Delete provider profiles in settings, then clear the associated secrets in settings.
3. Uninstall the extension. Uninstalling removes the extension's global state and SecretStorage
   entries; directories under a **custom** storage path are outside VS Code's control and must be
   removed manually.
4. Remove workspace `.roo/` and `.agents/` directories if you added rules/skills there — these are
   ordinary project files and are not part of the extension's storage.

---

## 5. What is never stored

- **No analytics or usage telemetry.** There is no analytics SDK in the dependency tree.
- **No conversation data on a server.** There is no backend; the extension has no account system.
- **No secrets in provider-profile JSON.** Keys and OAuth tokens live in SecretStorage, and are
  never posted to the webview.

## 6. What leaves the machine, and when

Retention is not the only privacy question — egress is covered in
[`docs/architecture.md` §13.3](../architecture.md): inference calls, model-catalogue lookups,
embedding calls when indexing is enabled, MCP servers you add, OAuth token exchange, and the
consented Semble download. Nothing else.

## 7. Gaps (tracked, not hidden)

- There is no configurable retention policy (e.g. "delete conversations older than 30 days").
  Retention is manual and unlimited by default.
- `customStoragePath` history: if a user changes the path, data written under the old path is not
  migrated or removed by the extension.

Both are recorded in the architecture debt register.
