// ─── Order Module ──────────────────────────────────────────────────────────────
// Order creation, retrieval, listing, and lifecycle management.
import { prisma } from '@watermart/core';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'REFUNDED'
  | 'FAILED';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface OrderAddress {
  name: string;
  phone?: string;
  street: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress | null;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  shippingMethod: string | null;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseItems(raw: unknown): OrderItem[] {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as OrderItem[]);
  } catch {
    return [];
  }
}

function parseAddress(raw: unknown): OrderAddress {
  try {
    return typeof raw === 'string'
      ? JSON.parse(raw)
      : (raw as OrderAddress);
  } catch {
    return { name: '', street: '', city: '', zip: '', country: 'US' };
  }
}

function parseAddressOrNull(raw: unknown): OrderAddress | null {
  if (!raw) return null;
  try {
    return typeof raw === 'string'
      ? JSON.parse(raw)
      : (raw as OrderAddress);
  } catch {
    return null;
  }
}

function mapDbOrderToOrder(o: {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  items: unknown;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: unknown;
  billingAddress: unknown;
  paymentMethod: string | null;
  paymentStatus: string;
  shippingMethod: string | null;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    status: o.status as OrderStatus,
    items: parseItems(o.items),
    subtotal: o.subtotal,
    tax: o.tax,
    shipping: o.shipping,
    total: o.total,
    currency: o.currency,
    shippingAddress: parseAddress(o.shippingAddress),
    billingAddress: parseAddressOrNull(o.billingAddress),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus as PaymentStatus,
    shippingMethod: o.shippingMethod,
    trackingNumber: o.trackingNumber,
    notes: o.notes,
    createdAt:
      typeof o.createdAt === 'string'
        ? o.createdAt
        : o.createdAt.toISOString(),
    updatedAt:
      typeof o.updatedAt === 'string'
        ? o.updatedAt
        : o.updatedAt.toISOString(),
  };
}

export class OrderService {
  /** Create an order from a cart. Clears the cart afterward. */
  async createOrder(input: {
    userId: string;
    sessionId: string;
    shippingAddress: OrderAddress;
    billingAddress?: OrderAddress;
    paymentMethod: string;
    shippingMethod?: string;
    notes?: string;
  }): Promise<Order> {
    // Get cart
    const cart = await prisma.cart.findFirst({
      where: {
        OR: [{ userId: input.userId }, { sessionId: input.sessionId }],
      },
    });
    if (!cart) throw new Error('Cart not found');
    const cartItems = JSON.parse(cart.items) as OrderItem[];
    if (cartItems.length === 0) throw new Error('Cart is empty');

    const subtotal =
      Math.round(
        cartItems.reduce((s, i) => s + i.price * i.quantity, 0) * 100,
      ) / 100;
    const shipping = subtotal >= 75 ? 0 : 5.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + shipping + tax) * 100) / 100;

    // Generate order number
    const now = new Date();
    const orderNumber = `WMT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        status: 'PENDING',
        items: cart.items,
        subtotal,
        tax,
        shipping,
        total,
        currency: 'USD',
        shippingAddress: JSON.stringify(input.shippingAddress),
        billingAddress: input.billingAddress
          ? JSON.stringify(input.billingAddress)
          : null,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'PENDING',
        shippingMethod: input.shippingMethod ?? null,
        notes: input.notes ?? null,
      },
    });

    // Create order items
    for (const item of cartItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image ?? null,
        },
      });
    }

    // Clear cart
    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: '[]' },
    });

    const items: OrderItem[] = cartItems.map((i) => ({ ...i, id: '' }));
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status as OrderStatus,
      items,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      currency: order.currency,
      shippingAddress: JSON.parse(order.shippingAddress),
      billingAddress: order.billingAddress
        ? JSON.parse(order.billingAddress)
        : null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus as PaymentStatus,
      shippingMethod: order.shippingMethod,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  /** Get an order by ID. */
  async getOrder(id: string): Promise<Order | null> {
    const o = await prisma.order.findUnique({ where: { id } });
    if (!o) return null;
    return mapDbOrderToOrder(o);
  }

  /** List orders with optional filters. */
  async listOrders(filters?: {
    userId?: string;
    status?: OrderStatus;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Order[]; total: number; page: number; pageSize: number }> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    const orders = data.map(mapDbOrderToOrder);
    return { data: orders, total, page, pageSize };
  }

  /** Update order status. */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const o = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    return mapDbOrderToOrder(o);
  }
}
