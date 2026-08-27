import { Announcements, getAnnouncementForVersion, hasAnnouncementForVersion } from "./announcements"

describe("announcements line-resolution (iterate-then-stabilize)", () => {
	it("hasAnnouncementForVersion('3.87.19') is true — the pre-release popup regression", () => {
		// A pre-release patch on the 3.87 line must resolve to the 3.87.0 line
		// base, which carries content. This is exactly what failed before the
		// line-resolution fix: the old build-time derived version
		// (<major>.<minor>.<run>) had no announcement entry, so the "What's New"
		// popup never fired in pre-release builds.
		expect(hasAnnouncementForVersion("3.87.19")).toBe(true)
	})

	it("getAnnouncementForVersion('3.87.19') returns the 3.87.0 entry", () => {
		expect(getAnnouncementForVersion("3.87.19")).toBe(Announcements["3.87.0"])
		expect(getAnnouncementForVersion("3.87.19")?.version).toBe("3.87.0")
	})

	it("hasAnnouncementForVersion('3.86.0') is false for an older line with no content", () => {
		expect(hasAnnouncementForVersion("3.86.0")).toBe(false)
		expect(getAnnouncementForVersion("3.86.0")).toBeUndefined()
	})

	it("exact match still works (hasAnnouncementForVersion('3.87.0') is true)", () => {
		expect(hasAnnouncementForVersion("3.87.0")).toBe(true)
		expect(getAnnouncementForVersion("3.87.0")).toBe(Announcements["3.87.0"])
	})

	it("a two-part version like '3.87' does not false-positive", () => {
		expect(hasAnnouncementForVersion("3.87")).toBe(false)
		expect(getAnnouncementForVersion("3.87")).toBeUndefined()
	})
})
