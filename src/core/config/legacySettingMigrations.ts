import type { GlobalState } from "@roo-code/types"

type AutoCloseSettingKey = keyof Pick<
	GlobalState,
	"autoCloseRooOpenedFiles" | "autoCloseRooOpenedFilesAfterUserEdited" | "autoCloseRooOpenedNewFiles"
>

/**
 * Legacy -> current key map for the auto-close settings that were renamed from
 * `autoCloseZooOpened*` to `autoCloseRooOpened*`.
 *
 * This is the single source of truth for the rename. It is consumed by the
 * activation-time storage migration in `ContextProxy` and by the settings
 * import sanitizer so user values survive the rename without any behavior
 * change. Keep legacy literals confined to this module.
 */
export const LEGACY_AUTO_CLOSE_SETTING_KEY_MIGRATIONS: ReadonlyArray<{
	legacyKey: string
	newKey: AutoCloseSettingKey
}> = [
	{ legacyKey: "autoCloseZooOpenedFiles", newKey: "autoCloseRooOpenedFiles" },
	{ legacyKey: "autoCloseZooOpenedFilesAfterUserEdited", newKey: "autoCloseRooOpenedFilesAfterUserEdited" },
	{ legacyKey: "autoCloseZooOpenedNewFiles", newKey: "autoCloseRooOpenedNewFiles" },
]
