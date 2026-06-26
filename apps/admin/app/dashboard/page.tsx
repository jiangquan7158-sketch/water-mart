'use client';

import { useState, useMemo } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import clsx from 'clsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { format, subDays } from 'date-fns';

// ── Mock Data ────────────────────────────────────────────────────────────────

interface StatCardData {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  iconBg: string;
}

const statCards: StatCardData[] = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    trend: '+20.1%',
    trendUp: true,
    icon: DollarSign,
    iconBg: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    title: 'Orders',
    value: '356',
    trend: '+12.5%',
    trendUp: true,
    icon: ShoppingBag,
    iconBg: 'bg-blue-500/10 text-blue-400',
  },
  {
    title: 'Products',
    value: '1,245',
    trend: '+3.2%',
    trendUp: true,
    icon: Package,
    iconBg: 'bg-purple-500/10 text-purple-400',
  },
  {
    title: 'Customers',
    value: '8,432',
    trend: '+8.9%',
    trendUp: true,
    icon: Users,
    iconBg: 'bg-orange-500/10 text-orange-400',
  },
];

// Generate 30 days of mock revenue data inside the component
function generateRevenueData() {
  return Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const baseRevenue = 1200 + Math.sin(i / 5) * 400 + Math.random() * 300;
    return {
      date: format(date, 'MMM dd'),
      revenue: Math.round(baseRevenue),
    };
  });
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  amount: number;
  status: 'Delivered' | 'Processing' | 'Pending' | 'Cancelled';
}

const recentOrders: RecentOrder[] = [
  { id: '1', orderNumber: '#WM-2024-0156', customer: 'Emily Johnson', date: '2024-06-24', amount: 245.99, status: 'Delivered' },
  { id: '2', orderNumber: '#WM-2024-0155', customer: 'Michael Chen', date: '2024-06-24', amount: 189.50, status: 'Processing' },
  { id: '3', orderNumber: '#WM-2024-0154', customer: 'Sarah Williams', date: '2024-06-23', amount: 432.00, status: 'Delivered' },
  { id: '4', orderNumber: '#WM-2024-0153', customer: 'David Kim', date: '2024-06-23', amount: 78.25, status: 'Pending' },
  { id: '5', orderNumber: '#WM-2024-0152', customer: 'Lisa Anderson', date: '2024-06-22', amount: 312.80, status: 'Delivered' },
];

interface TopProduct {
  name: string;
  sales: number;
}

const topProducts: TopProduct[] = [
  { name: 'Smart Water Bottle Pro', sales: 234 },
  { name: 'pH Test Kit Deluxe', sales: 189 },
  { name: 'Mineral Filter Cartridge', sales: 167 },
  { name: 'UV Sterilizer Pen', sales: 145 },
  { name: 'Water Quality Sensor', sales: 123 },
];

const statusStyles: Record<string, string> = {
  Delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  Cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
};

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-white">
        ${payload[0]!.value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const revenueData = useMemo(() => generateRevenueData(), []);

  return (
    <div className="space-y-6">
      {/* Page title for mobile */}
      <h2 className="text-xl font-bold text-white sm:hidden">Dashboard</h2>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={clsx('p-2 rounded-lg', stat.iconBg)}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <div
                  className={clsx(
                    'flex items-center text-xs font-medium',
                    stat.trendUp ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {stat.trendUp ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {stat.trend}
                </div>
                <span className="text-xs text-slate-500">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Revenue Chart ──────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white">Revenue Overview</h3>
            <p className="text-xs text-slate-400 mt-0.5">Last 30 days</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            20.1% growth
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }}
                fill="url(#revenueGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Two Columns: Orders + Top Products ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Orders</h3>
            <a
              href="/orders"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2.5 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Order#
                  </th>
                  <th className="text-left py-2.5 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left py-2.5 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right py-2.5 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-right py-2.5 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-2 text-sm font-medium text-blue-400">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-300">
                      {order.customer}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-400">
                      {format(new Date(order.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-2 text-sm text-right text-slate-300 font-medium">
                      ${order.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={clsx(
                          'status-badge border',
                          statusStyles[order.status]
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Top Selling Products</h3>
            <a
              href="/products"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all
            </a>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    color: '#f1f5f9',
                  }}
                  formatter={(value: number) => [value, 'Sales']}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
