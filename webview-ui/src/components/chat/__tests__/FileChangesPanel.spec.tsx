import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@/utils/test-utils"

import type { ClineMessage } from "@roo-code/types"

import { vscode } from "@src/utils/vscode"

import FileChangesPanel from "../FileChangesPanel"

vi.mock("@/i18n/setup", () => ({
	__esModule: true,
	default: {
		use: vi.fn().mockReturnThis(),
		init: vi.fn().mockReturnThis(),
		addResourceBundle: vi.fn(),
		language: "en",
		changeLanguage: vi.fn(),
	},
	loadTranslations: vi.fn(),
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				"chat:fileChangesInConversation.header": "Files changed",
			}
			return translations[key] || key
		},
		i18n: {
			language: "en",
			changeLanguage: vi.fn(),
		},
	}),
	initReactI18next: {
		type: "3rdParty",
		init: vi.fn(),
	},
	Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// CodeBlock uses the translation context; it is only rendered for non-diff
// languages, but the module import still resolves.
vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

// Mock vscode API
vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

// Mock the VSCode progress ring used by CodeAccordion (not rendered in these tests)
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeProgressRing: () => <span data-testid="progress-ring" />,
}))

// A tool message carrying one edited file with original content, so the panel
// requests the final content and can render a merged diff.
const clineMessages: ClineMessage[] = [
	{
		ts: 1,
		type: "ask",
		ask: "tool",
		isAnswered: true,
		text: JSON.stringify({
			tool: "editedExistingFile",
			path: "src/foo.ts",
			diff: "-alpha\n+beta",
			originalContent: "alpha",
		}),
	},
]

describe("FileChangesPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	const expandPanelAndFile = () => {
		render(<FileChangesPanel clineMessages={clineMessages} />)
		// Expand the whole panel first (Radix Collapsible only mounts content when open).
		fireEvent.click(screen.getByRole("button", { name: /Files changed/i }))
		// Expand the per-file accordion so the panel requests the final file content.
		fireEvent.click(screen.getByText(/foo\.ts/))
	}

	it("requests final file content when a file row is expanded", async () => {
		expandPanelAndFile()

		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "readFileContent",
				text: "src/foo.ts",
			})
		})
	})

	it("applies a fileContent message from a trusted (same/empty origin) source", async () => {
		expandPanelAndFile()

		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({ type: "readFileContent", text: "src/foo.ts" })
		})

		// A trusted message (empty origin -> same-context/extension host) is applied
		// and the merged diff (containing the new "gamma" line) is rendered.
		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: "fileContent", fileContent: { path: "src/foo.ts", content: "alpha\ngamma" } },
				}),
			)
		})

		await waitFor(() => {
			expect(screen.getByText(/gamma/)).toBeInTheDocument()
		})
	})

	it("ignores fileContent messages from untrusted (cross-origin) sources", async () => {
		expandPanelAndFile()

		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({ type: "readFileContent", text: "src/foo.ts" })
		})

		// A cross-origin message must be rejected: forged content never reaches
		// state and the merged diff must not appear.
		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					origin: "https://evil.example",
					data: { type: "fileContent", fileContent: { path: "src/foo.ts", content: "alpha\nEVIL CONTENT" } },
				}),
			)
		})

		// Give the (ignored) message a chance to (incorrectly) update state.
		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalled()
		})

		expect(screen.queryByText(/EVIL CONTENT/)).not.toBeInTheDocument()
		// The panel still shows the original diff (no merged content was injected).
		expect(screen.queryByText(/gamma/)).not.toBeInTheDocument()
	})

	it("applies a trusted message even after a cross-origin message was rejected", async () => {
		expandPanelAndFile()

		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({ type: "readFileContent", text: "src/foo.ts" })
		})

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					origin: "https://evil.example",
					data: { type: "fileContent", fileContent: { path: "src/foo.ts", content: "alpha\nEVIL CONTENT" } },
				}),
			)
		})

		// The subsequent legitimate message from the extension host is still applied.
		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: "fileContent", fileContent: { path: "src/foo.ts", content: "alpha\ngamma" } },
				}),
			)
		})

		await waitFor(() => {
			expect(screen.getByText(/gamma/)).toBeInTheDocument()
		})
		expect(screen.queryByText(/EVIL CONTENT/)).not.toBeInTheDocument()
	})
})
