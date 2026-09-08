// npx vitest run src/utils/__tests__/workspaceTrust.spec.ts

import { t } from "../../i18n"
import {
	isWorkspaceTrusted,
	requestWorkspaceTrust,
	ensureWorkspaceTrusted,
	WORKSPACE_TRUST_MESSAGE_KEY,
} from "../workspaceTrust"

const trustState: {
	isTrusted: boolean | undefined
	requestResult: boolean
	requestImpl: ((opts?: { modal?: boolean; message?: string }) => Thenable<boolean>) | undefined
	apiAvailable: boolean
} = {
	isTrusted: undefined,
	requestResult: false,
	requestImpl: undefined,
	apiAvailable: true,
}

const requestFn = vitest.fn((opts?: { modal?: boolean; message?: string }) => {
	if (trustState.requestImpl) {
		return trustState.requestImpl(opts)
	}
	return Promise.resolve(trustState.requestResult)
})

vitest.mock("vscode", () => ({
	workspace: {
		get isTrusted() {
			return trustState.isTrusted
		},
		get requestWorkspaceTrust() {
			// Simulate the API being absent in some environments/tests.
			return trustState.apiAvailable ? requestFn : undefined
		},
	},
	window: {},
}))

describe("workspaceTrust", () => {
	beforeEach(() => {
		trustState.isTrusted = undefined
		trustState.requestResult = false
		trustState.requestImpl = undefined
		trustState.apiAvailable = true
		requestFn.mockClear()
	})

	describe("isWorkspaceTrusted", () => {
		it("returns false when vscode reports an explicitly untrusted workspace", () => {
			trustState.isTrusted = false
			expect(isWorkspaceTrusted()).toBe(false)
		})

		it("returns true when vscode reports a trusted workspace", () => {
			trustState.isTrusted = true
			expect(isWorkspaceTrusted()).toBe(true)
		})

		it("treats an undefined trust state as trusted (no explicit untrusted workspace)", () => {
			trustState.isTrusted = undefined
			expect(isWorkspaceTrusted()).toBe(true)
		})
	})

	describe("requestWorkspaceTrust", () => {
		it("returns false when the requestWorkspaceTrust API is unavailable", async () => {
			trustState.apiAvailable = false
			await expect(requestWorkspaceTrust()).resolves.toBe(false)
		})

		it("returns true when the user grants trust", async () => {
			trustState.isTrusted = false
			trustState.requestResult = true
			await expect(requestWorkspaceTrust()).resolves.toBe(true)
		})

		it("returns false when the user declines trust", async () => {
			trustState.isTrusted = false
			trustState.requestResult = false
			await expect(requestWorkspaceTrust()).resolves.toBe(false)
		})

		it("fails safe when the request throws", async () => {
			trustState.isTrusted = false
			trustState.requestImpl = () => Promise.reject(new Error("boom"))
			await expect(requestWorkspaceTrust()).resolves.toBe(false)
		})

		it("passes a localized message explaining why trust is required", async () => {
			trustState.isTrusted = false
			trustState.requestImpl = (opts) => {
				expect(opts?.message).toBe(t(WORKSPACE_TRUST_MESSAGE_KEY))
				return Promise.resolve(false)
			}
			await requestWorkspaceTrust(WORKSPACE_TRUST_MESSAGE_KEY)
			expect(requestFn).toHaveBeenCalledTimes(1)
		})
	})

	describe("ensureWorkspaceTrusted", () => {
		it("proceeds immediately when the workspace is already trusted", async () => {
			trustState.isTrusted = true
			await expect(ensureWorkspaceTrusted()).resolves.toBe(true)
			expect(requestFn).not.toHaveBeenCalled()
		})

		it("requests trust when the workspace is untrusted and grants on approval", async () => {
			trustState.isTrusted = false
			trustState.requestResult = true
			await expect(ensureWorkspaceTrusted()).resolves.toBe(true)
			expect(requestFn).toHaveBeenCalledTimes(1)
		})

		it("returns false (operation must not run) when trust is declined", async () => {
			trustState.isTrusted = false
			trustState.requestResult = false
			await expect(ensureWorkspaceTrusted()).resolves.toBe(false)
			expect(requestFn).toHaveBeenCalledTimes(1)
		})
	})
})
