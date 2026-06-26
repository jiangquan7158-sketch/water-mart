// ─── Scraper Interfaces ───────────────────────────────────────────────────────

export interface ScrapedVariant {
  name: string;
  value: string;
  price?: number;
  stock?: number;
  sku?: string;
}

export interface ScrapedProduct {
  sourceUrl: string;
  platform: string;
  title: string;
  description: string;
  images: string[];
  variants: ScrapedVariant[];
  price?: number;
  currency?: string;
  category?: string;
  specs: Record<string, string>;
  brand?: string;
  availability?: string;
}

export interface ScraperAdapter {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedProduct>;
  getPlatformName(): string;
}
