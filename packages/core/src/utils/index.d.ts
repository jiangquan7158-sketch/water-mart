/**
 * Converts a text string into a URL-friendly slug.
 * Handles Latin, CJK, Arabic, Cyrillic, and other scripts by
 * transliterating where possible and falling back to a UUID suffix.
 */
export declare function slugify(text: string): string;
/**
 * Generates a human-readable order number in the format:
 * WMT-YYYYMMDD-XXXXXX
 * Where XXXXXX is a 6-character alphanumeric segment.
 */
export declare function generateOrderNumber(): string;
/**
 * Generates an 8-character alphanumeric affiliate code.
 */
export declare function generateAffiliateCode(): string;
/**
 * Truncates a string to the specified length, appending an ellipsis
 * if the string exceeds the limit.
 */
export declare function truncate(text: string, length: number): string;
/**
 * Merges class names, filtering out falsy values.
 * Equivalent to the popular `clsx` / `classnames` pattern.
 */
export declare function cn(...classes: (string | undefined | null | false)[]): string;
/**
 * Formats a numeric amount into a locale-aware currency string.
 * Uses Intl.NumberFormat internally.
 */
export declare function formatCurrency(amount: number, currency: string, locale: string): string;
/**
 * Returns a promise that resolves after the given number of milliseconds.
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retries an async function with exponential backoff between attempts.
 *
 * @param fn - The async function to retry.
 * @param maxRetries - Maximum number of retry attempts (default: 3).
 * @param baseDelayMs - Base delay in milliseconds before the first retry (default: 1000).
 * @returns The resolved value of `fn`.
 * @throws The last error if all retries are exhausted.
 */
export declare function retry<T>(fn: () => Promise<T>, maxRetries?: number, baseDelayMs?: number): Promise<T>;
/**
 * Creates a new object with only the specified keys from the source.
 */
export declare function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
/**
 * Creates a new object excluding the specified keys from the source.
 */
export declare function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
/**
 * Splits an array into chunks of the specified size.
 */
export declare function chunk<T>(arr: T[], size: number): T[][];
/**
 * Parses a JSON string safely, returning the fallback on failure.
 */
export declare function safeJsonParse<T>(json: string, fallback: T): T;
//# sourceMappingURL=index.d.ts.map