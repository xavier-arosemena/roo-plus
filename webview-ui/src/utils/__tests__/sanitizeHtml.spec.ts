import { describe, it, expect } from "vitest"
import { sanitizeHtml } from "../sanitizeHtml"

describe("sanitizeHtml", () => {
	it("removes <script> tags and their content", () => {
		const output = sanitizeHtml('<p>hello</p><script>alert("xss")</script>')
		expect(output).not.toContain("script")
		expect(output).toContain("<p>hello</p>")
	})

	it("removes event-handler attributes (onerror/onclick)", () => {
		const output = sanitizeHtml('<img src="x.png" onerror="alert(1)"><div onclick="alert(1)">text</div>')
		expect(output).not.toMatch(/onerror|onclick/i)
	})

	it("strips javascript: URLs", () => {
		const output = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
		expect(output).not.toContain("javascript:")
	})

	it("preserves safe formatting (span with inline color)", () => {
		const output = sanitizeHtml('<span style="color: var(--vscode-terminal-ansiGreen, #0dbc79)">green</span>')
		expect(output).toContain("<span")
		expect(output).toContain("green")
		expect(output).toContain("color")
	})

	it("allows SVG path elements but strips <script> nested inside <svg>", () => {
		const output = sanitizeHtml(
			'<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">' +
				'<path d="M0 0 L10 10" stroke="currentColor"/>' +
				"<script>alert(1)</script>" +
				"</svg>",
		)
		expect(output).toContain("<path")
		expect(output).toContain("viewBox")
		expect(output).not.toContain("<script")
		expect(output).not.toContain("alert")
	})

	it("removes disallowed elements (iframe/object/embed/style)", () => {
		const output = sanitizeHtml(
			'<iframe src="https://evil.example"></iframe><object data="x"></object><embed src="x"><style>body{}</style>',
		)
		expect(output).not.toContain("iframe")
		expect(output).not.toContain("object")
		expect(output).not.toContain("embed")
		expect(output).not.toContain("<style")
	})

	it("does not let an event handler or javascript: URL survive inside SVG", () => {
		const output = sanitizeHtml(
			'<svg><g onclick="alert(1)"><a href="javascript:alert(2)"><path d="M0 0"/></a></g></svg>',
		)
		expect(output).not.toMatch(/onclick|javascript:/i)
	})
})
