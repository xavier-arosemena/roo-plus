import { render } from "@testing-library/react"
import { TerminalOutput, TERMINAL_OUTPUT_ESCAPE_XML } from "../TerminalOutput"

describe("TerminalOutput", () => {
	it("pins escapeXML: true to prevent XSS regressions", () => {
		expect(TERMINAL_OUTPUT_ESCAPE_XML).toBe(true)
	})
	it("renders plain text without ANSI codes", () => {
		const { container } = render(<TerminalOutput content="hello world" />)
		expect(container.textContent).toBe("hello world")
	})

	it("converts ANSI color codes to styled spans", () => {
		const { container } = render(<TerminalOutput content={"\x1B[32mgreen\x1B[0m"} />)
		const span = container.querySelector("span")
		expect(span).toBeTruthy()
		expect(span?.textContent).toBe("green")
	})

	it("escapes HTML in terminal output to prevent XSS", () => {
		const { container } = render(<TerminalOutput content={'<script>alert("xss")</script>'} />)
		expect(container.innerHTML).not.toContain("<script>")
		expect(container.textContent).toContain('<script>alert("xss")</script>')
	})

	it("neutralizes a <script> payload as escaped text (not executable)", () => {
		const { container } = render(
			<TerminalOutput content={'\x1B[32m<svg onload="alert(1)"><script>alert("xss")</script></svg>\x1B[0m'} />,
		)
		// No live <script> or <svg> element is injected — the payload is escaped text.
		expect(container.innerHTML).not.toContain("<script")
		expect(container.innerHTML).not.toContain("<svg")
		// escapeXML keeps the payload visible as plain text rather than executing it.
		expect(container.textContent).toContain('alert("xss")')
	})

	it("handles empty content", () => {
		const { container } = render(<TerminalOutput content="" />)
		expect(container.textContent).toBe("")
	})
})
