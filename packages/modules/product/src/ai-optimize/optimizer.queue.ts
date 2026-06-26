// ─── AI Optimization Queue ────────────────────────────────────────────────────
// Redis-backed job queue for batching scraped product optimization.
//
// Flow:
// 1. ScrapeResult is created → enqueueOptimization(resultId, targetLocales)
// 2. Queue processor picks up jobs and runs them through AIOptimizerService
// 3. Results are stored back on the ScrapeResult.aiOptimized field
// 4. Status is queryable via getOptimizationStatus

import { prisma, redis } from '@watermart/core';
import { AIOptimizerService } from './optimizer.service';
import type { AIOptimizedProduct, OptimizationOptions } from './optimizer.service';
import type { ScrapeResult, Prisma } from '@prisma/client';

// ─── Constants ───────────────────────────────────────────────────────────────

const QUEUE_PREFIX = 'wm:optimizer';
const QUEUE_KEY = `${QUEUE_PREFIX}:jobs`;
const JOB_PREFIX = `${QUEUE_PREFIX}:job`;
const MAX_RETRIES = 3;

// ─── Types ──────────────────────────────────────────────────────────────────

export type OptimizationJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface OptimizationJob {
  id: string;
  resultId: string;
  targetLocales: string[];
  options?: OptimizationOptions;
  status: OptimizationJobStatus;
  attempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OptimizationStatusResult {
  status: OptimizationJobStatus;
  result?: AIOptimizedProduct;
  error?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `opt_${timestamp}_${random}`;
}

function jobKey(jobId: string): string {
  return `${JOB_PREFIX}:${jobId}`;
}

// ─── Optimization Queue ──────────────────────────────────────────────────────

export class OptimizationQueue {
  private optimizer: AIOptimizerService;

  constructor(apiKey?: string) {
    this.optimizer = new AIOptimizerService(apiKey);
  }

  // ── Enqueue ───────────────────────────────────────────────────────────────

  /**
   * Enqueue a scrape result for AI optimization.
   *
   * @param resultId - The ScrapeResult UUID to optimize
   * @param targetLocales - Target locale codes for translation
   * @param options - Optimization options (tone, SEO, tags)
   * @returns The generated job ID
   */
  async enqueueOptimization(
    resultId: string,
    targetLocales: string[],
    options?: OptimizationOptions,
  ): Promise<string> {
    // Verify the scrape result exists
    const scrapeResult = await prisma.scrapeResult.findUnique({
      where: { id: resultId },
    });

    if (!scrapeResult) {
      throw new Error(`ScrapeResult with id "${resultId}" not found`);
    }

    const now = new Date().toISOString();
    const jobId = generateJobId();

    const job: OptimizationJob = {
      id: jobId,
      resultId,
      targetLocales,
      options,
      status: 'queued',
      attempts: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    // Store job data + push to queue
    const pipeline = redis.pipeline();
    pipeline.setex(jobKey(jobId), 86400, JSON.stringify(job)); // 24h TTL
    pipeline.lpush(QUEUE_KEY, jobId);
    await pipeline.exec();

    return jobId;
  }

  // ── Get Status ────────────────────────────────────────────────────────────

  /**
   * Check the status of an optimization job, including the result if completed.
   */
  async getOptimizationStatus(jobId: string): Promise<OptimizationStatusResult> {
    const raw = await redis.get(jobKey(jobId));
    if (!raw) {
      throw new Error(`Optimization job "${jobId}" not found or expired`);
    }

    const job: OptimizationJob = JSON.parse(raw);

    const result: OptimizationStatusResult = {
      status: job.status,
      error: job.error,
      attempts: job.attempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    // If completed, try to fetch the result from the database
    if (job.status === 'completed') {
      const scrapeResult = await prisma.scrapeResult.findUnique({
        where: { id: job.resultId },
      });

      if (scrapeResult?.aiOptimized) {
        result.result = scrapeResult.aiOptimized as unknown as AIOptimizedProduct;
      }
    }

    return result;
  }

  // ── Process Queue ─────────────────────────────────────────────────────────

  /**
   * Async generator that yields optimization jobs as they are processed.
   * Each yielded object contains the job info and a completion callback.
   *
   * Usage:
   * ```
   * for await (const job of queue.processQueue()) {
   *   // job contains { id, resultId, targetLocales, ... }
   * }
   * ```
   */
  async *processQueue(): AsyncGenerator<
    {
      jobId: string;
      resultId: string;
      targetLocales: string[];
      options?: OptimizationOptions;
    },
    void,
    undefined
  > {
    while (true) {
      let job: OptimizationJob | null = null;

      try {
        // Blocking pop from the right (FIFO: lpush + rpop)
        const jobId = await redis.rpoplpush(QUEUE_KEY, `${QUEUE_PREFIX}:processing`);

        if (!jobId) {
          // No jobs in queue, yield control
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        // Load job data
        const raw = await redis.get(jobKey(jobId));
        if (!raw) {
          // Clean up orphan
          await redis.lrem(`${QUEUE_PREFIX}:processing`, 1, jobId);
          continue;
        }

        job = JSON.parse(raw) as OptimizationJob;

        // Update status to processing
        job.status = 'processing';
        job.attempts += 1;
        job.updatedAt = new Date().toISOString();
        await redis.setex(jobKey(jobId), 86400, JSON.stringify(job));

        // Load the scrape result data
        const scrapeResult = await prisma.scrapeResult.findUnique({
          where: { id: job.resultId },
        });

        if (!scrapeResult) {
          throw new Error(`ScrapeResult "${job.resultId}" no longer exists`);
        }

        const rawData = scrapeResult.rawData as Record<string, unknown>;

        // Yield the job for processing
        yield {
          jobId: job.id,
          resultId: job.resultId,
          targetLocales: job.targetLocales,
          options: job.options,
        };

        // After yield, process the job
        const optimized = await this.optimizer.optimize(
          {
            title: (rawData.title as string) ?? '',
            description: (rawData.description as string) ?? '',
            specs: (rawData.specs as Record<string, string>) ?? {},
            price: typeof rawData.price === 'number' ? rawData.price : parseFloat(String(rawData.price ?? '0')) || 0,
            currency: (rawData.currency as string) ?? 'USD',
            images: Array.isArray(rawData.images) ? rawData.images.map(String) : [],
            platform: (rawData.platform as string) ?? 'unknown',
          },
          job.targetLocales,
          job.options,
        );

        // Store result back on the ScrapeResult
        await prisma.scrapeResult.update({
          where: { id: job.resultId },
          data: {
            aiOptimized: optimized as unknown as Prisma.InputJsonValue,
            status: 'OPTIMIZED',
          },
        });

        // Mark job as completed
        job.status = 'completed';
        job.error = null;
        job.updatedAt = new Date().toISOString();
        await redis.setex(jobKey(jobId), 86400, JSON.stringify(job));
        await redis.lrem(`${QUEUE_PREFIX}:processing`, 1, job.id);
      } catch (err) {
        if (job) {
          const errorMessage = err instanceof Error ? err.message : String(err);

          if (job.attempts >= MAX_RETRIES) {
            // Terminal failure
            job.status = 'failed';
            job.error = errorMessage;
            job.updatedAt = new Date().toISOString();
            await redis.setex(jobKey(job.id), 86400, JSON.stringify(job));
            await redis.lrem(`${QUEUE_PREFIX}:processing`, 1, job.id);

            // Also update the scrape result status
            try {
              await prisma.scrapeResult.update({
                where: { id: job.resultId },
                data: { status: 'FAILED' },
              });
            } catch {
              // Ignore update failure
            }
          } else {
            // Re-queue for retry
            job.status = 'queued';
            job.error = errorMessage;
            job.updatedAt = new Date().toISOString();
            await redis.setex(jobKey(job.id), 86400, JSON.stringify(job));
            await redis.lrem(`${QUEUE_PREFIX}:processing`, 1, job.id);
            await redis.lpush(QUEUE_KEY, job.id);
          }
        }
      }
    }
  }

  // ── Get Queue Length ──────────────────────────────────────────────────────

  /**
   * Get the number of jobs waiting in the queue.
   */
  async getQueueLength(): Promise<number> {
    return redis.llen(QUEUE_KEY);
  }

  // ── Get Processing Count ──────────────────────────────────────────────────

  async getProcessingCount(): Promise<number> {
    return redis.llen(`${QUEUE_PREFIX}:processing`);
  }

  // ── Cancel Job ────────────────────────────────────────────────────────────

  /**
   * Cancel a queued optimization job. Cannot cancel jobs that are already processing.
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const raw = await redis.get(jobKey(jobId));
    if (!raw) return false;

    const job: OptimizationJob = JSON.parse(raw);
    if (job.status !== 'queued') {
      return false; // Cannot cancel jobs that are already processing or completed
    }

    // Remove from queue and delete job data
    await Promise.all([
      redis.lrem(QUEUE_KEY, 1, jobId),
      redis.del(jobKey(jobId)),
    ]);

    return true;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

const globalOptimizationQueue = globalThis as unknown as {
  __optimizationQueue?: OptimizationQueue;
};

export function getOptimizationQueue(apiKey?: string): OptimizationQueue {
  if (!globalOptimizationQueue.__optimizationQueue) {
    globalOptimizationQueue.__optimizationQueue = new OptimizationQueue(apiKey);
  }
  return globalOptimizationQueue.__optimizationQueue;
}
