import { getRequestConfig } from 'next-intl/server';

const locales = [
  'en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'pt',
  'ar', 'ru', 'hi', 'th', 'vi', 'id', 'it', 'nl',
  'pl', 'sv', 'tr', 'uk',
] as const;

export type Locale = (typeof locales)[number];
export const supportedLocales = locales;
export const defaultLocale: Locale = 'en';

async function loadMessages(locale: string) {
  try {
    return (await import(`../messages/${locale}/common.json`)).default;
  } catch {
    // Locale has no translation file yet — fall back to English UI text.
    // Product/category data still translates per-field from the DB.
    return (await import(`../messages/en/common.json`)).default;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale: locale as Locale,
    messages: await loadMessages(locale),
    timeZone: 'UTC',
    now: new Date(),
  };
});
