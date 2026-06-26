// ─── Event Map ──────────────────────────────────────────────────────────────
// Register all application events here for type-safe publish/subscribe.
// ─── Event Bus Implementation ───────────────────────────────────────────────
export class EventBus {
    listeners = new Map();
    wildcardListeners = new Set();
    /**
     * Subscribe to a specific event.
     * Returns an unsubscribe function.
     */
    on(event, listener) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(listener);
        return () => {
            const current = this.listeners.get(event);
            if (current) {
                current.delete(listener);
                if (current.size === 0) {
                    this.listeners.delete(event);
                }
            }
        };
    }
    /**
     * Subscribe to a specific event, fire once, then unsubscribe.
     */
    once(event, listener) {
        const wrapper = (payload) => {
            unsubscribe();
            void listener(payload);
        };
        const unsubscribe = this.on(event, wrapper);
        return unsubscribe;
    }
    /**
     * Subscribe to all events via wildcard.
     */
    onAny(listener) {
        this.wildcardListeners.add(listener);
        return () => {
            this.wildcardListeners.delete(listener);
        };
    }
    /**
     * Publish an event asynchronously. Returns void — errors in listeners
     * are caught and logged but do not propagate.
     */
    async publish(event, payload) {
        const specificListeners = this.listeners.get(event);
        const promises = [];
        // Wildcard listeners
        for (const listener of this.wildcardListeners) {
            promises.push(Promise.resolve()
                .then(() => listener(payload))
                .catch((err) => console.error(`[EventBus] Wildcard listener error for "${event}":`, err)));
        }
        // Specific listeners
        if (specificListeners) {
            for (const listener of specificListeners) {
                promises.push(Promise.resolve()
                    .then(() => listener(payload))
                    .catch((err) => console.error(`[EventBus] Listener error for "${event}":`, err)));
            }
        }
        await Promise.allSettled(promises);
    }
    /**
     * Publish an event synchronously (fire and forget). Errors are caught
     * and logged. Use this when you don't need to wait for listeners.
     */
    emit(event, payload) {
        void this.publish(event, payload);
    }
    /**
     * Remove all listeners for an event, or all events if none specified.
     */
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        }
        else {
            this.listeners.clear();
            this.wildcardListeners.clear();
        }
    }
    /**
     * Return the number of listeners for a given event (excluding wildcards).
     */
    listenerCount(event) {
        const set = this.listeners.get(event);
        return set ? set.size : 0;
    }
    /**
     * List all event names that have listeners.
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }
}
// ─── Singleton ──────────────────────────────────────────────────────────────
const globalForEventBus = globalThis;
export const eventBus = globalForEventBus.eventBus ?? new EventBus();
if (process.env.NODE_ENV !== 'production') {
    globalForEventBus.eventBus = eventBus;
}
