import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@watermart/core';
import { ImageSearchService } from '@watermart/product';

export const dynamic = 'force-dynamic';

// Prisma stores translations/categories as JSON strings (SQLite).
// Serialize a product row into the shape the storefront expects.
function serialize(p: {
  id: string;
  slug: string;
  status: string;
  translations: string;
  basePrice: number;
  currency: string;
  images?: Array<{ url: string; alt: string | null }>;
  categories?: Array<{ category: { id: string; slug: string; translations: string } }>;
}) {
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    translations: JSON.parse(p.translations),
    basePrice: p.basePrice,
    currency: p.currency,
    images: p.images?.map((i) => ({ url: i.url, alt: i.alt })) ?? [],
    categories:
      p.categories?.map((c) => ({
        id: c.category.id,
        slug: c.category.slug,
        translations: JSON.parse(c.category.translations),
      })) ?? [],
  };
}

const productInclude = {
  images: true,
  categories: { include: { category: true } },
} as const;

async function textSearch(q: string, category?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'PUBLISHED' };
  if (q) where.slug = { contains: q };
  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    take: 50,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(serialize);
}

async function idsSearch(ids: string[]) {
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'PUBLISHED' },
    include: productInclude,
    take: 50,
  });
  // Preserve the order of `ids`
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is (typeof products)[number] => Boolean(p))
    .map(serialize);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const idsParam = searchParams.get('ids');

  try {
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      return NextResponse.json(await idsSearch(ids));
    }
    return NextResponse.json(await textSearch(q, category));
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const q = (form.get('q') as string) || '';
    const category = (form.get('category') as string) || undefined;
    const imageFile = form.get('image');

    // Image search: compute perceptual hash and match indexed product images.
    if (imageFile && imageFile instanceof File) {
      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const service = new ImageSearchService();
        const matches = await service.searchByImage(buffer);
        const productIds = [
          ...new Set(matches.map((m) => m.image.productId)),
        ];
        return NextResponse.json(await idsSearch(productIds));
      } catch {
        // Image decoding/indexing may fail for unsupported formats or when
        // no images are indexed yet. Fall back to text search if we have a
        // keyword, otherwise return empty results.
        if (q) return NextResponse.json(await textSearch(q, category));
        return NextResponse.json([]);
      }
    }

    return NextResponse.json(await textSearch(q, category));
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
