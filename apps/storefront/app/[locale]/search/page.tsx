'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Star, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const RESULTS = [
  { slug: 'aqua-pure-bottle-500', name: 'AquaPure Insulated Bottle 500ml', price: 29.99, salePrice: 24.99, rating: 4.8, reviews: 2341, category: 'waterBottles', brand: 'AquaPure', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop' },
  { slug: 'aqua-pure-bottle-750', name: 'AquaPure Insulated Bottle 750ml', price: 34.99, rating: 4.7, reviews: 1890, category: 'waterBottles', brand: 'AquaPure', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop' },
  { slug: 'aqua-pure-bottle-1l', name: 'AquaPure Insulated Bottle 1L', price: 39.99, salePrice: 34.99, rating: 4.6, reviews: 1204, category: 'waterBottles', brand: 'AquaPure', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop' },
  { slug: 'pureflow-home-filter', name: 'PureFlow Home Filtration System', price: 199.99, rating: 4.6, reviews: 987, category: 'filtration', brand: 'PureFlow', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop' },
  { slug: 'pureflow-under-sink', name: 'PureFlow Under-Sink Filter System', price: 149.99, salePrice: 129.99, rating: 4.4, reviews: 756, category: 'filtration', brand: 'PureFlow', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop' },
  { slug: 'hydro-zen-dispenser', name: 'HydroZen Countertop Dispenser', price: 89.99, rating: 4.5, reviews: 1563, category: 'dispensers', brand: 'HydroZen', image: 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=400&h=400&fit=crop' },
  { slug: 'hydro-zen-floor', name: 'HydroZen Floor Standing Dispenser', price: 249.99, rating: 4.3, reviews: 432, category: 'dispensers', brand: 'HydroZen', image: 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=400&h=400&fit=crop' },
  { slug: 'aqua-test-kit-pro', name: 'AquaTest Pro Water Testing Kit', price: 49.99, rating: 4.7, reviews: 412, category: 'testingKits', brand: 'AquaTest', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=400&fit=crop' },
  { slug: 'filter-replacement-3pk', name: 'Replacement Filter Cartridge 3-Pack', price: 34.99, rating: 4.4, reviews: 623, category: 'accessories', brand: 'PureFlow', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop' },
  { slug: 'hydration-backpack', name: 'TrailRunner Hydration Backpack 2L', price: 59.99, salePrice: 49.99, rating: 4.5, reviews: 892, category: 'hydrationPacks', brand: 'TrailRunner', image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop' },
];

const PRICE_RANGES = [
  { label: 'search.under25', min: 0, max: 25 },
  { label: 'search.25to50', min: 25, max: 50 },
  { label: 'search.50to100', min: 50, max: 100 },
  { label: 'search.100to200', min: 100, max: 200 },
  { label: 'search.over200', min: 200, max: Infinity },
];

const BRANDS = ['AquaPure', 'PureFlow', 'HydroZen', 'AquaTest', 'TrailRunner'];

function SearchContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let items = RESULTS;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      items = items.filter((p) => selectedCategories.includes(p.category));
    }

    if (selectedBrands.length > 0) {
      items = items.filter((p) => selectedBrands.includes(p.brand));
    }

    if (selectedPriceRanges.length > 0) {
      items = items.filter((p) => {
        const effectivePrice = p.salePrice ?? p.price;
        return selectedPriceRanges.some((idx) => {
          const range = PRICE_RANGES[idx];
          return range && effectivePrice >= range.min && effectivePrice < range.max;
        });
      });
    }

    if (minRating > 0) {
      items = items.filter((p) => p.rating >= minRating);
    }

    switch (sortBy) {
      case 'price-asc':
        items = [...items].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
        break;
      case 'price-desc':
        items = [...items].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
        break;
      case 'rating':
        items = [...items].sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        items = [...items].reverse();
        break;
    }

    return items;
  }, [searchQuery, selectedCategories, selectedBrands, selectedPriceRanges, minRating, sortBy]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePriceRange = (idx: number) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const PER_PAGE = 6;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pagedItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t('search.searchPlaceholder')}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-sky-500 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside
          className={cn(
            'w-64 flex-shrink-0 space-y-8 transition-all',
            !showFilters && 'hidden lg:block'
          )}
        >
          {/* Category Filter */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('search.category')}</h3>
            <div className="space-y-2">
              {[
                { key: 'waterBottles', count: 3 },
                { key: 'filtration', count: 2 },
                { key: 'dispensers', count: 2 },
                { key: 'accessories', count: 1 },
                { key: 'testingKits', count: 1 },
                { key: 'hydrationPacks', count: 1 },
              ].map((cat) => (
                <label key={cat.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                    className="h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-gray-600">{t(`categories.${cat.key}` as any)}</span>
                  <span className="ml-auto text-xs text-gray-400">({cat.count})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('search.priceRange')}</h3>
            <div className="space-y-2">
              {PRICE_RANGES.map((range, idx) => (
                <label key={idx} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPriceRanges.includes(idx)}
                    onChange={() => togglePriceRange(idx)}
                    className="h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-gray-600">{t(range.label as any)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('search.rating')}</h3>
            <div className="space-y-2">
              {[4, 3, 2, 1].map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === r}
                    onChange={() => setMinRating(minRating === r ? 0 : r)}
                    className="h-4 w-4 border-gray-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="flex items-center gap-1 text-gray-600">
                    {r}+{' '}
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('search.brand')}</h3>
            <div className="space-y-2">
              {BRANDS.map((brand) => (
                <label key={brand} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-gray-600">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Sort & Count Bar */}
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <p className="text-sm text-gray-500">
              {filtered.length} {t('search.results')}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('search.filters')}
              </button>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-10 text-sm text-gray-700 outline-none focus:border-sky-500"
                >
                  <option value="relevance">{t('search.sortRelevance')}</option>
                  <option value="price-asc">{t('search.sortPriceLow')}</option>
                  <option value="price-desc">{t('search.sortPriceHigh')}</option>
                  <option value="rating">{t('search.sortRating')}</option>
                  <option value="newest">{t('search.sortNewest')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Mobile Filters Drawer */}
          {showFilters && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:hidden">
              {/* Ssame filter content for mobile */}
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('search.category')}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {['waterBottles', 'filtration', 'dispensers', 'accessories', 'testingKits', 'hydrationPacks'].map((key) => (
                      <button
                        key={key}
                        onClick={() => toggleCategory(key)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                          selectedCategories.includes(key)
                            ? 'bg-sky-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {t(`categories.${key}` as any)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {pagedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">{t('search.noResults')}</h3>
              <p className="mt-2 text-sm text-gray-500">{t('search.noResultsHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pagedItems.map((product) => (
                <a
                  key={product.slug}
                  href={`/en/products/${product.slug}`}
                  className="group flex gap-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-sky-600">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">{product.brand}</p>
                      <div className="mt-1 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'h-3.5 w-3.5',
                              s <= Math.round(product.rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-none text-gray-300'
                            )}
                          />
                        ))}
                        <span className="ml-1 text-xs text-gray-400">({product.reviews})</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-bold text-gray-900">
                        ${(product.salePrice ?? product.price).toFixed(2)}
                      </span>
                      {product.salePrice && (
                        <span className="text-xs text-gray-400 line-through">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('search.previous')}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    page === p
                      ? 'bg-sky-500 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('search.next')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-sky-500" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
