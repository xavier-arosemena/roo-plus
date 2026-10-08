import path, { resolve } from "path"
import fs from "fs"
import { execSync } from "child_process"

import { defineConfig, type PluginOption, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import { sourcemapPlugin } from "./src/vite-plugins/sourcemapPlugin"

function getGitSha() {
	let gitSha: string | undefined = undefined

	try {
		gitSha = execSync("git rev-parse HEAD").toString().trim()
	} catch (_error) {
		// Do nothing.
	}

	return gitSha
}

const wasmPlugin = (): Plugin => ({
	name: "wasm",
	async load(id) {
		if (id.endsWith(".wasm")) {
			const wasmBinary = await import(id)

			return `
           			const wasmModule = new WebAssembly.Module(${wasmBinary.default});
           			export default wasmModule;
         		`
		}
	},
})

const persistPortPlugin = (): Plugin => ({
	name: "write-port-to-file",
	configureServer(viteDevServer) {
		viteDevServer?.httpServer?.once("listening", () => {
			const address = viteDevServer?.httpServer?.address()
			const port = address && typeof address === "object" ? address.port : null

			if (port) {
				fs.writeFileSync(resolve(__dirname, "..", ".vite-port"), port.toString())
				console.log(`[Vite Plugin] Server started on port ${port}`)
			} else {
				console.warn("[Vite Plugin] Could not determine server port")
			}
		})
	},
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	let outDir = "../src/webview-ui/build"

	const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "package.json"), "utf8"))
	const gitSha = getGitSha()

	const define: Record<string, any> = {
		"process.platform": JSON.stringify(process.platform),
		"process.env.VSCODE_TEXTMATE_DEBUG": JSON.stringify(process.env.VSCODE_TEXTMATE_DEBUG),
		"process.env.PKG_NAME": JSON.stringify(pkg.name),
		"process.env.PKG_VERSION": JSON.stringify(pkg.version),
		"process.env.PKG_OUTPUT_CHANNEL": JSON.stringify("Zoo-Code"),
		"process.env.PKG_RELEASE_CHANNEL": JSON.stringify(process.env.PKG_RELEASE_CHANNEL || "stable"),
		...(gitSha ? { "process.env.PKG_SHA": JSON.stringify(gitSha) } : {}),
	}

	// TODO: We can use `@roo-code/build` to generate `define` once the
	// monorepo is deployed.
	if (mode === "nightly") {
		outDir = "../apps/vscode-nightly/build/webview-ui/build"

		const nightlyPkg = JSON.parse(
			fs.readFileSync(path.join(__dirname, "..", "apps", "vscode-nightly", "package.nightly.json"), "utf8"),
		)

		define["process.env.PKG_NAME"] = JSON.stringify(nightlyPkg.name)
		define["process.env.PKG_VERSION"] = JSON.stringify(nightlyPkg.version)
		define["process.env.PKG_OUTPUT_CHANNEL"] = JSON.stringify("Zoo-Code-Nightly")
		define["process.env.PKG_RELEASE_CHANNEL"] = JSON.stringify("prerelease")
	}

	// Modules owned by the Mermaid diagram engine. Every captured module is
	// either eagerly bundled (Mermaid's core, via the static import in
	// `MermaidBlock`) or lazily loaded (each diagram renderer, via Mermaid's
	// internal dynamic imports); the `codeSplitting` groups below split the two
	// so diagram renderers are never pulled into the initial graph.
	const MERMAID_MODULES = /[\\/]node_modules[\\/](mermaid[\\/]|@mermaid-js[\\/])/

	const plugins: PluginOption[] = [react(), tailwindcss(), persistPortPlugin(), wasmPlugin(), sourcemapPlugin()]

	return {
		// Emit RELATIVE asset URLs (`./assets/...`) instead of Vite's default
		// root-absolute `/assets/...` (issue #416). The webview is served from a
		// non-root `asWebviewUri` prefix, so a root-absolute URL escapes that
		// prefix and the resource server answers 401: the emitted preload helper
		// (`"/"+e`) and the 60 `url(/assets/fonts/…)` refs in the CSS all break.
		base: "./",
		plugins,
		resolve: {
			tsconfigPaths: true,
		},
		build: {
			outDir,
			emptyOutDir: true,
			reportCompressedSize: false,
			// Belt-and-braces with the hardened boot guard (issue #416): do not
			// emit `link[rel=modulepreload]` hint links at all. A benign preload
			// hint failing to load must never be conflated with a dead boot.
			modulePreload: false,
			// Generate complete source maps with original TypeScript sources
			sourcemap: true,
			// Vite 8 uses Rolldown/Oxc by default; keep non-production modes readable.
			minify: mode === "production",
			// Use a single combined CSS bundle so all webviews share styles
			cssCodeSplit: false,
			rolldownOptions: {
				// Externalize vscode module - it's imported by file-search.ts which is
				// dynamically imported by roo-config/index.ts, but should never be bundled
				// in the webview since it's not available in the browser context
				external: ["vscode"],
				input: resolve(__dirname, "index.html"),
				output: {
					entryFileNames: "assets/[name].js",
					chunkFileNames: "assets/[name]-[hash].js",
					assetFileNames: (assetInfo) => {
						const name = assetInfo.name ?? ""

						if (name.endsWith(".css")) {
							return "assets/index.css"
						}

						if (/\.(woff2?|ttf)$/.test(name)) {
							return "assets/fonts/[name][extname]"
						}

						return "assets/[name][extname]"
					},
					// Consolidate the webview chunk fan-out (issue #13). The VSIX
					// Marketplace warns at >100 packaged `.js` files; the webview
					// production build was the dominant contributor (Mermaid emits
					// one lazily-imported chunk per diagram type, and Shiki emits a
					// tiny re-export shim per grammar that is also embedded by
					// another grammar). Split by reachability, NOT uniformly lazy:
					// Mermaid's CORE is eagerly bundled (it is statically imported
					// by `MermaidBlock`, so the `mermaid-core` group is tagged
					// `$initial` and lands in the initial graph); only the Shiki
					// grammar and Mermaid diagram-renderer chunks are LAZY — each
					// is reachable solely through a dynamic import, so it is
					// fetched on demand, never at startup.
					codeSplitting: {
						groups: [
							{
								// Shiki: `shiki/dist/langs/<x>.mjs` is a one-line
								// re-export of the canonical `@shikijs/langs/dist/<x>.mjs`
								// grammar. When a grammar is also embedded by another
								// curated grammar (e.g. `c` is embedded by `glsl`,
								// `lua`, `ruby`), Rolldown splits the shared grammar
								// into its own chunk and emits the dynamic entry as a
								// separate ~60-byte facade. Co-locating each facade
								// with its canonical grammar removes those shims while
								// preserving per-language lazy loading.
								name: (id) => {
									const canonical = /[\\/]@shikijs[\\/]langs[\\/]dist[\\/]([^\\/]+)\.mjs$/.exec(id)

									if (canonical) {
										return `shiki-lang-${canonical[1]}`
									}

									const facade = /[\\/]shiki[\\/]dist[\\/]langs[\\/]([^\\/]+)\.mjs$/.exec(id)

									return facade ? `shiki-lang-${facade[1]}` : null
								},
								test: /[\\/]node_modules[\\/](shiki[\\/]dist[\\/]langs|@shikijs[\\/]langs[\\/]dist)[\\/]/,
							},
							{
								// Mermaid is reached from two directions: `MermaidBlock`
								// is statically imported by MarkdownBlock (so Mermaid's
								// core is part of the initial graph), while each diagram
								// type is loaded through its own dynamic import. Split
								// Mermaid by reachability so the eagerly-reachable core
								// collapses into a single initial chunk and the diagram
								// renderers collapse into lazily-loaded chunk(s) that
								// are still fetched only when a diagram renders.
								name: "mermaid-core",
								test: MERMAID_MODULES,
								tags: ["$initial"],
							},
							{
								// The rest of Mermaid (its diagram renderers) is reached
								// only through Mermaid's internal dynamic imports.
								// `entriesAware` groups matching modules by the set of
								// entries that import them, so a diagram ships the code
								// it uses plus genuinely shared helpers instead of
								// dragging in the whole engine. The merge threshold
								// coalesces tiny subgroups to keep the total chunk count
								// within the VSIX budget.
								name: "mermaid",
								test: MERMAID_MODULES,
								entriesAware: true,
								entriesAwareMergeThreshold: 96 * 1024,
								includeDependenciesRecursively: false,
							},
						],
					},
				},
			},
		},
		server: {
			hmr: {
				host: "localhost",
				protocol: "ws",
			},
			cors: {
				origin: "*",
				methods: "*",
				allowedHeaders: "*",
			},
		},
		define,
		optimizeDeps: {
			exclude: ["@vscode/codicons", "vscode-oniguruma", "shiki"],
		},
		assetsInclude: ["**/*.wasm", "**/*.wav"],
	}
})
