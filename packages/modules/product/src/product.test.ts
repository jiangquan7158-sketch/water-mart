// ─── Product Module Tests ─────────────────────────────────────────────────────
// Vitest test suite covering:
// - product.service.ts: createProduct, getProduct, listProducts, updateProduct,
//   deleteProduct, searchProducts (all mocked Prisma)
// - phash.ts: computePerceptualHash returns 16-char hex, same image -> same hash,
//   different image -> different hash, hamming distance for identical = 0,
//   hamming distance for opposite = 64
// - scraper adapters: each canHandle returns true/false correctly
// - ai optimizer: buildOptimizationPrompt includes all targetLocales,
//   prompt contains expected keywords
//
// All external dependencies are mocked. Each test is independent.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@watermart/core', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productCategory: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productImage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    productVariant: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    scrapeJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    scrapeResult: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    lpush: vi.fn(),
    rpoplpush: vi.fn(),
    lrem: vi.fn(),
    llen: vi.fn(),
    pipeline: vi.fn(() => ({
      setex: vi.fn(),
      lpush: vi.fn(),
      get: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  },
}));

import { prisma } from '@watermart/core';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'test-product',
    status: 'DRAFT',
    translations: { en: { title: 'Test Product', description: 'A test product' } },
    basePrice: 29.99,
    currency: 'USD',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    images: [],
    variants: [],
    categories: [],
    tags: [],
    ...overrides,
  };
}

// ─── ProductService Tests ───────────────────────────────────────────────────

import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
  });

  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.product.create).mockResolvedValue(makeMockProduct() as never);

      const result = await service.createProduct({
        slug: 'test-product',
        translations: { en: { title: 'Test Product', description: 'A test product' } },
        basePrice: 29.99,
        currency: 'USD',
      });

      expect((result as Record<string, unknown>).slug).toBe('test-product');
      expect(prisma.product.create).toHaveBeenCalledTimes(1);
    });

    it('should reject duplicate slugs', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(makeMockProduct() as never);

      await expect(
        service.createProduct({
          slug: 'test-product',
          translations: { en: { title: 'Test', description: 'Test' } },
          basePrice: 10,
          currency: 'USD',
        }),
      ).rejects.toThrow('already taken');
    });

    it('should reject invalid slug format', async () => {
      await expect(
        service.createProduct({
          slug: 'Invalid Slug With Spaces',
          translations: { en: { title: 'Test', description: 'Test' } },
          basePrice: 10,
          currency: 'USD',
        }),
      ).rejects.toThrow();
    });

    it('should reject missing translations', async () => {
      await expect(
        service.createProduct({
          slug: 'my-product',
          translations: {} as never,
          basePrice: 10,
          currency: 'USD',
        } as never),
      ).rejects.toThrow();
    });

    it('should reject negative base price', async () => {
      await expect(
        service.createProduct({
          slug: 'my-product',
          translations: { en: { title: 'Test', description: 'Test' } },
          basePrice: -5,
          currency: 'USD',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getProduct', () => {
    it('should get product by UUID', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(makeMockProduct() as never);

      const result = await service.getProduct('550e8400-e29b-41d4-a716-446655440000');
      expect((result as Record<string, unknown> | null)?.slug).toBe('test-product');
    });

    it('should get product by slug when UUID lookup fails', async () => {
      // Non-UUID input bypasses findUnique → goes directly to findBySlug
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null); // won't be called for non-UUID
      // Mock the whole repo findBySlug instead
      const { ProductRepository } = await import('./product.repository');
      const mockRepo = { findById: vi.fn().mockResolvedValue(null), findBySlug: vi.fn().mockResolvedValue(makeMockProduct({ slug: 'test-product' })) };
      const svc = new ProductService(mockRepo as any);

      const result = await svc.getProduct('test-product');
      expect((result as Record<string, unknown> | null)?.slug).toBe('test-product');
    });

    it('should return null for non-existent product', async () => {
      // Both UUID lookup and slug fallback return null
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const result = await service.getProduct('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('listProducts', () => {
    it('should list products with pagination', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([makeMockProduct() as never]);
      vi.mocked(prisma.product.count).mockResolvedValue(1);

      const result = await service.listProducts({ page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      const updatedProduct = makeMockProduct({ basePrice: 39.99 });
      vi.mocked(prisma.product.findUnique).mockResolvedValue(makeMockProduct() as never);
      vi.mocked(prisma.product.update).mockResolvedValue(updatedProduct as never);

      const result = await service.updateProduct('550e8400-e29b-41d4-a716-446655440000', { basePrice: 39.99 });
      expect(result).toBeDefined();
    });

    it('should reject slug change to existing slug', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(
        makeMockProduct({ id: 'different-id' }) as never,
      );

      await expect(
        service.updateProduct('550e8400-e29b-41d4-a716-446655440000', { slug: 'test-product' }),
      ).rejects.toThrow('already taken');
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      vi.mocked(prisma.product.delete).mockResolvedValue(makeMockProduct() as never);

      const result = await service.deleteProduct('550e8400-e29b-41d4-a716-446655440000');
      expect((result as Record<string, unknown>).slug).toBe('test-product');
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([makeMockProduct() as never]);
      vi.mocked(prisma.product.count).mockResolvedValue(1);

      const result = await service.searchProducts('test', 'en');
      expect(result.data).toHaveLength(1);
    });
  });
});

// ─── Perceptual Hash Tests ──────────────────────────────────────────────────

import { computePerceptualHash, hammingDistance } from './image-search/phash';

describe('phash', () => {
  describe('computePerceptualHash', () => {
    it('should return a 16-character hex string', () => {
      const pixels = createSolidImagePixels(64, 64, 128, 128, 128);
      const hash = computePerceptualHash(pixels, 64, 64);
      expect(hash).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
    });

    it('should produce the same hash for the same image', () => {
      const pixels = createSolidImagePixels(64, 64, 100, 150, 200);
      const hash1 = computePerceptualHash(pixels, 64, 64);
      const hash2 = computePerceptualHash(pixels, 64, 64);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different images', () => {
      const solidPixels = createSolidImagePixels(64, 64, 255, 0, 0);
      const gradientPixels = createGradientPixels(64, 64);

      const solidHash = computePerceptualHash(solidPixels, 64, 64);
      const gradientHash = computePerceptualHash(gradientPixels, 64, 64);

      expect(solidHash).not.toBe(gradientHash);
    });

    it('should handle small images', () => {
      const pixels = createSolidImagePixels(16, 16, 128, 128, 128);
      const hash = computePerceptualHash(pixels, 16, 16);
      expect(hash).toHaveLength(16);
    });

    it('should handle 1x1 images', () => {
      const pixels = createSolidImagePixels(1, 1, 128, 128, 128);
      const hash = computePerceptualHash(pixels, 1, 1);
      expect(hash).toHaveLength(16);
    });
  });

  describe('hammingDistance', () => {
    it('should return 0 for identical hashes', () => {
      const pixels = createSolidImagePixels(32, 32, 128, 128, 128);
      const hash = computePerceptualHash(pixels, 32, 32);
      expect(hammingDistance(hash, hash)).toBe(0);
    });

    it('should return 64 for opposite hashes', () => {
      const hash1 = '0000000000000000';
      const hash2 = 'ffffffffffffffff';
      const dist = hammingDistance(hash1, hash2);
      expect(dist).toBe(64);
    });

    it('should return a positive distance for different hashes', () => {
      const hash1 = '0000000000000000';
      const hash2 = 'aaaaaaaaaaaaaaaa';
      const dist = hammingDistance(hash1, hash2);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(64);
    });

    it('should throw for different length hashes', () => {
      expect(() => hammingDistance('0000', '0000000000000000')).toThrow();
    });

    it('should be symmetric', () => {
      const hash1 = 'a1b2c3d4e5f67890';
      const hash2 = '0f1e2d3c4b5a6978';
      expect(hammingDistance(hash1, hash2)).toBe(hammingDistance(hash2, hash1));
    });
  });
});

// ─── Test image helpers ─────────────────────────────────────────────────────

function createSolidImagePixels(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Uint8ClampedArray {
  const totalPixels = width * height;
  const pixels = new Uint8ClampedArray(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    pixels[offset] = r;
    pixels[offset + 1] = g;
    pixels[offset + 2] = b;
    pixels[offset + 3] = 255;
  }
  return pixels;
}

function createGradientPixels(width: number, height: number): Uint8ClampedArray {
  const totalPixels = width * height;
  const pixels = new Uint8ClampedArray(totalPixels * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const value = Math.floor((x / (width - 1)) * 255);
      pixels[offset] = value;
      pixels[offset + 1] = 255 - value;
      pixels[offset + 2] = (value + 128) % 256;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

// ─── Scraper Adapter Tests ──────────────────────────────────────────────────

import { AmazonScraper } from './scraper/adapters/amazon.adapter';
import { ShopifyScraper } from './scraper/adapters/shopify.adapter';
import { AliExpressScraper } from './scraper/adapters/aliexpress.adapter';
import { GenericScraper } from './scraper/adapters/generic.adapter';

describe('Scraper Adapters', () => {
  describe('AmazonScraper', () => {
    const scraper = new AmazonScraper();

    it('should return true for amazon.com', () => {
      expect(scraper.canHandle('https://www.amazon.com/dp/B0EXAMPLE')).toBe(true);
    });

    it('should return true for amazon.de', () => {
      expect(scraper.canHandle('https://www.amazon.de/dp/B0EXAMPLE')).toBe(true);
    });

    it('should return true for amazon.co.jp', () => {
      expect(scraper.canHandle('https://www.amazon.co.jp/dp/B0EXAMPLE')).toBe(true);
    });

    it('should return true for amazon.co.uk', () => {
      expect(scraper.canHandle('https://www.amazon.co.uk/dp/B0EXAMPLE')).toBe(true);
    });

    it('should return true for amazon.in', () => {
      expect(scraper.canHandle('https://www.amazon.in/dp/B0EXAMPLE')).toBe(true);
    });

    it('should return true for amazon.com.au', () => {
      expect(scraper.canHandle('https://www.amazon.com.au/dp/B0EXAMPLE')).toBe(true);
    });

    it('should return false for non-Amazon URLs', () => {
      expect(scraper.canHandle('https://www.ebay.com/itm/12345')).toBe(false);
      expect(scraper.canHandle('https://www.walmart.com/ip/12345')).toBe(false);
      expect(scraper.canHandle('https://aliexpress.com/item/12345.html')).toBe(false);
    });

    it('should return platform name', () => {
      expect(scraper.getPlatformName()).toBe('Amazon');
    });
  });

  describe('ShopifyScraper', () => {
    const scraper = new ShopifyScraper();

    it('should return true for myshopify.com domains', () => {
      expect(scraper.canHandle('https://store.myshopify.com/products/test')).toBe(true);
    });

    it('should return true for /products/ paths', () => {
      expect(scraper.canHandle('https://example.com/products/my-product')).toBe(true);
    });

    it('should return true for cdn.shopify.com URLs', () => {
      expect(scraper.canHandle('https://cdn.shopify.com/s/files/1/1234/products/img.jpg')).toBe(true);
    });

    it('should return false for amazon URLs', () => {
      expect(scraper.canHandle('https://www.amazon.com/dp/B0EXAMPLE')).toBe(false);
    });

    it('should return platform name', () => {
      expect(scraper.getPlatformName()).toBe('Shopify');
    });
  });

  describe('AliExpressScraper', () => {
    const scraper = new AliExpressScraper();

    it('should return true for aliexpress.com item URLs', () => {
      expect(scraper.canHandle('https://www.aliexpress.com/item/1005001234567890.html')).toBe(true);
    });

    it('should return true for aliexpress.us item URLs', () => {
      expect(scraper.canHandle('https://aliexpress.us/item/3256801234567890.html')).toBe(true);
    });

    it('should return true for store product URLs', () => {
      expect(scraper.canHandle('https://www.aliexpress.com/store/product/12345.html')).toBe(true);
    });

    it('should return false for non-AliExpress URLs', () => {
      expect(scraper.canHandle('https://www.amazon.com/dp/B0EXAMPLE')).toBe(false);
      expect(scraper.canHandle('https://example.com/products/test')).toBe(false);
    });

    it('should return platform name', () => {
      expect(scraper.getPlatformName()).toBe('AliExpress');
    });
  });

  describe('GenericScraper', () => {
    const scraper = new GenericScraper();

    it('should return true for any URL', () => {
      expect(scraper.canHandle('https://any-website.com/product/123')).toBe(true);
      expect(scraper.canHandle('https://totally-unknown-store.io/items/xyz')).toBe(true);
      expect(scraper.canHandle('https://example.com')).toBe(true);
    });

    it('should return platform name', () => {
      expect(scraper.getPlatformName()).toBe('generic');
    });
  });
});

// ─── AI Optimizer Prompt Tests ──────────────────────────────────────────────

import { buildOptimizationPrompt, SYSTEM_PROMPT } from './ai-optimize/optimizer.prompts';

describe('AI Optimizer', () => {
  const rawData = {
    title: 'Premium Water Filter System',
    description: 'High-quality water filtration for your home.',
    specs: {
      'Filter Type': 'Activated Carbon',
      'Flow Rate': '2.5 GPM',
      'Filter Life': '6 months',
    },
    price: 49.99,
    currency: 'USD',
    images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    platform: 'Amazon',
  };

  describe('buildOptimizationPrompt', () => {
    it('should include all target locales in the prompt', () => {
      const targetLocales = ['en', 'de', 'ja', 'pt-BR'];
      const prompt = buildOptimizationPrompt(rawData, targetLocales);

      for (const locale of targetLocales) {
        expect(prompt).toContain(locale);
      }
    });

    it('should include the product title', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en']);
      expect(prompt).toContain('Premium Water Filter System');
    });

    it('should include the platform name', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en']);
      expect(prompt).toContain('Amazon');
    });

    it('should include SEO instructions when includeSeo is true', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en'], { includeSeo: true });
      expect(prompt).toContain('seoTitle');
      expect(prompt).toContain('SEO Metadata');
    });

    it('should omit SEO instructions when includeSeo is false', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en'], { includeSeo: false });
      expect(prompt).not.toContain('seoTitle');
      expect(prompt).not.toContain('SEO Metadata');
    });

    it('should include tags instructions when includeTags is true', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en'], { includeTags: true });
      expect(prompt).toContain('suggestedTags');
      expect(prompt).toContain('Suggested Tags');
    });

    it('should include tone guidance', () => {
      const professional = buildOptimizationPrompt(rawData, ['en'], { tone: 'professional' });
      expect(professional).toContain('authoritative');

      const casual = buildOptimizationPrompt(rawData, ['en'], { tone: 'casual' });
      expect(casual).toContain('friendly');

      const luxury = buildOptimizationPrompt(rawData, ['en'], { tone: 'luxury' });
      expect(luxury).toContain('sophisticated');
    });

    it('should use professional tone by default', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en']);
      expect(prompt).toContain('authoritative');
    });

    it('should reference the current price', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en']);
      expect(prompt).toContain('49.99');
      expect(prompt).toContain('USD');
    });

    it('should include JSON output format instructions', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en']);
      expect(prompt).toContain('enhancedTitle');
      expect(prompt).toContain('enhancedDescription');
      expect(prompt).toContain('translations');
      expect(prompt).toContain('sellingPoints');
      expect(prompt).toContain('suggestedPrice');
    });

    it('should handle empty specs', () => {
      const prompt = buildOptimizationPrompt(
        { ...rawData, specs: {} },
        ['en'],
      );
      expect(prompt).toContain('(no specifications provided)');
    });

    it('should handle empty title', () => {
      const prompt = buildOptimizationPrompt(
        { ...rawData, title: '' },
        ['en'],
      );
      expect(prompt).toContain('(no title provided)');
    });

    it('should handle empty description', () => {
      const prompt = buildOptimizationPrompt(
        { ...rawData, description: '' },
        ['en'],
      );
      expect(prompt).toContain('(no description provided)');
    });

    it('should be a string', () => {
      const prompt = buildOptimizationPrompt(rawData, ['en']);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('SYSTEM_PROMPT', () => {
    it('should be a non-empty string', () => {
      expect(SYSTEM_PROMPT).toBeTruthy();
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it('should mention e-commerce optimization concepts', () => {
      expect(SYSTEM_PROMPT).toContain('Copywriting');
      expect(SYSTEM_PROMPT).toContain('SEO');
      expect(SYSTEM_PROMPT).toContain('Localization');
      expect(SYSTEM_PROMPT).toContain('Pricing');
    });

    it('should instruct JSON-only output', () => {
      expect(SYSTEM_PROMPT).toContain('JSON');
    });
  });
});

// ─── AI Optimizer Service Tests ─────────────────────────────────────────────

import { AIOptimizerService, BUILD_OPTIMIZATION_SYSTEM_PROMPT } from './ai-optimize/optimizer.service';

describe('AIOptimizerService', () => {
  describe('constructor', () => {
    it('should accept apiKey as constructor param', () => {
      const service = new AIOptimizerService('test-api-key-12345');
      expect(service).toBeDefined();
    });

    it('should throw if no API key is available', () => {
      const originalEnv = process.env.CLAUDE_API_KEY;
      delete (process.env as Record<string, string | undefined>).CLAUDE_API_KEY;

      expect(() => new AIOptimizerService()).toThrow('API key');

      if (originalEnv) {
        process.env.CLAUDE_API_KEY = originalEnv;
      }
    });
  });

  describe('BUILD_OPTIMIZATION_SYSTEM_PROMPT', () => {
    it('should export the system prompt constant', () => {
      expect(BUILD_OPTIMIZATION_SYSTEM_PROMPT).toBeDefined();
      expect(typeof BUILD_OPTIMIZATION_SYSTEM_PROMPT).toBe('string');
      expect(BUILD_OPTIMIZATION_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });
  });
});

// ─── Image Search Service Tests ─────────────────────────────────────────────

import { ImageSearchService } from './image-search/image-search.service';

describe('ImageSearchService', () => {
  let service: ImageSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImageSearchService();
  });

  describe('removeProductImage', () => {
    it('should delete a product image by id', async () => {
      vi.mocked(prisma.productImage.delete).mockResolvedValue({} as never);

      await service.removeProductImage('img-uuid');
      expect(prisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'img-uuid' },
      });
    });

    it('should propagate deletion errors', async () => {
      vi.mocked(prisma.productImage.delete).mockRejectedValue(new Error('Not found'));

      await expect(service.removeProductImage('bad-id')).rejects.toThrow('Not found');
    });
  });
});
