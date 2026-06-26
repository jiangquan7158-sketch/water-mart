import type { Locale } from '../types';

// ─── Supported Locales ──────────────────────────────────────────────────────

export const SUPPORTED_LOCALES: readonly Locale[] = [
  'en',  // English
  'zh',  // Chinese (Simplified)
  'ja',  // Japanese
  'ko',  // Korean
  'de',  // German
  'fr',  // French
  'es',  // Spanish
  'pt',  // Portuguese
  'ar',  // Arabic
  'ru',  // Russian
  'hi',  // Hindi
  'bn',  // Bengali
  'tr',  // Turkish
  'it',  // Italian
  'nl',  // Dutch
  'pl',  // Polish
  'vi',  // Vietnamese
  'th',  // Thai
  'id',  // Indonesian
  'ms',  // Malay
  'fil', // Filipino
  'sw',  // Swahili
  'am',  // Amharic
  'fa',  // Persian
  'ur',  // Urdu
  'he',  // Hebrew
] as const;

export const DEFAULT_LOCALE: Locale = 'en';

// ─── Locale Display Names ───────────────────────────────────────────────────

export const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  en:   'English',
  zh:   '中文 (Chinese)',
  ja:   '日本語 (Japanese)',
  ko:   '한국어 (Korean)',
  de:   'Deutsch (German)',
  fr:   'Français (French)',
  es:   'Español (Spanish)',
  pt:   'Português (Portuguese)',
  ar:   'العربية (Arabic)',
  ru:   'Русский (Russian)',
  hi:   'हिन्दी (Hindi)',
  bn:   'বাংলা (Bengali)',
  tr:   'Türkçe (Turkish)',
  it:   'Italiano (Italian)',
  nl:   'Nederlands (Dutch)',
  pl:   'Polski (Polish)',
  vi:   'Tiếng Việt (Vietnamese)',
  th:   'ไทย (Thai)',
  id:   'Bahasa Indonesia (Indonesian)',
  ms:   'Bahasa Melayu (Malay)',
  fil:  'Filipino',
  sw:   'Kiswahili (Swahili)',
  am:   'አማርኛ (Amharic)',
  fa:   'فارسی (Persian)',
  ur:   'اردو (Urdu)',
  he:   'עברית (Hebrew)',
};

// ─── RTL Locales ────────────────────────────────────────────────────────────

export const RTL_LOCALES: readonly Locale[] = [
  'ar', // Arabic
  'he', // Hebrew
  'fa', // Persian
  'ur', // Urdu
];

// ─── Locale Helpers ─────────────────────────────────────────────────────────

export function isRtl(locale: Locale): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function isValidLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function normalizeLocale(locale: string): Locale {
  // Handle locale variants like 'zh-CN' -> 'zh', 'en-US' -> 'en'
  const base = locale.split('-')[0]?.toLowerCase();
  if (base && isValidLocale(base)) return base;
  return DEFAULT_LOCALE;
}

// ─── Locale to BCP 47 Tag ───────────────────────────────────────────────────

export function toBcp47(locale: Locale): string {
  const mapping: Partial<Record<Locale, string>> = {
    zh: 'zh-Hans',
    ja: 'ja-JP',
    ko: 'ko-KR',
    ar: 'ar-SA',
  };
  return mapping[locale] || locale;
}
