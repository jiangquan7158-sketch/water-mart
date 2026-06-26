// ─── WaterMart Payment Module ──────────────────────────────────────────────────
// Real payment gateway implementation with mock Stripe & PayPal providers.
//
// Features:
// - PaymentProvider interface with Stripe (mock) and PayPal (mock) backends
// - Zod-schema validation for all inputs
// - In-memory payment store (with Prisma-ready shape for production)
// - EventBus integration emitting 'payment:completed' and 'payment:refunded'
// - Structured error handling with typed error codes
// - Full refund support (full and partial)

import { z } from 'zod';
import { eventBus } from '@watermart/core';
import type { EventBus } from '@watermart/core';

// ─── Types & Enums ────────────────────────────────────────────────────────────

export type PaymentProviderType = 'stripe' | 'paypal' | 'mock';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export interface PaymentIntent {
  id: string;
  orderId: string;
  amount: number; // in minor/cents units
  currency: string;
  provider: PaymentProviderType;
  providerPaymentId: string | null;
  status: PaymentStatus;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProviderType;
  paymentMethodToken?: string;
  metadata?: Record<string, string>;
}

export interface RefundInput {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  reason?: string;
  createdAt: string;
}

export interface WebhookEvent {
  provider: PaymentProviderType;
  eventType: string;
  rawPayload: Record<string, unknown>;
  signature: string;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  amount: z.number().int().positive('amount must be a positive integer in minor units'),
  currency: z.string().length(3, 'currency must be a 3-letter ISO code').default('USD'),
  provider: z.enum(['stripe', 'paypal', 'mock'], {
    errorMap: () => ({ message: 'provider must be stripe, paypal, or mock' }),
  }),
  paymentMethodToken: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
  amount: z.number().int().positive('refund amount must be a positive integer in minor units'),
  reason: z.string().max(500).optional(),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
});

// ─── Payment Provider Interface ───────────────────────────────────────────────

export interface PaymentProvider {
  readonly type: PaymentProviderType;

  /** Authorize and capture a payment. */
  processPayment(input: CreatePaymentInput): Promise<PaymentIntent>;

  /** Refund a payment, full or partial. */
  refundPayment(input: RefundInput, payment: PaymentIntent): Promise<RefundResult>;

  /** Verify incoming webhook signature. */
  verifyWebhook(event: WebhookEvent): Promise<boolean>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${ts}_${rand}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

// ─── Stripe Mock Provider ─────────────────────────────────────────────────────
// Simulates Stripe's payment intent lifecycle without real API keys.
// Supports test card behavior: 4000000000000002 → declined, others → success.

const STRIPE_DECLINED_CARD = 'tok_declined';

class StripeMockProvider implements PaymentProvider {
  readonly type: PaymentProviderType = 'stripe';

  async processPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    // Simulate network latency
    await delay(200 + Math.random() * 300);

    // Test card behavior — simulate declines
    if (input.paymentMethodToken === STRIPE_DECLINED_CARD) {
      return {
        id: generateId('pay'),
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency,
        provider: 'stripe',
        providerPaymentId: null,
        status: 'failed',
        metadata: {
          ...input.metadata,
          failureCode: 'card_declined',
          failureMessage: 'Your card was declined. Please try a different payment method.',
        },
        createdAt: isoNow(),
        updatedAt: isoNow(),
      };
    }

    // Simulate successful Stripe payment intent
    const stripePiId = `pi_${Math.random().toString(36).substring(2, 26)}`;

    return {
      id: generateId('pay'),
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      provider: 'stripe',
      providerPaymentId: stripePiId,
      status: 'completed',
      metadata: {
        ...input.metadata,
        stripePaymentIntentId: stripePiId,
        paymentMethod: input.paymentMethodToken ?? 'card',
        receiptUrl: `https://pay.stripe.com/receipts/${stripePiId}`,
      },
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
  }

  async refundPayment(input: RefundInput, payment: PaymentIntent): Promise<RefundResult> {
    await delay(150 + Math.random() * 200);

    if (input.amount > payment.amount) {
      return {
        id: generateId('ref'),
        paymentId: input.paymentId,
        amount: input.amount,
        currency: payment.currency,
        status: 'failed',
        reason: 'Refund amount exceeds payment amount',
        createdAt: isoNow(),
      };
    }

    return {
      id: generateId('ref'),
      paymentId: input.paymentId,
      amount: input.amount,
      currency: payment.currency,
      status: 'completed',
      reason: input.reason,
      createdAt: isoNow(),
    };
  }

  async verifyWebhook(_event: WebhookEvent): Promise<boolean> {
    // In production: construct event using Stripe signature + webhook secret
    return true;
  }
}

// ─── PayPal Mock Provider ─────────────────────────────────────────────────────

class PayPalMockProvider implements PaymentProvider {
  readonly type: PaymentProviderType = 'paypal';

  async processPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    await delay(300 + Math.random() * 400);

    // Simulate PayPal order ID
    const paypalOrderId = `${Math.random().toString(36).substring(2, 10).toUpperCase()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    return {
      id: generateId('pay'),
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      provider: 'paypal',
      providerPaymentId: paypalOrderId,
      status: 'completed',
      metadata: {
        ...input.metadata,
        paypalOrderId,
        paypalCaptureId: `${paypalOrderId}C`,
        payerEmail: 'buyer@watermart.example.com',
      },
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
  }

  async refundPayment(input: RefundInput, payment: PaymentIntent): Promise<RefundResult> {
    await delay(200 + Math.random() * 300);

    if (input.amount > payment.amount) {
      return {
        id: generateId('ref'),
        paymentId: input.paymentId,
        amount: input.amount,
        currency: payment.currency,
        status: 'failed',
        reason: 'Refund amount exceeds payment amount',
        createdAt: isoNow(),
      };
    }

    return {
      id: generateId('ref'),
      paymentId: input.paymentId,
      amount: input.amount,
      currency: payment.currency,
      status: 'completed',
      reason: input.reason,
      createdAt: isoNow(),
    };
  }

  async verifyWebhook(_event: WebhookEvent): Promise<boolean> {
    // In production: verify PayPal webhook signature
    return true;
  }
}

// ─── Mock (Generic) Provider ─────────────────────────────────────────────────

class MockPaymentProvider implements PaymentProvider {
  readonly type: PaymentProviderType = 'mock';

  async processPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    await delay(50 + Math.random() * 100);

    return {
      id: generateId('pay'),
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      provider: 'mock',
      providerPaymentId: `mock_${generateId('pi')}`,
      status: 'completed',
      metadata: input.metadata ?? {},
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
  }

  async refundPayment(input: RefundInput, payment: PaymentIntent): Promise<RefundResult> {
    await delay(50);

    if (input.amount > payment.amount) {
      return {
        id: generateId('ref'),
        paymentId: input.paymentId,
        amount: input.amount,
        currency: payment.currency,
        status: 'failed',
        createdAt: isoNow(),
      };
    }

    return {
      id: generateId('ref'),
      paymentId: input.paymentId,
      amount: input.amount,
      currency: payment.currency,
      status: 'completed',
      reason: input.reason,
      createdAt: isoNow(),
    };
  }

  async verifyWebhook(_event: WebhookEvent): Promise<boolean> {
    return true;
  }
}

// ─── Payment Error ────────────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// ─── Payment Service ──────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PaymentService {
  private readonly providers: Map<PaymentProviderType, PaymentProvider>;
  private readonly payments: Map<string, PaymentIntent>;
  private readonly refunds: Map<string, RefundResult>;
  private readonly events: EventBus;

  constructor() {
    this.providers = new Map();
    this.payments = new Map();
    this.refunds = new Map();
    this.events = eventBus;

    // Register built-in providers
    this.registerProvider(new StripeMockProvider());
    this.registerProvider(new PayPalMockProvider());
    this.registerProvider(new MockPaymentProvider());
  }

  // ── Provider Management ──────────────────────────────────────────────────

  /** Register a custom payment provider. */
  registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.type, provider);
  }

  /** Get a registered provider by type. */
  getProvider(type: PaymentProviderType): PaymentProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new PaymentError(
        `Payment provider "${type}" is not registered. Available: ${[...this.providers.keys()].join(', ')}`,
        'PROVIDER_NOT_FOUND',
        400,
      );
    }
    return provider;
  }

  // ── createPaymentIntent ──────────────────────────────────────────────────
  // Simulates Stripe's payment intent creation flow.

  async createPaymentIntent(input: CreatePaymentInput): Promise<PaymentIntent> {
    // Validate
    const parsed = createPaymentSchema.safeParse(input);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      throw new PaymentError(
        'Payment validation failed',
        'VALIDATION_ERROR',
        400,
        { fieldErrors: flat.fieldErrors },
      );
    }

    const valid = parsed.data;

    // Check for duplicate order payment
    const existing = Array.from(this.payments.values()).find(
      (p) => p.orderId === valid.orderId && p.status === 'completed',
    );
    if (existing) {
      throw new PaymentError(
        `Order ${valid.orderId} already has a completed payment (${existing.id})`,
        'DUPLICATE_PAYMENT',
        409,
      );
    }

    const provider = this.getProvider(valid.provider);

    // Create initial pending intent
    const intentId = generateId('pay');
    const intent: PaymentIntent = {
      id: intentId,
      orderId: valid.orderId,
      amount: valid.amount,
      currency: valid.currency,
      provider: valid.provider,
      providerPaymentId: null,
      status: 'pending',
      metadata: valid.metadata ?? {},
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    this.payments.set(intentId, intent);

    // Process through provider
    const result = await provider.processPayment(valid);

    // Update store with provider result
    result.id = intentId; // Preserve our internal ID
    this.payments.set(intentId, result);

    // Emit event
    if (result.status === 'completed') {
      this.events.emit('payment:completed', {
        paymentId: result.id,
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        provider: result.provider,
      });
    }

    return result;
  }

  // ── confirmPayment ───────────────────────────────────────────────────────
  // Confirms a pending payment. For mock providers this is immediate.

  async confirmPayment(
    paymentIdOrInput: string | { paymentId: string },
  ): Promise<PaymentIntent> {
    const paymentId =
      typeof paymentIdOrInput === 'string'
        ? paymentIdOrInput
        : confirmPaymentSchema.parse(paymentIdOrInput).paymentId;

    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new PaymentError(
        `Payment "${paymentId}" not found`,
        'PAYMENT_NOT_FOUND',
        404,
      );
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new PaymentError(
        `Payment "${paymentId}" cannot be confirmed — current status: ${payment.status}`,
        'INVALID_STATUS',
        400,
      );
    }

    // Advance to processing then completed
    payment.status = 'processing';
    payment.updatedAt = isoNow();
    this.payments.set(paymentId, payment);

    // Simulate async confirmation delay
    await delay(100 + Math.random() * 200);

    payment.status = 'completed';
    payment.updatedAt = isoNow();
    this.payments.set(paymentId, payment);

    this.events.emit('payment:completed', {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
    });

    return payment;
  }

  // ── refund ───────────────────────────────────────────────────────────────

  async refund(input: RefundInput): Promise<RefundResult> {
    // Validate
    const parsed = refundSchema.safeParse(input);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      throw new PaymentError(
        'Refund validation failed',
        'VALIDATION_ERROR',
        400,
        { fieldErrors: flat.fieldErrors },
      );
    }

    const valid = parsed.data;

    const payment = this.payments.get(valid.paymentId);
    if (!payment) {
      throw new PaymentError(
        `Payment "${valid.paymentId}" not found`,
        'PAYMENT_NOT_FOUND',
        404,
      );
    }

    // Validate refundable status
    const refundable: PaymentStatus[] = ['completed', 'partially_refunded'];
    if (!refundable.includes(payment.status)) {
      throw new PaymentError(
        `Cannot refund payment "${valid.paymentId}" — status is "${payment.status}"`,
        'NOT_REFUNDABLE',
        400,
      );
    }

    // Calculate refundable amount
    const existingRefunds = Array.from(this.refunds.values())
      .filter((r) => r.paymentId === valid.paymentId && r.status !== 'failed')
      .reduce((sum, r) => sum + r.amount, 0);

    const refundableAmount = payment.amount - existingRefunds;
    if (valid.amount > refundableAmount) {
      throw new PaymentError(
        `Refund amount ${valid.amount} exceeds refundable amount ${refundableAmount}`,
        'REFUND_EXCEEDS_BALANCE',
        400,
      );
    }

    const provider = this.getProvider(payment.provider);
    const result = await provider.refundPayment(valid, payment);

    if (result.status === 'completed') {
      this.refunds.set(result.id, result);

      // Update payment status
      const totalRefunded = existingRefunds + valid.amount;
      payment.status = totalRefunded >= payment.amount ? 'refunded' : 'partially_refunded';
      payment.updatedAt = isoNow();
      this.payments.set(payment.id, payment);

      this.events.emit('payment:refunded', {
        paymentId: payment.id,
        orderId: payment.orderId,
        refundId: result.id,
        amount: valid.amount,
        currency: payment.currency,
      });
    }

    return result;
  }

  // ── getPayment ───────────────────────────────────────────────────────────

  async getPayment(paymentId: string): Promise<PaymentIntent | null> {
    return this.payments.get(paymentId) ?? null;
  }

  // ── listPaymentsByOrder ──────────────────────────────────────────────────

  async listPaymentsByOrder(orderId: string): Promise<PaymentIntent[]> {
    return Array.from(this.payments.values()).filter((p) => p.orderId === orderId);
  }

  // ── cancelPayment ────────────────────────────────────────────────────────

  async cancelPayment(paymentId: string, reason?: string): Promise<PaymentIntent> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new PaymentError(`Payment "${paymentId}" not found`, 'PAYMENT_NOT_FOUND', 404);
    }

    const cancellable: PaymentStatus[] = ['pending', 'processing'];
    if (!cancellable.includes(payment.status)) {
      throw new PaymentError(
        `Cannot cancel payment "${paymentId}" — status is "${payment.status}"`,
        'NOT_CANCELLABLE',
        400,
      );
    }

    payment.status = 'cancelled';
    payment.metadata.cancelReason = reason ?? 'Cancelled by merchant';
    payment.updatedAt = isoNow();
    this.payments.set(paymentId, payment);

    return payment;
  }

  // ── handleWebhook ────────────────────────────────────────────────────────

  async handleWebhook(event: WebhookEvent): Promise<void> {
    const provider = this.getProvider(event.provider);
    const valid = await provider.verifyWebhook(event);
    if (!valid) {
      throw new PaymentError('Invalid webhook signature', 'INVALID_WEBHOOK', 400);
    }

    // In production: parse event type and update payment status accordingly
    switch (event.eventType) {
      case 'payment_intent.succeeded': {
        const piId = event.rawPayload.paymentIntentId as string | undefined;
        if (piId) {
          const payment = Array.from(this.payments.values()).find(
            (p) => p.metadata.stripePaymentIntentId === piId,
          );
          if (payment && payment.status === 'pending') {
            payment.status = 'completed';
            payment.updatedAt = isoNow();
            this.payments.set(payment.id, payment);

            this.events.emit('payment:completed', {
              paymentId: payment.id,
              orderId: payment.orderId,
              amount: payment.amount,
              currency: payment.currency,
              provider: payment.provider,
            });
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const piId = event.rawPayload.paymentIntentId as string | undefined;
        if (piId) {
          const payment = Array.from(this.payments.values()).find(
            (p) => p.metadata.stripePaymentIntentId === piId,
          );
          if (payment && (payment.status === 'pending' || payment.status === 'processing')) {
            payment.status = 'failed';
            payment.metadata.failureMessage =
              (event.rawPayload.error as string) ?? 'Payment failed via webhook';
            payment.updatedAt = isoNow();
            this.payments.set(payment.id, payment);
          }
        }
        break;
      }
      default:
        // Unhandled event type — log and ignore
        break;
    }
  }

  // ── getRefunds ───────────────────────────────────────────────────────────

  async getRefunds(paymentId: string): Promise<RefundResult[]> {
    return Array.from(this.refunds.values()).filter((r) => r.paymentId === paymentId);
  }

  // ── Payment Stats ────────────────────────────────────────────────────────

  async getStats(): Promise<{
    totalPayments: number;
    completedPayments: number;
    totalRefunded: number;
    totalVolumeMinor: number;
  }> {
    const all = Array.from(this.payments.values());
    const completed = all.filter((p) => p.status === 'completed');
    const refunded = Array.from(this.refunds.values()).filter((r) => r.status === 'completed');

    return {
      totalPayments: all.length,
      completedPayments: completed.length,
      totalRefunded: refunded.reduce((sum, r) => sum + r.amount, 0),
      totalVolumeMinor: completed.reduce((sum, p) => sum + p.amount, 0),
    };
  }
}
