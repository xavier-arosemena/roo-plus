/**
 * Public surface of the label module. Callers import from here and nowhere
 * else; the implementation lives under `internal/`.
 */
export { parseRecord as parseLabel } from "./internal/parse.mjs"
export { readRecord as scanRecord } from "./internal/parseStream.mjs"
export { COLUMN_ORDER as columnOrder } from "./internal/columnTable.mjs"
