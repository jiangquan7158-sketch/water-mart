import { v4 as uuid } from 'uuid';
import { redis } from '../cache/redis';
// ─── Queue Implementation ───────────────────────────────────────────────────
const QUEUE_LIST = 'list'; // pending + processing items
const QUEUE_PROCESSING = 'processing'; // items currently being handled
export class Queue {
    prefix;
    maxAttempts;
    processors = new Map();
    running = false;
    pollInterval = null;
    constructor(options = {}) {
        this.prefix = options.prefix || 'wm:queue';
        this.maxAttempts = options.maxAttempts || 3;
    }
    // ── Key helpers ─────────────────────────────────────────────────────
    key(suffix) {
        return `${this.prefix}:${suffix}`;
    }
    itemKey(id) {
        return this.key(`item:${id}`);
    }
    // ── Enqueue ──────────────────────────────────────────────────────────
    async enqueue(type, data) {
        const now = new Date().toISOString();
        const item = {
            id: uuid(),
            type,
            data,
            status: 'pending',
            attempts: 0,
            maxAttempts: this.maxAttempts,
            error: null,
            createdAt: now,
            updatedAt: now,
        };
        const serialized = JSON.stringify(item);
        // Store item + push ID to pending list
        await Promise.all([
            redis.setex(this.itemKey(item.id), 86400, serialized), // 24h TTL per item
            redis.lpush(this.key(QUEUE_LIST), item.id),
        ]);
        return item;
    }
    // ── Dequeue (internal) ───────────────────────────────────────────────
    async dequeue() {
        // Move the next pending item from the end of the list to the processing set
        const id = await redis.rpoplpush(this.key(QUEUE_LIST), this.key(QUEUE_PROCESSING));
        if (!id)
            return null;
        const raw = await redis.get(this.itemKey(id));
        if (!raw) {
            // Orphaned reference — clean up
            await redis.lrem(this.key(QUEUE_PROCESSING), 1, id);
            return null;
        }
        const item = JSON.parse(raw);
        item.status = 'processing';
        item.attempts += 1;
        item.updatedAt = new Date().toISOString();
        // Persist updated state
        await redis.setex(this.itemKey(item.id), 86400, JSON.stringify(item));
        return item;
    }
    // ── Mark completed / failed ──────────────────────────────────────────
    async complete(id) {
        const raw = await redis.get(this.itemKey(id));
        if (!raw)
            return;
        const item = JSON.parse(raw);
        item.status = 'completed';
        item.updatedAt = new Date().toISOString();
        await Promise.all([
            redis.setex(this.itemKey(id), 86400, JSON.stringify(item)),
            redis.lrem(this.key(QUEUE_PROCESSING), 1, id),
        ]);
    }
    async fail(id, error) {
        const raw = await redis.get(this.itemKey(id));
        if (!raw)
            return;
        const item = JSON.parse(raw);
        item.error = typeof error === 'string' ? error : error.message;
        item.updatedAt = new Date().toISOString();
        if (item.attempts >= item.maxAttempts) {
            // Terminal failure
            item.status = 'failed';
            await Promise.all([
                redis.setex(this.itemKey(id), 86400, JSON.stringify(item)),
                redis.lrem(this.key(QUEUE_PROCESSING), 1, id),
            ]);
        }
        else {
            // Retry — put back into pending
            item.status = 'pending';
            await Promise.all([
                redis.setex(this.itemKey(id), 86400, JSON.stringify(item)),
                redis.lrem(this.key(QUEUE_PROCESSING), 1, id),
                redis.lpush(this.key(QUEUE_LIST), id),
            ]);
        }
    }
    // ── Get item status ──────────────────────────────────────────────────
    async getItem(id) {
        const raw = await redis.get(this.itemKey(id));
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    // ── Queue statistics ─────────────────────────────────────────────────
    async getStats() {
        const [pendingLen, processingLen] = await Promise.all([
            redis.llen(this.key(QUEUE_LIST)),
            redis.llen(this.key(QUEUE_PROCESSING)),
        ]);
        // completed and failed require key scans — approximations
        const allKeys = await redis.keys(this.key('item:*'));
        let completed = 0;
        let failed = 0;
        if (allKeys.length > 0) {
            const pipeline = redis.pipeline();
            for (const k of allKeys) {
                pipeline.get(k);
            }
            const results = await pipeline.exec();
            if (results) {
                for (const [err, raw] of results) {
                    if (err || !raw)
                        continue;
                    const item = JSON.parse(raw);
                    if (item.status === 'completed')
                        completed++;
                    else if (item.status === 'failed')
                        failed++;
                }
            }
        }
        return {
            pending: pendingLen,
            processing: processingLen,
            completed,
            failed,
        };
    }
    // ── Processor registration ───────────────────────────────────────────
    registerProcessor(processor) {
        this.processors.set(processor.type, processor);
    }
    // ── Polling loop ──────────────────────────────────────────────────────
    async startPolling(pollIntervalMs = 1000) {
        if (this.running)
            return;
        this.running = true;
        const processNext = async () => {
            if (!this.running)
                return;
            try {
                const item = await this.dequeue();
                if (!item)
                    return;
                const processor = this.processors.get(item.type);
                if (!processor) {
                    await this.fail(item.id, `No processor registered for type: ${item.type}`);
                    return;
                }
                try {
                    await processor.handler(item);
                    await this.complete(item.id);
                }
                catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    await this.fail(item.id, error);
                }
            }
            catch (err) {
                console.error('[Queue] Process error:', err);
            }
        };
        // Kick off continuous polling
        const poll = async () => {
            while (this.running) {
                await processNext();
                // Small yield between dequeues when idle
                await new Promise((r) => setTimeout(r, 10));
            }
        };
        this.pollInterval = setInterval(() => {
            // keep-alive — actual polling is in the loop above
        }, pollIntervalMs);
        // Start the main loop
        poll().catch((err) => console.error('[Queue] Poll loop error:', err));
    }
    stopPolling() {
        this.running = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}
// ─── Singleton ──────────────────────────────────────────────────────────────
const globalForQueue = globalThis;
export const queue = globalForQueue.queue ?? new Queue();
if (process.env.NODE_ENV !== 'production') {
    globalForQueue.queue = queue;
}
