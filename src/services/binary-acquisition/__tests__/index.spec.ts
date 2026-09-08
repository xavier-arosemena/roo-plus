// npx vitest run src/services/binary-acquisition/__tests__/index.spec.ts

import { t } from "../../../i18n"
import {
	BINARY_ACQUISITION_CONSENT_STORAGE_KEY,
	binaryAcquisitionStorageKey,
	buildBinaryAcquisitionConsentMessage,
	hasAlwaysAllowConsent,
	persistConsentDecision,
	requestBinaryAcquisitionApproval,
	requestBinaryAcquisitionConsent,
	resetBinaryConsentSession,
	type BinaryAcquisitionConsentStorage,
	type BinaryAcquisitionInfo,
} from "../index"

const consentInfo: BinaryAcquisitionInfo = {
	id: "test-binary",
	name: "Test Component",
	version: "v1.2.3",
	source: "example/repo",
	purpose: "test purpose",
	checksumSha256: "abcd1234",
	approxSize: "~1 MB",
}

function createStorage(): BinaryAcquisitionConsentStorage & { map: Map<string, unknown> } {
	const map = new Map<string, unknown>()
	return {
		map,
		get: (key, defaultValue) => (map.has(key) ? map.get(key) : defaultValue),
		update: vitest.fn(async (key, value) => {
			map.set(key, value)
		}),
	}
}

const trustState = { isTrusted: undefined as boolean | undefined, grantResult: false }
let nextSelection: "allow-once" | "always-allow" | "deny" | "dismiss" = "allow-once"

const showWarningMock = vitest.fn()

vitest.mock("vscode", () => ({
	workspace: {
		get isTrusted() {
			return trustState.isTrusted
		},
		requestWorkspaceTrust: vitest.fn(() => Promise.resolve(trustState.grantResult)),
	},
	window: {
		showWarningMessage: (...args: unknown[]) => showWarningMock(...args),
	},
}))

const allowOnceLabel = (): string => t("common:binaryConsent.allowOnce")
const alwaysAllowLabel = (): string => t("common:binaryConsent.alwaysAllow")
const denyLabel = (): string => t("common:binaryConsent.deny")

describe("binary acquisition consent", () => {
	beforeEach(() => {
		trustState.isTrusted = undefined
		trustState.grantResult = false
		nextSelection = "allow-once"
		showWarningMock.mockReset()
		showWarningMock.mockImplementation((_msg: string, _opts: unknown, ...buttons: string[]) => {
			if (nextSelection === "dismiss") {
				return Promise.resolve(undefined)
			}
			const index = nextSelection === "always-allow" ? 1 : nextSelection === "deny" ? 2 : 0
			return Promise.resolve(buttons[index])
		})
		resetBinaryConsentSession()
	})

	describe("requestBinaryAcquisitionConsent", () => {
		it("returns deny when the dialog is dismissed (never auto-defaults to allow)", async () => {
			await expect(requestBinaryAcquisitionConsent(consentInfo, () => Promise.resolve(undefined))).resolves.toBe(
				"deny",
			)
		})

		it("returns allow-once when the allow-once button is chosen", async () => {
			await expect(
				requestBinaryAcquisitionConsent(consentInfo, () => Promise.resolve(allowOnceLabel())),
			).resolves.toBe("allow-once")
		})

		it("returns always-allow when the always-allow button is chosen", async () => {
			await expect(
				requestBinaryAcquisitionConsent(consentInfo, () => Promise.resolve(alwaysAllowLabel())),
			).resolves.toBe("always-allow")
		})

		it("returns deny when the deny button is chosen", async () => {
			await expect(
				requestBinaryAcquisitionConsent(consentInfo, () => Promise.resolve(denyLabel())),
			).resolves.toBe("deny")
		})

		it("shows a modal dialog with the attribution metadata and three explicit choices", async () => {
			await requestBinaryAcquisitionConsent(consentInfo)
			expect(showWarningMock).toHaveBeenCalledWith(
				buildBinaryAcquisitionConsentMessage(consentInfo),
				{ modal: true },
				allowOnceLabel(),
				alwaysAllowLabel(),
				denyLabel(),
			)
		})
	})

	describe("persistence", () => {
		it("persists only an explicit always-allow decision, keyed by binary@version", async () => {
			const storage = createStorage()
			await persistConsentDecision(storage, "semble", "v0.5.2", "always-allow")
			expect(await hasAlwaysAllowConsent(storage, "semble", "v0.5.2")).toBe(true)
			expect(await hasAlwaysAllowConsent(storage, "semble", "v0.6.0")).toBe(false)
			expect(await hasAlwaysAllowConsent(storage, "other", "v0.5.2")).toBe(false)
			expect(storage.map.get(BINARY_ACQUISITION_CONSENT_STORAGE_KEY)).toEqual({
				[binaryAcquisitionStorageKey("semble", "v0.5.2")]: "always-allow",
			})
		})

		it("never persists allow-once or deny decisions", async () => {
			const storage = createStorage()
			await persistConsentDecision(storage, "semble", "v0.5.2", "allow-once")
			await persistConsentDecision(storage, "semble", "v0.5.2", "deny")
			expect(await hasAlwaysAllowConsent(storage, "semble", "v0.5.2")).toBe(false)
			expect(storage.map.size).toBe(0)
		})
	})

	describe("requestBinaryAcquisitionApproval", () => {
		it("never approves a download in an untrusted workspace", async () => {
			trustState.isTrusted = false
			trustState.grantResult = false
			const storage = createStorage()
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(false)
			expect(showWarningMock).not.toHaveBeenCalled()
			expect(storage.map.size).toBe(0)
		})

		it("requests trust first and proceeds to consent once trust is granted", async () => {
			trustState.isTrusted = false
			trustState.grantResult = true
			const storage = createStorage()
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			expect(showWarningMock).toHaveBeenCalledTimes(1)
		})

		it("short-circuits to approval when always-allow was previously persisted, without prompting", async () => {
			const storage = createStorage()
			await persistConsentDecision(storage, consentInfo.id, consentInfo.version, "always-allow")
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			expect(showWarningMock).not.toHaveBeenCalled()
		})

		it("allow-once approves one acquisition and is not re-prompted in the same session", async () => {
			const storage = createStorage()
			nextSelection = "allow-once"
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			// Not persisted.
			expect(await hasAlwaysAllowConsent(storage, consentInfo.id, consentInfo.version)).toBe(false)
			// Second attempt in the same session proceeds without prompting again.
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			expect(showWarningMock).toHaveBeenCalledTimes(1)
		})

		it("deny blocks the download and is not re-prompted in the same session", async () => {
			const storage = createStorage()
			nextSelection = "deny"
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(false)
			expect(showWarningMock).toHaveBeenCalledTimes(1)
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(false)
			expect(showWarningMock).toHaveBeenCalledTimes(1)
			expect(await hasAlwaysAllowConsent(storage, consentInfo.id, consentInfo.version)).toBe(false)
		})

		it("re-prompts after a session reset (deny is not persisted)", async () => {
			const storage = createStorage()
			nextSelection = "deny"
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(false)
			resetBinaryConsentSession()
			nextSelection = "allow-once"
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			expect(showWarningMock).toHaveBeenCalledTimes(2)
		})

		it("always-allow persists so future sessions do not re-prompt", async () => {
			const storage = createStorage()
			nextSelection = "always-allow"
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			expect(await hasAlwaysAllowConsent(storage, consentInfo.id, consentInfo.version)).toBe(true)
			resetBinaryConsentSession()
			await expect(requestBinaryAcquisitionApproval(storage, consentInfo)).resolves.toBe(true)
			expect(showWarningMock).toHaveBeenCalledTimes(1)
		})
	})
})
