import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { prisma } = await import('@watermart/core');
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(categories.map(c => ({
      id: c.id, slug: c.slug,
      translations: JSON.parse(c.translations),
    })));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
