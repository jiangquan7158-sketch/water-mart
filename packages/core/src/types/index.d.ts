import type { Decimal } from '@prisma/client/runtime/library';
export type Locale = 'en' | 'zh' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt' | 'ar' | 'ru' | 'hi' | 'bn' | 'tr' | 'it' | 'nl' | 'pl' | 'vi' | 'th' | 'id' | 'ms' | 'fil' | 'sw' | 'am' | 'fa' | 'ur' | 'he';
export type Currency = string;
export interface Price {
    amount: Decimal;
    currency: Currency;
}
export interface Image {
    url: string;
    alt: string | null;
    width?: number | null;
    height?: number | null;
    perceptualHash?: Uint8Array | null;
}
export type Translation<T> = Partial<Record<Locale, T>>;
export interface Address {
    name: string;
    phone?: string | null;
    street: string;
    city: string;
    state?: string | null;
    zip: string;
    country: string;
}
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
export interface OrderSummary {
    orderId: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    itemCount: number;
    createdAt: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown> | Array<unknown>;
}
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
export type Metadata = Record<string, unknown>;
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}
export interface SortOption {
    field: string;
    direction: 'asc' | 'desc';
}
export type SortInput = SortOption | SortOption[];
export interface FilterInput {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between';
    value: unknown;
    value2?: unknown;
}
export interface QueryOptions {
    page?: number;
    pageSize?: number;
    sort?: SortInput;
    filters?: FilterInput[];
    search?: string;
    locale?: Locale;
    include?: string[];
}
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export declare function success<T>(data: T): Result<T>;
export declare function failure<E = Error>(error: E): Result<never, E>;
//# sourceMappingURL=index.d.ts.map