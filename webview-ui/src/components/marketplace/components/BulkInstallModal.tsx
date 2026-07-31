import React, { useState, useEffect, useMemo } from "react"
import { MarketplaceItem } from "@roo-code/types"
import { isTrustedMessage } from "@/utils/trustedMessages"
import { vscode } from "@/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface BulkInstallResult {
	slug: string
	success: boolean
	error?: string
}

interface BulkInstallModalProps {
	items: MarketplaceItem[]
	isOpen: boolean
	onClose: () => void
	hasWorkspace: boolean
}

type InstallState = "idle" | "installing" | "complete"

export const BulkInstallModal: React.FC<BulkInstallModalProps> = ({ items, isOpen, onClose, hasWorkspace }) => {
	const { t } = useAppTranslation()
	const [scope, setScope] = useState<"project" | "global">(hasWorkspace ? "project" : "global")
	const [installState, setInstallState] = useState<InstallState>("idle")
	const [currentIndex, setCurrentIndex] = useState(0)
	const [results, setResults] = useState<BulkInstallResult[]>([])

	// Reset state when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setInstallState("idle")
			setCurrentIndex(0)
			setResults([])
			setScope(hasWorkspace ? "project" : "global")
		}
	}, [isOpen, hasWorkspace])

	// Listen for bulk install results
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (!isTrustedMessage(event)) return
			const message = event.data
			if (message.type === "marketplaceBulkInstallResult" && message.results) {
				setResults(message.results)
				setInstallState("complete")
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	const handleInstallAll = () => {
		if (items.length === 0) return

		setInstallState("installing")
		setCurrentIndex(0)

		// Send bulk install message to backend
		vscode.postMessage({
			type: "installMarketplaceItems",
			mpItems: items,
			mpInstallOptions: { target: scope },
		})
	}

	const successCount = useMemo(() => results.filter((r) => r.success).length, [results])
	const failCount = useMemo(() => results.filter((r) => !r.success).length, [results])

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{installState === "complete"
							? failCount === 0
								? t("marketplace:bulkInstall.successTitle", { count: String(successCount) })
								: t("marketplace:bulkInstall.partialTitle", {
										success: String(successCount),
										failed: String(failCount),
									})
							: t("marketplace:bulkInstall.title", { count: String(items.length) })}
					</DialogTitle>
					<DialogDescription>
						{installState === "complete"
							? failCount === 0
								? t("marketplace:bulkInstall.successDescription")
								: t("marketplace:bulkInstall.partialDescription")
							: t("marketplace:bulkInstall.description", { count: String(items.length) })}
					</DialogDescription>
				</DialogHeader>

				{installState === "installing" ? (
					/* Progress state */
					<div className="space-y-4 py-4">
						<div className="flex items-center justify-center gap-2 text-vscode-foreground">
							<Loader2 className="h-5 w-5 animate-spin" />
							<span>
								{t("marketplace:bulkInstall.progress", {
									current: String(currentIndex || 1),
									total: String(items.length),
								})}
							</span>
						</div>
						<div className="w-full bg-vscode-input-border rounded-full h-2">
							<div
								className="bg-vscode-button-background h-2 rounded-full transition-all duration-300 ease-in-out"
								style={{ width: `${(currentIndex / items.length) * 100}%` }}
							/>
						</div>
					</div>
				) : installState === "complete" ? (
					/* Results summary */
					<div className="space-y-3 py-2 max-h-64 overflow-y-auto">
						{results.map((result) => {
							const item = items.find((i) => i.id === result.slug)
							return (
								<div
									key={result.slug}
									className={`flex items-start gap-2 p-2 rounded ${
										result.success ? "bg-green-600/10 text-green-400" : "bg-red-600/10 text-red-400"
									}`}>
									{result.success ? (
										<CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
									) : (
										<XCircle className="h-4 w-4 mt-0.5 shrink-0" />
									)}
									<div className="min-w-0">
										<div className="text-sm font-medium">{item?.name || result.slug}</div>
										{!result.success && result.error && (
											<div className="text-xs mt-0.5 opacity-80">{result.error}</div>
										)}
									</div>
								</div>
							)
						})}
					</div>
				) : (
					/* Configuration state (idle) */
					<div className="space-y-4 py-2">
						{/* Installation scope */}
						<div className="space-y-2">
							<div className="text-base font-semibold">{t("marketplace:bulkInstall.scope")}</div>
							<div className="space-y-2">
								<label className="flex items-center space-x-2">
									<input
										type="radio"
										name="bulk-scope"
										value="project"
										checked={scope === "project"}
										onChange={() => setScope("project")}
										disabled={!hasWorkspace}
										className="rounded-full"
									/>
									<span className={!hasWorkspace ? "opacity-50" : ""}>
										{t("marketplace:bulkInstall.project")}
									</span>
								</label>
								<label className="flex items-center space-x-2">
									<input
										type="radio"
										name="bulk-scope"
										value="global"
										checked={scope === "global"}
										onChange={() => setScope("global")}
										className="rounded-full"
									/>
									<span>{t("marketplace:bulkInstall.global")}</span>
								</label>
							</div>
						</div>

						{/* Selected items list */}
						<div className="space-y-2">
							<div className="text-base font-semibold">
								{t("marketplace:bulkInstall.itemsToInstall", { count: String(items.length) })}
							</div>
							<div className="max-h-48 overflow-y-auto space-y-1">
								{items.map((item) => {
									const _result = results.find((r) => r.slug === item.id)
									return (
										<div
											key={item.id}
											className="flex items-center gap-2 text-sm text-vscode-foreground py-1 px-2 rounded hover:bg-vscode-editor-foreground/5">
											<span className="truncate">{item.name}</span>
										</div>
									)
								})}
							</div>
						</div>
					</div>
				)}

				<DialogFooter>
					{installState === "complete" ? (
						<Button onClick={onClose}>{t("marketplace:bulkInstall.done")}</Button>
					) : (
						<>
							<Button variant="outline" onClick={onClose}>
								{t("marketplace:bulkInstall.cancel")}
							</Button>
							{installState === "idle" && items.length > 0 && (
								<Button onClick={handleInstallAll}>
									{t("marketplace:bulkInstall.installButton", { count: String(items.length) })}
								</Button>
							)}
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
