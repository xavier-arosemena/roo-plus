import type { TaskScheduler } from "./TaskScheduler"
import type { Task } from "./Task"

/**
 * Single canonical "run this task under the scheduler" helper.
 *
 * Previously duplicated verbatim in `ClineProvider` and `TaskOrchestrator`.
 * Keeping one copy means a fix to the scheduling/error path cannot silently
 * miss the other caller.
 *
 * `TaskScheduler.schedule()` resolves when the task finishes, so the rejection
 * is caught here and logged with the calling `source` rather than becoming an
 * unhandled rejection that would take down the host process.
 *
 * @param scheduler Scheduler that gates execution (`maxConcurrency = 1` today).
 * @param task Task to run; it may already be aborted/abandoned, in which case
 *   the scheduler releases the permit without running it.
 * @param source Short label identifying the call site, used in the log line so
 *   a task that never started is diagnosable from the output channel.
 */
export function scheduleTask(scheduler: TaskScheduler, task: Task, source: string): void {
	void scheduler
		.schedule(task, () => task.run())
		.catch((error) => console.error(`[${source}] taskScheduler.schedule failed:`, error))
}
