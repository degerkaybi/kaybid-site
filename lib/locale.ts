export type Locale = 'tr' | 'en'

/** Active site locale. Set NEXT_PUBLIC_SITE_LOCALE=tr to serve the Turkish version. */
export function getLocale(): Locale {
  return process.env.NEXT_PUBLIC_SITE_LOCALE === 'tr' ? 'tr' : 'en'
}

const TURKISH_LETTERS = /[çğıöşüÇĞİÖŞÜ]/

/**
 * Language tag for a heading that gets `text-transform: uppercase`.
 * Browsers only map i → İ (and ı → I) for lang="tr", so Turkish titles inside an
 * English page need their own lang attribute.
 */
export function textLang(text: string): Locale {
  return TURKISH_LETTERS.test(text) ? 'tr' : getLocale()
}
