// === Checkout Module ===
// Checkout flow orchestration: validation, totals, shipping, and coupon management.
import { prisma } from '@watermart/core';
import type { CartService } from '@watermart/cart';

export interface CheckoutAddress {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface ShippingOption {
  id: string;
  carrier: string;
  serviceName: string;
  estimatedDays: { min: number; max: number };
  price: number;
  currency: string;
}

export interface CheckoutLineItem {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string | null;
}

export interface CheckoutSummary {
  lineItems: CheckoutLineItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  appliedCoupons: string[];
  shippingOption: ShippingOption | null;
}

export interface CheckoutValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CheckoutValidationResult {
  isValid: boolean;
  errors: CheckoutValidationError[];
}

const TAX_RATE = 0.08;
const STANDARD_SHIPPING_PRICE = 5.99;
const FREE_SHIPPING_THRESHOLD = 75;

// In-memory coupon stack per session (simplified; in production this would be stored in DB or Redis)
const sessionCoupons = new Map<string, string[]>();

export class CheckoutService {
  private cartService: CartService;

  constructor(cartService: CartService) {
    this.cartService = cartService;
  }

  /** Validate the current cart state. Checks stock, pricing, and item availability. */
  async validateCart(sessionId: string): Promise<CheckoutValidationResult> {
    const errors: CheckoutValidationError[] = [];
    const cart = await this.cartService.getCart(sessionId);

    if (!cart.items || cart.items.length === 0) {
      errors.push({
        field: 'cart',
        message: 'Cart is empty',
        code: 'CART_EMPTY',
      });
      return { isValid: false, errors };
    }

    // Validate each item
    for (const item of cart.items) {
      // Check product exists and is published
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        errors.push({
          field: `items[${item.productId}]`,
          message: `Product ${item.name} no longer exists`,
          code: 'PRODUCT_NOT_FOUND',
        });
        continue;
      }

      if (product.status !== 'PUBLISHED') {
        errors.push({
          field: `items[${item.productId}]`,
          message: `Product ${item.name} is no longer available`,
          code: 'PRODUCT_NOT_AVAILABLE',
        });
        continue;
      }

      // Check variant stock if variantId provided
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant) {
          errors.push({
            field: `items[${item.productId}].variant`,
            message: `Selected variant for ${item.name} is no longer available`,
            code: 'VARIANT_NOT_FOUND',
          });
        } else if (variant.stock < item.quantity) {
          errors.push({
            field: `items[${item.productId}].quantity`,
            message: `Only ${variant.stock} units available for ${item.name}`,
            code: 'INSUFFICIENT_STOCK',
          });
        }
      }

      // Verify price hasn't changed significantly (>50% diff)
      if (product.basePrice > 0) {
        const priceDiff = Math.abs(item.price - product.basePrice);
        if (priceDiff / product.basePrice > 0.5) {
          errors.push({
            field: `items[${item.productId}].price`,
            message: `Price for ${item.name} has changed. Please review before checkout.`,
            code: 'PRICE_CHANGED',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /** Calculate totals including tax, shipping, and coupon discounts. */
  async calculateTotals(
    sessionId: string,
    shippingAddress?: CheckoutAddress,
  ): Promise<CheckoutSummary> {
    const cart = await this.cartService.getCart(sessionId);

    // Build line items
    const lineItems: CheckoutLineItem[] = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: Math.round(item.price * item.quantity * 100) / 100,
      image: item.image,
    }));

    const subtotal = lineItems.reduce((sum, li) => sum + li.totalPrice, 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;

    // Calculate coupon discount
    const appliedCouponCodes = sessionCoupons.get(sessionId) ?? [];
    const couponDiscounts = await this.calculateCouponDiscounts(
      roundedSubtotal,
      appliedCouponCodes,
    );
    const discountAmount = couponDiscounts.discount;
    const isFreeShipping = couponDiscounts.freeShipping;

    // After-discount subtotal
    const afterDiscount = Math.max(0, roundedSubtotal - discountAmount);

    // Shipping
    let shippingAmount = 0;
    if (!isFreeShipping && afterDiscount < FREE_SHIPPING_THRESHOLD) {
      shippingAmount = STANDARD_SHIPPING_PRICE;
    }

    // Tax (on after-discount subtotal, not including shipping)
    const taxAmount = Math.round(afterDiscount * TAX_RATE * 100) / 100;

    // Total
    const total = Math.round((afterDiscount + shippingAmount + taxAmount) * 100) / 100;

    return {
      lineItems,
      subtotal: roundedSubtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      total,
      currency: 'USD',
      appliedCoupons: [...appliedCouponCodes],
      shippingOption: shippingAmount > 0
        ? {
            id: 'standard',
            carrier: 'WaterMart Standard',
            serviceName: 'Standard Shipping (5-7 business days)',
            estimatedDays: { min: 5, max: 7 },
            price: shippingAmount,
            currency: 'USD',
          }
        : {
            id: 'free',
            carrier: 'WaterMart Standard',
            serviceName: 'Free Shipping (5-7 business days)',
            estimatedDays: { min: 5, max: 7 },
            price: 0,
            currency: 'USD',
          },
    };
  }

  /** Apply a coupon/discount code to the current checkout session. */
  async applyCoupon(sessionId: string, code: string): Promise<CheckoutSummary> {
    // Validate coupon exists and is valid
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new Error(`Coupon code "${code}" is not valid`);
    }

    // Check expiration
    const now = new Date();
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new Error(`Coupon code "${code}" has expired`);
    }
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new Error(`Coupon code "${code}" is not yet active`);
    }

    // Check usage limits
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      throw new Error(`Coupon code "${code}" has reached its usage limit`);
    }

    // Add to session coupons
    const currentCoupons = sessionCoupons.get(sessionId) ?? [];
    if (currentCoupons.includes(code)) {
      throw new Error(`Coupon code "${code}" is already applied`);
    }
    sessionCoupons.set(sessionId, [...currentCoupons, code]);

    return this.calculateTotals(sessionId);
  }

  /** Remove a previously applied coupon. */
  async removeCoupon(sessionId: string, code: string): Promise<CheckoutSummary> {
    const currentCoupons = sessionCoupons.get(sessionId) ?? [];
    sessionCoupons.set(
      sessionId,
      currentCoupons.filter((c) => c !== code),
    );
    return this.calculateTotals(sessionId);
  }

  /** Get available shipping options for the cart + address. */
  async getShippingOptions(
    sessionId: string,
    shippingAddress: CheckoutAddress,
  ): Promise<ShippingOption[]> {
    const summary = await this.calculateTotals(sessionId, shippingAddress);

    const options: ShippingOption[] = [
      {
        id: 'standard',
        carrier: 'WaterMart Standard',
        serviceName: 'Standard Shipping (5-7 business days)',
        estimatedDays: { min: 5, max: 7 },
        price: summary.shippingAmount > 0 ? summary.shippingAmount : 0,
        currency: 'USD',
      },
      {
        id: 'express',
        carrier: 'WaterMart Express',
        serviceName: 'Express Shipping (2-3 business days)',
        estimatedDays: { min: 2, max: 3 },
        price: 14.99,
        currency: 'USD',
      },
      {
        id: 'overnight',
        carrier: 'WaterMart Overnight',
        serviceName: 'Overnight Shipping (next business day)',
        estimatedDays: { min: 1, max: 1 },
        price: 29.99,
        currency: 'USD',
      },
    ];

    return options;
  }

  /** Set the selected shipping option. */
  async selectShippingOption(
    sessionId: string,
    shippingOptionId: string,
  ): Promise<CheckoutSummary> {
    const summary = await this.calculateTotals(sessionId);

    let shippingPrice: number;
    let shippingName: string;
    let estimatedDays: { min: number; max: number };

    switch (shippingOptionId) {
      case 'standard':
        shippingPrice = summary.shippingAmount;
        shippingName = 'Standard Shipping (5-7 business days)';
        estimatedDays = { min: 5, max: 7 };
        break;
      case 'express':
        shippingPrice = 14.99;
        shippingName = 'Express Shipping (2-3 business days)';
        estimatedDays = { min: 2, max: 3 };
        break;
      case 'overnight':
        shippingPrice = 29.99;
        shippingName = 'Overnight Shipping (next business day)';
        estimatedDays = { min: 1, max: 1 };
        break;
      default:
        throw new Error(`Unknown shipping option: ${shippingOptionId}`);
    }

    return {
      ...summary,
      shippingAmount: shippingPrice,
      total: Math.round((summary.subtotal - summary.discountAmount + shippingPrice + summary.taxAmount) * 100) / 100,
      shippingOption: {
        id: shippingOptionId,
        carrier: 'WaterMart',
        serviceName: shippingName,
        estimatedDays,
        price: shippingPrice,
        currency: 'USD',
      },
    };
  }

  /** Validate a shipping address. */
  validateShippingAddress(address: CheckoutAddress): CheckoutValidationResult {
    const errors: CheckoutValidationError[] = [];

    if (!address.firstName?.trim()) {
      errors.push({ field: 'firstName', message: 'First name is required', code: 'REQUIRED' });
    }
    if (!address.lastName?.trim()) {
      errors.push({ field: 'lastName', message: 'Last name is required', code: 'REQUIRED' });
    }
    if (!address.line1?.trim()) {
      errors.push({ field: 'line1', message: 'Address line 1 is required', code: 'REQUIRED' });
    }
    if (!address.city?.trim()) {
      errors.push({ field: 'city', message: 'City is required', code: 'REQUIRED' });
    }
    if (!address.postalCode?.trim()) {
      errors.push({ field: 'postalCode', message: 'Postal code is required', code: 'REQUIRED' });
    }
    if (!address.country?.trim()) {
      errors.push({ field: 'country', message: 'Country is required', code: 'REQUIRED' });
    }

    return { isValid: errors.length === 0, errors };
  }

  /** Calculate coupon discounts for applied coupons. */
  private async calculateCouponDiscounts(
    subtotal: number,
    couponCodes: string[],
  ): Promise<{ discount: number; freeShipping: boolean }> {
    let totalDiscount = 0;
    let freeShipping = false;

    for (const code of couponCodes) {
      const coupon = await prisma.coupon.findUnique({ where: { code } });
      if (!coupon) continue;

      // Check min order amount
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) continue;

      switch (coupon.type) {
        case 'PERCENTAGE':
          totalDiscount += Math.round(subtotal * (coupon.value / 100) * 100) / 100;
          break;
        case 'FIXED_AMOUNT':
          totalDiscount += coupon.value;
          break;
        case 'FREE_SHIPPING':
          freeShipping = true;
          break;
      }
    }

    // Cap discount at subtotal
    totalDiscount = Math.min(totalDiscount, subtotal);

    return { discount: totalDiscount, freeShipping };
  }
}
