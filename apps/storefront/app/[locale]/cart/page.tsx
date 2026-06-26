'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Tag,
  Shield,
  Truck,
} from 'lucide-react';

const INITIAL_ITEMS = [
  {
    id: 'cart-1',
    slug: 'aqua-pure-bottle-500',
    name: 'AquaPure Insulated Bottle 500ml',
    variant: 'Color: #0ea5e9 / Size: 500ml',
    price: 24.99,
    originalPrice: 29.99,
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&h=200&fit=crop',
  },
  {
    id: 'cart-2',
    slug: 'hydro-zen-dispenser',
    name: 'HydroZen Countertop Dispenser',
    variant: 'Color: White',
    price: 89.99,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=200&h=200&fit=crop',
  },
];

export default function CartPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal - discount + shipping;

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const applyDiscount = () => {
    if (discountCode.toLowerCase() === 'water10') {
      setDiscount(subtotal * 0.1);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <ShoppingBag className="mx-auto mb-6 h-20 w-20 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">{t('cart.empty')}</h1>
        <p className="mt-2 text-gray-500">{t('cart.emptyHint')}</p>
        <Link
          href={`/${locale}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
        >
          {t('cart.continueShopping')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">{t('cart.title')}</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <Link
                href={`/${locale}/products/${item.slug}`}
                className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/${locale}/products/${item.slug}`}
                    className="font-medium text-gray-900 hover:text-sky-600"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500">{item.variant}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    {item.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        ${(item.originalPrice * item.quantity).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-gray-200">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="rounded-l-lg p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="rounded-r-lg p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t('cart.summary')}</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('cart.subtotal')}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t('cart.shipping')}</span>
                <span>{shipping === 0 ? t('cart.free') : `$${shipping.toFixed(2)}`}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('cart.discount')}</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Discount Code */}
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder={t('cart.discountPlaceholder')}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <button
                onClick={applyDiscount}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                {t('cart.apply')}
              </button>
            </div>

            <div className="my-4 border-t border-gray-100" />

            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>{t('cart.total')}</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <Link
              href={`/${locale}/checkout`}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 py-3.5 text-sm font-semibold text-white transition-all hover:bg-sky-600 active:scale-[0.98]"
            >
              {t('cart.checkout')}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                {t('cart.secureCheckout')}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Truck className="h-3.5 w-3.5 text-green-500" />
                {shipping === 0 ? t('cart.freeShippingMsg') : t('cart.shippingEligibility')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
