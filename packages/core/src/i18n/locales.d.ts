import type { Locale } from '../types';
export declare const SUPPORTED_LOCALES: readonly Locale[];
export declare const DEFAULT_LOCALE: Locale;
export declare const LOCALE_DISPLAY_NAMES: Record<Locale, string>;
export declare const RTL_LOCALES: readonly Locale[];
export declare function isRtl(locale: Locale): boolean;
export declare function isValidLocale(locale: string): locale is Locale;
export declare function normalizeLocale(locale: string): Locale;
export declare function toBcp47(locale: Locale): string;
//# sourceMappingURL=locales.d.ts.map