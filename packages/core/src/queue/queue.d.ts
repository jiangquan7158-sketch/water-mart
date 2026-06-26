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
export declare class Queue {
    private readonly prefix;
    private readonly maxAttempts;
    private processors;
    private running;
    private pollInterval;
    constructor(options?: QueueOptions);
    private key;
    private itemKey;
    enqueue<T = unknown>(type: string, data: T): Promise<QueueItem<T>>;
    private dequeue;
    complete(id: string): Promise<void>;
    fail(id: string, error: Error | string): Promise<void>;
    getItem(id: string): Promise<QueueItem | null>;
    getStats(): Promise<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
    registerProcessor<T = unknown>(processor: QueueProcessor<T>): void;
    startPolling(pollIntervalMs?: number): Promise<void>;
    stopPolling(): void;
}
export declare const queue: Queue;
//# sourceMappingURL=queue.d.ts.map