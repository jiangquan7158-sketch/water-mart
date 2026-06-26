import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: [
    'en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'pt',
    'ar', 'ru', 'hi', 'th', 'vi', 'id', 'it', 'nl',
    'pl', 'sv', 'tr', 'uk',
  ],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
