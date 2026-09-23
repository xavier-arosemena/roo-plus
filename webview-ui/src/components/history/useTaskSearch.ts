import { useState, useMemo, useCallback } from "react"
import { Fzf } from "fzf"

import { highlightFzfMatch } from "@/utils/highlight"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { vscode } from "@/utils/vscode"

type SortOption = "newest" | "oldest" | "mostExpensive" | "mostTokens" | "mostRelevant"

export const useTaskSearch = () => {
	const { taskHistory, taskHistoryScope } = useExtensionState()
	const [searchQuery, setSearchQuery] = useState("")
	const [sortOption, setSortOption] = useState<SortOption>("newest")
	const [lastNonRelevantSort, setLastNonRelevantSort] = useState<SortOption | null>("newest")

	// The host now computes the task-history window PER WORKSPACE SCOPE
	// (2026-09-23 per-workspace history review), so the panel no longer filters
	// by workspace locally — doing so after truncation is what collapsed
	// `Workspace: Current` to ~1 row. This selector is a SCOPE switch: changing
	// it asks the host for that scope's first page (the reducer resets the list).
	const showAllWorkspaces = taskHistoryScope === "all"

	const setShowAllWorkspaces = useCallback((showAll: boolean) => {
		vscode.postMessage({ type: "getOlderTaskHistory", scope: showAll ? "all" : "current" })
	}, [])

	// Keep the relevance-sort state machine in sync with the search query using
	// the React-recommended "adjust state during render" pattern (each branch
	// converges, so no infinite loop) instead of an effect.
	if (searchQuery && sortOption !== "mostRelevant" && !lastNonRelevantSort) {
		setLastNonRelevantSort(sortOption)
		setSortOption("mostRelevant")
	} else if (!searchQuery && sortOption === "mostRelevant" && lastNonRelevantSort) {
		setSortOption(lastNonRelevantSort)
		setLastNonRelevantSort(null)
	}

	const presentableTasks = useMemo(() => {
		return taskHistory.filter((item) => item.ts && item.task)
	}, [taskHistory])

	const fzf = useMemo(() => {
		return new Fzf(presentableTasks, {
			selector: (item) => item.task,
		})
	}, [presentableTasks])

	const tasks = useMemo(() => {
		let results = presentableTasks

		if (searchQuery) {
			const searchResults = fzf.find(searchQuery)
			results = searchResults.map((result) => {
				const positions = Array.from(result.positions)
				const taskEndIndex = result.item.task.length

				return {
					...result.item,
					highlight: highlightFzfMatch(
						result.item.task,
						positions.filter((p) => p < taskEndIndex),
					),
					workspace: result.item.workspace,
				}
			})
		}

		// Then sort the results
		return [...results].sort((a, b) => {
			switch (sortOption) {
				case "oldest":
					return (a.ts || 0) - (b.ts || 0)
				case "mostExpensive":
					return (b.totalCost || 0) - (a.totalCost || 0)
				case "mostTokens":
					const aTokens = (a.tokensIn || 0) + (a.tokensOut || 0) + (a.cacheWrites || 0) + (a.cacheReads || 0)
					const bTokens = (b.tokensIn || 0) + (b.tokensOut || 0) + (b.cacheWrites || 0) + (b.cacheReads || 0)
					return bTokens - aTokens
				case "mostRelevant":
					// Keep fuse order if searching, otherwise sort by newest
					return searchQuery ? 0 : (b.ts || 0) - (a.ts || 0)
				case "newest":
				default:
					return (b.ts || 0) - (a.ts || 0)
			}
		})
	}, [presentableTasks, searchQuery, fzf, sortOption])

	return {
		tasks,
		searchQuery,
		setSearchQuery,
		sortOption,
		setSortOption,
		lastNonRelevantSort,
		setLastNonRelevantSort,
		showAllWorkspaces,
		setShowAllWorkspaces,
	}
}
