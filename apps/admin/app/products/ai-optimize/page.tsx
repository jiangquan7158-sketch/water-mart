'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircle,
  Edit,
  RefreshCw,
  X,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  ChevronDown,
  BadgeCheck,
  Clock,
  SkipForward,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = 'All' | 'Pending Review' | 'Published' | 'Skipped';

interface OptimizedField {
  original: string;
  optimized: string;
  changed: boolean;
}

interface OptimizedProduct {
  id: string;
  image: string;
  name: string;
  status: 'Pending Review' | 'Published' | 'Skipped';
  title: OptimizedField;
  description: OptimizedField;
  seoTitle: OptimizedField;
  seoDescription: OptimizedField;
  tags: OptimizedField;
  suggestedPrice: { original: number; optimized: number; changed: boolean };
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockOptimizedProducts: OptimizedProduct[] = [
  {
    id: 'ai-1',
    image: 'https://picsum.photos/seed/ai1/80/80',
    name: 'Smart Water Bottle Pro',
    status: 'Pending Review',
    title: {
      original: 'Smart Water Bottle Pro - Hydration Tracker',
      optimized: 'Smart Hydration Bottle Pro | Track Water Intake with Bluetooth & App',
      changed: true,
    },
    description: {
      original: 'A smart water bottle that tracks your daily water intake and reminds you to stay hydrated.',
      optimized: 'Stay perfectly hydrated with the Smart Hydration Bottle Pro — featuring Bluetooth 5.3 connectivity, real-time intake tracking via our companion app, and intelligent LED reminders. The double-walled stainless steel construction keeps drinks cold for 24 hours or hot for 12. BPA-free, leak-proof, and designed for fitness enthusiasts, office professionals, and anyone serious about wellness.',
      changed: true,
    },
    seoTitle: {
      original: 'Smart Water Bottle | Hydration Tracker',
      optimized: 'Smart Hydration Bottle Pro | Track Water Intake | Bluetooth Water Bottle 2024',
      changed: true,
    },
    seoDescription: {
      original: 'Track your hydration with our smart water bottle. Bluetooth enabled, app connected.',
      optimized: 'Transform your hydration habits with the Smart Hydration Bottle Pro. Bluetooth-enabled tracking, personalized goals, LED reminders, and a companion app. Stay healthy, one sip at a time. Free shipping on orders over $50.',
      changed: true,
    },
    tags: {
      original: 'water bottle, smart, hydration',
      optimized: 'smart water bottle, hydration tracker, bluetooth water bottle, fitness bottle, health tracker, BPA-free bottle, temperature control',
      changed: true,
    },
    suggestedPrice: { original: 49.99, optimized: 54.99, changed: true },
  },
  {
    id: 'ai-2',
    image: 'https://picsum.photos/seed/ai2/80/80',
    name: 'pH Test Kit Deluxe',
    status: 'Pending Review',
    title: {
      original: 'pH Test Kit Deluxe - Water Testing',
      optimized: 'Professional pH Test Kit Deluxe | Complete Water Quality Testing Lab',
      changed: true,
    },
    description: {
      original: 'Deluxe pH test kit for testing water quality at home or in the lab.',
      optimized: 'Take control of your water quality with our Professional pH Test Kit Deluxe — the complete water testing solution trusted by home users and laboratory professionals alike. Includes 200 high-precision strips (pH 0-14 range), 50 mineral content tests, a digital result logbook, and a calibrated color chart for instant, accurate readings. Perfect for aquariums, hydroponics, pools, drinking water, and educational use.',
      changed: true,
    },
    seoTitle: {
      original: 'pH Test Kit | Water Quality Testing',
      optimized: 'Professional pH Test Kit Deluxe | 200 Strips | Water, Pool & Aquarium Testing',
      changed: true,
    },
    seoDescription: {
      original: 'Test your water pH levels at home with our deluxe test kit.',
      optimized: 'Test water pH with lab-grade accuracy at home. Our Professional pH Test Kit Deluxe includes 200 strips, mineral tests, digital logbook. Ideal for aquariums, pools, drinking water & hydroponics. Ships today.',
      changed: true,
    },
    tags: {
      original: 'water test, pH, testing kit',
      optimized: 'pH test kit, water quality test, pH strips, pool test kit, aquarium test, water testing, home water test, mineral test',
      changed: true,
    },
    suggestedPrice: { original: 89.00, optimized: 94.99, changed: true },
  },
  {
    id: 'ai-3',
    image: 'https://picsum.photos/seed/ai3/80/80',
    name: 'Mineral Filter Cartridge 3-Pack',
    status: 'Published',
    title: {
      original: 'Mineral Filter Cartridge 3-Pack',
      optimized: 'Premium Mineral Filter Cartridge 3-Pack | Essential Minerals, Better Taste',
      changed: false,
    },
    description: {
      original: 'A pack of 3 mineral filter cartridges for water filtration systems.',
      optimized: 'Enhance every glass with our Premium Mineral Filter Cartridge 3-Pack — engineered to add essential minerals including calcium, magnesium, and potassium back into your filtered water while improving taste and alkalinity. Each cartridge lasts up to 6 months and fits standard 10-inch housings. Compatible with most reverse osmosis and under-sink filtration systems.',
      changed: false,
    },
    seoTitle: {
      original: 'Mineral Filter Cartridge | 3-Pack',
      optimized: 'Mineral Filter Cartridge 3-Pack | Adds Calcium & Magnesium | 6-Month Life',
      changed: false,
    },
    seoDescription: {
      original: 'Enhance your water quality with mineral filter cartridges.',
      optimized: 'Add essential minerals back into your filtered water. Premium Mineral Filter Cartridges add calcium, magnesium & potassium. Each lasts 6 months. 3-pack value.',
      changed: false,
    },
    tags: {
      original: 'filter, mineral, cartridge, water filtration',
      optimized: 'mineral filter, water filter cartridge, reverse osmosis filter, alkaline filter, calcium filter, magnesium filter',
      changed: false,
    },
    suggestedPrice: { original: 34.99, optimized: 34.99, changed: false },
  },
  {
    id: 'ai-4',
    image: 'https://picsum.photos/seed/ai4/80/80',
    name: 'UV-C Sterilizer Wand',
    status: 'Pending Review',
    title: {
      original: 'UV-C Sterilizer Wand - Water Purification',
      optimized: 'UV-C LED Sterilizer Wand | 99.9% Bacteria Kill Rate | Portable Water Purifier',
      changed: true,
    },
    description: {
      original: 'Portable UV-C sterilizer wand for purifying water on the go.',
      optimized: 'Purify water anywhere with the UV-C LED Sterilizer Wand — laboratory-tested to eliminate 99.9% of harmful bacteria, viruses, and protozoa in just 90 seconds. The compact, USB-C rechargeable design slips into any backpack or travel kit. Ideal for camping, international travel, emergency preparedness, and everyday use. No chemicals, no filters, no taste — just pure, safe water.',
      changed: true,
    },
    seoTitle: {
      original: 'UV-C Sterilizer Wand | Water Purifier',
      optimized: 'Portable UV-C Water Sterilizer Wand | Kills 99.9% Bacteria | USB Rechargeable',
      changed: true,
    },
    seoDescription: {
      original: 'Portable UV sterilizer for safe drinking water anywhere.',
      optimized: 'Make any water safe to drink in 90 seconds. Our UV-C Sterilizer Wand eliminates 99.9% of pathogens without chemicals or filters. USB-C rechargeable, ultralight, and perfect for travel, camping & emergencies.',
      changed: true,
    },
    tags: {
      original: 'UV, sterilizer, water purification',
      optimized: 'UV water purifier, water sterilizer wand, portable water purifier, camping water filter, emergency water treatment, bacteria killer, chemical-free purification',
      changed: true,
    },
    suggestedPrice: { original: 129.99, optimized: 139.99, changed: true },
  },
  {
    id: 'ai-5',
    image: 'https://picsum.photos/seed/ai5/80/80',
    name: 'Heavy Metal Test Strips',
    status: 'Published',
    title: {
      original: 'Heavy Metal Test Strips',
      optimized: 'Heavy Metal Test Strips | Detect Lead, Copper, Mercury in Water | 50-Pack',
      changed: false,
    },
    description: {
      original: 'Test strips for detecting heavy metals in drinking water.',
      optimized: 'Ensure your family\'s safety with our Heavy Metal Test Strips — capable of detecting lead, copper, mercury, cadmium, and arsenic at levels as low as 1ppb. Each 50-strip pack provides rapid, lab-grade results in under 2 minutes with easy-to-read color comparison. Independently tested and trusted by water quality professionals nationwide.',
      changed: false,
    },
    seoTitle: {
      original: 'Heavy Metal Test Strips | Water Safety',
      optimized: 'Heavy Metal Water Test Strips | Detect Lead & Mercury | 50 Strips, 2-Minute Results',
      changed: false,
    },
    seoDescription: {
      original: 'Test for heavy metals in your drinking water with easy-to-use strips.',
      optimized: 'Detect lead, copper, mercury & more in your drinking water in 2 minutes. 50-strip pack with easy color-match results. Lab-grade accuracy for home use.',
      changed: false,
    },
    tags: {
      original: 'test strips, heavy metals, water safety',
      optimized: 'heavy metal test, lead test strips, water quality test, drinking water safety, copper test, mercury detection',
      changed: false,
    },
    suggestedPrice: { original: 24.50, optimized: 24.50, changed: false },
  },
  {
    id: 'ai-6',
    image: 'https://picsum.photos/seed/ai6/80/80',
    name: 'Reverse Osmosis Membrane',
    status: 'Skipped',
    title: {
      original: 'Reverse Osmosis Membrane Filter Element',
      optimized: 'High-Efficiency Reverse Osmosis Membrane | 75 GPD | NSF Certified',
      changed: true,
    },
    description: {
      original: 'Standard reverse osmosis membrane for water filtration systems.',
      optimized: 'Upgrade your RO system with our High-Efficiency Reverse Osmosis Membrane — delivering 75 gallons per day of ultra-pure water while rejecting up to 99% of contaminants including lead, chlorine, fluoride, arsenic, and more. NSF/ANSI 58 certified with a 2-year service life. Precision-engineered thin-film composite (TFC) membrane fits most standard 1812/2012 housings.',
      changed: true,
    },
    seoTitle: {
      original: 'Reverse Osmosis Membrane | Water Filter',
      optimized: 'Reverse Osmosis Membrane 75 GPD | NSF Certified | Fits Standard Housings',
      changed: true,
    },
    seoDescription: {
      original: 'Replace your RO membrane for better water filtration.',
      optimized: 'Get 75 GPD of pure water with our NSF/ANSI 58 certified RO membrane. Removes 99% of contaminants. 2-year service life. Compatible with standard 1812/2012 housings.',
      changed: true,
    },
    tags: {
      original: 'RO, membrane, reverse osmosis, filter',
      optimized: 'RO membrane, reverse osmosis filter, water purification membrane, TFC membrane, NSF certified filter, 75 GPD membrane',
      changed: true,
    },
    suggestedPrice: { original: 189.00, optimized: 199.00, changed: true },
  },
  {
    id: 'ai-7',
    image: 'https://picsum.photos/seed/ai7/80/80',
    name: 'Portable TDS Meter',
    status: 'Pending Review',
    title: {
      original: 'Portable TDS Meter Digital Water Quality Tester',
      optimized: 'Professional Digital TDS Meter | Instant Water Purity Readings | Auto-Calibration',
      changed: true,
    },
    description: {
      original: 'Digital TDS meter for measuring total dissolved solids in water.',
      optimized: 'Know exactly what\'s in your water with our Professional Digital TDS Meter — delivering instant, accurate total dissolved solids readings from 0-9990 ppm with auto-temperature compensation. Features one-touch auto-calibration, a backlit LCD display, and a built-in hold function to freeze readings. The sleek, pen-style design is pocket-sized for field use and includes a protective carrying case.',
      changed: true,
    },
    seoTitle: {
      original: 'TDS Meter | Digital Water Tester',
      optimized: 'Professional Digital TDS Meter | 0-9990 ppm | Water Quality Tester with Case',
      changed: true,
    },
    seoDescription: {
      original: 'Measure TDS levels in your water with a digital meter.',
      optimized: 'Get instant TDS readings (0-9990 ppm) with our Professional Digital Water Tester. Auto-calibration, backlit display, temperature compensation & carrying case included.',
      changed: true,
    },
    tags: {
      original: 'TDS meter, water tester, digital',
      optimized: 'TDS meter, water quality tester, digital water meter, ppm meter, water purity tester, total dissolved solids meter, water hardness test',
      changed: true,
    },
    suggestedPrice: { original: 19.99, optimized: 24.99, changed: true },
  },
  {
    id: 'ai-8',
    image: 'https://picsum.photos/seed/ai8/80/80',
    name: 'Alkaline Water Pitcher',
    status: 'Published',
    title: {
      original: 'Alkaline Water Pitcher - pH Balance',
      optimized: 'Alkaline Water Filter Pitcher | pH 8.5-9.5 | 7-Stage Filtration | 10-Cup Capacity',
      changed: false,
    },
    description: {
      original: 'Alkaline water pitcher that increases pH and adds minerals to drinking water.',
      optimized: 'Transform ordinary tap water into refreshing alkaline water with our 7-stage Alkaline Water Filter Pitcher. Each pour delivers perfectly balanced pH 8.5-9.5 water enriched with calcium, magnesium, and potassium. The 10-cup BPA-free carafe features a slim design for refrigerator doors, an ergonomic handle, and an easy-fill lid. Each filter lasts 40 gallons — about 2 months for a family of four.',
      changed: false,
    },
    seoTitle: {
      original: 'Alkaline Water Pitcher | pH Balance | 10 Cups',
      optimized: 'Alkaline Water Filter Pitcher | pH 8.5-9.5 | 7-Stage Filtration | 10-Cup BPA-Free',
      changed: false,
    },
    seoDescription: {
      original: 'Enjoy alkaline water at home with our pH-balancing pitcher.',
      optimized: 'Drink healthier with our 7-stage Alkaline Water Pitcher. Gets pH 8.5-9.5, adds minerals, and fits in your fridge door. 40-gallon filter life. BPA-free. Ships free.',
      changed: false,
    },
    tags: {
      original: 'alkaline, water pitcher, pH balance',
      optimized: 'alkaline water pitcher, pH water filter, alkaline filter pitcher, mineral water pitcher, water ionizer pitcher',
      changed: false,
    },
    suggestedPrice: { original: 39.99, optimized: 39.99, changed: false },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const statusCounts = {
  all: mockOptimizedProducts.length,
  pending: mockOptimizedProducts.filter((p) => p.status === 'Pending Review').length,
  published: mockOptimizedProducts.filter((p) => p.status === 'Published').length,
  skipped: mockOptimizedProducts.filter((p) => p.status === 'Skipped').length,
};

function FieldDiff({
  label,
  original,
  optimized,
  changed,
}: {
  label: string;
  original: string;
  optimized: string;
  changed: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className={clsx('p-2.5 rounded-lg text-sm', changed ? 'bg-slate-800/50' : 'bg-slate-800/30')}>
          <p className="text-slate-500 text-xs mb-0.5">Original</p>
          <p className="text-slate-300 leading-relaxed">{original}</p>
        </div>
        <div
          className={clsx(
            'p-2.5 rounded-lg text-sm',
            changed
              ? 'bg-emerald-500/5 border border-emerald-500/20'
              : 'bg-slate-800/30'
          )}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs text-emerald-400">AI Optimized</p>
            {changed && <Sparkles className="w-3 h-3 text-emerald-400" />}
          </div>
          <p className={clsx('leading-relaxed', changed ? 'text-white' : 'text-slate-300')}>
            {optimized}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function AIOptimizePage() {
  const [activeTab, setActiveTab] = useState<ReviewStatus>('All');
  const [products, setProducts] = useState<OptimizedProduct[]>(mockOptimizedProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const filteredProducts = activeTab === 'All'
    ? products
    : products.filter((p) => p.status === activeTab);

  const handlePublish = useCallback(
    (id: string) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'Published' as const } : p))
      );
      toast.success('Product published', {
        description: 'AI-optimized content is now live on your store',
      });
    },
    []
  );

  const handleSkip = useCallback(
    (id: string) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'Skipped' as const } : p))
      );
      toast.info('Optimization skipped', {
        description: 'Original content preserved',
      });
    },
    []
  );

  const handleReoptimize = useCallback(
    (product: OptimizedProduct) => {
      toast.success('Re-optimization queued', {
        description: `AI is re-analyzing "${product.name}"`,
      });
    },
    []
  );

  const handleEditToggle = useCallback(
    (id: string) => {
      if (editingId === id) {
        setEditingId(null);
        setEditValues({});
        toast.success('Edits saved', { description: 'Changes applied to optimized content' });
      } else {
        setEditingId(id);
        const product = products.find((p) => p.id === id);
        if (product) {
          setEditValues({
            title: product.title.optimized,
            description: product.description.optimized,
            seoTitle: product.seoTitle.optimized,
            seoDescription: product.seoDescription.optimized,
            tags: product.tags.optimized,
            price: product.suggestedPrice.optimized.toString(),
          });
        }
      }
    },
    [editingId, products]
  );

  const handlePublishAll = useCallback(() => {
    const pending = products.filter((p) => p.status === 'Pending Review');
    if (pending.length === 0) {
      toast.info('No pending reviews', { description: 'All products have been reviewed' });
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.status === 'Pending Review' ? { ...p, status: 'Published' as const } : p
      )
    );
    toast.success(`Published ${pending.length} products`, {
      description: 'All AI-optimized content is now live',
    });
  }, [products]);

  const tabs: { key: ReviewStatus; label: string; count: number }[] = [
    { key: 'All', label: 'All', count: statusCounts.all },
    { key: 'Pending Review', label: 'Pending Review', count: statusCounts.pending },
    { key: 'Published', label: 'Published', count: statusCounts.published },
    { key: 'Skipped', label: 'Skipped', count: statusCounts.skipped },
  ];

  const pendingCount = statusCounts.pending;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white sm:hidden">AI Optimization</h2>

      {/* Stats Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{statusCounts.all}</span> optimized
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{statusCounts.published}</span> published
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SkipForward className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{statusCounts.skipped}</span> skipped
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{statusCounts.pending}</span> pending
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-75">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Publish All button for pending */}
      {activeTab === 'Pending Review' && pendingCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handlePublishAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Publish All Reviewed ({pendingCount})
          </button>
        </div>
      )}

      {/* Product Cards */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No products in this category</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isEditing = editingId === product.id;
            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                    width={40}
                    height={40}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {product.name}
                    </h4>
                  </div>
                  <span
                    className={clsx('status-badge border', {
                      'bg-amber-500/10 text-amber-400 border-amber-500/30':
                        product.status === 'Pending Review',
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':
                        product.status === 'Published',
                      'bg-slate-500/10 text-slate-400 border-slate-500/30':
                        product.status === 'Skipped',
                    })}
                  >
                    {product.status === 'Pending Review' && <Clock className="w-3 h-3 mr-1 inline" />}
                    {product.status === 'Published' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                    {product.status === 'Skipped' && <SkipForward className="w-3 h-3 mr-1 inline" />}
                    {product.status}
                  </span>
                </div>

                {/* Comparison Content */}
                <div className="p-5 space-y-4">
                  {/* Title */}
                  <FieldDiff
                    label="Title"
                    original={product.title.original}
                    optimized={isEditing ? (editValues.title ?? product.title.optimized) : product.title.optimized}
                    changed={product.title.changed}
                  />

                  {/* Description */}
                  <FieldDiff
                    label="Description"
                    original={product.description.original}
                    optimized={isEditing ? (editValues.description ?? product.description.optimized) : product.description.optimized}
                    changed={product.description.changed}
                  />

                  {/* SEO Title */}
                  <FieldDiff
                    label="SEO Title"
                    original={product.seoTitle.original}
                    optimized={isEditing ? (editValues.seoTitle ?? product.seoTitle.optimized) : product.seoTitle.optimized}
                    changed={product.seoTitle.changed}
                  />

                  {/* SEO Description */}
                  <FieldDiff
                    label="SEO Description"
                    original={product.seoDescription.original}
                    optimized={isEditing ? (editValues.seoDescription ?? product.seoDescription.optimized) : product.seoDescription.optimized}
                    changed={product.seoDescription.changed}
                  />

                  {/* Tags */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tags</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-slate-800/50 text-sm">
                        <p className="text-slate-500 text-xs mb-1">Original</p>
                        <div className="flex flex-wrap gap-1">
                          {product.tags.original.split(', ').map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-xs text-emerald-400">AI Optimized</p>
                          {product.tags.changed && <Sparkles className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(isEditing
                            ? (editValues.tags ?? product.tags.optimized)
                            : product.tags.optimized
                          )
                            .split(', ')
                            .map((tag) => (
                              <span
                                key={tag}
                                className={clsx(
                                  'px-2 py-0.5 text-xs rounded-full',
                                  product.tags.changed
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : 'bg-slate-700 text-slate-400'
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Price */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Suggested Price
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-slate-800/50 text-sm">
                        <p className="text-slate-500 text-xs mb-0.5">Original</p>
                        <p className="text-slate-300 font-mono font-semibold">
                          ${product.suggestedPrice.original.toFixed(2)}
                        </p>
                      </div>
                      <div
                        className={clsx(
                          'p-2.5 rounded-lg text-sm',
                          product.suggestedPrice.changed
                            ? 'bg-emerald-500/5 border border-emerald-500/20'
                            : 'bg-slate-800/30'
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-xs text-emerald-400">Suggested</p>
                          {product.suggestedPrice.changed && (
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                        <p
                          className={clsx(
                            'font-mono font-semibold',
                            product.suggestedPrice.changed ? 'text-emerald-400' : 'text-slate-300'
                          )}
                        >
                          {isEditing
                            ? `$${parseFloat(editValues.price ?? '0').toFixed(2)}`
                            : `$${product.suggestedPrice.optimized.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inline Editor for Edit Mode */}
                  {isEditing && (
                    <div className="space-y-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg animate-fade-in">
                      <p className="text-sm font-medium text-blue-400 mb-2">Inline Editor</p>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={editValues.title ?? ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="w-full h-9 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={editValues.description ?? ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-y"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">SEO Title</label>
                          <input
                            type="text"
                            value={editValues.seoTitle ?? ''}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, seoTitle: e.target.value }))
                            }
                            className="w-full h-9 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">SEO Description</label>
                          <input
                            type="text"
                            value={editValues.seoDescription ?? ''}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, seoDescription: e.target.value }))
                            }
                            className="w-full h-9 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Tags (comma separated)</label>
                        <input
                          type="text"
                          value={editValues.tags ?? ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, tags: e.target.value }))
                          }
                          className="w-full h-9 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.price ?? ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, price: e.target.value }))
                          }
                          className="w-32 h-9 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-slate-800 bg-slate-950/30">
                  {product.status !== 'Published' && (
                    <button
                      onClick={() => handlePublish(product.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleEditToggle(product.id)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors',
                      isEditing
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10'
                    )}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Edits
                      </>
                    ) : (
                      <>
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </>
                    )}
                  </button>
                  {product.status !== 'Skipped' && (
                    <button
                      onClick={() => handleReoptimize(product)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-optimize
                    </button>
                  )}
                  {product.status === 'Pending Review' && (
                    <button
                      onClick={() => handleSkip(product.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Publish All button */}
      {activeTab === 'Pending Review' && pendingCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handlePublishAll}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-emerald-600 rounded-xl shadow-lg hover:bg-emerald-700 transition-all shadow-emerald-600/20"
          >
            <CheckCircle className="w-4 h-4" />
            Publish All Reviewed ({pendingCount})
          </button>
        </div>
      )}
    </div>
  );
}
