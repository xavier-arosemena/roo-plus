// npx vitest __tests__/dist_assets.spec.ts

import * as fs from "fs"
import * as path from "path"
import * as yaml from "yaml"

describe("dist assets", () => {
	const distPath = path.join(__dirname, "../dist")
	const marketplaceAssetsPath = path.join(distPath, "assets/marketplace")

	describe("tiktoken", () => {
		it("should have tiktoken wasm file", () => {
			expect(fs.existsSync(path.join(distPath, "tiktoken_bg.wasm"))).toBe(true)
		})
	})

	describe("tree-sitter", () => {
		const treeSitterFiles = [
			"tree-sitter-bash.wasm",
			"tree-sitter-cpp.wasm",
			"tree-sitter-c_sharp.wasm",
			"tree-sitter-css.wasm",
			"tree-sitter-c.wasm",
			"tree-sitter-dart.wasm",
			"tree-sitter-elisp.wasm",
			"tree-sitter-elixir.wasm",
			"tree-sitter-elm.wasm",
			"tree-sitter-embedded_template.wasm",
			"tree-sitter-go.wasm",
			"tree-sitter-html.wasm",
			"tree-sitter-javascript.wasm",
			"tree-sitter-java.wasm",
			"tree-sitter-json.wasm",
			"tree-sitter-kotlin.wasm",
			"tree-sitter-lua.wasm",
			"tree-sitter-objc.wasm",
			"tree-sitter-ocaml.wasm",
			"tree-sitter-php.wasm",
			"tree-sitter-python.wasm",
			"tree-sitter-ql.wasm",
			"tree-sitter-rescript.wasm",
			"tree-sitter-ruby.wasm",
			"tree-sitter-rust.wasm",
			"tree-sitter-scala.wasm",
			"tree-sitter-solidity.wasm",
			"tree-sitter-swift.wasm",
			"tree-sitter-systemrdl.wasm",
			"tree-sitter-tlaplus.wasm",
			"tree-sitter-toml.wasm",
			"tree-sitter-tsx.wasm",
			"tree-sitter-typescript.wasm",
			"tree-sitter-vue.wasm",
			"tree-sitter.wasm",
			"tree-sitter-yaml.wasm",
			"tree-sitter-zig.wasm",
		]

		test.each(treeSitterFiles)("should have %s file", (filename) => {
			expect(fs.existsSync(path.join(distPath, filename))).toBe(true)
		})
	})

	describe("marketplace assets", () => {
		const marketplaceFiles: Array<{ filename: string; key: string }> = [
			{ filename: "modes.yml", key: "items" },
			{ filename: "mcps.yml", key: "items" },
			{ filename: "pre-installed-modes.yml", key: "customModes" },
		]

		test.each(marketplaceFiles)(
			"should include bundled $filename marketplace asset with multiple items",
			({ filename, key }) => {
				const assetPath = path.join(marketplaceAssetsPath, filename)
				expect(fs.existsSync(assetPath)).toBe(true)

				const parsed = yaml.parse(fs.readFileSync(assetPath, "utf-8"))
				expect(Array.isArray(parsed?.[key])).toBe(true)
				expect(parsed[key].length).toBeGreaterThan(1)
			},
		)
	})

	describe("mode description completeness (Mode descriptions feature)", () => {
		// Regression gate for the original bug: modes installed from a VSIX shipped
		// with blank/missing descriptions. The bundled marketplace assets must never
		// lose descriptions at build time, so every bundled mode/item must carry a
		// non-empty description that is not a clone of its roleDefinition.
		const preInstalledPath = path.join(marketplaceAssetsPath, "pre-installed-modes.yml")
		const modesCatalogPath = path.join(marketplaceAssetsPath, "modes.yml")

		type BundledMode = { slug: string; description?: string; roleDefinition?: string }
		type MarketplaceItem = { id: string; description?: string; content?: string }

		function loadBundledModes(filename: string): BundledMode[] {
			const parsed = yaml.parse(fs.readFileSync(path.join(marketplaceAssetsPath, filename), "utf-8"))
			return parsed.customModes as BundledMode[]
		}

		// modes.yml items carry a marketplace `description` plus a nested `content`
		// string that is the mode's own YAML (optionally wrapped in customModes).
		function parseItemMode(content: string): { slug: string; description: string; roleDefinition: string } {
			const parsed = yaml.parse(content ?? "")
			const mode = parsed?.customModes?.[0] ?? parsed
			return {
				slug: mode?.slug ?? "",
				description: mode?.description ?? "",
				roleDefinition: mode?.roleDefinition ?? "",
			}
		}

		it("pre-installed-modes.yml: every bundled mode has a non-empty description", () => {
			const modes = loadBundledModes("pre-installed-modes.yml")
			expect(modes.length).toBeGreaterThan(1)
			const blank = modes.filter((m) => !m.description?.trim())
			expect(blank.map((m) => m.slug)).toEqual([])
		})

		it("pre-installed-modes.yml: no description is a clone of roleDefinition", () => {
			const modes = loadBundledModes("pre-installed-modes.yml")
			const clones = modes.filter(
				(m) => m.description?.trim() && m.description.trim() === m.roleDefinition?.trim(),
			)
			expect(clones.map((m) => m.slug)).toEqual([])
		})

		it("modes.yml: every marketplace item has a non-empty description", () => {
			const parsed = yaml.parse(fs.readFileSync(modesCatalogPath, "utf-8"))
			const items = parsed.items as MarketplaceItem[]
			expect(items.length).toBeGreaterThan(1)
			const blank = items.filter((it) => !it.description?.trim())
			expect(blank.map((it) => it.id)).toEqual([])
		})

		it("modes.yml: no item's mode description is blank or a clone of its roleDefinition", () => {
			const parsed = yaml.parse(fs.readFileSync(modesCatalogPath, "utf-8"))
			const items = parsed.items as MarketplaceItem[]

			const blank: string[] = []
			const clones: string[] = []
			for (const it of items) {
				const mode = parseItemMode(it.content ?? "")
				if (!mode.description.trim()) {
					blank.push(it.id)
				}
				if (
					mode.description.trim() &&
					mode.roleDefinition.trim() &&
					mode.description.trim() === mode.roleDefinition.trim()
				) {
					clones.push(it.id)
				}
			}
			expect(blank).toEqual([])
			expect(clones).toEqual([])
		})
	})
})
