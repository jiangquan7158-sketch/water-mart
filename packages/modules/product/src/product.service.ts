import { z } from 'zod';
import { prisma } from '@watermart/core';
import { ProductRepository } from './product.repository';
import type {
  ProductFilters,
  ProductCreateInput,
  ProductUpdateInput,
} from './product.repository';
import type { Product, ProductStatus, Prisma } from '@prisma/client';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const translationSchema = z.record(
  z.string(),
  z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
  }),
);

const createProductSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  translations: translationSchema.refine(
    (t) => Object.keys(t).length > 0,
    'At least one translation is required',
  ),
  basePrice: z.number().positive('Base price must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO 4217 code'),
  images: z
    .array(
      z.object({
        url: z.string().url('Image URL must be valid'),
        alt: z.string().optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1),
        price: z.number().positive(),
        compareAtPrice: z.number().positive().optional(),
        stock: z.number().int().nonnegative(),
        translations: z.record(z.string(), z.unknown()).optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
  categories: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateProductSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  translations: translationSchema.optional(),
  basePrice: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1),
        price: z.number().positive(),
        compareAtPrice: z.number().positive().optional(),
        stock: z.number().int().nonnegative(),
        translations: z.record(z.string(), z.unknown()).optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
  categories: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listProductsSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'publishedAt', 'basePrice', 'slug', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Service ──────────────────────────────────────────────────────────────────

export class ProductService {
  private repo: ProductRepository;

  constructor(repository?: ProductRepository) {
    this.repo = repository ?? new ProductRepository();
  }

  // ── Create product ───────────────────────────────────────────────────────

  async createProduct(
    data: {
      slug: string;
      translations: Record<string, { title: string; description: string }>;
      basePrice: number;
      currency: string;
      images?: { url: string; alt?: string }[];
      variants?: { sku: string; price: number; stock: number; attributes?: Record<string, unknown> }[];
      categories?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<Product> {
    const validated = createProductSchema.parse(data);

    // Check slug uniqueness
    const existing = await this.repo.findBySlug(validated.slug);
    if (existing) {
      throw new Error(`Slug "${validated.slug}" is already taken`);
    }

    const input: ProductCreateInput = {
      slug: validated.slug,
      translations: validated.translations as Record<string, unknown>,
      basePrice: validated.basePrice,
      currency: validated.currency,
      metadata: validated.metadata,
      images: validated.images?.map((img) => ({
        url: img.url,
        alt: img.alt,
      })),
      variants: validated.variants?.map((v) => ({
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        attributes: v.attributes ?? {},
        translations: {},
      })),
      categories: validated.categories,
      tags: validated.tags,
    };

    return this.repo.create(input);
  }

  // ── Update product ───────────────────────────────────────────────────────

  async updateProduct(
    id: string,
    data: Partial<{
      slug: string;
      translations: Record<string, { title: string; description: string }>;
      basePrice: number;
      currency: string;
      images: { url: string; alt?: string }[];
      variants: { sku: string; price: number; stock: number; attributes?: Record<string, unknown> }[];
      categories: string[];
      tags: string[];
      metadata: Record<string, unknown>;
    }>,
  ): Promise<Product> {
    const validated = updateProductSchema.parse(data);

    // If slug is being updated, check uniqueness
    if (validated.slug) {
      const existing = await this.repo.findBySlug(validated.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Slug "${validated.slug}" is already taken`);
      }
    }

    // Build update input
    const updateInput: ProductUpdateInput = {};

    if (validated.slug !== undefined) updateInput.slug = validated.slug;
    if (validated.translations !== undefined) {
      updateInput.translations = validated.translations as Record<string, unknown>;
    }
    if (validated.basePrice !== undefined) updateInput.basePrice = validated.basePrice;
    if (validated.currency !== undefined) updateInput.currency = validated.currency;
    if (validated.metadata !== undefined) updateInput.metadata = validated.metadata;

    const product = await this.repo.update(id, updateInput);

    // Handle related entities updates via separate Prisma calls if needed
    if (validated.categories) {
      // Replace categories: delete existing, create new
      await prisma.productCategory.deleteMany({ where: { productId: id } });
      if (validated.categories.length > 0) {
        await prisma.productCategory.createMany({
          data: validated.categories.map((catId) => ({
            productId: id,
            categoryId: catId,
          })),
        });
      }
    }

    if (validated.tags) {
      await prisma.productTag.deleteMany({ where: { productId: id } });
      if (validated.tags.length > 0) {
        await prisma.productTag.createMany({
          data: validated.tags.map((tagId) => ({
            productId: id,
            tagId: tagId,
          })),
        });
      }
    }

    if (validated.images) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (validated.images.length > 0) {
        await prisma.productImage.createMany({
          data: validated.images.map((img, idx) => ({
            productId: id,
            url: img.url,
            alt: img.alt ?? null,
            sortOrder: idx,
          })),
        });
      }
    }

    if (validated.variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      if (validated.variants.length > 0) {
        await prisma.productVariant.createMany({
          data: validated.variants.map((v, idx) => ({
            productId: id,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            attributes: JSON.stringify(v.attributes ?? {}),
            sortOrder: idx,
          })),
        });
      }
    }

    // Re-fetch with includes
    return (await this.repo.findById(id))!;
  }

  // ── Delete product ───────────────────────────────────────────────────────

  async deleteProduct(id: string): Promise<Product> {
    return this.repo.delete(id);
  }

  // ── Get product (by UUID or slug) ────────────────────────────────────────

  async getProduct(idOrSlug: string): Promise<Product | null> {
    // Try UUID first
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(idOrSlug)) {
      const product = await this.repo.findById(idOrSlug);
      if (product) return product;
    }

    // Fall back to slug lookup
    return this.repo.findBySlug(idOrSlug);
  }

  // ── List products ────────────────────────────────────────────────────────

  async listProducts(
    filters: Omit<ProductFilters, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'> & {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const validated = listProductsSchema.parse(filters);
    return this.repo.findMany(validated);
  }

  // ── Search products ──────────────────────────────────────────────────────

  async searchProducts(
    query: string,
    locale: string = 'en',
    filters?: {
      status?: ProductStatus;
      category?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const results = await this.repo.findMany({
      search: query,
      status: filters?.status ?? 'PUBLISHED',
      category: filters?.category,
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? 20,
      sortBy: filters?.sortBy ?? 'createdAt',
      sortOrder: filters?.sortOrder ?? 'desc',
    });

    return results;
  }

  // ── Get product by slug ──────────────────────────────────────────────────

  async getProductBySlug(slug: string): Promise<Product | null> {
    return this.repo.findBySlug(slug);
  }

  // ── Publish product ──────────────────────────────────────────────────────

  async publishProduct(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new Error(`Product with id "${id}" not found`);
    }

    return this.repo.updateStatus(id, 'PUBLISHED');
  }

  // ── Archive product ──────────────────────────────────────────────────────

  async archiveProduct(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new Error(`Product with id "${id}" not found`);
    }

    return this.repo.updateStatus(id, 'ARCHIVED');
  }

  // ── Bulk update status ───────────────────────────────────────────────────

  async bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<number> {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
    });

    return result.count;
  }

  // ── Bulk delete ──────────────────────────────────────────────────────────

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }
}
