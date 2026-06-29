'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search, Upload, Star, ShoppingCart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/search/image-upload';

interface ProductFromAPI {
  id: string;
  slug: string;
  translations: Record<string, { title: string; description: string }>;
  basePrice: number;
  currency: string;
  images: Array<{ url: string; alt: string | null }>;
  categories: Array<{
    id: string;
    slug: string;
    translations: Record<string, { name: string }>;
  }>;
}

interface CategoryFromAPI {
  id: string;
  slug: string;
  translations: Record<string, { name: string }>;
}

const DEFAULT_CATEGORIES: CategoryFromAPI[] = [
  { id: '1', slug: 'water-pitchers', translations: { en: { name: 'Water Pitchers' }, zh: { name: '滤水壶' } } },
  { id: '2', slug: 'reverse-osmosis', translations: { en: { name: 'Reverse Osmosis' }, zh: { name: '反渗透' } } },
  { id: '3', slug: 'shower-filters', translations: { en: { name: 'Shower Filters' }, zh: { name: '淋浴过滤' } } },
  { id: '4', slug: 'countertop', translations: { en: { name: 'Countertop' }, zh: { name: '台式' } } },
  { id: '5', slug: 'under-sink', translations: { en: { name: 'Under-Sink' }, zh: { name: '台下' } } },
  { id: '6', slug: 'accessories', translations: { en: { name: 'Accessories' }, zh: { name: '配件' } } },
];

function StarRating({ rating }: { rating: number; reviews?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-none text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductFromAPI[]>([]);
  const [categories, setCategories] = useState<CategoryFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);

  const removeImage = () => setImage(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Keyword-only search: go straight to the search page.
    if (searchQuery.trim() && !image) {
      window.location.href = `/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`;
      return;
    }
    // Image search: upload the file, then navigate to results by id.
    if (image) {
      setSearching(true);
      try {
        const formData = new FormData();
        formData.append('image', image);
        if (searchQuery.trim()) formData.append('q', searchQuery.trim());
        const res = await fetch('/api/search', { method: 'POST', body: formData });
        const data = res.ok ? await res.json() : [];
        const slugs = (data as Array<{ slug: string }>).map((p) => p.slug).filter(Boolean);
        if (slugs.length > 0) {
          window.location.href = `/${locale}/search?ids=${encodeURIComponent(slugs.join(','))}`;
        } else {
          // No matches — still open the search page so the user can refine.
          window.location.href = `/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`;
        }
      } catch {
        window.location.href = `/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`;
      } finally {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const data: ProductFromAPI[] = await prodRes.json();
          setProducts(data);

          // Extract unique categories from products response
          const catMap = new Map<string, CategoryFromAPI>();
          for (const product of data) {
            for (const cat of product.categories) {
              if (!catMap.has(cat.id)) {
                catMap.set(cat.id, cat);
              }
            }
          }
          if (catMap.size > 0) {
            setCategories(Array.from(catMap.values()));
          }
        }
      } catch {
        // Fall back to defaults if API unavailable
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const getTranslation = (obj: Record<string, { title?: string; name?: string; description?: string }>, field: 'title' | 'name' | 'description'): string => {
    return (obj[locale] as Record<string,string>)?.[field] ?? (obj.en as Record<string,string>)?.[field] ?? '';
  };

  const displayCategories = categories.length > 0 ? categories.slice(0, 6) : DEFAULT_CATEGORIES;
  const getCatName = (cat: CategoryFromAPI): string => {
    if (typeof cat.translations === 'object' && cat.translations !== null) {
      const t = cat.translations as Record<string, Record<string,string>>;
      return t[locale]?.name ?? t.en?.name ?? cat.slug;
    }
    return cat.slug;
  };

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 px-4 py-20 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?w=1920&q=80')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/10" />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-sky-50 md:text-xl">
            {t('hero.subtitle')}
          </p>
          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-2xl items-center gap-2 rounded-full bg-white/15 p-1.5 backdrop-blur-md"
          >
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-5 py-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none"
              />
              <ImageUpload
                onImageSelected={setImage}
                image={image}
                onRemoveImage={removeImage}
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="hidden rounded-full bg-white px-8 py-3 font-semibold text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50 md:block"
            >
              {searching ? '...' : t('common.search')}
            </button>
          </form>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">
          {t('categories.title')}
        </h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-6">
            {displayCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${locale}/search?category=${cat.slug}`}
                className="group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-sky-50 sm:h-28 sm:w-28">
                  <span className="text-3xl">💧</span>
                </div>
                <span className="text-center text-sm font-medium text-gray-700 group-hover:text-sky-600">
                  {getCatName(cat)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">{t('products.featured')}</h2>
            <Link href={`/${locale}/search`} className="text-sm font-medium text-sky-600 hover:text-sky-700">
              {t('products.viewAll')}
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <div key={product.slug} className="group rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                  <Link href={`/${locale}/products/${product.slug}`} className="block overflow-hidden rounded-t-2xl">
                    <img
                      src={product.images[0]?.url ?? `https://picsum.photos/seed/${product.slug}/400/400`}
                      alt={product.images[0]?.alt ?? product.slug}
                      className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </Link>
                  <div className="p-4">
                    <Link href={`/${locale}/products/${product.slug}`} className="block text-sm font-medium text-gray-900 line-clamp-2 hover:text-sky-600">
                      {getTranslation(product.translations, 'title')}
                    </Link>
                    <StarRating rating={4.5} />
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">${product.basePrice.toFixed(2)}</span>
                    </div>
                    <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600">
                      <ShoppingCart className="h-4 w-4" />
                      {t('products.addToCart')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">{t('trust.title')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
                <svg className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('trust.globalShipping')}</h3>
              <p className="text-sm text-gray-500">{t('trust.globalShippingDesc')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
                <svg className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('trust.securePayment')}</h3>
              <p className="text-sm text-gray-500">{t('trust.securePaymentDesc')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
                <svg className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('trust.easyReturns')}</h3>
              <p className="text-sm text-gray-500">{t('trust.easyReturnsDesc')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
                <svg className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('trust.support247')}</h3>
              <p className="text-sm text-gray-500">{t('trust.support247Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gradient-to-r from-sky-500 to-blue-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-3 text-3xl font-bold">{t('footer.newsletter')}</h2>
          <p className="mb-8 text-sky-100">{t('footer.newsletterDesc')}</p>
          <form onSubmit={(e) => e.preventDefault()} className="mx-auto flex max-w-md gap-2">
            <input type="email" placeholder={t('footer.emailPlaceholder')} className="flex-1 rounded-full px-5 py-3 text-gray-900 placeholder-gray-400 outline-none ring-1 ring-transparent focus:ring-white" />
            <button type="submit" className="rounded-full bg-white px-8 py-3 font-semibold text-sky-600 transition-colors hover:bg-sky-50">{t('footer.subscribe')}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
