// npx vitest run src/services/binary-acquisition/__tests__/info.spec.ts

import { SEMBLE_SHA256, SEMBLE_VERSION } from "../../code-index/semble/semble-downloader"
import { DCG_ARCHIVES, DCG_VERSION } from "../../destructive-command-guard/constants"
import { buildSembleAcquisitionInfo } from "../semble"
import { buildDcgAcquisitionInfo } from "../dcg"

const platformKey = `${process.platform}-${process.arch}`

describe("binary acquisition attribution metadata (Marketplace #305 D3/3A)", () => {
	it("Semble metadata carries the pinned version, upstream repo, checksum and size", () => {
		const archive = SEMBLE_SHA256[platformKey]
		if (!archive) {
			return // platform has no prebuilt Semble
		}

		const info = buildSembleAcquisitionInfo()
		expect(info).toBeDefined()
		expect(info!.id).toBe("semble")
		expect(info!.name).toBe("Semble")
		expect(info!.version).toBe(SEMBLE_VERSION)
		expect(info!.source).toContain("Audare-est-Facere/sembleexec")
		expect(info!.checksumSha256).toBe(SEMBLE_SHA256[platformKey])
		expect(info!.approxSize).toContain("MB")
	})

	it("DCG metadata carries the pinned version, upstream repo, checksum and size", () => {
		const archive = DCG_ARCHIVES[platformKey]
		if (!archive) {
			return // platform has no prebuilt DCG
		}

		const info = buildDcgAcquisitionInfo()
		expect(info).toBeDefined()
		expect(info!.id).toBe("destructive-command-guard")
		expect(info!.version).toBe(DCG_VERSION)
		expect(info!.source).toContain("Dicklesworthstone/destructive_command_guard")
		expect(info!.checksumSha256).toBe(DCG_ARCHIVES[platformKey].sha256)
		expect(info!.approxSize).toContain("MB")
	})
})
