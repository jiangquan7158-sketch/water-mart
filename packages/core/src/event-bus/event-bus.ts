// ─── Event Map ──────────────────────────────────────────────────────────────
// Register all application events here for type-safe publish/subscribe.

export interface EventMap {
  // Product events
  'product:created': { productId: string; slug: string };
  'product:updated': { productId: string; slug: string };
  'product:published': { productId: string; slug: string };
  'product:archived': { productId: string; slug: string };
  'product:deleted': { productId: string };

  // Order events
  'order:created': { orderId: string; orderNumber: string; userId: string };
  'order:confirmed': { orderId: string; orderNumber: string };
  'order:shipped': {
    orderId: string;
    orderNumber: string;
    trackingNumber: string;
  };
  'order:delivered': { orderId: string; orderNumber: string };
  'order:cancelled': { orderId: string; orderNumber: string };
  'order:refunded': { orderId: string; orderNumber: string };

  // User events
  'user:registered': { userId: string; email: string; name?: string | null };
  'user:updated': { userId: string };
  'user:deleted': { userId: string };

  // Cart events
  'cart:updated': { cartId: string; userId?: string; sessionId?: string };

  // Review events
  'review:created': { reviewId: string; productId: string; rating: number };

  // Scraping events
  'scrape:job:started': { jobId: string; urlCount: number };
  'scrape:job:completed': { jobId: string; resultCount: number };
  'scrape:job:failed': { jobId: string; error: string };
  'scrape:result:optimized': {
    resultId: string;
    productId?: string;
  };
  'scrape:result:published': { resultId: string; productId: string };

  // Affiliate events
  'affiliate:registered': { affiliateId: string; userId: string; code: string };
  'affiliate:conversion': {
    affiliateId: string;
    orderId: string;
    commission: number;
  };

  // Coupon events
  'coupon:created': { couponId: string; code: string };
  'coupon:redeemed': { couponId: string; code: string; orderId: string };

  // Notification events
  'notification:send': {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };

  // System events
  'system:health': { status: 'ok' | 'degraded' | 'down'; timestamp: string };
  'system:config:updated': { key: string };
}

export type EventName = keyof EventMap;
export type EventPayload<T extends EventName> = EventMap[T];

// ─── Listener type ──────────────────────────────────────────────────────────

export type EventListener<T extends EventName = EventName> = (
  payload: EventPayload<T>,
) => void | Promise<void>;

// ─── Event Bus Implementation ───────────────────────────────────────────────

export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private wildcardListeners: Set<EventListener> = new Set();

  /**
   * Subscribe to a specific event.
   * Returns an unsubscribe function.
   */
  on<T extends EventName>(
    event: T,
    listener: EventListener<T>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as EventListener);

    return () => {
      const current = this.listeners.get(event);
      if (current) {
        current.delete(listener as EventListener);
        if (current.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to a specific event, fire once, then unsubscribe.
   */
  once<T extends EventName>(
    event: T,
    listener: EventListener<T>,
  ): () => void {
    const wrapper: EventListener<T> = (payload) => {
      unsubscribe();
      void (listener(payload) as unknown);
    };

    const unsubscribe = this.on(event, wrapper);
    return unsubscribe;
  }

  /**
   * Subscribe to all events via wildcard.
   */
  onAny(listener: EventListener): () => void {
    this.wildcardListeners.add(listener);

    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Publish an event asynchronously. Returns void — errors in listeners
   * are caught and logged but do not propagate.
   */
  async publish<T extends EventName>(
    event: T,
    payload: EventPayload<T>,
  ): Promise<void> {
    const specificListeners = this.listeners.get(event);

    const promises: Promise<void>[] = [];

    // Wildcard listeners
    for (const listener of this.wildcardListeners) {
      promises.push(
        Promise.resolve()
          .then(() => listener(payload))
          .catch((err) =>
            console.error(
              `[EventBus] Wildcard listener error for "${event}":`,
              err,
            ),
          ),
      );
    }

    // Specific listeners
    if (specificListeners) {
      for (const listener of specificListeners) {
        promises.push(
          Promise.resolve()
            .then(() => listener(payload))
            .catch((err) =>
              console.error(
                `[EventBus] Listener error for "${event}":`,
                err,
              ),
            ),
        );
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Publish an event synchronously (fire and forget). Errors are caught
   * and logged. Use this when you don't need to wait for listeners.
   */
  emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
    void this.publish(event, payload);
  }

  /**
   * Remove all listeners for an event, or all events if none specified.
   */
  clear(event?: EventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
    }
  }

  /**
   * Return the number of listeners for a given event (excluding wildcards).
   */
  listenerCount(event: EventName): number {
    const set = this.listeners.get(event);
    return set ? set.size : 0;
  }

  /**
   * List all event names that have listeners.
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const globalForEventBus = globalThis as unknown as {
  eventBus: EventBus | undefined;
};

export const eventBus: EventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== 'production') {
  globalForEventBus.eventBus = eventBus;
}
