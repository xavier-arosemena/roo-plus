# Mode-file interoperability — the foreign readers

| Field                       | Value                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | RESEARCH REPORT (2026-11-05). Input to ADR-3. Not a decision, not an ADR, not a change to the corpus.                                                                                            |
| **Question**                | If the capability map ships by extending the existing group-options object — `["edit", { fileRegex, allow, deny }]` — do readers outside Roo+ ignore `allow`/`deny` rather than reject the file? |
| **Contract**                | [`test-fixtures/modes/README.md`](../../test-fixtures/modes/README.md:1) — fixtures F1–F10 and the outcome classes.                                                                              |
| **Baseline (not repeated)** | [`docs/modes-target-state.md`](../modes-target-state.md:153) §3.2 — our executed results for the Roo+ runtime and the published schema. Cited below, never re-derived.                           |
| **Readers**                 | Roo Code (archived, final commit), Zoo Code (current), Kilo Code (current). Cline screened and dropped — it does not read the artefact.                                                          |
| **Evidence grades**         | **EXECUTED** (the pinned validator/converter was run), **CODE-READ** (the surrounding loader was read at a pinned commit), **DOCUMENTED** (docs only; secondary).                                |
| **Retrieval date**          | 2026-11-05 (UTC).                                                                                                                                                                                |
| **Reproduction**            | §12. Harness lived outside the repository; no product code, fixture, ADR, or target-state document was modified.                                                                                 |

---

## 1. Executive answer

**For file acceptance, Route A passes the lineage. For enforcement, it fails.**

Every qualifying reader _loads_ `["edit", { fileRegex, allow, deny }]`:

- **Roo Code** at its final commit loads the mode and **strips** `allow`, `deny`, and (because the field did not yet exist there) `allowedMcpServers`.
- **Zoo Code** loads the mode and **strips** `allow`/`deny`, keeping `fileRegex`, `description`, and `allowedMcpServers`.
- **Kilo Code** never validates the shape at all; it keeps `fileRegex`, ignores `allow`/`deny`, and projects the group into an opencode permission map.

No qualifying reader rejects F4. No qualifying reader crashes on it. That is the good news, and it is genuinely good: the `groups` tuple is a forward-compatible carrier in the same sense that an unknown root key is at F2.

The bad news is the one that decides the ADR. **A stripped restriction is not a neutral loss when the grant remains.** A mode authored as `["command", { allow: ["git status"], deny: ["rm -rf *"] }]` is read by Roo Code and Zoo Code as `["command"]` — the whole tool group, with the policy gone. The same is true of `mcp`. For `edit`, the surviving `fileRegex` is a floor, so the loss is bounded; for `command` and `mcp`, the loss is a **silent widening to the full group**. Roo Code goes further and drops `allowedMcpServers` entirely, turning a mode restricted to one MCP server into a mode with every MCP server.

So the Route A verdict is conditional, not a green light:

> **Route A is safe as a load-compatible carrier for edit-path refinements that are strictly narrower than `fileRegex`. It is not safe as the carrier for command/MCP capability policy. If ADR-3 needs one persisted carrier for the full map, the evidence supports Route C (loader-side/manifest), not Route A and not Route B.**

The rest of this report is the evidence for that sentence, including the exact lines, the executed outputs, and the places where the evidence runs out.

---

## 2. Verdict matrix

Legend. `load` = accepted with nothing to ignore. `ignore` = unknown key skipped without observable effect. `strip` = unknown key dropped (at parse or at projection) and the mode still loads; ⚠️ marks observable authored semantics lost. `reject (file)` = the whole `customModes` array fails; every mode in that file is lost. `reject (mode)` = only that entry is dropped (none observed). `crash` = unhandled error. `unverified` = not measured.

| Fixture                         | Roo Code `b867ec9`                              | Zoo Code `4d1a543`                                    | Kilo Code `b2ba8bb`                                      |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| **F1** `v1-baseline`            | load                                            | load                                                  | load                                                     |
| **F2** `unknown-root-key`       | strip                                           | strip                                                 | ignore                                                   |
| **F3** `typo-mode-key`          | strip ⚠️                                        | strip ⚠️                                              | strip ⚠️                                                 |
| **F4** `group-options-extended` | strip ⚠️ (`allow`, `deny`, `allowedMcpServers`) | strip ⚠️ (`allow`, `deny`; keeps `allowedMcpServers`) | strip ⚠️ (`allow`, `deny`; `fileRegex` → permission map) |
| **F5** `bounded-marker`         | strip                                           | strip                                                 | strip                                                    |
| **F6** `missing-required`       | reject (file)                                   | reject (file)                                         | load (degraded: no role definition)                      |
| **F7** `duplicate-slug`         | reject (file)                                   | reject (file)                                         | load (dedupe; later wins)                                |
| **F8** `unknown-group`          | reject (file)                                   | reject (file)                                         | load (all real permissions denied)                       |
| **F9** `uppercase-slug`         | load                                            | load                                                  | load                                                     |
| **F10** `empty-groups`          | load                                            | load                                                  | load                                                     |
| **Evidence**                    | E/C                                             | E/C                                                   | E/C                                                      |

**E** = the pinned validator/converter was executed (§12). **C** = the loader wiring that turns a validator result into “file lost / mode kept” was code-read at the pinned commit. For Roo Code and Zoo Code, F6–F8’s _failure_ is EXECUTED and the _blast radius_ (`return []`) is CODE-READ. For Kilo, every cell is EXECUTED through its own `readModesFile` + `migrate`; the absence of `.roomodes` support is CODE-READ (a repo-wide search). No cell is `unverified`; the remaining gaps are listed in §10.

**Shape coverage (what the table cannot show).**

| File shape                            | Roo Code | Zoo Code | Kilo Code    |
| ------------------------------------- | -------- | -------- | ------------ |
| `.roomodes` (workspace)               | read     | read     | **not read** |
| `custom_modes.yaml` (global settings) | read     | read     | read         |
| `.kilocodemodes` (project/home)       | not read | not read | read         |

Roo Code and Zoo Code read both Roo-lineage shapes with the same schema. Kilo Code reads **`custom_modes.yaml` and `.kilocodemodes` — not `.roomodes`**. The Kilo column above was produced by materialising each fixture as `.kilocodemodes` and running Kilo’s own reader. A literal `.roomodes` file dropped into a Kilo workspace is never opened; every fixture in that shape is simply _not read_ (no load, no strip, no reject). This is a name-level divergence in the lineage, not a schema behaviour.

---

## 3. Roo Code — the historical baseline

|                 |                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Repository**  | [`RooCodeInc/Roo-Code`](https://github.com/RooCodeInc/Roo-Code)                             |
| **Commit read** | `b867ec9145750d0ae1ff7f02d35406e9bf2a0b16` (default branch `main`)                          |
| **Commit date** | 2026-05-15T14:04:45-04:00 (18:04:45Z)                                                       |
| **Retrieved**   | 2026-11-05                                                                                  |
| **Archived**    | **Yes** — GitHub API `archived: true`; last push 2026-05-15T18:08:47Z; repository read-only |
| **Licence**     | Apache-2.0 (short excerpts below, attributed)                                               |

### 3.1 Files read

- `.roomodes` in the workspace root — `ROOMODES_FILENAME = ".roomodes"` in [`CustomModesManager.ts`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/config/CustomModesManager.ts#L19).
- `custom_modes.yaml` in the extension’s global settings directory — `customModes: "custom_modes.yaml"` in [`globalFileNames.ts`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/shared/globalFileNames.ts#L5).
- The two are merged, project (`.roomodes`) taking precedence by slug (`CustomModesManager.ts:226-247`, `:356-402`).

### 3.2 The authoritative validator is zod, not the JSON schema

The loader parses YAML, then calls `customModesSettingsSchema.safeParse(settings)` ([`CustomModesManager.ts:193`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/config/CustomModesManager.ts#L193)). The schema is plain `z.object` with no `.strict()`:

```ts
// packages/types/src/mode.ts:96-105
export const modeConfigSchema = z.object({
	slug: z.string().regex(/^[a-zA-Z0-9-]+$/, "Slug must contain only letters numbers and dashes"),
	name: z.string().min(1, "Name is required"),
	roleDefinition: z.string().min(1, "Role definition is required"),
	whenToUse: z.string().optional(),
	description: z.string().optional(),
	customInstructions: z.string().optional(),
	groups: groupEntryArraySchema,
	source: z.enum(["global", "project"]).optional(),
})
```

```ts
// packages/types/src/mode.ts:113-131 (refine body elided)
export const customModesSettingsSchema = z.object({
	customModes: z.array(modeConfigSchema).refine(
		…
		{ message: "Duplicate mode slugs are not allowed" },
	),
})
```

Group options are also a plain object, so zod’s default “strip unknown keys” applies at both levels:

```ts
// packages/types/src/mode.ts:9-29 (body elided)
export const groupOptionsSchema = z.object({
	…
	description: z.string().optional(),
})
```

The group entry is a union of a bare enum or a two-tuple:

```ts
// packages/types/src/mode.ts:37
export const groupEntrySchema = z.union([toolGroupsSchema, z.tuple([toolGroupsSchema, groupOptionsSchema])])
```

The published JSON schema is a **separate, deliberately strict view**, generated from `roomodesZodSchema` and not imported by the loader:

```ts
// packages/types/src/roomodes-schema.ts:37-41
const roomodesZodSchema = z
	.object({
		customModes: z.array(exportedModeConfigSchema),
	})
	.strict()
```

Its generated artifact has `additionalProperties: false` at the root, the mode node, and the group-options node ([`schemas/roomodes.json:61,81,86,91`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/schemas/roomodes.json#L61)). A repo-wide search for `roomodes.json` / `generateRoomodesJsonSchema` finds only the generator script and its test — the loader never consults it. **The JSON schema is secondary evidence for runtime behaviour.**

### 3.3 The eight questions

1. **File shapes read.** `.roomodes` (workspace) and `custom_modes.yaml` (global settings). Same schema for both; `.roomodes` wins on slug conflict.
2. **Unknown-key behaviour.** **Strip.** `safeParse` succeeds and returns the stripped object; the loader then maps `result.data.customModes`. Evidence: EXECUTED (F2 root key, F3 mode key, F4 options, F5 `bounded`). Authoritative validator: zod `customModesSettingsSchema`; the strict JSON schema is not in the load path.
3. **Unknown-group behaviour.** **Fatal for the whole file.** `toolGroupsSchema` is `z.enum(["read","edit","command","mcp","modes"])` ([`tool.ts:7`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/packages/types/src/tool.ts#L7)); `["bogus-group"]` fails the array, and the loader returns `[]` after an error toast. Evidence: EXECUTED (validation) + CODE-READ (`CustomModesManager.ts:195-208`).
4. **Group vocabulary.** `read`, `edit`, `command`, `mcp`, `modes`. **`browser` is no longer a runtime group.** It is listed in `deprecatedToolGroups` ([`tool.ts:16`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/packages/types/src/tool.ts#L16)) and silently filtered out before validation ([`mode.ts:91-94`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/packages/types/src/mode.ts#L91-L94)). The published JSON schema still _accepts_ `browser` in its enum, another runtime/schema divergence. A mode authored with `browser` loses that group silently at load.
5. **Group-options behaviour (F4).** The tuple is accepted. zod strips `allow` and `deny`; `fileRegex` and `description` survive. Because `allowedMcpServers` is absent from this commit’s `modeConfigSchema`, it is also stripped. Executed output for F4:
   `groups: ["read", ["edit", { fileRegex: "\\.(md|ya?ml)$", description: "Docs only" }], "mcp"]` — no `allow`, no `deny`, no `allowedMcpServers`.
6. **Structural failure blast radius.** **Whole file**, not per-mode. `safeParse` fails the entire `customModes` array; `loadModesFromFile` returns `[]` ([`CustomModesManager.ts:195-208`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/config/CustomModesManager.ts#L195-L208)). Global `custom_modes.yaml` modes still load and are merged, so the loss is “all modes in that file”, not “all modes in the product”. That distinction matters for the shared-repo scenario.
7. **Export.** `exportModeWithRules` produces a standalone YAML string ([`CustomModesManager.ts:715-837`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/config/CustomModesManager.ts#L715)); the webview handler opens a save dialog with a default name of `<slug>-export.yaml` ([`webviewMessageHandler.ts:1958`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/webview/webviewMessageHandler.ts#L1958)). It spreads the **already-parsed** mode, sets `source: "project"`, and appends `rulesFiles` ([`:805-822`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/config/CustomModesManager.ts#L805-L822)). Unknown keys were stripped at load, so they are absent from the export. The normal edit/save path also rewrites `.roomodes` through `updateModesInFile`, which re-parses the raw file and re-stringifies the whole object (`:465-494`): unknown root keys and untouched modes survive, but the **edited mode** is replaced by the in-memory parsed object, so its `allow`/`deny` would be written back missing.
8. **Version/date/archived.** See the table at §3.

### 3.4 What this means for F1–F10

Roo Code reproduces the Roo+ runtime baseline exactly, with two deviations caused by the older schema:

- **F5:** Roo Code **strips** `bounded`; the Roo+ runtime keeps it. The foreign reader is stricter here than we are. The “must never persist” invariant is writer-enforced in both, but Roo Code’s schema also enforces it.
- **F4:** Roo Code strips `allowedMcpServers` in addition to `allow`/`deny`. This is not a neutral loss; it removes an MCP restriction and lets the mode see every server. See §9.

---

## 4. Zoo Code — the continuing lineage

|                 |                                                                         |
| --------------- | ----------------------------------------------------------------------- |
| **Repository**  | [`Zoo-Code-Org/Zoo-Code`](https://github.com/Zoo-Code-Org/Zoo-Code)     |
| **Commit read** | `4d1a543c5cab3595dd2530ca183721b5b819ee47` (default branch `main`)      |
| **Commit date** | 2026-11-05T12:59:22+00:00                                               |
| **Retrieved**   | 2026-11-05                                                              |
| **Archived**    | **No** — GitHub API `archived: false`; active push 2026-11-05T20:50:02Z |
| **Licence**     | Apache-2.0                                                              |

Zoo Code is the community continuation of Roo Code; its mode subsystem is the Roo subsystem plus `allowedMcpServers`. The load path is line-for-line the same as Roo Code’s — a diff of the two `CustomModesManager.ts` files shows only error-property renames (`error.errors` → `error.issues`), a marketplace parameter on delete, and unrelated catch-binding changes.

### 4.1 Files read

Same two shapes as Roo Code: `.roomodes` (workspace) and `custom_modes.yaml` (global settings). `ROOMODES_FILENAME` is still `.roomodes` ([`CustomModesManager.ts:19`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/src/core/config/CustomModesManager.ts#L19)); `GlobalFileNames.customModes` is still `custom_modes.yaml` ([`globalFileNames.ts:5`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/src/shared/globalFileNames.ts#L5)).

### 4.2 The authoritative validator is zod 4, and it still strips

Zoo Code upgraded to **zod 4.6.7** (`packages/types/package.json`), while Roo Code and Roo+ pin **3.25.76**. The unknown-key behaviour did not change across the major: `z.object` still strips by default. The schema is the same shape:

```ts
// packages/types/src/mode.ts:96-113
export const modeConfigSchema = z.object({
	slug: z.string().regex(/^[a-zA-Z0-9-]+$/, "Slug must contain only letters numbers and dashes"),
	name: z.string().min(1, "Name is required"),
	roleDefinition: z.string().min(1, "Role definition is required"),
	whenToUse: z.string().optional(),
	description: z.string().optional(),
	customInstructions: z.string().optional(),
	groups: groupEntryArraySchema,
	source: z.enum(["global", "project"]).optional(),
	allowedMcpServers: z
		.array(z.string())
		.describe(
			"Optional list of MCP server names to include. When omitted, all servers are available. When set, only the listed servers are injected.",
		)
		.optional(),
})
```

The loader is unchanged in the decisive respect:

```ts
// src/core/config/CustomModesManager.ts:193-208
const result = customModesSettingsSchema.safeParse(settings)
if (!result.success) {
	console.error(`[CustomModesManager] Schema validation failed for ${filePath}:`, result.error)
	// Show user-friendly error for .roomodes files
	if (filePath.endsWith(ROOMODES_FILENAME)) {
		const issues = result.error.issues.map((issue) => `• ${issue.path.join(".")}: ${issue.message}`).join("\n")

		vscode.window.showErrorMessage(t("common:customModes.errors.schemaValidationError", { issues }))
	}
	return []
}
```

The published JSON schema is again separate and strict — `roomodesZodSchema` ends in `.strict()` ([`roomodes-schema.ts:37-41`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/packages/types/src/roomodes-schema.ts#L37-L41)), generated with zod 4’s `z.toJSONSchema`. It is not in the load path.

### 4.3 The eight questions

1. **File shapes read.** `.roomodes` and `custom_modes.yaml`, merged with project precedence.
2. **Unknown-key behaviour.** **Strip** at root, mode, and group-options levels. Evidence: EXECUTED (F2–F5). Authoritative validator: zod `customModesSettingsSchema`; JSON schema secondary.
3. **Unknown-group behaviour.** **Fatal for the whole file.** `["bogus-group"]` fails `toolGroupsSchema`; `return []`. Evidence: EXECUTED + CODE-READ.
4. **Group vocabulary.** `read`, `edit`, `command`, `mcp`, `modes`; `browser` is deprecated and stripped before validation ([`tool.ts:7,16`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/packages/types/src/tool.ts#L7)). Same runtime/schema divergence as Roo Code.
5. **Group-options behaviour (F4).** Accepts the tuple; strips `allow`/`deny`; keeps `fileRegex`, `description`, and **`allowedMcpServers`**. Executed F4 output:
   `groups: ["read", ["edit", { fileRegex: "\\.(md|ya?ml)$", description: "Docs only" }], "mcp"], allowedMcpServers: ["git"]`.
6. **Structural failure blast radius.** **Whole file**, same as Roo Code; global modes survive the merge.
7. **Export.** Same export implementation as Roo Code (`exportModeWithRules` at `:716-838`), same `source: "project"` and `rulesFiles`, same save-dialog path. `allowedMcpServers` survives because it is in the parsed object; `allow`/`deny` do not, because they were stripped at load.
8. **Version/date/archived.** See the table at §4.

### 4.4 What this means

Zoo Code is the _best_ foreign reader for Route A among the three, because it is the only one that preserves `allowedMcpServers`. It still drops `allow`/`deny`. If the capability map is used for `edit` narrowing inside a surviving `fileRegex`, Zoo Code is bounded; if it is used for `command`/`mcp`, Zoo Code grants the full group.

---

## 5. Kilo Code — a different architecture, same file shape by accident

|                 |                                                                         |
| --------------- | ----------------------------------------------------------------------- |
| **Repository**  | [`Kilo-Org/kilocode`](https://github.com/Kilo-Org/kilocode)             |
| **Commit read** | `b2ba8bbe54adc795f13b41dff64f6bde9218e327` (default branch `main`)      |
| **Commit date** | 2026-11-05T13:36:16-05:00                                               |
| **Retrieved**   | 2026-11-05                                                              |
| **Archived**    | **No** — GitHub API `archived: false`; active push 2026-11-05T20:47:39Z |
| **Licence**     | Apache-2.0                                                              |

Kilo Code is no longer a Roo-style VS Code mode manager. The current VS Code extension is built on the Kilo CLI; custom agents are **Markdown files with YAML frontmatter** or entries under the `agent` key of `kilo.jsonc`. The legacy bridge is `ModesMigrator`, which reads `custom_modes.yaml` / `.kilocodemodes` and converts them into opencode agents. The docs say this plainly: _“The current VS Code extension (built on the Kilo CLI) uses agent Markdown files to define custom agents. The legacy extension used `custom_modes.yaml` / `.kilocodemodes`.”_ ([`custom-modes.md:11`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/kilo-docs/pages/customize/custom-modes.md#L11)). This is DOCUMENTED evidence; the code below is CODE-READ/EXECUTED.

### 5.1 Files read

```ts
// packages/opencode/src/kilocode/modes-migrator.ts:164-188 (non-contiguous; pushes elided)
…
const vscodeGlobalPath = path.join(KilocodePaths.vscodeGlobalStorage(), "settings", "custom_modes.yaml")
…
const cliGlobalPath = path.join(os.homedir(), ".kilocode", "cli", "global", "settings", "custom_modes.yaml")
…
const homeModesPath = path.join(os.homedir(), ".kilocodemodes")
…
const legacyPath = path.join(options.globalSettingsDir, "custom_modes.yaml")
…
const projectModesPath = path.join(options.projectDir, ".kilocodemodes")
```

**`.roomodes` is not among them.** A case-insensitive search of the whole repository at this commit finds `roomodes` only in inherited CHANGELOG entries (lines 6528 and 6986 of `packages/kilo-vscode/CHANGELOG.md`), not in any loader. The project file is `.kilocodemodes`; the global file is `custom_modes.yaml`. A literal `.roomodes` file is invisible to Kilo Code.

### 5.2 There is no validator — only a parser and a projection

```ts
// packages/opencode/src/kilocode/modes-migrator.ts:132-143
export async function readModesFile(filepath: string): Promise<KilocodeMode[]> {
	try {
		const content = await fs.readFile(filepath, "utf-8")
		// Wrap YAML content in frontmatter delimiters so gray-matter can parse it
		const wrapped = `---\n${content}\n---`
		const parsed = matter(wrapped).data as KilocodeModesFile
		return parsed?.customModes ?? []
	} catch (err: any) {
		if (err.code === "ENOENT") return []
		throw err
	}
}
```

The only “schema” is a TypeScript interface, erased at runtime:

```ts
// packages/opencode/src/kilocode/modes-migrator.ts:13-22
export interface KilocodeMode {
	slug: string
	name: string
	roleDefinition: string
	groups: Array<string | [string, { fileRegex?: string; description?: string }]>
	customInstructions?: string
	whenToUse?: string
	description?: string
	source?: "global" | "project" | "organization"
}
```

There is no enum, no `.strict()`, no required-field check. `readModesFile` returns whatever YAML produced; `migrate` then converts each mode. This is a hand-written parser, and it is the authoritative (only) reader.

### 5.3 The group vocabulary is a mapping, not an enum

```ts
// packages/opencode/src/kilocode/modes-migrator.ts:36-41
const GROUP_TO_PERMISSION: Record<string, string> = {
	read: "read",
	edit: "edit",
	browser: "bash",
	command: "bash",
	mcp: "mcp",
}

const ALL_PERMISSIONS = ["read", "edit", "bash", "mcp"]
```

`browser` is not merely “still present”; it is **translated to `bash`**. A mode authored with `browser` (deprecated and stripped by Roo Code/Zoo Code) gets shell access in Kilo Code. That is a cross-reader privilege translation, and it is the opposite direction from Roo Code/Zoo Code’s silent removal.

### 5.4 The eight questions

1. **File shapes read.** `custom_modes.yaml` (VS Code global storage and CLI global settings), `~/.kilocodemodes`, optional `globalSettingsDir/custom_modes.yaml`, and project `.kilocodemodes`. **Not `.roomodes`.**
2. **Unknown-key behaviour.** **Ignore/strip at projection.** `readModesFile` keeps only `parsed.customModes`; `convertMode` reads `roleDefinition`, `customInstructions`, `description`, `whenToUse`, `name`, `groups`. Everything else (`allow`, `deny`, `bounded`, `customInstrutions`, `allowedMcpServers`, unknown root keys) is absent from the produced agent. No validator exists to reject it.
3. **Unknown-group behaviour.** **Not fatal.** The group name is used as a permission key when it is not in the map: `GROUP_TO_PERMISSION[group] ?? group` ([`:56-59`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/opencode/src/kilocode/modes-migrator.ts#L56-L59)). Then every permission in `ALL_PERMISSIONS` not seen is set to `"deny"` ([`:76-80`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/opencode/src/kilocode/modes-migrator.ts#L76-L80)). For F8 the executed result is: `{ "bogus-group": "allow", "read": "deny", "edit": "deny", "bash": "deny", "mcp": "deny" }` — the mode loads, has zero real tools, and carries an unknown permission key. The opencode permission schema uses `StructWithRest` plus `Schema.Record(Schema.String, Rule)` ([`packages/core/src/v1/config/permission.ts:18-44`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/core/src/v1/config/permission.ts#L18-L44)), so the unknown key does not fail config parsing. No crash was observed.
4. **Group vocabulary.** `read`, `edit`, `command`→`bash`, `browser`→`bash`, `mcp`; anything else becomes a literal permission key. No `modes` group.
5. **Group-options behaviour (F4).** Accepts `[ "edit", { fileRegex, allow, deny } ]`; uses only `fileRegex`, projecting it to `{ "<regex>": "allow", "*": "deny" }`. `allow`/`deny` are ignored. Executed F4 permission:
   `{ read: "allow", edit: { "\\.(md|ya?ml)$": "allow", "*": "deny" }, mcp: "allow", bash: "deny" }`.
6. **Structural failure blast radius.** **Per-mode problems never reject.** A missing `roleDefinition` produces an agent whose prompt is just `customInstructions` (executed F6: `prompt: "Report the fixture identifier and stop."`). Duplicate slugs are collapsed by a `Map`, later entries winning (executed F7: two raw modes → one agent). Unknown groups become zero-permission agents (executed F8). The only whole-file failure is YAML parse/read error: `readModesFile` rethrows non-`ENOENT` errors (`:139-142`), and `ModesMigrator.migrate` does not catch them; `KilocodeConfigInjector.buildConfig` calls it without a try/catch ([`config-injector.ts:30`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/opencode/src/kilocode/config-injector.ts#L30)). Executed malformed-YAML result: `THROW unexpected end of the stream within a flow collection`.
7. **Export.** Kilo does not write `custom_modes.yaml` on export. Its current agent format is Markdown/`.kilo/agent/*.md` or `kilo.jsonc` `agent` entries; docs describe this as the primary path and the YAML as legacy migration input ([`custom-modes.md:239-259`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/kilo-docs/pages/customize/custom-modes.md#L239-L259)). The one legacy write path is deletion: it re-serialises the filtered **raw parsed** modes back to the YAML file (`agent/index.ts:745-759`), so unknown keys survive _that_ rewrite, but the migration to the agent format drops `allow`/`deny` because they were never modelled.
8. **Version/date/archived.** See the table at §5.

### 5.5 Two Kilo-specific hazards the fixtures do not express

- **Default-slug shadowing.** `DEFAULT_MODE_SLUGS = new Set(["code","build","architect","ask","debug","orchestrator"])`; a legacy mode with one of those slugs is skipped in favour of the native opencode agent (`modes-migrator.ts:197-205`). A shared `.kilocodemodes` that defines `architect` is silently ignored in Kilo.
- **`browser` → `bash`.** A mode using the deprecated group gets a _stronger_ capability in Kilo than in Roo Code/Zoo Code. Any cross-reader capability comparison must account for this, not just for lost `allow`/`deny`.

---

## 6. Cline — screened out

|                 |                                                 |
| --------------- | ----------------------------------------------- |
| **Repository**  | [`cline/cline`](https://github.com/cline/cline) |
| **Commit read** | `7606e9105bc647cca1d5a3ed35f487ed27e037ab`      |
| **Retrieved**   | 2026-11-05                                      |
| **Archived**    | No                                              |

Cline does **not** import `.roomodes` or `custom_modes.yaml`. At the pinned commit, a repo-wide search (excluding `node_modules` and `.git`) returns:

- `roomodes`: **0 files**
- `custom_modes`: **0 files**
- `customModes`: **0 files**

The search includes `apps/vscode`, so this is not a docs-only blind spot. Cline has its own Plan/Act workflow and its own rule/workflow files; it has no custom-mode file format to interoperate with. It is therefore **dropped from the matrix**. Its absence is not evidence about any other fork; it simply means there is no artefact-level contract to test. Do not infer a Cline verdict from this report.

---

## 7. Round-trip findings

The corpus protocol is import → export → diff. The decisive question is not “does it load?” but “what is left after a user edits the mode over there?”

| Reader                    | Writes `.roomodes`?                                            | How                                                                                                                                      | What is dropped on the way out                                                                               | What survives                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roo Code**              | Yes, on edit/save; export is a standalone YAML via save dialog | `updateModesInFile` re-parses and re-stringifies the whole file (`:465-494`); `exportModeWithRules` spreads the parsed mode (`:805-831`) | `allow`, `deny` (stripped at load); `allowedMcpServers` (absent from schema); `bounded` (absent from schema) | `slug`, `name`, `roleDefinition`, `whenToUse`, `description`, `customInstructions`, `groups` with `fileRegex`/`description`; `source` and `rulesFiles` are added by export |
| **Zoo Code**              | Same                                                           | Same implementation                                                                                                                      | `allow`, `deny`; `bounded`                                                                                   | Everything above plus `allowedMcpServers`                                                                                                                                  |
| **Kilo Code**             | **No `.roomodes` path**; legacy YAML is migration input        | Agent export is Markdown/config; delete rewrites legacy YAML from raw parsed objects (`agent/index.ts:745-759`)                          | `allow`, `deny` in the agent projection; `bounded`; `customInstrutions` (typo key)                           | `roleDefinition` + `customInstructions` merged into `prompt`; `description`; `groups` projected to permissions with `fileRegex`; `source` not meaningful                   |
| **Roo+ (control, cited)** | Yes                                                            | Existing manager                                                                                                                         | `allow`, `deny` today; keeps `fileRegex`, `allowedMcpServers`, `bounded`                                     | Per §3.2 baseline                                                                                                                                                          |

**The executed projection is the proof.** Running F4 through Roo Code’s `customModesSettingsSchema` yields a mode whose `groups` tuple contains only `fileRegex` and `description`; running it through Zoo Code’s yields the same plus `allowedMcpServers`. The export functions spread exactly that object. Therefore a round trip Roo+ → Roo Code/Zoo Code → Roo+ **cannot** preserve `allow`/`deny`: they are gone before the export is written. For Roo Code, `allowedMcpServers` is gone too.

One nuance worth keeping: `updateModesInFile` preserves unknown root keys and unknown keys in **untouched** modes, because it re-stringifies the raw parsed object. The loss is specific to the mode the user edits (and to every mode at load time, since the UI never sees the stripped keys). A team that never edits the mode in Roo Code can keep the bytes on disk; the moment the mode is saved there, the refinement is erased.

---

## 8. Route A verdict

### 8.1 Is extending group options safe across the lineage?

**For load compatibility: yes.** The worst outcome across Roo Code, Zoo Code, and Kilo Code is `strip`, never `reject (file)` and never `crash`. F4 is accepted by all three. The `groups` tuple is a forward-compatible carrier in exactly the way F2 shows an unknown root key is; the lineage does not use “reject unknown keys” at the runtime layer.

**For semantic fidelity: no.** The field is ignored by every foreign reader. A mode that looks restricted in the file is unrestricted in the reader that does not understand the field. The failure is asymmetric:

- `edit` + `fileRegex`: the surviving `fileRegex` is the floor. `allow`/`deny` can only narrow it, so the stripped result is _broader than authored but still bounded_.
- `command`, `mcp`: there is no surviving floor. Stripping the options leaves the **whole group granted**. This is a silent widening to maximum capability.
- `allowedMcpServers`: Roo Code strips it outright, so the mode gets every MCP server.
- `browser`: Roo Code/Zoo Code strip it; Kilo Code maps it to `bash`. The same file produces three different capabilities.

### 8.2 Conditions under which Route A is defensible

1. **No new required key anywhere.** A new mode-level or root-level key is merely stripped (F2/F3), but making it **required** turns it into an F6-style whole-file failure for every file that predates it. Only optional keys inside the existing group-options object qualify.
2. **No new group name.** F8 is fatal for the whole file in Roo Code and Zoo Code. The capability map must not introduce a group such as `"capabilities"` or `"paths"`.
3. **The legacy grant must be no broader than the new policy.** This is the load-bearing condition. For `edit`, keep `fileRegex` as the enforcement floor and let `allow`/`deny` only narrow it. For `command`/`mcp`, do **not** express policy in group options while keeping the broad group entry — old readers will grant the group. If the policy must be narrower than the group, the legacy entry has to be removed or the groups emptied (the fail-closed variant below).
4. **The product must state the enforcement domain.** A mode carrying a capability map is “enforced by Roo+; advisory elsewhere”. The UI must show the effective policy a foreign reader would apply, not the authored one.
5. **Our own published schema must change.** F4 is rejected by [`schemas/roomodes.json`](../../schemas/roomodes.json:61) today (`additionalProperties: false` at the options node; executed baseline). If Route A ships and authors use `allow`/`deny`, the authoring linter will reject the file even though the runtime accepts it. The ADR must either relax that node or explicitly scope the map out of the published schema.
6. **Round-trip fidelity must not be promised.** Roo Code and Zoo Code erase the map on load/save (and Roo Code erases `allowedMcpServers`). Any “edit your mode in Roo Code” workflow is destructive.

### 8.3 The fail-closed variant inside the same family

If persistence is mandatory and the policy is narrower than any legacy group, the only encoding that is both load-safe and fail-closed is:

- author `groups: []` (or only groups whose legacy semantics equal the intended policy), so a foreign reader grants nothing; and
- put the map in an **additive, optional mode-level key**, which foreign readers strip (F3 behaviour) without rejecting the file.

This is not Route A as defined — it does not use the group-options object — but it belongs to the same “no version envelope” family and is strictly safer than putting command/MCP policy inside a granted group. Old readers show the mode with no tools (F10 behaviour in Roo Code/Zoo Code; all-deny in Kilo Code) instead of showing it with full tools. That converts silent widening into silent disablement, which is the correct direction for a security control.

### 8.4 What the evidence supports instead

- **Route B (versioned file): not supported.** An additive version key at the root is stripped by Roo Code/Zoo Code (F2), so old readers load the file with old semantics — the same silent downgrade as Route A, plus a false sense of versioning. A version _envelope_ that restructures `customModes` is rejected as a structural failure (F6 family), losing every mode in the file. Neither outcome enforces anything.
- **Route C (loader-side/manifest): supported for the full map.** It does not claim that a file carries a policy that foreign readers ignore. The extension enforces; the file remains the legacy `groups` grant. This is the honest route for `command`/`mcp` restrictions, which have no legacy floor.
- **Route A: supported only for edit-path refinements bounded by `fileRegex`,** with conditions 1–6. If ADR-3 requires a single persisted carrier for the _whole_ map, the evidence points to Route C, not A.

### 8.5 Decision recommendation

> **Do not adopt Route A as the general carrier for the capability map.** Adopt Route C for command/MCP policy. Permit Route A only for `edit` refinements that are strictly narrower than `fileRegex`, with an explicit “Roo+-only enforcement” warning and no promise of round-trip fidelity. If a persisted carrier is non-negotiable, use the fail-closed variant (empty legacy groups + additive optional map), not the group-options extension.

The condition is not cosmetic. It is the difference between “a reader ignores a field” (true, and safe for load) and “a reader ignores a restriction while keeping the grant” (true, and unsafe for anything called a capability).

---

## 9. Silent-downgrade risk, per reader

What a user loses when the reader does not understand `allow`/`deny` — and why the loss is dangerous rather than merely lossy.

| Authored in Roo+                                                                     | Roo Code `b867ec9` enforces                                 | Zoo Code `4d1a543` enforces               | Kilo Code `b2ba8bb` enforces                                                                                   |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `["edit", { fileRegex: "docs/**", allow: ["docs/*.md"], deny: ["docs/secret/**"] }]` | `fileRegex` only — **broader than authored**, still bounded | `fileRegex` only — same                   | `fileRegex` projected to `{ "docs/**": allow, "*": deny }` — approximately the same bound; `allow`/`deny` gone |
| `["command", { allow: ["git status"], deny: ["rm -rf *"] }]`                         | **whole `command` group** — policy gone, maximum grant      | **whole `command` group** — maximum grant | `bash: allow` — maximum grant                                                                                  |
| `["mcp", { allow: ["git"] }]`                                                        | **whole `mcp` group** — all servers                         | **whole `mcp` group** — all servers       | `mcp: allow` — all servers                                                                                     |
| `allowedMcpServers: ["git"]`                                                         | **all MCP servers** — field absent from schema              | `git` only — preserved                    | no per-server allow-list; `mcp: allow`                                                                         |
| `groups: []`                                                                         | no tools                                                    | no tools                                  | all permissions deny                                                                                           |
| `["bogus-group"]`                                                                    | **whole file rejected** — all modes in that file lost       | **whole file rejected**                   | mode loads, zero real permissions                                                                              |

Three sentences summarise the risk:

1. **Roo Code is the worst case**: it drops both the new group-option policy and an existing mode-level MCP allow-list. A user who installs a Roo+ mode restricted to one MCP server into Roo Code gets a mode that can call every server, with no warning and no visible change in the mode card.
2. **Zoo Code loses the refinement but keeps the MCP allow-list.** It is the least-bad reader for Route A, and still not a place to store a `command` policy.
3. **Kilo Code fails closed on unknown groups but open on known ones.** An unknown group yields zero permissions (safe), while a known `command`/`mcp` group with stripped options yields the full group (unsafe). Its `browser`→`bash` mapping can also _increase_ capability relative to Roo Code/Zoo Code.

The common pattern: **the grant is the part every reader understands; the restriction is the part only the newest reader understands.** Any design that keeps the grant in a legacy field and puts the restriction in a new field will be silently widened by every older reader. The only way to avoid that is to make the legacy field no broader than the new policy — or to stop claiming the file is the enforcement boundary.

---

## 10. No-data register

Everything below is either not measured or measured with a stated residual uncertainty. It is not an assumption of success.

| #   | Item                                                                                      | What was attempted                                                                                                                                                                                       | Status / residual                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Full Roo Code extension-host load (VS Code `CustomModesManager` against a real workspace) | Cloned at `b867ec9`; copied `packages/types/src/mode.ts` + `tool.ts`; executed `customModesSettingsSchema` under Node 22 + tsx + zod 3.25.76. The loader’s `safeParse`/`return []` wiring was code-read. | **Partially executed.** The validator is measured; the watcher, error toast, and merge are code-read. No extension host was launched.                                                                                                           |
| N2  | Full Zoo Code extension-host load                                                         | Same, with zod 4.6.7.                                                                                                                                                                                    | **Partially executed.** Same residual as N1.                                                                                                                                                                                                    |
| N3  | Literal `.roomodes` in Kilo Code                                                          | Repo-wide search at `b2ba8bb` for `roomodes`; only inherited CHANGELOG hits. Fixtures were materialised as `.kilocodemodes` and run through `readModesFile` + `migrate`.                                 | **Not applicable / unverified.** No `.roomodes` code path exists in the pinned source, so a `.roomodes` file is simply not read. A shipped legacy Kilo VSIX from before the CLI rewrite was **not** audited; only the current source is pinned. |
| N4  | Kilo Code downstream handling of the unknown `bogus-group` permission key                 | Executed `convertPermissions`/`migrate`; read `ConfigPermissionV1.Info` (`StructWithRest` + `Schema.Record(Schema.String, Rule)`).                                                                       | **Conversion executed; runtime not executed.** No config-parse crash is expected from the schema, but the opencode UI/runtime was not run.                                                                                                      |
| N5  | Roo Code / Zoo Code export file write through the VS Code save dialog                     | Code-read `webviewMessageHandler.ts:1958` and `exportModeWithRules`; did not run VS Code.                                                                                                                | **Code-read only.** The YAML content is measured at the schema level; the dialog’s file-writing side effect is not.                                                                                                                             |
| N6  | Roo Code / Zoo Code published JSON schema enforcement at runtime                          | Searched for imports of `schemas/roomodes.json` / `generateRoomodesJsonSchema`; found only the generator and tests.                                                                                      | **Negative finding, code-read.** The JSON schema is not in the load path. It was not executed with a JSON-schema validator because it is secondary.                                                                                             |
| N7  | Zoo Code JSON-schema generation under zod 4                                               | Read `roomodes-schema.ts:37-41` (`.strict()`); did not run `z.toJSONSchema`.                                                                                                                             | **Code-read only.** The runtime strip behaviour is executed; the generated artifact is not.                                                                                                                                                     |
| N8  | Older released binaries of any reader                                                     | Not attempted. Only the pinned commits were read/executed.                                                                                                                                               | **Unverified by design.** No claim is made about releases other than the pinned commits.                                                                                                                                                        |
| N9  | Cline as a mode-file reader                                                               | Repo-wide search at `7606e91`; zero hits for `roomodes`, `custom_modes`, `customModes`, including `apps/vscode`.                                                                                         | **Negative finding.** Dropped from the matrix. No no-data gap: there is no artefact contract to test.                                                                                                                                           |
| N10 | Kilo Code organization-managed modes                                                      | Not investigated; out of scope (cloud-provided, not a file reader).                                                                                                                                      | **Out of scope.**                                                                                                                                                                                                                               |
| N11 | Roo Code / Zoo Code concurrent-write behaviour on `.roomodes`                             | Code-read `updateModesInFile` and the write queue; did not race two writers.                                                                                                                             | **Code-read only.** The “untouched modes keep unknown keys” claim assumes no concurrent rewrite; not stress-tested.                                                                                                                             |

---

## 11. Source register

All URLs retrieved **2026-11-05**. Commit SHAs are the full 40-character hashes read by `git rev-parse HEAD` after a shallow clone, cross-checked against the GitHub API.

| Source                                                                                                                                                                                              | Commit / reference                         | What it was used for                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| [RooCodeInc/Roo-Code](https://github.com/RooCodeInc/Roo-Code)                                                                                                                                       | `b867ec9145750d0ae1ff7f02d35406e9bf2a0b16` | Final archived baseline; loader, schema, tool groups, export          |
| [`packages/types/src/mode.ts`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/packages/types/src/mode.ts#L96-L131)                                            | same                                       | `modeConfigSchema`, `customModesSettingsSchema`, `groupOptionsSchema` |
| [`packages/types/src/tool.ts`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/packages/types/src/tool.ts#L7-L16)                                              | same                                       | group enum and deprecated `browser`                                   |
| [`src/core/config/CustomModesManager.ts`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/src/core/config/CustomModesManager.ts#L183-L215)                     | same                                       | `safeParse`, whole-file `return []`, export, `updateModesInFile`      |
| [`packages/types/src/roomodes-schema.ts`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/packages/types/src/roomodes-schema.ts#L37-L41)                       | same                                       | strict published schema                                               |
| [`schemas/roomodes.json`](https://github.com/RooCodeInc/Roo-Code/blob/b867ec9145750d0ae1ff7f02d35406e9bf2a0b16/schemas/roomodes.json#L61)                                                           | same                                       | `additionalProperties: false` (secondary)                             |
| [Zoo-Code-Org/Zoo-Code](https://github.com/Zoo-Code-Org/Zoo-Code)                                                                                                                                   | `4d1a543c5cab3595dd2530ca183721b5b819ee47` | Current continuation; zod 4; `allowedMcpServers`                      |
| [`packages/types/src/mode.ts`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/packages/types/src/mode.ts#L96-L113)                                          | same                                       | mode schema with `allowedMcpServers`                                  |
| [`src/core/config/CustomModesManager.ts`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/src/core/config/CustomModesManager.ts#L193-L208)                   | same                                       | identical load path                                                   |
| [`packages/types/src/roomodes-schema.ts`](https://github.com/Zoo-Code-Org/Zoo-Code/blob/4d1a543c5cab3595dd2530ca183721b5b819ee47/packages/types/src/roomodes-schema.ts#L37-L41)                     | same                                       | strict published schema                                               |
| [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode)                                                                                                                                           | `b2ba8bbe54adc795f13b41dff64f6bde9218e327` | Current Kilo; legacy migrator                                         |
| [`packages/opencode/src/kilocode/modes-migrator.ts`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/opencode/src/kilocode/modes-migrator.ts#L132-L209) | same                                       | parser, group mapping, dedupe, file shapes                            |
| [`packages/opencode/src/kilocode/config-injector.ts`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/opencode/src/kilocode/config-injector.ts#L30-L39) | same                                       | live call site of `migrate`                                           |
| [`packages/core/src/v1/config/permission.ts`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/core/src/v1/config/permission.ts#L18-L44)                 | same                                       | permission schema accepts extra keys                                  |
| [`packages/kilo-docs/pages/customize/custom-modes.md`](https://github.com/Kilo-Org/kilocode/blob/b2ba8bbe54adc795f13b41dff64f6bde9218e327/packages/kilo-docs/pages/customize/custom-modes.md#L11)   | same                                       | documented Markdown-agent path and legacy YAML                        |
| [cline/cline](https://github.com/cline/cline)                                                                                                                                                       | `7606e9105bc647cca1d5a3ed35f487ed27e037ab` | Screening: zero `roomodes`/`custom_modes`/`customModes` hits          |
| [`docs/modes-target-state.md`](../modes-target-state.md:153)                                                                                                                                        | working tree (2026-11-04 proposal)         | Our executed baseline, cited not re-derived                           |
| [`test-fixtures/modes/README.md`](../../test-fixtures/modes/README.md:1)                                                                                                                            | working tree                               | F1–F10 definitions, outcome classes, round-trip protocol              |
| GitHub REST API `/repos/{owner}/{repo}`                                                                                                                                                             | 2026-11-05                                 | `archived`, `pushed_at`, `default_branch`                             |

Licences: all four repositories are Apache-2.0. Excerpts are short, attributed, and used for technical comparison.

---

## 12. Reproduction and limitations

### 12.1 What was executed

The decisive validator/converter modules were copied out of the pinned clones and executed; no source in the product repository was touched.

- **Roo Code:** `packages/types/src/mode.ts` + `tool.ts` at `b867ec9`, run under Node 22.22.2 with **zod 3.25.76** (the version declared by Roo Code). The import specifier `./tool.js` was changed to `./tool.ts` in the harness copy only, so Node could resolve it; the schema code is otherwise unmodified.
- **Zoo Code:** the same two files at `4d1a543`, run with **zod 4.6.7** (the version declared by Zoo Code). Same import-specifier adjustment.
- **Kilo Code:** `packages/opencode/src/kilocode/modes-migrator.ts` at `b2ba8bb`, run under Node 22 + tsx. The only harness change was replacing the `KilocodePaths` import with a stub, because the exercised path uses `skipGlobalPaths: true`; the `readModesFile`, `convertPermissions`, `convertMode`, and `migrate` functions are unmodified. Fixtures were written as real `.kilocodemodes` files and parsed by Kilo’s own `gray-matter` reader.
- Fixtures were materialised from [`test-fixtures/modes/README.md`](../../test-fixtures/modes/README.md:23). F1 and F4 are explicit in the corpus; F2, F3, F5–F10 were reconstructed exactly as described (F6 is two baseline-shaped modes, the second omitting `roleDefinition`; F7 is two identical slugs; F8 replaces `groups` with `["bogus-group"]`; F9 changes the slug to `Fixture-Baseline-Caps`; F10 sets `groups: []`).
- For the zod validators, the fixture objects were round-tripped through `yaml.parse(yaml.stringify(fixture))` before validation, so YAML scalar/array handling was exercised.

### 12.2 What was not executed

- No VS Code extension host was launched for Roo Code or Zoo Code; their `CustomModesManager` watchers, toasts, merge order, and save dialogs are **CODE-READ** at the pinned commits.
- No shipped Kilo VSIX from before the CLI rewrite was audited. The claim “Kilo does not read `.roomodes`” is about the pinned source at `b2ba8bb`, not about every binary ever published.
- No full opencode runtime was launched for Kilo; the permission projection was executed, the downstream permission evaluation was code-read.
- Cline was not tested beyond the absence search, because there is no reader to test.

### 12.3 Residual uncertainty that could change the conclusion

- If Roo Code or Zoo Code changes its loader to use the **published JSON schema** (`.strict()`) rather than the zod runtime schema, F2/F3/F4/F5 would become whole-file rejections. F9 would still pass: both forks’ published slug pattern is `^[a-zA-Z0-9-]+$`, unlike Roo+’s stricter lowercase authoring schema. At the pinned commits the JSON schema is generated and unused at runtime.
- If a future Zoo/Roo release adds `allow`/`deny` to its schema with a _stricter_ inner object, the verdict for that release would change. The current direction is the opposite: zod object stripping is stable across zod 3 → 4 (executed).
- If Kilo Code reintroduces a `.roomodes` reader, its column would need a new execution. The current architecture points away from that: the project file is `.kilocodemodes`, and the agent format is Markdown.
- If ADR-3 treats the capability map as **advisory** rather than a security boundary, the silent-widening objection loses force and Route A becomes acceptable on load-compatibility alone. That is a product decision, not an evidence gap; the report states the evidence for both readings.

---

## 13. One-line answers for the ADR

- **F4 across the lineage:** load everywhere, strip everywhere, enforce nowhere outside Roo+.
- **Worst reader:** Roo Code final — `allow`, `deny`, and `allowedMcpServers` all disappear; `command`/`mcp` become full grants.
- **Best reader:** Zoo Code — keeps `allowedMcpServers`, still drops `allow`/`deny`.
- **Most divergent reader:** Kilo Code — no `.roomodes`, no validator, `browser`→`bash`, unknown group → zero permissions.
- **Route A:** safe for load, unsafe for command/MCP enforcement, lossy on round-trip.
- **Route B:** not supported — additive version keys are stripped, restructuring envelopes are rejected.
- **Route C:** the evidence-supported carrier for the full map.
- **Fail-closed variant:** `groups: []` + additive optional map; old readers disable rather than widen.
