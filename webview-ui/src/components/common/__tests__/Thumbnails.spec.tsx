import { render, screen, act } from "@/utils/test-utils"

import { vscode } from "@src/utils/vscode"
import Thumbnails from "../Thumbnails"

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

const IMAGES = ["data:image/png;base64,AAAA", "data:image/png;base64,BBBB"]

describe("Thumbnails - images sync (loop-safe hardening)", () => {
	it("renders the images", () => {
		render(<Thumbnails images={IMAGES} />)

		expect(screen.getByAltText("Thumbnail 1")).toHaveAttribute("src", IMAGES[0])
		expect(screen.getByAltText("Thumbnail 2")).toHaveAttribute("src", IMAGES[1])
	})

	it("does not loop when the parent passes a fresh images array reference with identical content", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			const { rerender } = render(<Thumbnails images={IMAGES} />)

			// The images prop array reference may be recreated on every parent
			// render (it comes from context-derived message objects). The
			// render-phase guard compares a stable content key, so this must
			// not cascade into a render loop.
			for (let i = 0; i < 20; i++) {
				act(() => {
					rerender(<Thumbnails images={[...IMAGES]} />)
				})
			}

			expect(
				errorSpy.mock.calls.some(
					([message]) =>
						typeof message === "string" &&
						(message.includes("Too many re-renders") || message.includes("Maximum update depth exceeded")),
				),
			).toBe(false)

			expect(screen.getByAltText("Thumbnail 1")).toHaveAttribute("src", IMAGES[0])
			expect(screen.getByAltText("Thumbnail 2")).toHaveAttribute("src", IMAGES[1])
		} finally {
			errorSpy.mockRestore()
		}
	})

	it("posts openImage on click", () => {
		render(<Thumbnails images={IMAGES} />)

		act(() => {
			screen.getByAltText("Thumbnail 1").click()
		})

		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "openImage", text: IMAGES[0] })
	})
})
