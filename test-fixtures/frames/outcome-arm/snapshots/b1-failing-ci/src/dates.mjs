const pad = (value) => String(value).padStart(2, "0")

/**
 * Calendar day label for an incident timestamp.
 * Labels are stable strings of the form 2026-10-01.
 */
export function dayKey(timestamp) {
	const at = new Date(timestamp)

	if (Number.isNaN(at.getTime())) {
		throw new TypeError(`invalid timestamp: ${String(timestamp)}`)
	}

	return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}
