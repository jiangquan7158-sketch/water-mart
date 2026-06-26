'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, Package, Search, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORDERS = [
  {
    id: 'WM-2025-001234',
    date: '2025-12-15',
    status: 'delivered',
    total: 139.97,
    items: 3,
    paymentMethod: 'Visa ****4242',
  },
  {
    id: 'WM-2025-001198',
    date: '2025-11-28',
    status: 'shipped',
    total: 89.99,
    items: 1,
    paymentMethod: 'PayPal',
  },
  {
    id: 'WM-2025-001102',
    date: '2025-11-10',
    status: 'delivered',
    total: 228.48,
    items: 5,
    paymentMethod: 'Mastercard ****8888',
  },
  {
    id: 'WM-2025-001045',
    date: '2025-10-22',
    status: 'cancelled',
    total: 34.99,
    items: 1,
    paymentMethod: 'Visa ****4242',
  },
  {
    id: 'WM-2025-000987',
    date: '2025-10-05',
    status: 'delivered',
    total: 62.97,
    items: 2,
    paymentMethod: 'PayPal',
  },
  {
    id: 'WM-2025-000876',
    date: '2025-09-18',
    status: 'processing',
    total: 199.99,
    items: 1,
    paymentMethod: 'Visa ****4242',
  },
];

const statusConfig: Partial<Record<string, { icon: React.ElementType; color: string; bg: string }>> = {
  delivered: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50' },
  shipped: { icon: Truck, color: 'text-blue-700', bg: 'bg-blue-50' },
  processing: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
  cancelled: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50' },
};

export default function OrdersPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = ORDERS.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/en"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          {t('nav.home')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{t('account.orders')}</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('account.searchOrders')}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
        >
          <option value="all">{t('account.allOrders')}</option>
          <option value="processing">{t('account.processing')}</option>
          <option value="shipped">{t('account.shipped')}</option>
          <option value="delivered">{t('account.delivered')}</option>
          <option value="cancelled">{t('account.cancelled')}</option>
        </select>
      </div>

      {/* Order List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-4 h-16 w-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900">{t('account.noOrders')}</h2>
          <p className="mt-2 text-sm text-gray-500">{t('account.noOrdersHint')}</p>
          <Link
            href="/en/search"
            className="mt-6 rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
          >
            {t('account.startShopping')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const status = statusConfig[order.status] ?? statusConfig.processing!
            const StatusIcon = status.icon;
            return (
              <div
                key={order.id}
                className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl',
                      status.bg
                    )}
                  >
                    <StatusIcon className={cn('h-6 w-6', status.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{order.id}</h3>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                          status.bg,
                          status.color
                        )}
                      >
                        {t(`account.${order.status}` as any)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('account.date')}: {order.date}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('account.items')}: {order.items} | {order.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                  <span className="text-lg font-bold text-gray-900">
                    ${order.total.toFixed(2)}
                  </span>
                  <Link
                    href={`/en/account/orders/${order.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    {t('account.viewDetails')}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
