import { prisma } from '@watermart/core';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  expiresAt: string;
  createdAt: string;
}

export interface AddItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  currency: string;
}

export class CartService {
  /** Get or create cart. If userId is provided, tries user cart first. Falls back to sessionId. */
  async getCart(sessionId: string, userId?: string): Promise<Cart> {
    const where = userId ? { userId } : { sessionId };
    let cart = await prisma.cart.findFirst({ where });
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          ...(userId ? { userId } : {}),
          sessionId,
          items: '[]',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }
    return {
      id: cart.id,
      userId: cart.userId ?? undefined,
      sessionId: cart.sessionId ?? '',
      items: JSON.parse(cart.items),
      expiresAt: cart.expiresAt.toISOString(),
      createdAt: cart.createdAt.toISOString(),
    };
  }

  async addItem(
    sessionId: string,
    input: AddItemInput,
    userId?: string,
  ): Promise<Cart> {
    const cart = await this.getCart(sessionId, userId);
    // If userId but cart was by session, link it
    if (userId && !cart.userId) {
      await prisma.cart.update({ where: { id: cart.id }, data: { userId } });
    }
    const items: CartItem[] = cart.items;
    // Fetch product info from DB
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error('Product not found');
    const translations = JSON.parse(product.translations);
    const name = translations.en?.title ?? 'Product';

    const existingIdx = items.findIndex(
      (i) =>
        i.productId === input.productId &&
        i.variantId === (input.variantId ?? undefined),
    );
    if (existingIdx >= 0) {
      items[existingIdx]!.quantity += input.quantity;
    } else {
      items.push({
        productId: input.productId,
        variantId: input.variantId,
        name,
        sku: 'SKU-' + input.productId.slice(0, 8),
        price: product.basePrice,
        quantity: input.quantity,
        image: undefined,
      });
    }
    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: JSON.stringify(items) },
    });
    return { ...cart, items, userId: userId ?? cart.userId };
  }

  async removeItem(
    sessionId: string,
    productId: string,
    variantId?: string,
    userId?: string,
  ): Promise<Cart> {
    const cart = await this.getCart(sessionId, userId);
    const items = cart.items.filter(
      (i) =>
        !(
          i.productId === productId &&
          (i.variantId ?? undefined) === (variantId ?? undefined)
        ),
    );
    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: JSON.stringify(items) },
    });
    return { ...cart, items };
  }

  async updateQuantity(
    sessionId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    userId?: string,
  ): Promise<Cart> {
    const cart = await this.getCart(sessionId, userId);
    const items = cart.items
      .map((i) =>
        i.productId === productId &&
        (i.variantId ?? undefined) === (variantId ?? undefined)
          ? { ...i, quantity: Math.max(0, quantity) }
          : i,
      )
      .filter((i) => i.quantity > 0);
    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: JSON.stringify(items) },
    });
    return { ...cart, items };
  }

  async clearCart(sessionId: string, userId?: string): Promise<void> {
    const cart = await this.getCart(sessionId, userId);
    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: '[]' },
    });
  }

  async getCartSummary(
    sessionId: string,
    userId?: string,
  ): Promise<CartSummary> {
    const cart = await this.getCart(sessionId, userId);
    const subtotal =
      Math.round(
        cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100,
      ) / 100;
    return {
      items: cart.items,
      itemCount: cart.items.reduce((c, i) => c + i.quantity, 0),
      subtotal,
      currency: 'USD',
    };
  }
}
