import React from "react"
import { render, screen, act } from "@/utils/test-utils"

import type { IndexingStatus } from "@roo-code/types"

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

// The real context recreates `codebaseIndexConfig` as a fresh object reference
// on every extension state push. `useExtensionState` below returns a fresh
// object on every call to model that reference-unstable context churn — this is
// what used to drive the render-phase reference guard into React error #301
// ("Too many re-renders") before the loop-safe conversion.
const { holder } = vi.hoisted(() => ({
	holder: {
		config: {
			codebaseIndexEnabled: true,
			codebaseIndexQdrantUrl: "",
			codebaseIndexEmbedderProvider: "openai",
			codebaseIndexEmbedderModelId: "text-embedding-3-small",
			codebaseIndexEmbedderModelDimension: 1536,
			codebaseIndexSearchMaxResults: 50,
			codebaseIndexSearchMinScore: 0.4,
			codebaseIndexSembleBinaryPath: "",
		},
		models: {
			openai: { "text-embedding-3-small": { dimension: 1536 } },
		},
	},
}))

vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		// Fresh object reference on every call (reference-unstable config).
		codebaseIndexConfig: { ...holder.config },
		codebaseIndexModels: holder.models,
		cwd: "/workspace",
		apiConfiguration: {},
		platform: "linux",
		arch: "x64",
	}),
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
// component), mirroring the pattern used by CodeIndexPopover.spec.tsx.
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
	StandardTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

const renderPopover = (status: IndexingStatus = DEFAULT_STATUS) =>
	render(
		<CodeIndexPopover indexingStatus={status}>
			<button data-testid="popover-trigger" />
		</CodeIndexPopover>,
	)

// The "codebase indexing enabled" checkbox is rendered first; the workspace
// toggle / auto-enable checkboxes come later and are gated on `enabled`.
const enabledCheckbox = () => screen.getAllByRole("checkbox")[0] as HTMLInputElement

describe("CodeIndexPopover - loop-safe hardening (issue #245 regression)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		holder.config = {
			codebaseIndexEnabled: true,
			codebaseIndexQdrantUrl: "",
			codebaseIndexEmbedderProvider: "openai",
			codebaseIndexEmbedderModelId: "text-embedding-3-small",
			codebaseIndexEmbedderModelDimension: 1536,
			codebaseIndexSearchMaxResults: 50,
			codebaseIndexSearchMinScore: 0.4,
			codebaseIndexSembleBinaryPath: "",
		}
	})

	it("initializes settings from the loaded config on mount", () => {
		renderPopover()
		// enabled=true in the config → the checkbox reflects it (checked).
		expect(enabledCheckbox()).toBeChecked()
	})

	it("does not loop when the context re-emits a fresh codebaseIndexConfig reference with identical content", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			const { rerender } = renderPopover()

			// Pump many consecutive re-renders. Each render observes a NEW
			// config object reference (context churn) with identical logical
			// content. A render-phase reference guard would setState on every
			// render → React error #301 ("Too many re-renders").
			for (let i = 0; i < 20; i++) {
				act(() => {
					rerender(
						<CodeIndexPopover indexingStatus={{ ...DEFAULT_STATUS }}>
							<button data-testid="popover-trigger" />
						</CodeIndexPopover>,
					)
				})
			}

			expect(
				errorSpy.mock.calls.some(
					([message]) =>
						typeof message === "string" &&
						(message.includes("Too many re-renders") || message.includes("Maximum update depth exceeded")),
				),
			).toBe(false)

			// Settings were initialized from the (unchanged) config on mount and
			// were not clobbered by the churn.
			expect(enabledCheckbox()).toBeChecked()
		} finally {
			errorSpy.mockRestore()
		}
	})

	it("re-initializes settings when the config content changes (not just its reference)", () => {
		const { rerender } = renderPopover()
		expect(enabledCheckbox()).toBeChecked()

		// Logical content change: enabled flips to false → settings re-init.
		act(() => {
			holder.config = { ...holder.config, codebaseIndexEnabled: false }
			rerender(
				<CodeIndexPopover indexingStatus={{ ...DEFAULT_STATUS }}>
					<button data-testid="popover-trigger" />
				</CodeIndexPopover>,
			)
		})

		expect(enabledCheckbox()).not.toBeChecked()
	})

	it("does not loop when the parent passes a fresh indexingStatus object with identical content", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			const { rerender } = renderPopover()

			for (let i = 0; i < 20; i++) {
				act(() => {
					rerender(
						<CodeIndexPopover indexingStatus={{ ...DEFAULT_STATUS, processedItems: 0 }}>
							<button data-testid="popover-trigger" />
						</CodeIndexPopover>,
					)
				})
			}

			expect(
				errorSpy.mock.calls.some(
					([message]) =>
						typeof message === "string" &&
						(message.includes("Too many re-renders") || message.includes("Maximum update depth exceeded")),
				),
			).toBe(false)

			expect(enabledCheckbox()).toBeChecked()
		} finally {
			errorSpy.mockRestore()
		}
	})
})
