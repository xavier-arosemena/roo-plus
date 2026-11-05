/**
 * Revision of the "What's New" popup's MARKETING slot.
 *
 * The copy itself lives in i18n (`chat:announcement.marketing`), so it is
 * translatable and can be reworded without touching the changelog or any
 * generated asset. This constant is the deliberate re-arm signal: bump it
 * when the copy changes MATERIALLY and every user sees the popup once more.
 *
 * Hand-maintained (not generated) because the trigger must cover
 * translation-independent copy changes, including edits made only in
 * non-English locales.
 */
export const MARKETING_REVISION = "star-cta-v1"
