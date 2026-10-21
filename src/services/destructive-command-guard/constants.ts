export const DCG_VERSION = "v0.7.7"

export type DcgArchiveInfo = Readonly<{
	/** Upstream release asset name — byte-identical to the file bundled in the VSIX. */
	archive: string
	binary: "dcg" | "dcg.exe"
	/** SHA-256 of the upstream archive, verified before extraction. */
	sha256: string
	/** SHA-256 of the executable inside that archive, verified after extraction. */
	binarySha256: string
}>

export const DCG_ARCHIVES: Readonly<Record<string, DcgArchiveInfo>> = {
	"darwin-x64": {
		archive: "dcg-x86_64-apple-darwin.tar.xz",
		binary: "dcg",
		sha256: "15b42fbbbeab47123899e6328d90cd593e14999f3d275f71294815ad8ed9479c",
		binarySha256: "8f2a53fb20ea3e91b7e91bdb64f12c800b8c3b789a784a5871f26475ac0981d2",
	},
	"darwin-arm64": {
		archive: "dcg-aarch64-apple-darwin.tar.xz",
		binary: "dcg",
		sha256: "a63cf82bd3584055112d5ec7a4ab3d7e0619a9f806a53930c27aa0e6297484de",
		binarySha256: "48616e766d6579eaa7cbb9dac949c1d36455f1374f91872d6ed5591976ecd282",
	},
	"linux-arm64": {
		archive: "dcg-aarch64-unknown-linux-gnu.tar.xz",
		binary: "dcg",
		sha256: "abb0d94f23ab50f9edc16f8ca6939ff8eec23e1831d3ad7a28d9f03252c3306d",
		binarySha256: "8927f75a3b337c1a2f5d87585f4c9abc0a3e17a214a72ccb5c46cee5db8163bc",
	},
	"linux-x64": {
		archive: "dcg-x86_64-unknown-linux-musl.tar.xz",
		binary: "dcg",
		sha256: "472b130a9b235edc57e6cb7566641da5fef905e9dbefd3a46f9ad1e33205fa04",
		binarySha256: "131acedaa3e3576fe2c3e253a5f4209e5ba4b75bbff7faf1ee3e18cb88e95a66",
	},
	"win32-x64": {
		archive: "dcg-x86_64-pc-windows-msvc.zip",
		binary: "dcg.exe",
		sha256: "435127410eabc53e772be4f5c668a875b45fbaf806654b577c2d975bd0e38964",
		binarySha256: "93d3da674c1ab398fec425532f72b2d3d55ab72340bd91ccd90cf8acd5f21912",
	},
} as const

/**
 * Directory (relative to the extension root) that carries the five upstream
 * release archives inside the packaged VSIX.
 *
 * DCG is distributed **bundled**, not downloaded at runtime (decision DCG 3a,
 * 2026-10-21 — see `docs/DCG-RELEASE-GOVERNANCE.md`). The archives are the
 * unmodified upstream release assets, so the pinned `sha256` values above are
 * still the published upstream checksums; `binarySha256` additionally covers
 * the extracted executable so a tampered VSIX is detected at first use.
 */
export const DCG_BUNDLE_DIR = "bin/dcg"

/**
 * Provenance for the bundled bytes lives in `THIRD-PARTY-NOTICES.md` §1.1 and
 * `docs/DCG-RELEASE-GOVERNANCE.md`; there is deliberately no release-URL constant
 * here, because Roo+ never fetches DCG over the network. The no-network property
 * is enforced by `__tests__/manager.spec.ts`, which mocks `https.get` and asserts
 * it is never called on any install path.
 */
export const DCG_RUN_TIMEOUT_MS = 3_000
export const DCG_MAX_OUTPUT_BYTES = 256 * 1024
