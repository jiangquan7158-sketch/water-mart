import { v4 as uuid } from 'uuid';
import { redis } from '../cache/redis';

// ─── Types ──────────────────────────────────────────────────────────────────

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueItem<T = unknown> {
  id: string;
  type: string;
  data: T;
  status: QueueStatus;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueProcessor<T = unknown> {
  type: string;
  handler: (item: QueueItem<T>) => Promise<void>;
  concurrency?: number;
}

export interface QueueOptions {
  /** Redis key prefix for the queue (default: 'wm:queue') */
  prefix?: string;
  /** Maximum retry attempts for a job (default: 3) */
  maxAttempts?: number;
}

// ─── Queue Implementation ───────────────────────────────────────────────────

const QUEUE_LIST = 'list'; // pending + processing items
const QUEUE_PROCESSING = 'processing'; // items currently being handled

export class Queue {
  private readonly prefix: string;
  private readonly maxAttempts: number;
  private processors: Map<string, QueueProcessor> = new Map();
  private running = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: QueueOptions = {}) {
    this.prefix = options.prefix || 'wm:queue';
    this.maxAttempts = options.maxAttempts || 3;
  }

  // ── Key helpers ─────────────────────────────────────────────────────

  private key(suffix: string): string {
    return `${this.prefix}:${suffix}`;
  }

  private itemKey(id: string): string {
    return this.key(`item:${id}`);
  }

  // ── Enqueue ──────────────────────────────────────────────────────────

  async enqueue<T = unknown>(
    type: string,
    data: T,
  ): Promise<QueueItem<T>> {
    const now = new Date().toISOString();
    const item: QueueItem<T> = {
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

  private async dequeue(): Promise<QueueItem | null> {
    // Move the next pending item from the end of the list to the processing set
    const id = await redis.rpoplpush(
      this.key(QUEUE_LIST),
      this.key(QUEUE_PROCESSING),
    );

    if (!id) return null;

    const raw = await redis.get(this.itemKey(id));
    if (!raw) {
      // Orphaned reference — clean up
      await redis.lrem(this.key(QUEUE_PROCESSING), 1, id);
      return null;
    }

    const item: QueueItem = JSON.parse(raw);
    item.status = 'processing';
    item.attempts += 1;
    item.updatedAt = new Date().toISOString();

    // Persist updated state
    await redis.setex(
      this.itemKey(item.id),
      86400,
      JSON.stringify(item),
    );

    return item;
  }

  // ── Mark completed / failed ──────────────────────────────────────────

  async complete(id: string): Promise<void> {
    const raw = await redis.get(this.itemKey(id));
    if (!raw) return;

    const item: QueueItem = JSON.parse(raw);
    item.status = 'completed';
    item.updatedAt = new Date().toISOString();

    await Promise.all([
      redis.setex(this.itemKey(id), 86400, JSON.stringify(item)),
      redis.lrem(this.key(QUEUE_PROCESSING), 1, id),
    ]);
  }

  async fail(id: string, error: Error | string): Promise<void> {
    const raw = await redis.get(this.itemKey(id));
    if (!raw) return;

    const item: QueueItem = JSON.parse(raw);
    item.error = typeof error === 'string' ? error : error.message;
    item.updatedAt = new Date().toISOString();

    if (item.attempts >= item.maxAttempts) {
      // Terminal failure
      item.status = 'failed';
      await Promise.all([
        redis.setex(this.itemKey(id), 86400, JSON.stringify(item)),
        redis.lrem(this.key(QUEUE_PROCESSING), 1, id),
      ]);
    } else {
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

  async getItem(id: string): Promise<QueueItem | null> {
    const raw = await redis.get(this.itemKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as QueueItem;
  }

  // ── Queue statistics ─────────────────────────────────────────────────

  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
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
          if (err || !raw) continue;
          const item: QueueItem = JSON.parse(raw as string);
          if (item.status === 'completed') completed++;
          else if (item.status === 'failed') failed++;
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

  registerProcessor<T = unknown>(processor: QueueProcessor<T>): void {
    this.processors.set(processor.type, processor as QueueProcessor);
  }

  // ── Polling loop ──────────────────────────────────────────────────────

  async startPolling(pollIntervalMs = 1000): Promise<void> {
    if (this.running) return;
    this.running = true;

    const processNext = async () => {
      if (!this.running) return;

      try {
        const item = await this.dequeue();
        if (!item) return;

        const processor = this.processors.get(item.type);
        if (!processor) {
          await this.fail(
            item.id,
            `No processor registered for type: ${item.type}`,
          );
          return;
        }

        try {
          await processor.handler(item);
          await this.complete(item.id);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          await this.fail(item.id, error);
        }
      } catch (err) {
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

  stopPolling(): void {
    this.running = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const globalForQueue = globalThis as unknown as {
  queue: Queue | undefined;
};

export const queue: Queue = globalForQueue.queue ?? new Queue();

if (process.env.NODE_ENV !== 'production') {
  globalForQueue.queue = queue;
}
