import type { ScraperAdapter, ScrapedProduct } from './scraper.interface';
import { prisma } from '@watermart/core';
import type { ScrapeJob, ScrapeResult, Prisma } from '@prisma/client';

// ─── Tiny Event Emitter ───────────────────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void;

class MiniEmitter {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[MiniEmitter] Error in handler for "${event}":`, err);
        }
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// ─── Scraper Manager ──────────────────────────────────────────────────────────

export class ScraperManager {
  private adapters: ScraperAdapter[] = [];
  public events: MiniEmitter = new MiniEmitter();

  // ── Register adapter ─────────────────────────────────────────────────────

  registerAdapter(adapter: ScraperAdapter): void {
    this.adapters.push(adapter);
  }

  // ── Scrape multiple URLs ─────────────────────────────────────────────────

  async scrapeUrls(
    urls: string[],
  ): Promise<{ jobId: string; status: string }> {
    // Create ScrapeJob in DB
    const job = await prisma.scrapeJob.create({
      data: {
        urls: JSON.stringify(urls),
        status: 'QUEUED',
      },
    });

    // Fire started event
    this.events.emit('scrape:job:started', { jobId: job.id, urlCount: urls.length });

    // Process asynchronously (fire and forget, status tracked in DB)
    this.processJob(job.id).catch((err) => {
      console.error(`[ScraperManager] Job ${job.id} processing error:`, err);
    });

    return { jobId: job.id, status: 'QUEUED' };
  }

  // ── Process a job internally ─────────────────────────────────────────────

  private async processJob(jobId: string): Promise<void> {
    // Update status to RUNNING
    const job = await prisma.scrapeJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' },
    });

    const urls = job.urls;
    let successCount = 0;
    let failCount = 0;

    for (const url of urls) {
      try {
        // Pick the first adapter where canHandle returns true; fall back to last (generic)
        let adapter: ScraperAdapter | undefined;
        for (const a of this.adapters) {
          if (a.canHandle(url)) {
            adapter = a;
            break;
          }
        }

        const scraped: ScrapedProduct = adapter
          ? await adapter.scrape(url)
          : {
              sourceUrl: url,
              platform: 'unknown',
              title: '',
              description: '',
              images: [],
              variants: [],
              specs: {},
            };

        // Create ScrapeResult
        await prisma.scrapeResult.create({
          data: {
            jobId,
            sourceUrl: url,
            platform: adapter?.getPlatformName() ?? 'unknown',
            rawData: JSON.stringify(scraped),
            status: 'SCRAPED',
          },
        });

        successCount++;
      } catch (err) {
        failCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Create a failed scrape result
        await prisma.scrapeResult.create({
          data: {
            jobId,
            sourceUrl: url,
            platform: 'unknown',
            rawData: JSON.stringify({ error: errorMessage }),
            status: 'FAILED',
          },
        });

        console.error(`[ScraperManager] Failed to scrape ${url}:`, errorMessage);
      }
    }

    // Determine final job status
    let finalStatus: 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
    if (successCount > 0 && failCount === 0) {
      finalStatus = 'COMPLETED';
    } else if (successCount === 0) {
      finalStatus = 'FAILED';
    } else {
      finalStatus = 'PARTIALLY_COMPLETED';
    }

    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: { status: finalStatus },
    });

    // Emit completion event
    this.events.emit('scrape:completed', {
      jobId,
      successCount,
      failCount,
      status: finalStatus,
    });
  }

  // ── Get job status ───────────────────────────────────────────────────────

  async getJobStatus(jobId: string): Promise<ScrapeJob & { results: ScrapeResult[] }> {
    const job = await prisma.scrapeJob.findUnique({
      where: { id: jobId },
      include: {
        results: true,
      },
    });

    if (!job) {
      throw new Error(`ScrapeJob with id "${jobId}" not found`);
    }

    return job;
  }

  // ── Get job results ──────────────────────────────────────────────────────

  async getJobResults(jobId: string): Promise<ScrapeResult[]> {
    const job = await this.getJobStatus(jobId);
    return job.results;
  }
}
