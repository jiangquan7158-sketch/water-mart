import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { prisma } = await import('@watermart/core');
    const products = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: { images: true, categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(products.map(p => ({
      id: p.id, slug: p.slug, status: p.status,
      translations: JSON.parse(p.translations),
      basePrice: p.basePrice, currency: p.currency,
      images: p.images.map(i => ({ url: i.url, alt: i.alt })),
      categories: p.categories.map(c => ({ id: c.category.id, slug: c.category.slug, translations: JSON.parse(c.category.translations) })),
      createdAt: p.createdAt.toISOString(),
    })));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
