import { createI18n } from 'vue-i18n'

const STORAGE_KEY = 'aurora-locale'

// Auto-discovered: drop a new `xx.json` file in ./locales and it's picked up
// automatically — no import statements or registration to edit.
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*.json', {
  eager: true,
})

const messages: Record<string, Record<string, unknown>> = {}
for (const path in localeModules) {
  const match = path.match(/([\w-]+)\.json$/)
  const code = match?.[1]
  if (code) messages[code] = localeModules[path].default
}

export const availableLocales = Object.keys(messages)

function detectDefaultLocale(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && availableLocales.includes(stored)) return stored

  const browserLang = navigator.language.slice(0, 2)
  if (availableLocales.includes(browserLang)) return browserLang

  return availableLocales.includes('vi') ? 'vi' : availableLocales[0]
}

export const i18n = createI18n({
  legacy: false,
  locale: detectDefaultLocale(),
  fallbackLocale: availableLocales.includes('en') ? 'en' : availableLocales[0],
  messages: messages as Record<string, never>,
})

export function setLocale(code: string) {
  if (!availableLocales.includes(code)) return
  i18n.global.locale.value = code as never
  localStorage.setItem(STORAGE_KEY, code)
  document.documentElement.setAttribute('lang', code)
}

export function localeName(code: string): string {
  const entry = messages[code] as { locale?: { name?: string } } | undefined
  return entry?.locale?.name ?? code
}
