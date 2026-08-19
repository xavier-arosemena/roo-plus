// "Roo+" figlet-style wordmark. Pure ASCII — renders identically in any
// monospace font (every ASCII character advances one cell in a monospace font,
// so there is none of the glyph-width risk that box-drawing characters have).
// The "o"s sit together (the right border of the first "o" is the left border
// of the second) and each carries a small circle "(_)" in the middle; the "+"
// is a fancy form with a top cap. Rendered in the theme foreground color, so it
// adapts to dark and light themes without a separate light-mode artwork.
const ROO_PLUS_ASCII = [
	" ____                         ",
	"|  _ \\ ___  ___    _   ",
	"| |_) / _ \\/ _ \\ _| |_ ",
	"|  _ < (_) |(_) |_   _|",
	"|_| \\_\\___/\\___/  |_|  ",
].join("\n")

const RooHero = () => {
	return (
		<div className="relative flex flex-col items-start">
			<pre
				role="img"
				aria-label="Roo+ logo"
				className="m-0 font-mono text-vscode-foreground text-[13px] leading-tight select-none whitespace-pre bg-transparent"
				style={{
					fontVariantLigatures: "none",
					fontKerning: "none",
				}}>
				{ROO_PLUS_ASCII}
			</pre>
		</div>
	)
}

export default RooHero
