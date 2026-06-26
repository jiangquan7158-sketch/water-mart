'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  Eye,
  Printer,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ArrowUpDown,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  image: string;
}

interface StatusEvent {
  status: OrderStatus;
  date: Date;
  note: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  date: Date;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: OrderItem[];
  timeline: StatusEvent[];
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: '#WM-2024-0001',
    customerName: 'Emily Johnson',
    customerEmail: 'emily.j@example.com',
    date: new Date('2024-06-25T10:30:00'),
    total: 245.99,
    subtotal: 229.99,
    tax: 16.00,
    shipping: 0,
    status: 'Delivered',
    paymentStatus: 'Paid',
    shippingAddress: {
      line1: '123 Main Street',
      line2: 'Apt 4B',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'United States',
    },
    items: [
      { id: 'oi-1', name: 'Smart Water Bottle Pro', sku: 'SWB-PRO-001', quantity: 2, price: 49.99, image: 'https://picsum.photos/seed/ord1a/80/80' },
      { id: 'oi-2', name: 'pH Test Kit Deluxe', sku: 'PHK-DLX-002', quantity: 1, price: 89.00, image: 'https://picsum.photos/seed/ord1b/80/80' },
      { id: 'oi-3', name: 'Water Hardness Test Strips', sku: 'WHT-STR-021', quantity: 3, price: 9.99, image: 'https://picsum.photos/seed/ord1c/80/80' },
    ],
    timeline: [
      { status: 'Pending', date: new Date('2024-06-25T10:30:00'), note: 'Order placed' },
      { status: 'Processing', date: new Date('2024-06-25T11:00:00'), note: 'Payment confirmed' },
      { status: 'Shipped', date: new Date('2024-06-26T09:00:00'), note: 'Package shipped via UPS' },
      { status: 'Delivered', date: new Date('2024-06-28T14:30:00'), note: 'Delivered to front door' },
    ],
  },
  {
    id: '2',
    orderNumber: '#WM-2024-0002',
    customerName: 'Michael Chen',
    customerEmail: 'mchen@example.com',
    date: new Date('2024-06-25T14:15:00'),
    total: 89.00,
    subtotal: 89.00,
    tax: 0,
    shipping: 0,
    status: 'Processing',
    paymentStatus: 'Paid',
    shippingAddress: {
      line1: '456 Oak Avenue',
      line2: '',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
    },
    items: [
      { id: 'oi-4', name: 'Mineral Filter Cartridge 3-Pack', sku: 'MFC-003', quantity: 2, price: 34.99, image: 'https://picsum.photos/seed/ord2a/80/80' },
    ],
    timeline: [
      { status: 'Pending', date: new Date('2024-06-25T14:15:00'), note: 'Order placed' },
      { status: 'Processing', date: new Date('2024-06-25T14:30:00'), note: 'Payment confirmed' },
    ],
  },
  {
    id: '3',
    orderNumber: '#WM-2024-0003',
    customerName: 'Sarah Williams',
    customerEmail: 'sarah.w@example.com',
    date: new Date('2024-06-24T09:00:00'),
    total: 432.00,
    subtotal: 399.99,
    tax: 32.01,
    shipping: 0,
    status: 'Shipped',
    paymentStatus: 'Paid',
    shippingAddress: {
      line1: '789 Pine Road',
      line2: 'Suite 300',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'United States',
    },
    items: [
      { id: 'oi-5', name: 'Whole House Filter System', sku: 'WHF-SYS-025', quantity: 1, price: 549.99, image: 'https://picsum.photos/seed/ord3a/80/80' },
    ],
    timeline: [
      { status: 'Pending', date: new Date('2024-06-24T09:00:00'), note: 'Order placed' },
      { status: 'Processing', date: new Date('2024-06-24T10:00:00'), note: 'Payment confirmed' },
      { status: 'Shipped', date: new Date('2024-06-25T08:00:00'), note: 'Package shipped via FedEx' },
    ],
  },
  {
    id: '4',
    orderNumber: '#WM-2024-0004',
    customerName: 'David Kim',
    customerEmail: 'david.k@example.com',
    date: new Date('2024-06-23T16:45:00'),
    total: 78.25,
    subtotal: 69.99,
    tax: 5.60,
    shipping: 2.66,
    status: 'Pending',
    paymentStatus: 'Pending',
    shippingAddress: {
      line1: '321 Elm Street',
      line2: '',
      city: 'Seattle',
      state: 'WA',
      zip: '98101',
      country: 'United States',
    },
    items: [
      { id: 'oi-6', name: 'Portable TDS Meter', sku: 'TDS-MTR-006', quantity: 2, price: 19.99, image: 'https://picsum.photos/seed/ord4a/80/80' },
      { id: 'oi-7', name: 'Chlorine Test Drops', sku: 'CLT-DRP-012', quantity: 1, price: 12.99, image: 'https://picsum.photos/seed/ord4b/80/80' },
    ],
    timeline: [
      { status: 'Pending', date: new Date('2024-06-23T16:45:00'), note: 'Order placed, awaiting payment' },
    ],
  },
  {
    id: '5',
    orderNumber: '#WM-2024-0005',
    customerName: 'Lisa Anderson',
    customerEmail: 'lisa.a@example.com',
    date: new Date('2024-06-22T11:30:00'),
    total: 312.80,
    subtotal: 289.99,
    tax: 22.81,
    shipping: 0,
    status: 'Delivered',
    paymentStatus: 'Paid',
    shippingAddress: {
      line1: '654 Maple Drive',
      line2: '',
      city: 'Denver',
      state: 'CO',
      zip: '80202',
      country: 'United States',
    },
    items: [
      { id: 'oi-8', name: 'Water Distiller 4L', sku: 'WDS-4L-008', quantity: 1, price: 299.99, image: 'https://picsum.photos/seed/ord5a/80/80' },
    ],
    timeline: [
      { status: 'Pending', date: new Date('2024-06-22T11:30:00'), note: 'Order placed' },
      { status: 'Processing', date: new Date('2024-06-22T12:00:00'), note: 'Payment confirmed' },
      { status: 'Shipped', date: new Date('2024-06-23T10:00:00'), note: 'Package shipped' },
      { status: 'Delivered', date: new Date('2024-06-24T16:30:00'), note: 'Delivered - left on porch' },
    ],
  },
  // Generate more mock orders
  ...Array.from({ length: 15 }, (_, i) => {
    const statuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    const payStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Failed', 'Refunded'];
    const status = statuses[(i + 3) % 5]!;
    const names = [
      'James Wilson', 'Maria Garcia', 'Robert Taylor', 'Jennifer Lee', 'Thomas Brown',
      'Amanda Davis', 'Christopher Moore', 'Jessica White', 'Daniel Harris', 'Michelle Martin',
      'Ryan Clark', 'Stephanie Lewis', 'Kevin Walker', 'Nicole Hall', 'Brandon Allen',
    ];
    const items: OrderItem[] = [
      {
        id: `oi-gen-${i}-1`,
        name: ['Smart Water Bottle Pro', 'pH Test Kit Deluxe', 'Mineral Filter Cartridge', 'UV-C Sterilizer Wand', 'Copper Water Bottle 1L'][i % 5]!,
        sku: `GEN-${100 + i}`,
        quantity: 1 + (i % 3),
        price: [49.99, 89.00, 34.99, 129.99, 36.99][i % 5]!,
        image: `https://picsum.photos/seed/gen${i}/80/80`,
      },
    ];
    const total = items[0]!.price * items[0]!.quantity + 5.99;
    const timeline: StatusEvent[] = [
      { status: 'Pending', date: new Date(2024, 5, 20 - i), note: 'Order placed' },
    ];
    if (status !== 'Pending' && status !== 'Cancelled') {
      timeline.push({ status: 'Processing', date: new Date(2024, 5, 21 - i), note: 'Payment confirmed' });
    }
    if (status === 'Shipped' || status === 'Delivered') {
      timeline.push({ status: 'Shipped', date: new Date(2024, 5, 22 - i), note: 'Package shipped' });
    }
    if (status === 'Delivered') {
      timeline.push({ status: 'Delivered', date: new Date(2024, 5, 24 - i), note: 'Package delivered' });
    }
    if (status === 'Cancelled') {
      timeline.push({ status: 'Cancelled', date: new Date(2024, 5, 21 - i), note: 'Order cancelled by customer' });
    }

    return {
      id: `${6 + i}`,
      orderNumber: `#WM-2024-${String(6 + i).padStart(4, '0')}`,
      customerName: names[i % names.length]!,
      customerEmail: `${names[i % names.length]!.toLowerCase().replace(' ', '.')}@example.com`,
      date: new Date(2024, 5, 20 - (i % 20)),
      total,
      subtotal: total - 5.99,
      tax: 2.99,
      shipping: 3.00,
      status,
      paymentStatus: payStatuses[i % 4]!,
      shippingAddress: {
        line1: `${100 + i * 5} Commerce Street`,
        line2: i % 2 === 0 ? `Apt ${i + 1}` : '',
        city: ['Miami', 'Chicago', 'Boston', 'Phoenix', 'Atlanta'][i % 5]!,
        state: ['FL', 'IL', 'MA', 'AZ', 'GA'][i % 5]!,
        zip: String(33000 + i * 111),
        country: 'United States',
      },
      items,
      timeline,
    };
  }),
];

// ── Status Styles ────────────────────────────────────────────────────────────

const orderStatusStyles: Record<OrderStatus, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const orderStatusIcons: Record<OrderStatus, React.ElementType> = {
  Pending: Clock,
  Processing: Package,
  Shipped: Truck,
  Delivered: CheckCircle2,
  Cancelled: AlertCircle,
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  Refunded: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const filterTabs: Array<{ key: string; label: string }> = [
  { key: 'All', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Processing', label: 'Processing' },
  { key: 'Shipped', label: 'Shipped' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
];

// ── Order Detail Drawer Component ────────────────────────────────────────────

function OrderDrawer({
  order,
  open,
  onClose,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
}) {
  const getNextStatuses = (status: OrderStatus): OrderStatus[] => {
    const flow: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const idx = flow.indexOf(status);
    if (idx === -1) return [];
    return flow.slice(idx + 1);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">{order.orderNumber}</h3>
            <p className="text-xs text-slate-400">
              {format(order.date, 'MMMM dd, yyyy h:mm a')}
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
          {/* Order Status & Actions */}
          <div className="flex items-center justify-between">
            <span className={clsx('status-badge border text-sm px-3 py-1', orderStatusStyles[order.status])}>
              {(() => {
                const Icon = orderStatusIcons[order.status];
                return <Icon className="w-3.5 h-3.5 mr-1.5 inline" />;
              })()}
              {order.status}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info('Print preview opened')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              {getNextStatuses(order.status).length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      toast.success(`Status updated to ${e.target.value}`, {
                        description: `Order ${order.orderNumber}`,
                      });
                    }
                  }}
                  className="h-9 px-3 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>
                    Update Status
                  </option>
                  {getNextStatuses(order.status).map((s) => (
                    <option key={s} value={s}>
                      Mark as {s}
                    </option>
                  ))}
                  {order.status !== 'Cancelled' && (
                    <option value="Cancelled">Cancel Order</option>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Customer</h4>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-1">
              <p className="text-sm text-white font-medium">{order.customerName}</p>
              <p className="text-sm text-slate-400">{order.customerEmail}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Shipping Address</h4>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-0.5">
              <p className="text-sm text-slate-300">{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && (
                <p className="text-sm text-slate-300">{order.shippingAddress.line2}</p>
              )}
              <p className="text-sm text-slate-300">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zip}
              </p>
              <p className="text-sm text-slate-300">{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">
              Items ({order.items.length})
            </h4>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                    width={48}
                    height={48}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-slate-300">
                      {item.quantity} x ${item.price.toFixed(2)}
                    </p>
                    <p className="text-sm font-medium text-white">
                      ${(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Order Total</h4>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-slate-300">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tax</span>
                <span className="text-slate-300">${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Shipping</span>
                <span className="text-slate-300">
                  {order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-1.5 flex justify-between">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-sm font-semibold text-white">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Order Timeline</h4>
            <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-700">
              {order.timeline.map((event, idx) => {
                const Icon = orderStatusIcons[event.status];
                return (
                  <div key={idx} className="relative">
                    <div
                      className={clsx(
                        'absolute -left-6 w-6 h-6 rounded-full border-2 flex items-center justify-center',
                        idx === order.timeline.length - 1
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-slate-800 border-slate-700'
                      )}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white">{event.status}</p>
                    <p className="text-xs text-slate-500">
                      {format(event.date, 'MMM dd, yyyy h:mm a')} - {event.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    let orders = mockOrders;
    if (activeTab !== 'All') {
      orders = orders.filter((o) => o.status === activeTab);
    }
    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
      );
    }
    return orders;
  }, [activeTab, globalFilter]);

  const orderStats = useMemo(() => {
    const total = mockOrders.length;
    const pending = mockOrders.filter((o) => o.status === 'Pending').length;
    const shipped = mockOrders.filter((o) => o.status === 'Shipped').length;
    const revenue = mockOrders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.total, 0);
    return { total, pending, shipped, revenue };
  }, []);

  const openOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white"
            onClick={() => column.toggleSorting()}
          >
            Order#
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-blue-400">
            {row.original.orderNumber}
          </span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-white">{row.original.customerName}</p>
            <p className="text-xs text-slate-500">{row.original.customerEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white"
            onClick={() => column.toggleSorting()}
          >
            Date
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-300">
            {format(row.original.date, 'MMM dd, yyyy')}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white"
            onClick={() => column.toggleSorting()}
          >
            Total
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white">
            ${row.original.total.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={clsx('status-badge border', orderStatusStyles[row.original.status])}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment',
        cell: ({ row }) => (
          <span
            className={clsx(
              'status-badge border',
              paymentStatusStyles[row.original.paymentStatus]
            )}
          >
            {row.original.paymentStatus}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openOrder(row.original);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/10 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
        ),
        enableSorting: false,
      },
    ],
    [openOrder]
  );

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white sm:hidden">Orders</h2>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Total Orders</p>
              <p className="text-2xl font-bold text-white">{orderStats.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-amber-400">{orderStats.pending}</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Shipped</p>
              <p className="text-2xl font-bold text-purple-400">{orderStats.shipped}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Revenue</p>
              <p className="text-2xl font-bold text-emerald-400">
                ${orderStats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const count =
            tab.key === 'All'
              ? mockOrders.length
              : mockOrders.filter((o) => o.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-75">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-left whitespace-nowrap"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openOrder(row.original)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No orders found</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
          <p className="text-sm text-slate-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({filteredOrders.length} orders)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
