import { v4 as uuid } from 'uuid';

// ─── Slugify ────────────────────────────────────────────────────────────────

/**
 * Converts a text string into a URL-friendly slug.
 * Handles Latin, CJK, Arabic, Cyrillic, and other scripts by
 * transliterating where possible and falling back to a UUID suffix.
 */
export function slugify(text: string): string {
  const slug = text
    .toString()
    .normalize('NFKD') // Decompose accented chars
    .toLowerCase()
    .trim()
    .replace(/[À-ɏЀ-ӿ]/g, (char) => {
      // Basic transliteration fallback for Latin-adjacent scripts
      const map: Record<string, string> = {
        à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
        è: 'e', é: 'e', ê: 'e', ë: 'e',
        ì: 'i', í: 'i', î: 'i', ï: 'i',
        ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
        ù: 'u', ú: 'u', û: 'u', ü: 'u',
        ñ: 'n', ç: 'c', ß: 'ss',
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e',
        ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
        м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
        т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
        ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e',
        ю: 'yu', я: 'ya',
      };
      return map[char] || '-';
    })
    .replace(/[^a-z0-9一-鿿぀-ゟ゠-ヿ؀-ۿऀ-ॿ฀-๿]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // If the slug is primarily non-Latin or empty, append a short UUID
  if (!slug || /^[一-鿿぀-ゟ゠-ヿ؀-ۿ]+/.test(slug)) {
    const shortId = uuid().split('-')[1];
    return slug ? `${slug}-${shortId}` : shortId!;
  }

  return slug || `item-${uuid().split('-')[1]}`;
}

// ─── Generate Order Number ──────────────────────────────────────────────────

/**
 * Generates a human-readable order number in the format:
 * WMT-YYYYMMDD-XXXXXX
 * Where XXXXXX is a 6-character alphanumeric segment.
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = uuid()
    .replace(/-/g, '')
    .substring(0, 6)
    .toUpperCase();

  return `WMT-${datePart}-${randomPart}`;
}

// ─── Generate Affiliate Code ────────────────────────────────────────────────

/**
 * Generates an 8-character alphanumeric affiliate code.
 */
export function generateAffiliateCode(): string {
  return uuid()
    .replace(/-/g, '')
    .substring(0, 8)
    .toUpperCase();
}

// ─── Truncate ───────────────────────────────────────────────────────────────

/**
 * Truncates a string to the specified length, appending an ellipsis
 * if the string exceeds the limit.
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length).replace(/\s+\S*$/, '') + '...';
}

// ─── Classnames Merger (cn) ─────────────────────────────────────────────────

/**
 * Merges class names, filtering out falsy values.
 * Equivalent to the popular `clsx` / `classnames` pattern.
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Format Currency ────────────────────────────────────────────────────────

/**
 * Formats a numeric amount into a locale-aware currency string.
 * Uses Intl.NumberFormat internally.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for locales or currencies not recognized by the runtime
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ─── Sleep ──────────────────────────────────────────────────────────────────

/**
 * Returns a promise that resolves after the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Retry ──────────────────────────────────────────────────────────────────

/**
 * Retries an async function with exponential backoff between attempts.
 *
 * @param fn - The async function to retry.
 * @param maxRetries - Maximum number of retry attempts (default: 3).
 * @param baseDelayMs - Base delay in milliseconds before the first retry (default: 1000).
 * @returns The resolved value of `fn`.
 * @throws The last error if all retries are exhausted.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxRetries) break;

      // Exponential backoff: delay * 2^attempt with some jitter
      const jitter = Math.random() * 0.3 * baseDelayMs;
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`,
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

// ─── Pick ───────────────────────────────────────────────────────────────────

/**
 * Creates a new object with only the specified keys from the source.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

// ─── Omit ───────────────────────────────────────────────────────────────────

/**
 * Creates a new object excluding the specified keys from the source.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const keySet = new Set(keys as string[]);
  const result = {} as Omit<T, K>;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keySet.has(key as string)) {
      (result as Record<string, unknown>)[key as string] = obj[key];
    }
  }
  return result;
}

// ─── Chunk ──────────────────────────────────────────────────────────────────

/**
 * Splits an array into chunks of the specified size.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ─── Safe JSON Parse ────────────────────────────────────────────────────────

/**
 * Parses a JSON string safely, returning the fallback on failure.
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T,
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
