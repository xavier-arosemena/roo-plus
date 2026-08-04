import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@/utils/test-utils"

import type { IndexingStatus } from "@roo-code/types"

import { vscode } from "@src/utils/vscode"

import { CodeIndexPopover } from "../CodeIndexPopover"

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

// Mutable extension state so each test can configure the provider / enabled flag
// before rendering. `vi.hoisted` keeps the reference available to the mocked module.
const { mockExtensionState } = vi.hoisted(() => ({
	mockExtensionState: {
		codebaseIndexConfig: {} as Record<string, unknown>,
		codebaseIndexModels: {} as Record<string, unknown>,
		cwd: "/workspace",
		apiConfiguration: {},
		platform: "linux",
		arch: "x64",
	},
}))

vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => mockExtensionState,
}))

vi.mock("@src/components/ui/hooks/useRooPortal", () => ({
	useRooPortal: () => document.body,
}))

vi.mock("@src/components/ui/hooks/useOpenRouterModelProviders", () => ({
	useOpenRouterModelProviders: () => ({ data: undefined }),
	OPENROUTER_DEFAULT_PROVIDER_NAME: "openrouter",
}))

vi.mock("react-i18next", () => ({
	Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Force the popover content to render (the `open` state is internal to the
// component), mirroring the pattern used by ApiConfigSelector.spec.tsx.
vi.mock("@src/components/ui", () => ({
	Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
		<div data-testid="popover-root" data-open={open}>
			{children}
		</div>
	),
	PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	PopoverContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="popover-content">{children}</div>
	),
	// Expose tooltip content in the DOM so tests can assert the hint is surfaced.
	StandardTooltip: ({ children, content }: { children: React.ReactNode; content?: React.ReactNode }) => (
		<span>
			{children}
			{content ? <span data-testid="tooltip-content">{content}</span> : null}
		</span>
	),
	Button: ({
		children,
		onClick,
		disabled,
		className,
		...props
	}: {
		children: React.ReactNode
		onClick?: () => void
		disabled?: boolean
		className?: string
		[key: string]: unknown
	}) => (
		<button onClick={onClick} disabled={disabled} className={className} {...props}>
			{children}
		</button>
	),
	Select: ({
		value,
		onValueChange,
		children,
	}: {
		value?: string
		onValueChange?: (value: string) => void
		children: React.ReactNode
	}) => (
		<select
			data-testid="provider-select"
			value={value}
			onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value)}>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectValue: () => null,
	SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
		<option value={value}>{children}</option>
	),
	Slider: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
		<div {...props}>{children}</div>
	),
	AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button onClick={onClick}>{children}</button>
	),
	AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button onClick={onClick}>{children}</button>
	),
}))

const DEFAULT_STATUS: IndexingStatus = {
	systemStatus: "Standby",
	processedItems: 0,
	totalItems: 0,
	currentItemUnit: "items",
}

const START_BUTTON_LABEL = "settings:codeIndex.startIndexingButton"
const UNSAVED_HINT = "settings:codeIndex.unsavedSettingsMessage"
const STATUS_ERROR_KEY = "settings:codeIndex.indexingStatuses.error"
const STATUS_INDEXED_KEY = "settings:codeIndex.indexingStatuses.indexed"
const SEMBLE_BINARY_PATH_LABEL = "settings:codeIndex.sembleBinaryPathLabel"
const SEMBLE_BINARY_PATH_DESCRIPTION = "settings:codeIndex.sembleBinaryPathDescription"
const SETUP_CONFIG_LABEL = "settings:codeIndex.setupConfigLabel"

const dispatchMessage = (data: unknown) => {
	act(() => {
		window.dispatchEvent(new MessageEvent("message", { data }))
	})
}

describe("CodeIndexPopover - indexing UI regression (VSIX #117)", () => {
	const renderPopover = (overrides: { enabled?: boolean; provider?: string; status?: IndexingStatus } = {}) => {
		mockExtensionState.codebaseIndexConfig = {
			codebaseIndexEnabled: overrides.enabled ?? true,
			codebaseIndexQdrantUrl: "",
			codebaseIndexEmbedderProvider: overrides.provider ?? "openai",
			codebaseIndexEmbedderModelId: "text-embedding-3-small",
			codebaseIndexEmbedderModelDimension: 1536,
			codebaseIndexSearchMaxResults: 50,
			codebaseIndexSearchMinScore: 0.4,
			codebaseIndexSembleBinaryPath: "",
		}
		mockExtensionState.codebaseIndexModels = {
			openai: { "text-embedding-3-small": { dimension: 1536 } },
		}

		return render(
			<CodeIndexPopover indexingStatus={overrides.status ?? DEFAULT_STATUS}>
				<button data-testid="popover-trigger" />
			</CodeIndexPopover>,
		)
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("enables Start Indexing when there are no unsaved changes", () => {
		renderPopover()

		const startButton = screen.getByRole("button", { name: START_BUTTON_LABEL })
		expect(startButton).not.toBeDisabled()
		expect(screen.queryByText(UNSAVED_HINT)).not.toBeInTheDocument()

		fireEvent.click(startButton)
		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "startIndexing" })
	})

	it("disables Start Indexing and surfaces a tooltip hint when there are unsaved changes", () => {
		renderPopover({ enabled: false })

		// Start button is hidden while codebase indexing is disabled.
		expect(screen.queryByRole("button", { name: START_BUTTON_LABEL })).not.toBeInTheDocument()

		// Enabling indexing creates an unsaved change (the initial setting was false).
		fireEvent.click(screen.getByRole("checkbox"))

		const startButton = screen.getByRole("button", { name: START_BUTTON_LABEL })
		expect(startButton).toBeDisabled()

		// The reason for the disabled state is surfaced via the tooltip hint.
		expect(screen.getByText(UNSAVED_HINT)).toBeInTheDocument()

		// Clicking the disabled button must not trigger indexing.
		fireEvent.click(startButton)
		expect(vscode.postMessage).not.toHaveBeenCalledWith({ type: "startIndexing" })
	})

	it("renders error status with the backend message in error styling", () => {
		renderPopover({
			status: {
				systemStatus: "Error",
				message: "Semble binary download failed",
				processedItems: 0,
				totalItems: 0,
			},
		})

		const statusLine = screen.getByText(/Semble binary download failed/)
		expect(statusLine).toHaveTextContent(`${STATUS_ERROR_KEY} - Semble binary download failed`)
		expect(statusLine).toHaveClass("text-vscode-errorForeground")
	})

	it("updates the displayed status to Indexed after an indexingStatusUpdate", async () => {
		renderPopover()

		dispatchMessage({
			type: "indexingStatusUpdate",
			values: {
				systemStatus: "Indexed",
				processedItems: 10,
				totalItems: 10,
				currentItemUnit: "files",
			},
		})

		await waitFor(() => {
			expect(screen.getByText(STATUS_INDEXED_KEY)).toBeInTheDocument()
		})
	})

	it("updates the displayed status to Error with the backend message after an indexingStatusUpdate", async () => {
		renderPopover()

		dispatchMessage({
			type: "indexingStatusUpdate",
			values: {
				systemStatus: "Error",
				message: "check failed",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "files",
			},
		})

		await waitFor(() => {
			const statusLine = screen.getByText(/check failed/)
			expect(statusLine).toHaveTextContent(`${STATUS_ERROR_KEY} - check failed`)
			expect(statusLine).toHaveClass("text-vscode-errorForeground")
		})
	})

	it("re-requests indexing status after a successful save so stale Standby is not kept", async () => {
		renderPopover()

		dispatchMessage({ type: "codeIndexSettingsSaved", success: true })

		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({ type: "requestIndexingStatus" })
		})
	})

	it("transitions Semble from Standby to ready (Indexed) after starting and receiving a status update", async () => {
		renderPopover({ provider: "semble" })

		const startButton = screen.getByRole("button", { name: START_BUTTON_LABEL })
		expect(startButton).not.toBeDisabled()

		fireEvent.click(startButton)
		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "startIndexing" })

		dispatchMessage({
			type: "indexingStatusUpdate",
			values: {
				systemStatus: "Indexed",
				processedItems: 1,
				totalItems: 1,
				currentItemUnit: "files",
			},
		})

		await waitFor(() => {
			expect(screen.getByText(STATUS_INDEXED_KEY)).toBeInTheDocument()
		})
	})

	it("shows a Semble failure message instead of a bare Standby", async () => {
		renderPopover({ provider: "semble" })

		dispatchMessage({
			type: "indexingStatusUpdate",
			values: {
				systemStatus: "Error",
				message: "Semble binary download failed",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			},
		})

		await waitFor(() => {
			const statusLine = screen.getByText(/Semble binary download failed/)
			expect(statusLine).toHaveClass("text-vscode-errorForeground")
		})
	})

	it("renders the Semble binary path field with its i18n keys when the provider is semble", () => {
		renderPopover({ provider: "semble" })

		// The Semble binary path field lives inside the collapsible Setup section.
		fireEvent.click(screen.getByRole("button", { name: SETUP_CONFIG_LABEL }))

		// Label and description render as plain text (t is mocked to return the key).
		// These confirm the Semble section is wired up to the sembleBinaryPath*
		// i18n keys rather than rendering a raw-key fallback.
		expect(screen.getByText(SEMBLE_BINARY_PATH_LABEL)).toBeInTheDocument()
		expect(screen.getByText(SEMBLE_BINARY_PATH_DESCRIPTION)).toBeInTheDocument()
	})
})
