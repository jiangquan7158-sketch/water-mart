import { prisma } from '@watermart/core';
import type { Prisma, Product, ProductImage, ProductTag, ProductCategory, ProductStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductFilters {
  category?: string;
  search?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductCreateInput {
  slug: string;
  translations: Record<string, unknown>;
  basePrice: number;
  currency: string;
  metadata?: Record<string, unknown>;
  images?: { url: string; alt?: string; sortOrder?: number }[];
  variants?: {
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    translations?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    sortOrder?: number;
  }[];
  categories?: string[];
  tags?: string[];
}

export interface ProductUpdateInput {
  slug?: string;
  status?: ProductStatus;
  translations?: Record<string, unknown>;
  basePrice?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  publishedAt?: Date | null;
}

export interface ProductListResult {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

const productIncludes = {
  images: true,
  variants: true,
  categories: {
    include: {
      category: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
} as const satisfies Prisma.ProductInclude;

export class ProductRepository {
  // ── Find by ID ──────────────────────────────────────────────────────────

  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
      include: productIncludes,
    });
  }

  // ── Find by slug ────────────────────────────────────────────────────────

  async findBySlug(slug: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: productIncludes,
    });
  }

  // ── Find many with filters ──────────────────────────────────────────────

  async findMany(filters: ProductFilters): Promise<ProductListResult> {
    const {
      category,
      search,
      status,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.ProductWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { slug: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['searchText'], string_contains: search } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    const sortField = sortBy as keyof Product;
    // Whitelist valid sort fields to prevent injection
    const allowedSortFields = new Set<string>([
      'createdAt',
      'updatedAt',
      'publishedAt',
      'basePrice',
      'slug',
      'status',
    ]);

    if (allowedSortFields.has(sortBy)) {
      (orderBy as Record<string, string>)[sortBy] = sortOrder;
    } else {
      (orderBy as Record<string, string>)['createdAt'] = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productIncludes,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async create(input: ProductCreateInput): Promise<Product> {
    const {
      slug,
      translations,
      basePrice,
      currency,
      metadata,
      images,
      variants,
      categories,
      tags,
    } = input;

    const product = await prisma.product.create({
      data: {
        slug,
        translations: translations as Prisma.InputJsonValue,
        basePrice,
        currency,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        images: images
          ? {
              create: images.map((img, idx) => ({
                url: img.url,
                alt: img.alt ?? null,
                sortOrder: img.sortOrder ?? idx,
              })),
            }
          : undefined,
        variants: variants
          ? {
              create: variants.map((v, idx) => ({
                sku: v.sku,
                price: v.price,
                compareAtPrice: v.compareAtPrice ?? null,
                stock: v.stock,
                translations: (v.translations ?? {}) as Prisma.InputJsonValue,
                attributes: (v.attributes ?? {}) as Prisma.InputJsonValue,
                sortOrder: v.sortOrder ?? idx,
              })),
            }
          : undefined,
        categories: categories
          ? {
              create: categories.map((catId) => ({
                categoryId: catId,
              })),
            }
          : undefined,
        tags: tags
          ? {
              create: tags.map((tagId) => ({
                tagId: tagId,
              })),
            }
          : undefined,
      },
      include: productIncludes,
    });

    return product;
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async update(id: string, input: ProductUpdateInput): Promise<Product> {
    const data: Prisma.ProductUpdateInput = {};

    if (input.slug !== undefined) data.slug = input.slug;
    if (input.status !== undefined) data.status = input.status;
    if (input.translations !== undefined) {
      data.translations = input.translations as Prisma.InputJsonValue;
    }
    if (input.basePrice !== undefined) data.basePrice = input.basePrice;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.metadata !== undefined) {
      data.metadata = input.metadata as Prisma.InputJsonValue;
    }
    if (input.publishedAt !== undefined) data.publishedAt = input.publishedAt;

    return prisma.product.update({
      where: { id },
      data,
      include: productIncludes,
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
      include: productIncludes,
    });
  }

  // ── Update status ────────────────────────────────────────────────────────

  async updateStatus(id: string, status: ProductStatus): Promise<Product> {
    const data: Prisma.ProductUpdateInput = { status };

    if (status === 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    return prisma.product.update({
      where: { id },
      data,
      include: productIncludes,
    });
  }

  // ── Count ────────────────────────────────────────────────────────────────

  async count(filters: Omit<ProductFilters, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>): Promise<number> {
    const { category, search, status } = filters;
    const where: Prisma.ProductWhereInput = {};

    if (status) where.status = status;
    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      };
    }
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['searchText'], string_contains: search } },
      ];
    }

    return prisma.product.count({ where });
  }

  // ── Search by perceptual hash ────────────────────────────────────────────

  async searchByHash(hash: string, threshold: number = 10): Promise<ProductImage[]> {
    // Load all images that have a perceptualHash set
    const images = await prisma.productImage.findMany({
      where: {
        perceptualHash: { not: null },
      },
    });

    // Filter by Hamming distance computed in JS since raw SQL bit operations
    // on bytea columns require platform-specific extensions.
    // We precompute the target hash bits for comparison with each image's stored hash hex.
    const targetBytes = hexToBytes(hash);

    const results: { image: ProductImage; distance: number }[] = [];

    for (const image of images) {
      if (!image.perceptualHash) continue;
      const imageHash = bytesToHex(new Uint8Array(image.perceptualHash));
      const distance = hammingDistanceBytes(targetBytes, new Uint8Array(image.perceptualHash));
      if (distance <= threshold) {
        results.push({ image, distance });
      }
    }

    // Sort by distance ascending (most similar first)
    results.sort((a, b) => a.distance - b.distance);

    return results.map((r) => r.image);
  }
}

// ─── pHash helpers used by searchByHash ─────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

function hammingDistanceBytes(a: Uint8Array, b: Uint8Array): number {
  let distance = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    let xor = a[i]! ^ b[i]!;
    // Count set bits (popcount)
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  // Account for length difference as extra bits
  distance += Math.abs(a.length - b.length) * 8;
  return distance;
}
