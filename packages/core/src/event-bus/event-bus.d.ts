export interface EventMap {
    'product:created': {
        productId: string;
        slug: string;
    };
    'product:updated': {
        productId: string;
        slug: string;
    };
    'product:published': {
        productId: string;
        slug: string;
    };
    'product:archived': {
        productId: string;
        slug: string;
    };
    'product:deleted': {
        productId: string;
    };
    'order:created': {
        orderId: string;
        orderNumber: string;
        userId: string;
    };
    'order:confirmed': {
        orderId: string;
        orderNumber: string;
    };
    'order:shipped': {
        orderId: string;
        orderNumber: string;
        trackingNumber: string;
    };
    'order:delivered': {
        orderId: string;
        orderNumber: string;
    };
    'order:cancelled': {
        orderId: string;
        orderNumber: string;
    };
    'order:refunded': {
        orderId: string;
        orderNumber: string;
    };
    'user:registered': {
        userId: string;
        email: string;
        name?: string | null;
    };
    'user:updated': {
        userId: string;
    };
    'user:deleted': {
        userId: string;
    };
    'cart:updated': {
        cartId: string;
        userId?: string;
        sessionId?: string;
    };
    'review:created': {
        reviewId: string;
        productId: string;
        rating: number;
    };
    'scrape:job:started': {
        jobId: string;
        urlCount: number;
    };
    'scrape:job:completed': {
        jobId: string;
        resultCount: number;
    };
    'scrape:job:failed': {
        jobId: string;
        error: string;
    };
    'scrape:result:optimized': {
        resultId: string;
        productId?: string;
    };
    'scrape:result:published': {
        resultId: string;
        productId: string;
    };
    'affiliate:registered': {
        affiliateId: string;
        userId: string;
        code: string;
    };
    'affiliate:conversion': {
        affiliateId: string;
        orderId: string;
        commission: number;
    };
    'coupon:created': {
        couponId: string;
        code: string;
    };
    'coupon:redeemed': {
        couponId: string;
        code: string;
        orderId: string;
    };
    'notification:send': {
        userId: string;
        type: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
    };
    'system:health': {
        status: 'ok' | 'degraded' | 'down';
        timestamp: string;
    };
    'system:config:updated': {
        key: string;
    };
}
export type EventName = keyof EventMap;
export type EventPayload<T extends EventName> = EventMap[T];
export type EventListener<T extends EventName = EventName> = (payload: EventPayload<T>) => void | Promise<void>;
export declare class EventBus {
    private listeners;
    private wildcardListeners;
    /**
     * Subscribe to a specific event.
     * Returns an unsubscribe function.
     */
    on<T extends EventName>(event: T, listener: EventListener<T>): () => void;
    /**
     * Subscribe to a specific event, fire once, then unsubscribe.
     */
    once<T extends EventName>(event: T, listener: EventListener<T>): () => void;
    /**
     * Subscribe to all events via wildcard.
     */
    onAny(listener: EventListener): () => void;
    /**
     * Publish an event asynchronously. Returns void — errors in listeners
     * are caught and logged but do not propagate.
     */
    publish<T extends EventName>(event: T, payload: EventPayload<T>): Promise<void>;
    /**
     * Publish an event synchronously (fire and forget). Errors are caught
     * and logged. Use this when you don't need to wait for listeners.
     */
    emit<T extends EventName>(event: T, payload: EventPayload<T>): void;
    /**
     * Remove all listeners for an event, or all events if none specified.
     */
    clear(event?: EventName): void;
    /**
     * Return the number of listeners for a given event (excluding wildcards).
     */
    listenerCount(event: EventName): number;
    /**
     * List all event names that have listeners.
     */
    eventNames(): string[];
}
export declare const eventBus: EventBus;
//# sourceMappingURL=event-bus.d.ts.map