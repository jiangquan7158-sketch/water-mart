'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Upload, X } from 'lucide-react';
import ImageUpload from '@/components/search/image-upload';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [image, setImage] = useState<File | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    async function search() {
      // Run a search when there is a keyword OR an image OR an ids list.
      const ids = searchParams.get('ids');
      if (!searchQuery.trim() && !image && !ids) return;

      setLoading(true);
      setError(null);

      try {
        let data;
        if (ids) {
          // Results pre-computed by image search on the homepage.
          const res = await fetch(`/api/search?ids=${encodeURIComponent(ids)}`);
          if (!res.ok) throw new Error('Search failed');
          data = await res.json();
        } else {
          const formData = new FormData();
          if (searchQuery.trim()) formData.append('q', searchQuery.trim());
          if (image) formData.append('image', image);

          const res = await fetch('/api/search', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Search failed');
          data = await res.json();
        }

        setProducts(data);
        setHasSearched(true);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [searchQuery, image, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    // The useEffect above already reacts to input/image changes.
    // Just prevent the default form navigation.
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative flex min-h-[450px] items-center justify-center overflow-hidden bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 px-4 py-20 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?w=1920&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="mb-4 text-5xl font-extrabold leading-tight">Search WaterMart</h1>
          <p className="mb-8 text-xl text-sky-50">Find the perfect water filtration products</p>

          <form ref={formRef} onSubmit={handleSubmit} className="flex w-full max-w-2xl items-center gap-2 rounded-full bg-white/15 p-1.5 backdrop-blur-md">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-5 py-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none"
              />
              <ImageUpload
                onImageSelected={(file) => {
                  setIsImageUploading(true);
                  setImage(file);
                  setTimeout(() => setIsImageUploading(false), 500);
                  setShowImagePreview(true);
                }}
                image={image}
                onRemoveImage={() => {
                  setImage(null);
                  setShowImagePreview(false);
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() && !image}
              className="rounded-full bg-white px-8 py-3 font-semibold text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50"
            >
              {searchQuery.trim() ? 'Search' : hasSearched ? 'New Search' : 'Search'}
            </button>
          </form>

          {!hasSearched && (
            <button
              type="button"
              onClick={() => setShowImagePreview(!showImagePreview)}
              className="mt-6 flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{showImagePreview ? 'Hide image search' : 'Upload an image to search'}</span>
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-sky-500" /></div>
        ) : error ? (
          <div className="flex justify-center py-12 text-red-500"><p>{error}</p></div>
        ) : (
          <>
            {hasSearched && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-4 h-16 w-16 text-gray-300" />
                <h3 className="mb-2 text-xl font-medium text-gray-900">No results found</h3>
                <p className="mb-6 text-gray-500">Try different keywords or upload a clear image of the product</p>
                <Link href="/" className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600">Back to Home</Link>
              </div>
            ) : (
              <div>
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-gray-900">{hasSearched ? 'Search Results' : 'Recent Searches'}</h2>
                  {hasSearched && <Link href="/search" className="text-sm font-medium text-sky-600 hover:text-sky-700">View all</Link>}
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {products.map((product: any) => (
                    <div key={product.slug} className="group rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                      <Link href={`/${product.locale}/products/${product.slug}`} className="block overflow-hidden rounded-t-2xl">
                        <img
                          src={product.images?.[0]?.url ?? `https://picsum.photos/seed/${product.slug}/400/400`}
                          alt={product.images?.[0]?.alt ?? product.slug}
                          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </Link>
                      <div className="p-4">
                        <Link href={`/${product.locale}/products/${product.slug}`} className="block text-sm font-medium text-gray-900 line-clamp-2 hover:text-sky-600">
                          {product.translations?.[product.locale]?.title ?? product.title}
                        </Link>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-900">${product.basePrice?.toFixed(2) ?? '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
