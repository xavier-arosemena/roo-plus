import type { Task } from "../task/Task"

/**
 * The narrow slice of `Task` that tools are allowed to touch.
 *
 * Why this type exists: `BaseTool.execute()` used to take the whole `Task`, so
 * every tool could reach any part of the agent loop. That made `Task` a de-facto
 * god object and blocked any extraction of cohesive services out of it — you
 * cannot move a responsibility out of `Task` while 23 tools hold a reference to
 * all of it.
 *
 * This type is a `Pick` over exactly the members the tool layer uses today. It
 * is deliberately a `Pick` rather than a hand-written structural type so it
 * cannot drift from `Task`: if `Task` renames or narrows a member, this file
 * fails to compile.
 *
 * Rules:
 * - Adding a member here is a deliberate widening of the tool contract. Prefer
 *   passing the value through `ToolCallbacks` or a tool-specific option.
 * - Removing a member requires the compiler to be clean across
 *   `src/core/tools/**`.
 * - Do not add `Task` itself, `providerRef.deref()` chains, or anything that
 *   lets a tool start, cancel, or re-enter the agent loop.
 */
export type ToolExecutionContext = Pick<
	Task,
	| "api"
	| "ask"
	| "say"
	| "cwd"
	| "taskId"
	| "parentTaskId"
	| "providerRef"
	| "diffViewProvider"
	| "diffStrategy"
	| "consecutiveMistakeCount"
	| "consecutiveMistakeCountForEditFile"
	| "consecutiveMistakeCountForApplyDiff"
	| "recordToolError"
	| "didToolFailInCurrentTurn"
	| "sayAndCreateMissingParamError"
	| "rooIgnoreController"
	| "rooProtectedController"
	| "fileContextTracker"
	| "processQueuedMessages"
	| "didEditFile"
	| "didRejectTool"
	| "terminalProcess"
	| "emit"
	| "lastMessageTs"
	| "emitFinalTokenUsageUpdate"
	| "todoList"
	| "supersedePendingAsk"
	| "toolUsage"
	| "getTokenUsage"
	| "clineMessages"
>
