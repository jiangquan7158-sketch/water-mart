import type { Decimal } from '@prisma/client/runtime/library';

// ─── Locale ─────────────────────────────────────────────────────────────────
// WaterMart supports all major world languages for a truly global marketplace.

export type Locale =
  | 'en' // English
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'de' // German
  | 'fr' // French
  | 'es' // Spanish
  | 'pt' // Portuguese
  | 'ar' // Arabic
  | 'ru' // Russian
  | 'hi' // Hindi
  | 'bn' // Bengali
  | 'tr' // Turkish
  | 'it' // Italian
  | 'nl' // Dutch
  | 'pl' // Polish
  | 'vi' // Vietnamese
  | 'th' // Thai
  | 'id' // Indonesian
  | 'ms' // Malay
  | 'fil' // Filipino
  | 'sw' // Swahili
  | 'am' // Amharic
  | 'fa' // Persian
  | 'ur' // Urdu
  | 'he'; // Hebrew

// ─── Currency ───────────────────────────────────────────────────────────────

export type Currency = string; // ISO 4217 code e.g. 'USD', 'EUR', 'JPY'

// ─── Price ──────────────────────────────────────────────────────────────────

export interface Price {
  amount: Decimal;
  currency: Currency;
}

// ─── Image ──────────────────────────────────────────────────────────────────

export interface Image {
  url: string;
  alt: string | null;
  width?: number | null;
  height?: number | null;
  perceptualHash?: Uint8Array | null;
}

// ─── Translation ────────────────────────────────────────────────────────────

export type Translation<T> = Partial<Record<Locale, T>>;

// ─── Address ────────────────────────────────────────────────────────────────

export interface Address {
  name: string;
  phone?: string | null;
  street: string;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
}

// ─── Cart Item ──────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image?: string | null;
  attributes?: Record<string, string>;
}

// ─── Order Summary ──────────────────────────────────────────────────────────

export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

// ─── API Error ──────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
}

// ─── Deep Partial ───────────────────────────────────────────────────────────

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// ─── Metadata ───────────────────────────────────────────────────────────────

export type Metadata = Record<string, unknown>;

// ─── Paginated Response ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Sorting ────────────────────────────────────────────────────────────────

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export type SortInput = SortOption | SortOption[];

// ─── Filter ─────────────────────────────────────────────────────────────────

export interface FilterInput {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between';
  value: unknown;
  value2?: unknown; // For 'between' operator (upper bound)
}

// ─── Query Options ──────────────────────────────────────────────────────────

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: SortInput;
  filters?: FilterInput[];
  search?: string;
  locale?: Locale;
  include?: string[];
}

// ─── Result (Discriminated Union) ───────────────────────────────────────────

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ─── Result Helpers ─────────────────────────────────────────────────────────

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}
