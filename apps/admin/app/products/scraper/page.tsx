'use client';

import { useState, useCallback } from 'react';
import {
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  Link,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';

// ── Types ────────────────────────────────────────────────────────────────────

interface ScrapedProduct {
  id: string;
  sourceTitle: string;
  sourceUrl: string;
  platform: 'Amazon' | 'Shopify' | 'AliExpress' | 'Other';
  thumbnail: string;
  status: 'New' | 'Optimized' | 'Skipped';
  rawData: Record<string, unknown>;
}

interface ScrapeJob {
  id: string;
  urls: string[];
  progress: number;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Failed';
  createdAt: Date;
  products: ScrapedProduct[];
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const generateMockJobs = (): ScrapeJob[] => [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    urls: [
      'https://amazon.com/dp/B08XYZ123',
      'https://amazon.com/dp/B09ABC456',
      'https://shopify.com/products/water-filter-pro',
      'https://aliexpress.com/item/100500123456.html',
      'https://amazon.com/dp/B07DEF789',
    ],
    progress: 100,
    status: 'Completed',
    createdAt: new Date('2024-06-24T14:30:00'),
    products: [
      {
        id: 'sp-1',
        sourceTitle: 'Brita UltraMax Water Filter Dispenser 27-Cup, Extra Large, BPA-Free, 1 Filter',
        sourceUrl: 'https://amazon.com/dp/B08XYZ123',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz1/80/80',
        status: 'New',
        rawData: { title: 'Brita UltraMax Water Filter Dispenser 27-Cup', price: 34.99, description: 'Extra large water filter dispenser with 27-cup capacity. BPA-free. Includes 1 filter that lasts 2 months.', brand: 'Brita', rating: 4.7, reviews: 24532 },
      },
      {
        id: 'sp-2',
        sourceTitle: 'ZeroWater 10-Cup Ready-Pour 5-Stage Water Filter Pitcher',
        sourceUrl: 'https://amazon.com/dp/B09ABC456',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz2/80/80',
        status: 'Optimized',
        rawData: { title: 'ZeroWater 10-Cup Ready-Pour 5-Stage Water Filter Pitcher', price: 36.99, description: '5-stage ion exchange filter. Removes 99.6% of total dissolved solids. Includes TDS meter.', brand: 'ZeroWater', rating: 4.5, reviews: 18500 },
      },
      {
        id: 'sp-3',
        sourceTitle: 'AquaBliss High Output Revitalizing Shower Filter',
        sourceUrl: 'https://shopify.com/products/water-filter-pro',
        platform: 'Shopify',
        thumbnail: 'https://picsum.photos/seed/shop1/80/80',
        status: 'New',
        rawData: { title: 'AquaBliss High Output Revitalizing Shower Filter', price: 34.95, description: 'Multi-stage shower filter reduces chlorine and restores healthy skin and hair.', brand: 'AquaBliss', reviews: 12045 },
      },
      {
        id: 'sp-4',
        sourceTitle: 'Portable UV Water Sterilizer Rod USB Rechargeable',
        sourceUrl: 'https://aliexpress.com/item/100500123456.html',
        platform: 'AliExpress',
        thumbnail: 'https://picsum.photos/seed/ali1/80/80',
        status: 'Skipped',
        rawData: { title: 'Portable UV Water Sterilizer Rod USB Rechargeable', price: 12.50, description: 'Handheld UV-C sterilizer for water purification. USB rechargeable.', rating: 4.2, reviews: 3450 },
      },
      {
        id: 'sp-5',
        sourceTitle: 'APEC Water Systems ROES-50 Essence Series Top Tier 5-Stage Reverse Osmosis System',
        sourceUrl: 'https://amazon.com/dp/B07DEF789',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz3/80/80',
        status: 'New',
        rawData: { title: 'APEC Water Systems ROES-50 5-Stage Reverse Osmosis System', price: 199.99, description: 'Top tier 5-stage reverse osmosis drinking water filter system. WQA certified.', brand: 'APEC', rating: 4.8, reviews: 31000 },
      },
    ],
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f123456789ab',
    urls: [
      'https://amazon.com/dp/B10GHI111',
      'https://amazon.com/dp/B11JKL222',
      'https://amazon.com/dp/B12MNO333',
    ],
    progress: 65,
    status: 'InProgress',
    createdAt: new Date('2024-06-25T09:15:00'),
    products: [
      {
        id: 'sp-6',
        sourceTitle: 'Waterdrop 15UA Under Sink Water Filter System',
        sourceUrl: 'https://amazon.com/dp/B10GHI111',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz4/80/80',
        status: 'New',
        rawData: { title: 'Waterdrop 15UA Under Sink Water Filter System', price: 42.99, brand: 'Waterdrop' },
      },
      {
        id: 'sp-7',
        sourceTitle: 'Hydro Flask 32oz Wide Mouth Water Bottle',
        sourceUrl: 'https://amazon.com/dp/B11JKL222',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz5/80/80',
        status: 'New',
        rawData: { title: 'Hydro Flask 32oz Wide Mouth Water Bottle', price: 44.95, brand: 'Hydro Flask' },
      },
    ],
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789abc',
    urls: [
      'https://amazon.com/dp/B13PQR444',
      'https://amazon.com/dp/B14STU555',
      'https://shopify.com/products/travel-filter',
      'https://shopify.com/products/mineral-drops',
    ],
    progress: 100,
    status: 'Completed',
    createdAt: new Date('2024-06-23T11:00:00'),
    products: [
      {
        id: 'sp-8',
        sourceTitle: 'LifeStraw Personal Water Filter for Hiking',
        sourceUrl: 'https://amazon.com/dp/B13PQR444',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz6/80/80',
        status: 'Optimized',
        rawData: { title: 'LifeStraw Personal Water Filter', price: 19.95, brand: 'LifeStraw', rating: 4.8 },
      },
      {
        id: 'sp-9',
        sourceTitle: 'Sawyer Products MINI Water Filtration System',
        sourceUrl: 'https://amazon.com/dp/B14STU555',
        platform: 'Amazon',
        thumbnail: 'https://picsum.photos/seed/amz7/80/80',
        status: 'New',
        rawData: { title: 'Sawyer Products MINI Water Filtration System', price: 24.97, brand: 'Sawyer' },
      },
      {
        id: 'sp-10',
        sourceTitle: 'Compact Travel Filtration Kit',
        sourceUrl: 'https://shopify.com/products/travel-filter',
        platform: 'Shopify',
        thumbnail: 'https://picsum.photos/seed/shop2/80/80',
        status: 'New',
        rawData: { title: 'Compact Travel Filtration Kit', price: 49.99, brand: 'TravelPure' },
      },
      {
        id: 'sp-11',
        sourceTitle: 'Natural Mineral Drops for Water 60ml',
        sourceUrl: 'https://shopify.com/products/mineral-drops',
        platform: 'Shopify',
        thumbnail: 'https://picsum.photos/seed/shop3/80/80',
        status: 'New',
        rawData: { title: 'Natural Mineral Drops for Water 60ml', price: 27.99, brand: 'MineralPlus' },
      },
    ],
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890abc',
    urls: [
      'https://amazon.com/dp/B15VWX666',
      'https://aliexpress.com/item/100500789012.html',
    ],
    progress: 0,
    status: 'Pending',
    createdAt: new Date('2024-06-25T16:45:00'),
    products: [],
  },
];

// ── Status Badges ────────────────────────────────────────────────────────────

const jobStatusBadge: Record<string, { className: string; label: string }> = {
  Pending: { className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'Pending' },
  InProgress: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'In Progress' },
  Completed: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Completed' },
  Failed: { className: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'Failed' },
};

const platformBadge: Record<string, { className: string; label: string }> = {
  Amazon: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/30', label: 'Amazon' },
  Shopify: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Shopify' },
  AliExpress: { className: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'AliExpress' },
  Other: { className: 'bg-slate-500/10 text-slate-400 border-slate-500/30', label: 'Other' },
};

const productStatusBadge: Record<string, { className: string; label: string }> = {
  New: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'New' },
  Optimized: { className: 'bg-purple-500/10 text-purple-400 border-purple-500/30', label: 'Optimized' },
  Skipped: { className: 'bg-slate-500/10 text-slate-400 border-slate-500/30', label: 'Skipped' },
};

// ── Raw Data Modal ───────────────────────────────────────────────────────────

function RawDataModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: ScrapedProduct | null;
}) {
  if (!product) return null;
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <Dialog.Title className="text-base font-semibold text-white">
              Raw Scrape Data
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>
          <div className="p-5 overflow-auto max-h-[calc(80vh-5rem)]">
            <div className="mb-3">
              <p className="text-sm text-slate-400">Source: {product.sourceUrl}</p>
              <p className="text-sm text-slate-400">Platform: {product.platform}</p>
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(product.rawData, null, 2)}
            </pre>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function ScraperPage() {
  const [urlsInput, setUrlsInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [jobs, setJobs] = useState<ScrapeJob[]>(generateMockJobs);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set(['a1b2c3d4-e5f6-7890-abcd-ef1234567890']));
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ScrapedProduct | null>(null);

  const toggleJobExpanded = useCallback((jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const handleStartScraping = useCallback(() => {
    const urls = urlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    setIsScraping(true);

    // Simulate adding a job
    const newJob: ScrapeJob = {
      id: crypto.randomUUID(),
      urls,
      progress: 0,
      status: 'Pending',
      createdAt: new Date(),
      products: [],
    };

    setJobs((prev) => [newJob, ...prev]);
    setUrlsInput('');

    toast.success(`Scraping started`, {
      description: `Processing ${urls.length} URL${urls.length > 1 ? 's' : ''}`,
    });

    // Simulate progress
    setTimeout(() => {
      setIsScraping(false);
    }, 2000);
  }, [urlsInput]);

  const handleViewRaw = useCallback((product: ScrapedProduct) => {
    setSelectedProduct(product);
    setRawModalOpen(true);
  }, []);

  const handleOptimize = useCallback((product: ScrapedProduct) => {
    toast.success('AI Optimization queued', {
      description: `"${product.sourceTitle.slice(0, 40)}..." will be optimized`,
    });
  }, []);

  const handleOptimizeAll = useCallback((job: ScrapeJob) => {
    toast.success('Batch optimization started', {
      description: `Optimizing ${job.products.length} products with AI`,
    });
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white sm:hidden">Product Scraper</h2>

      {/* URL Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400">
            <Link className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Import Products from URLs</h3>
            <p className="text-xs text-slate-400">Paste product page URLs to scrape and import into your catalog</p>
          </div>
        </div>

        <textarea
          rows={5}
          placeholder="Paste product URLs here, one per line...&#10;https://amazon.com/dp/B08XYZ123&#10;https://shopify.com/products/water-filter"
          value={urlsInput}
          onChange={(e) => setUrlsInput(e.target.value)}
          className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y transition-colors"
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500">
            Supports Amazon, Shopify, AliExpress, and more
          </p>
          <button
            onClick={handleStartScraping}
            disabled={isScraping}
            className={clsx(
              'inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              isScraping
                ? 'bg-blue-600/50 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Scraping
              </>
            )}
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white">
            Scrape Jobs ({jobs.length})
          </h3>
        </div>

        {jobs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No scrape jobs yet</p>
            <p className="text-xs mt-1">Paste URLs above to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {jobs.map((job) => (
              <div key={job.id}>
                {/* Job Row */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-mono text-slate-500 truncate">
                          {job.id.slice(0, 8)}...
                        </span>
                        <span
                          className={clsx(
                            'status-badge border',
                            jobStatusBadge[job.status]!.className
                          )}
                        >
                          {job.status === 'InProgress' && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                          )}
                          {jobStatusBadge[job.status]!.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{job.urls.length} URLs</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(job.createdAt, 'MMM dd, yyyy h:mm a')}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-500',
                            job.status === 'Completed'
                              ? 'bg-emerald-500'
                              : job.status === 'InProgress'
                                ? 'bg-blue-500'
                                : job.status === 'Failed'
                                  ? 'bg-red-500'
                                  : 'bg-slate-600'
                          )}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">{job.progress}% complete</p>
                    </div>

                    {/* Expand button */}
                    {job.products.length > 0 && (
                      <button
                        onClick={() => toggleJobExpanded(job.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Toggle details"
                      >
                        {expandedJobs.has(job.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: Scraped Products Table */}
                {expandedJobs.has(job.id) && job.products.length > 0 && (
                  <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-white">
                        Scraped Products ({job.products.length})
                      </p>
                      <button
                        onClick={() => handleOptimizeAll(job)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Optimize All
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800">
                            <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 uppercase">Image</th>
                            <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 uppercase">Title</th>
                            <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 uppercase">Platform</th>
                            <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 uppercase">Status</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-slate-400 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {job.products.map((product) => (
                            <tr
                              key={product.id}
                              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-2.5 px-2">
                                <img
                                  src={product.thumbnail}
                                  alt={product.sourceTitle}
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                                  width={40}
                                  height={40}
                                />
                              </td>
                              <td className="py-2.5 px-2 max-w-xs">
                                <p className="text-sm text-slate-300 truncate">
                                  {product.sourceTitle}
                                </p>
                              </td>
                              <td className="py-2.5 px-2">
                                <span
                                  className={clsx(
                                    'status-badge border',
                                    platformBadge[product.platform]!.className
                                  )}
                                >
                                  {platformBadge[product.platform]!.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-2">
                                <span
                                  className={clsx(
                                    'status-badge border',
                                    productStatusBadge[product.status]!.className
                                  )}
                                >
                                  {product.status === 'New' && (
                                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                  )}
                                  {productStatusBadge[product.status]!.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOptimize(product)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md hover:bg-purple-500/20 transition-colors"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    AI Optimize
                                  </button>
                                  <button
                                    onClick={() => handleViewRaw(product)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Raw
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Data Modal */}
      <RawDataModal
        open={rawModalOpen}
        onClose={() => setRawModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
}
