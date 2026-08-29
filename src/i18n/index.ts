import { createI18n } from 'vue-i18n'
import { messages, type MessageSchema } from './messages'

export type Locale = 'ru' | 'en'

const LOCALE_KEY = 'tm-locale'

function detectLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY)
  if (stored === 'ru' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'ru'
}

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'ru',
  messages,
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  localStorage.setItem(LOCALE_KEY, locale)
  document.documentElement.lang = locale
}

// Non-component code (e.g. plain TS validation helpers) can import this
// directly instead of useI18n(), which only works inside setup().
export const t = i18n.global.t
