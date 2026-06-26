'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Ban,
  X,
  MousePointerClick,
  TrendingUp,
  Link,
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

type AffiliateStatus = 'Active' | 'Inactive' | 'Suspended';

interface ReferralLink {
  id: string;
  url: string;
  product: string;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: Date;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  country: string;
  code: string;
  commissionRate: number;
  balance: number;
  status: AffiliateStatus;
  totalSales: number;
  totalCommission: number;
  joinedAt: Date;
  phone: string;
  website: string;
  paymentMethod: string;
  notes: string;
  referrals: ReferralLink[];
  commissionHistory: { month: string; commission: number }[];
}

interface PendingApplication {
  id: string;
  name: string;
  email: string;
  country: string;
  appliedAt: Date;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const defaultCommissionHistory = [
  { month: 'Jan', commission: 0 },
  { month: 'Feb', commission: 0 },
  { month: 'Mar', commission: 0 },
  { month: 'Apr', commission: 0 },
  { month: 'May', commission: 0 },
  { month: 'Jun', commission: 0 },
];

const mockPendingApplications: PendingApplication[] = [
  { id: 'pend-1', name: 'Dakota Fisher', email: 'dakota.f@example.com', country: 'Canada', appliedAt: new Date('2025-06-24') },
  { id: 'pend-2', name: 'Hayden Brooks', email: 'hayden.b@example.com', country: 'United Kingdom', appliedAt: new Date('2025-06-23') },
  { id: 'pend-3', name: 'Sage Owens', email: 'sage.o@example.com', country: 'Australia', appliedAt: new Date('2025-06-22') },
];

const mockAffiliates: Affiliate[] = [
  {
    id: 'aff-1',
    name: 'Sarah Thompson',
    email: 'sarah.t@example.com',
    country: 'United States',
    code: 'SARAH20',
    commissionRate: 20,
    balance: 2450.50,
    status: 'Active',
    totalSales: 12250.00,
    totalCommission: 2450.50,
    joinedAt: new Date('2025-01-15'),
    phone: '+1 (555) 123-4567',
    website: 'https://sarahthompson.blog',
    paymentMethod: 'PayPal',
    notes: 'Top performer. Excellent social media presence with 250K Instagram followers.',
    referrals: [
      { id: 'ref-1', url: 'https://watermart.com/ref/SARAH20/smart-bottle', product: 'Smart Water Bottle Pro', clicks: 1450, conversions: 87, revenue: 4350.00, createdAt: new Date('2025-02-01') },
      { id: 'ref-2', url: 'https://watermart.com/ref/SARAH20/ph-kit', product: 'pH Test Kit Deluxe', clicks: 980, conversions: 52, revenue: 4628.00, createdAt: new Date('2025-03-15') },
      { id: 'ref-3', url: 'https://watermart.com/ref/SARAH20/filter-3pack', product: 'Mineral Filter Cartridge 3-Pack', clicks: 720, conversions: 38, revenue: 1329.62, createdAt: new Date('2025-05-01') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 450 },
      { month: 'Feb', commission: 520 },
      { month: 'Mar', commission: 480 },
      { month: 'Apr', commission: 680 },
      { month: 'May', commission: 720 },
      { month: 'Jun', commission: 890 },
    ],
  },
  {
    id: 'aff-2',
    name: 'David Park',
    email: 'david.park@example.com',
    country: 'South Korea',
    code: 'DAVID15',
    commissionRate: 15,
    balance: 890.25,
    status: 'Active',
    totalSales: 5935.00,
    totalCommission: 890.25,
    joinedAt: new Date('2025-03-20'),
    phone: '+82 10-1234-5678',
    website: 'https://youtube.com/@davidparkwater',
    paymentMethod: 'Bank Transfer',
    notes: 'YouTube reviewer with 85K subscribers. Focus on unboxing and review content.',
    referrals: [
      { id: 'ref-4', url: 'https://watermart.com/ref/DAVID15/uv-wand', product: 'UV-C Sterilizer Wand', clicks: 3200, conversions: 45, revenue: 5849.55, createdAt: new Date('2025-04-10') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 0 },
      { month: 'Feb', commission: 0 },
      { month: 'Mar', commission: 120 },
      { month: 'Apr', commission: 340 },
      { month: 'May', commission: 250 },
      { month: 'Jun', commission: 180 },
    ],
  },
  {
    id: 'aff-3',
    name: 'Lisa Mueller',
    email: 'lisa.m@example.com',
    country: 'Germany',
    code: 'LISA10',
    commissionRate: 10,
    balance: 320.00,
    status: 'Active',
    totalSales: 3200.00,
    totalCommission: 320.00,
    joinedAt: new Date('2025-05-10'),
    phone: '+49 170 1234567',
    website: 'https://lisamueller.de',
    paymentMethod: 'PayPal',
    notes: 'German lifestyle blogger. New affiliate showing strong early results.',
    referrals: [
      { id: 'ref-5', url: 'https://watermart.com/ref/LISA10/tds-meter', product: 'Portable TDS Meter', clicks: 850, conversions: 42, revenue: 839.58, createdAt: new Date('2025-05-15') },
      { id: 'ref-6', url: 'https://watermart.com/ref/LISA10/copper-bottle', product: 'Copper Water Bottle 1L', clicks: 620, conversions: 28, revenue: 1035.72, createdAt: new Date('2025-06-01') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 0 },
      { month: 'Feb', commission: 0 },
      { month: 'Mar', commission: 0 },
      { month: 'Apr', commission: 0 },
      { month: 'May', commission: 140 },
      { month: 'Jun', commission: 180 },
    ],
  },
  {
    id: 'aff-4',
    name: 'Raj Patel',
    email: 'raj.p@example.com',
    country: 'India',
    code: 'RAJWTR25',
    commissionRate: 25,
    balance: 0,
    status: 'Inactive',
    totalSales: 1800.00,
    totalCommission: 450.00,
    joinedAt: new Date('2025-02-01'),
    phone: '+91 98765 43210',
    website: 'https://rajpatelwater.com',
    paymentMethod: 'PayPal',
    notes: 'Inactive since May 2025. Re-engagement email sent. No response yet.',
    referrals: [
      { id: 'ref-7', url: 'https://watermart.com/ref/RAJWTR25/distiller', product: 'Water Distiller 4L', clicks: 340, conversions: 6, revenue: 1799.94, createdAt: new Date('2025-02-15') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 0 },
      { month: 'Feb', commission: 200 },
      { month: 'Mar', commission: 150 },
      { month: 'Apr', commission: 100 },
      { month: 'May', commission: 0 },
      { month: 'Jun', commission: 0 },
    ],
  },
  {
    id: 'aff-5',
    name: 'Emma Wilson',
    email: 'emma.w@example.com',
    country: 'United Kingdom',
    code: 'EMMAH2O',
    commissionRate: 18,
    balance: 156.80,
    status: 'Suspended',
    totalSales: 871.11,
    totalCommission: 156.80,
    joinedAt: new Date('2025-04-05'),
    phone: '+44 7700 123456',
    website: 'https://emmawilson.co.uk',
    paymentMethod: 'Bank Transfer',
    notes: 'Suspended pending review - suspected spam/bot traffic detected on referral links.',
    referrals: [
      { id: 'ref-8', url: 'https://watermart.com/ref/EMMAH2O/alkal-pitcher', product: 'Alkaline Water Pitcher', clicks: 5600, conversions: 22, revenue: 871.11, createdAt: new Date('2025-04-10') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 0 },
      { month: 'Feb', commission: 0 },
      { month: 'Mar', commission: 0 },
      { month: 'Apr', commission: 80 },
      { month: 'May', commission: 76.80 },
      { month: 'Jun', commission: 0 },
    ],
  },
  {
    id: 'aff-6',
    name: 'James Wilson',
    email: 'james.w@example.com',
    country: 'United States',
    code: 'JAMES12',
    commissionRate: 12,
    balance: 420.00,
    status: 'Active',
    totalSales: 3500.00,
    totalCommission: 420.00,
    joinedAt: new Date('2025-04-01'),
    phone: '+1 (555) 987-6543',
    website: 'https://jameswilson.com',
    paymentMethod: 'PayPal',
    notes: 'Steady performer. Runs water quality blog.',
    referrals: [
      { id: 'ref-9', url: 'https://watermart.com/ref/JAMES12/heavy-metal', product: 'Heavy Metal Test Strips', clicks: 2100, conversions: 140, revenue: 3430.00, createdAt: new Date('2025-04-15') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 0 },
      { month: 'Feb', commission: 0 },
      { month: 'Mar', commission: 0 },
      { month: 'Apr', commission: 180 },
      { month: 'May', commission: 150 },
      { month: 'Jun', commission: 90 },
    ],
  },
  {
    id: 'aff-7',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    country: 'Spain',
    code: 'MARIA15',
    commissionRate: 15,
    balance: 675.00,
    status: 'Active',
    totalSales: 4500.00,
    totalCommission: 675.00,
    joinedAt: new Date('2025-03-01'),
    phone: '+34 612 345 678',
    website: 'https://mariagarcia.es',
    paymentMethod: 'Bank Transfer',
    notes: 'Spanish market specialist. Strong organic traffic.',
    referrals: [
      { id: 'ref-10', url: 'https://watermart.com/ref/MARIA15/whole-house', product: 'Whole House Filter System', clicks: 280, conversions: 8, revenue: 4399.92, createdAt: new Date('2025-03-10') },
    ],
    commissionHistory: [
      { month: 'Jan', commission: 0 },
      { month: 'Feb', commission: 0 },
      { month: 'Mar', commission: 250 },
      { month: 'Apr', commission: 180 },
      { month: 'May', commission: 120 },
      { month: 'Jun', commission: 125 },
    ],
  },
];

// ── Status Styles ──────────────────────────────────────────────────────────────

const affiliateStatusStyles: Record<AffiliateStatus, string> = {
  Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Inactive: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  Suspended: 'bg-red-500/10 text-red-400 border-red-500/30',
};

// ── Detail Panel Component ─────────────────────────────────────────────────────

function AffiliateDetailPanel({
  affiliate,
  onClose,
}: {
  affiliate: Affiliate;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">{affiliate.name}</h3>
            <p className="text-xs text-slate-400">
              Affiliate since {format(affiliate.joinedAt, 'MMM dd, yyyy')} &middot; Code:{' '}
              <span className="font-mono text-blue-400">{affiliate.code}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Personal Info */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Personal Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Email</p>
                <p className="text-sm text-white truncate">{affiliate.email}</p>
              </div>
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                <p className="text-sm text-white">{affiliate.phone}</p>
              </div>
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Country</p>
                <p className="text-sm text-white">{affiliate.country}</p>
              </div>
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Website</p>
                <p className="text-sm text-blue-400 truncate">{affiliate.website}</p>
              </div>
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Payment Method</p>
                <p className="text-sm text-white">{affiliate.paymentMethod}</p>
              </div>
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Status</p>
                <span className={clsx('status-badge border', affiliateStatusStyles[affiliate.status])}>
                  {affiliate.status}
                </span>
              </div>
            </div>
            {affiliate.notes && (
              <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Notes</p>
                <p className="text-sm text-slate-300">{affiliate.notes}</p>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">Total Sales</p>
              <p className="text-lg font-bold text-white">
                ${affiliate.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">Commission</p>
              <p className="text-lg font-bold text-emerald-400">
                ${affiliate.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">Balance</p>
              <p className="text-lg font-bold text-blue-400">
                ${affiliate.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Commission History Chart */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Commission History</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={affiliate.commissionHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9' }}
                    formatter={(value: number) => [`$${value}`, 'Commission']}
                  />
                  <Line type="monotone" dataKey="commission" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5, fill: '#22c55e' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Referral Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Recent Referral Links</h4>
            <div className="space-y-2">
              {affiliate.referrals.map((ref) => (
                <div key={ref.id} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                  <p className="text-sm font-medium text-white truncate mb-1">{ref.product}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mb-2">{ref.url}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MousePointerClick className="w-3 h-3" />
                      <span className="font-medium text-white">{ref.clicks.toLocaleString()}</span> clicks
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-medium text-emerald-400">{ref.conversions}</span> conversions
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-medium text-white">${ref.revenue.toFixed(2)}</span>
                    </div>
                    <div className="ml-auto text-xs text-slate-500">
                      {ref.clicks > 0 ? ((ref.conversions / ref.clicks) * 100).toFixed(2) : '0.00'}% rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function AffiliatesPage() {
  const [pendingList, setPendingList] = useState<PendingApplication[]>(mockPendingApplications);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  // ── Computed Stats ───────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalAffiliates = mockAffiliates.length;
    const active = mockAffiliates.filter((a) => a.status === 'Active').length;
    const totalCommissionPaid = mockAffiliates.reduce((sum, a) => sum + a.totalCommission, 0);
    const pendingPayouts = mockAffiliates.reduce((sum, a) => sum + a.balance, 0);
    return { totalAffiliates, active, totalCommissionPaid, pendingPayouts };
  }, []);

  // ── Filtered Affiliates ──────────────────────────────────────────────────

  const filteredAffiliates = useMemo(() => {
    if (!searchQuery) return mockAffiliates;
    const q = searchQuery.toLowerCase();
    return mockAffiliates.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApprove = useCallback((app: PendingApplication) => {
    setPendingList((prev) => prev.filter((a) => a.id !== app.id));
    toast.success(`Approved ${app.name}`, { description: 'Affiliate account has been activated' });
  }, []);

  const handleReject = useCallback((app: PendingApplication) => {
    setPendingList((prev) => prev.filter((a) => a.id !== app.id));
    toast.info(`Rejected ${app.name}`, { description: 'The applicant will be notified' });
  }, []);

  const handleSuspend = useCallback((aff: Affiliate) => {
    toast.warning(`Suspended ${aff.name}`, { description: 'Affiliate links are now inactive' });
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white sm:hidden">Affiliates</h2>

      {/* ── Stats Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Total Affiliates</p>
              <p className="text-2xl font-bold text-white">{stats.totalAffiliates}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Commission Paid</p>
              <p className="text-2xl font-bold text-purple-400">
                ${stats.totalCommissionPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Pending Payouts</p>
              <p className="text-2xl font-bold text-amber-400">
                ${stats.pendingPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search affiliates by name, email, or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>

      {/* ── Approval Queue ────────────────────────────────────────────────── */}
      {pendingList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Approval Queue</h3>
              <span className="px-2 py-0.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full">
                {pendingList.length} Pending
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">Country</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">Applied</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((app) => (
                  <tr key={app.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-white">{app.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-400">{app.email}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <p className="text-sm text-slate-300">{app.country}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <p className="text-sm text-slate-400">{format(app.appliedAt, 'MMM dd, yyyy')}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── All Affiliates Table ──────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3">
          All Affiliates ({mockAffiliates.length})
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Commission</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Total Sales</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAffiliates.map((aff) => (
                  <tr key={aff.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-white">{aff.name}</p>
                        <p className="text-xs text-slate-500 md:hidden">{aff.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-sm text-slate-400">{aff.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-blue-400">{aff.code}</span>
                    </td>
                    <td className="py-3 px-4 text-right hidden lg:table-cell">
                      <span className="text-sm text-slate-300">{aff.commissionRate}%</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={clsx('text-sm font-medium', aff.balance > 0 ? 'text-emerald-400' : 'text-slate-500')}>
                        ${aff.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span className={clsx('status-badge border', affiliateStatusStyles[aff.status])}>
                          {aff.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right hidden lg:table-cell">
                      <span className="text-sm font-medium text-white">
                        ${aff.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedAffiliate(aff)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/10 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={() => toast.info(`Editing ${aff.name}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 border border-slate-700 rounded-md hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        {aff.status === 'Active' && (
                          <button
                            onClick={() => handleSuspend(aff)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/10 transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAffiliates.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No affiliates found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Panel ───────────────────────────────────────────────────── */}
      {selectedAffiliate && (
        <AffiliateDetailPanel
          affiliate={selectedAffiliate}
          onClose={() => setSelectedAffiliate(null)}
        />
      )}
    </div>
  );
}
