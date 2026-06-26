'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Eye,
  BarChart2,
  Users,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, subMonths, startOfYear } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

type TimeRange = '7d' | '30d' | '90d' | '1y';

interface KPI {
  title: string;
  value: string;
  change: number;
  changePositive: boolean;
  icon: React.ElementType;
  iconBg: string;
}

// ── Mock Data Generators ───────────────────────────────────────────────────────

function generateTimeData(range: TimeRange) {
  const daysMap: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = daysMap[range];
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const baseRevenue = 1200 + Math.sin(i / 7) * 400 + Math.cos(i / 14) * 300 + Math.random() * 200;
    const baseOrders = Math.round(20 + Math.sin(i / 7) * 8 + Math.random() * 6);
    return {
      date: format(date, range === '1y' ? 'MMM yy' : 'MMM dd'),
      revenue: Math.round(baseRevenue),
      orders: baseOrders,
    };
  });
}

const trafficSources = [
  { name: 'Direct', value: 35, color: '#3b82f6' },
  { name: 'Organic Search', value: 28, color: '#22c55e' },
  { name: 'Social Media', value: 18, color: '#a855f7' },
  { name: 'Referral', value: 12, color: '#f97316' },
  { name: 'Email', value: 7, color: '#eab308' },
];

const topProducts = [
  { name: 'Smart Water Bottle Pro', revenue: 12450 },
  { name: 'Whole House Filter System', revenue: 9890 },
  { name: 'pH Test Kit Deluxe', revenue: 8450 },
  { name: 'UV-C Sterilizer Wand', revenue: 7200 },
  { name: 'Reverse Osmosis Membrane', revenue: 6230 },
  { name: 'Alkaline Water Pitcher', revenue: 5190 },
  { name: 'Mineral Filter Cartridge', revenue: 4320 },
  { name: 'Copper Water Bottle 1L', revenue: 3890 },
];

const funnelData = [
  { name: 'Visitors', value: 45000 },
  { name: 'Product Views', value: 18000 },
  { name: 'Add to Cart', value: 6500 },
  { name: 'Checkout', value: 3200 },
  { name: 'Purchased', value: 1200 },
];

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#eab308'];

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = '$',
  valueSuffix = '',
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-semibold text-white">
          {entry.name}: {valuePrefix}
          {entry.value.toLocaleString()}{valueSuffix}
        </p>
      ))}
    </div>
  );
}

// ── Conversion Funnel Component ────────────────────────────────────────────────

function ConversionFunnel() {
  const maxValue = funnelData[0]!.value;
  return (
    <div className="space-y-2">
      {funnelData.map((step, idx) => {
        const widthPercent = (step.value / maxValue) * 100;
        const conversionRate =
          idx > 0 ? ((step.value / funnelData[idx - 1]!.value) * 100).toFixed(1) : '100';
        return (
          <div key={step.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-300">{step.name}</span>
              <span className="text-sm text-slate-400">
                {step.value.toLocaleString()}
                {idx > 0 && (
                  <span className="text-xs text-slate-500 ml-1">({conversionRate}%)</span>
                )}
              </span>
            </div>
            <div className="relative">
              <div
                className="h-10 rounded-lg flex items-center justify-center transition-all duration-500"
                style={{
                  width: `${Math.max(widthPercent, 10)}%`,
                  backgroundColor: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'][idx],
                  margin: '0 auto',
                }}
              >
                {widthPercent < 30 ? (
                  <span className="text-xs text-white/70 truncate px-2">{step.value.toLocaleString()}</span>
                ) : (
                  <span className="text-sm font-medium text-white">{step.value.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const timeData = useMemo(() => generateTimeData(timeRange), [timeRange]);

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: '1y', label: 'This Year' },
  ];

  // ── KPI Calculations ─────────────────────────────────────────────────────

  const kpis: KPI[] = useMemo(() => {
    const totalRevenue = timeData.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = timeData.reduce((s, d) => s + d.orders, 0);
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate = 2.4;
    const visitors = 45230;
    const pageViews = 128450;

    return [
      {
        title: 'Total Revenue',
        value: `$${totalRevenue.toLocaleString()}`,
        change: 20.1,
        changePositive: true,
        icon: DollarSign,
        iconBg: 'bg-emerald-500/10 text-emerald-400',
      },
      {
        title: 'Orders',
        value: totalOrders.toLocaleString(),
        change: 12.5,
        changePositive: true,
        icon: ShoppingBag,
        iconBg: 'bg-blue-500/10 text-blue-400',
      },
      {
        title: 'Avg Order Value',
        value: `$${aov.toFixed(2)}`,
        change: 5.2,
        changePositive: true,
        icon: BarChart2,
        iconBg: 'bg-purple-500/10 text-purple-400',
      },
      {
        title: 'Conversion Rate',
        value: `${conversionRate}%`,
        change: 0.3,
        changePositive: true,
        icon: Activity,
        iconBg: 'bg-cyan-500/10 text-cyan-400',
      },
      {
        title: 'Visitors',
        value: visitors.toLocaleString(),
        change: 15.8,
        changePositive: true,
        icon: Users,
        iconBg: 'bg-orange-500/10 text-orange-400',
      },
      {
        title: 'Page Views',
        value: pageViews.toLocaleString(),
        change: 8.3,
        changePositive: false,
        icon: Eye,
        iconBg: 'bg-pink-500/10 text-pink-400',
      },
    ];
  }, [timeData]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white sm:hidden">Analytics</h2>

      {/* ── Time Range Selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        {timeRanges.map((tr) => (
          <button
            key={tr.key}
            onClick={() => setTimeRange(tr.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              timeRange === tr.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-slate-400">{kpi.title}</p>
                <div className={clsx('p-1.5 rounded-md', kpi.iconBg)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {kpi.changePositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span
                  className={clsx(
                    'text-xs font-medium',
                    kpi.changePositive ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {kpi.change > 0 ? '+' : ''}
                  {kpi.change}%
                </span>
                <span className="text-xs text-slate-500">vs prev</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row 1: Revenue Over Time + Orders Over Time ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time - AreaChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Revenue Over Time</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily revenue trend</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              20.1% growth
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
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
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Over Time - BarChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Orders Over Time</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily order volume</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              12.5% growth
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                />
                <Tooltip content={<ChartTooltip valuePrefix="" />} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Top Products + Traffic Sources ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products - Horizontal BarChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">Top Products by Revenue</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    color: '#f1f5f9',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Sources - PieChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">Traffic Sources</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {trafficSources.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    color: '#f1f5f9',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Share']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-xs text-slate-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 3: Conversion Funnel (full width) ──────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white mb-1">Conversion Funnel</h3>
        <p className="text-xs text-slate-400 mb-6">Visitor journey from landing to purchase</p>
        <div className="max-w-2xl mx-auto">
          <ConversionFunnel />
        </div>
        {/* Summary stats */}
        <div className="flex justify-center gap-8 mt-6 pt-4 border-t border-slate-800">
          <div className="text-center">
            <p className="text-xs text-slate-400">Overall Conversion</p>
            <p className="text-lg font-bold text-emerald-400">
              {((funnelData[4]!.value / funnelData[0]!.value) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Cart Abandonment</p>
            <p className="text-lg font-bold text-amber-400">
              {(((funnelData[2]!.value - funnelData[4]!.value) / funnelData[2]!.value) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Checkout Completion</p>
            <p className="text-lg font-bold text-blue-400">
              {((funnelData[4]!.value / funnelData[3]!.value) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
