'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Share2,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&h=600&fit=crop',
];

const VARIANTS = {
  color: ['#0ea5e9', '#0284c7', '#1e293b', '#f59e0b'],
  size: ['350ml', '500ml', '750ml', '1L'],
};

const RELATED_PRODUCTS = [
  {
    slug: 'hydro-zen-dispenser',
    name: 'HydroZen Countertop Dispenser',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=400&h=400&fit=crop',
    rating: 4.5,
  },
  {
    slug: 'pureflow-home-filter',
    name: 'PureFlow Home Filtration System',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    rating: 4.6,
  },
  {
    slug: 'aqua-test-kit-pro',
    name: 'AquaTest Pro Water Testing Kit',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=400&fit=crop',
    rating: 4.7,
  },
  {
    slug: 'filter-replacement-3pk',
    name: 'Replacement Filter Cartridge 3-Pack',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    rating: 4.4,
  },
];

const TABS = ['description', 'specifications', 'shipping', 'reviews'];

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
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
      <span className="ml-2 text-sm text-gray-500">({reviews.toLocaleString()} reviews)</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedColor, setSelectedColor] = useState(VARIANTS.color[0]);
  const [selectedSize, setSelectedSize] = useState(VARIANTS.size[1]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const product = {
    name: 'AquaPure Insulated Bottle 500ml',
    price: 29.99,
    salePrice: 24.99,
    rating: 4.8,
    reviewCount: 2341,
    inStock: true,
    sku: 'APB-500-SKY',
    description: `Stay hydrated in style with the AquaPure Insulated Bottle. Engineered with double-wall vacuum insulation, this bottle keeps your beverages cold for up to 24 hours or hot for up to 12 hours. Made from premium 18/8 stainless steel, it is BPA-free, eco-friendly, and built to last a lifetime.\n\nThe wide-mouth opening makes it easy to fill, clean, and add ice cubes. The leak-proof lid ensures no spills in your bag, and the sleek powder-coated finish provides a comfortable, non-slip grip. Available in multiple sizes and vibrant colors to match your lifestyle.\n\nWhether you are hitting the gym, commuting to work, or exploring the outdoors, the AquaPure bottle is your perfect hydration companion. Every purchase supports global clean water initiatives — 1% of all sales goes to providing clean drinking water to communities in need.`,
    specifications: [
      { label: 'Material', value: '18/8 Stainless Steel' },
      { label: 'Insulation', value: 'Double-wall vacuum' },
      { label: 'BPA Free', value: 'Yes' },
      { label: 'Dishwasher Safe', value: 'Yes (hand wash recommended)' },
      { label: 'Cold Retention', value: 'Up to 24 hours' },
      { label: 'Hot Retention', value: 'Up to 12 hours' },
      { label: 'Weight', value: '340g (500ml)' },
      { label: 'Dimensions', value: '7.5cm x 26.5cm' },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/${locale}`} className="hover:text-sky-600">
          {t('nav.home')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/search`} className="hover:text-sky-600">
          {t('nav.shop')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">{product.name}</span>
      </nav>

      {/* Product Detail */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl bg-gray-50">
            <img
              src={PRODUCT_IMAGES[activeImage]}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {PRODUCT_IMAGES.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  'h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-gray-50 transition-all',
                  activeImage === i ? 'border-sky-500' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <img
                  src={img}
                  alt={`${product.name} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{product.name}</h1>
          <div className="mt-2">
            <StarRating rating={product.rating} reviews={product.reviewCount} />
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              ${product.salePrice.toFixed(2)}
            </span>
            <span className="text-lg text-gray-400 line-through">${product.price.toFixed(2)}</span>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Save ${(product.price - product.salePrice).toFixed(2)}
            </span>
          </div>

          {/* Color Variant */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              {t('product.color')}: <span className="font-normal text-gray-500">{selectedColor}</span>
            </h3>
            <div className="flex gap-3">
              {VARIANTS.color.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'h-10 w-10 rounded-full border-2 transition-all',
                    selectedColor === color
                      ? 'border-sky-500 ring-1 ring-sky-500 ring-offset-2'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Size Variant */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              {t('product.size')}: <span className="font-normal text-gray-500">{selectedSize}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {VARIANTS.size.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                    selectedSize === size
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('product.quantity')}</h3>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 w-fit">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="rounded p-1 hover:bg-gray-100 transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="rounded p-1 hover:bg-gray-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart + Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 py-3.5 text-base font-semibold text-white transition-all hover:bg-sky-600 active:scale-[0.98]">
              <ShoppingCart className="h-5 w-5" />
              {t('product.addToCart')}
            </button>
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold transition-all',
                isWishlisted
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              <Heart
                className={cn('h-5 w-5', isWishlisted && 'fill-red-500 text-red-500')}
              />
            </button>
            <button className="flex items-center justify-center rounded-full border border-gray-200 px-4 py-3.5 text-gray-700 transition-colors hover:bg-gray-50">
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* In-stock badge */}
          {product.inStock && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {t('product.inStock')}
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">SKU: {product.sku}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={cn(
                  'pb-3 text-sm font-medium transition-all',
                  activeTab === tab
                    ? 'border-b-2 border-sky-500 text-sky-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t(`product.${tab}` as any)}
              </button>
            ))}
          </nav>
        </div>

        <div className="py-8">
          {activeTab === 'description' && (
            <div className="max-w-3xl">
              <p className="whitespace-pre-line text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="max-w-2xl">
              <table className="w-full border-collapse">
                <tbody>
                  {product.specifications.map((spec) => (
                    <tr key={spec.label} className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-medium text-gray-900">{spec.label}</td>
                      <td className="py-3 text-sm text-gray-600">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50 p-6">
                <Truck className="h-6 w-6 flex-shrink-0 text-sky-500" />
                <div>
                  <h4 className="font-semibold text-gray-900">{t('product.freeShipping')}</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    {t('product.freeShippingDesc')}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50 p-6">
                <Shield className="h-6 w-6 flex-shrink-0 text-sky-500" />
                <div>
                  <h4 className="font-semibold text-gray-900">{t('product.warranty')}</h4>
                  <p className="mt-1 text-sm text-gray-600">{t('product.warrantyDesc')}</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50 p-6">
                <RotateCcw className="h-6 w-6 flex-shrink-0 text-sky-500" />
                <div>
                  <h4 className="font-semibold text-gray-900">{t('product.returnPolicy')}</h4>
                  <p className="mt-1 text-sm text-gray-600">{t('product.returnPolicyDesc')}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-3xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{product.rating}</div>
                  <StarRating rating={product.rating} reviews={product.reviewCount} />
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const pct = stars === 5 ? 72 : stars === 4 ? 18 : stars === 3 ? 6 : stars === 2 ? 2 : 2;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-gray-500">{stars}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-500">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sample Reviews */}
              {[
                {
                  name: 'Sarah M.',
                  date: '2025-12-10',
                  rating: 5,
                  title: 'Best water bottle I have ever owned!',
                  body: 'Keeps my water cold all day long, even in the summer heat. The powder coating is really nice and durable — I have dropped it several times and not a single scratch. Highly recommend!',
                },
                {
                  name: 'James K.',
                  date: '2025-11-28',
                  rating: 4,
                  title: 'Great bottle, wish lid was easier to clean',
                  body: 'Overall really solid build quality. Keeps drinks hot and cold as advertised. Only minor complaint is that the lid has some small crevices that are a bit tough to clean thoroughly.',
                },
                {
                  name: 'Elena R.',
                  date: '2025-10-15',
                  rating: 5,
                  title: 'Beautiful design and perfect size',
                  body: 'I got the 500ml in the sky blue color and it is gorgeous. The size is perfect for my commute bag. The wide mouth makes it super easy to add ice, which I really appreciate.',
                },
              ].map((review, i) => (
                <div key={i} className="border-b border-gray-100 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                        {review.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{review.name}</div>
                        <div className="text-xs text-gray-500">{review.date}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            'h-4 w-4',
                            s <= review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-none text-gray-300'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <h4 className="mt-3 font-medium text-gray-900">{review.title}</h4>
                  <p className="mt-2 text-sm text-gray-600">{review.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <section className="mt-16">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">{t('product.relatedProducts')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {RELATED_PRODUCTS.map((rp) => (
            <Link
              key={rp.slug}
              href={`/${locale}/products/${rp.slug}`}
              className="group rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className="overflow-hidden rounded-t-xl">
                <img
                  src={rp.image}
                  alt={rp.name}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-sky-600">
                  {rp.name}
                </h3>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        'h-3.5 w-3.5',
                        s <= Math.round(rp.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-none text-gray-300'
                      )}
                    />
                  ))}
                </div>
                <div className="mt-1 font-semibold text-gray-900">${rp.price.toFixed(2)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
