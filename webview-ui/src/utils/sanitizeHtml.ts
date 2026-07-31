import DOMPurify from "dompurify"
import type { Config } from "dompurify"

/**
 * Strict allowlist of HTML elements rendered by the chat webview.
 *
 * - `span`/`mark` with inline `style` cover terminal ANSI output
 *   (TerminalOutput) and search-highlight HTML (TaskItem).
 * - `a`/`img` are kept but their URL values are constrained by DOMPurify's
 *   default URI allowlist (http/https/mailto/tel/relative only — `javascript:`
 *   is always stripped) and event-handler attributes are never allowed.
 *
 * Deliberately NOT allowed: `script`, `style`, `iframe`, `object`, `embed`,
 * `form`, `input`, `link`, `meta`, and any event-handler attribute.
 */
const ALLOWED_HTML_TAGS = [
	"span",
	"div",
	"p",
	"br",
	"mark",
	"b",
	"strong",
	"i",
	"em",
	"code",
	"pre",
	"ul",
	"ol",
	"li",
	"blockquote",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"a",
	"img",
	"table",
	"thead",
	"tbody",
	"tr",
	"td",
	"th",
] as const

/**
 * SVG elements emitted by Mermaid's renderer. Kept as tight as possible while
 * still round-tripping the diagrams produced by MermaidBlock.
 */
const ALLOWED_SVG_TAGS = [
	"svg",
	"g",
	"path",
	"polyline",
	"polygon",
	"line",
	"circle",
	"rect",
	"ellipse",
	"text",
	"tspan",
	"textPath",
	"defs",
	"marker",
	"pattern",
	"use",
	"image",
	"title",
	"desc",
] as const

const ALLOWED_HTML_ATTRS = ["class", "style", "title", "href", "src", "alt"] as const

/**
 * SVG presentation/geometry attributes used by Mermaid output. No event-handler
 * attributes are permitted, and all URL values are constrained by DOMPurify's
 * default URI allowlist.
 */
const ALLOWED_SVG_ATTRS = [
	"id",
	"class",
	"style",
	"xmlns",
	"viewBox",
	"x",
	"y",
	"x1",
	"y1",
	"x2",
	"y2",
	"cx",
	"cy",
	"r",
	"rx",
	"ry",
	"width",
	"height",
	"d",
	"points",
	"fill",
	"stroke",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-opacity",
	"fill-opacity",
	"opacity",
	"transform",
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"text-anchor",
	"dominant-baseline",
	"marker-start",
	"marker-end",
	"marker-mid",
	"markerWidth",
	"markerHeight",
	"refX",
	"refY",
	"orient",
	"role",
	"aria-label",
	"color",
	"text-decoration",
	"shape-rendering",
	"vector-effect",
	"href",
	"target",
] as const

const SANITIZER_CONFIG: Config = {
	// Exclusive allowlist: only these tags/attributes are ever permitted.
	ALLOWED_TAGS: [...ALLOWED_HTML_TAGS, ...ALLOWED_SVG_TAGS],
	ALLOWED_ATTR: [...ALLOWED_HTML_ATTRS, ...ALLOWED_SVG_ATTRS],
	ALLOW_DATA_ATTR: false,
}

/**
 * A dedicated, isolated DOMPurify instance configured with the strict allowlist
 * above. Created through the factory so the module never mutates the global
 * DOMPurify hooks/config shared with the rest of the app.
 */
const purifier = DOMPurify(window)
purifier.setConfig(SANITIZER_CONFIG)

/**
 * Sanitizes untrusted/model-generated HTML against a strict allowlist.
 *
 * - Removes `script`/`style`/`iframe`/`object`/`embed` and event-handler
 *   attributes.
 * - Strips `javascript:` (and other non-allowlisted) URL schemes.
 * - Preserves safe formatting (`span` with inline `style`) and Mermaid SVG
 *   output (`svg`/`g`/`path`/... with presentation attributes).
 */
export function sanitizeHtml(html: string): string {
	return purifier.sanitize(html)
}
