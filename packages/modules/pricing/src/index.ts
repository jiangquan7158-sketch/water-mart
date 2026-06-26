// === Pricing Module ===
// Multi-currency pricing, tax calculation, and price rule evaluation.

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CNY" | "JPY" | "CAD" | "AUD";

export interface Money {
  amount: number; // stored in minor units (cents)
  currency: CurrencyCode;
}

export interface PriceRecord {
  productId: string;
  sku: string;
  basePrice: Money;
  salePrice: Money | null;
  costPrice: Money | null;
  compareAtPrice: Money | null;
  taxCode: string;
  isTaxInclusive: boolean;
  country: string;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyConversion {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  updatedAt: string;
}

export interface TaxLine {
  name: string;
  rate: number; // e.g. 0.0875 for 8.75%
  amount: Money;
}

export interface TaxCalculation {
  subtotal: Money;
  taxLines: TaxLine[];
  taxTotal: Money;
  total: Money;
}

export interface PriceCalculationResult {
  productId: string;
  sku: string;
  basePrice: Money;
  appliedPrice: Money; // after discounts / sales
  tax: TaxCalculation;
  finalPrice: Money;
  currency: CurrencyCode;
}

export class PricingService {
  /** Get the current price for a product in a given country/currency context. */
  async calculatePrice(
    productId: string,
    country: string,
    currency: CurrencyCode
  ): Promise<PriceCalculationResult | null> {
    throw new Error("PricingService.calculatePrice not implemented");
  }

  /** Convert an amount between currencies using the latest rate. */
  async convertCurrency(
    amount: Money,
    targetCurrency: CurrencyCode
  ): Promise<Money> {
    throw new Error("PricingService.convertCurrency not implemented");
  }

  /** Calculate tax for a given subtotal, country, and tax code. */
  async calculateTax(
    subtotal: Money,
    country: string,
    taxCode: string
  ): Promise<TaxCalculation> {
    throw new Error("PricingService.calculateTax not implemented");
  }

  /** Batch price calculation for multiple products. */
  async batchCalculatePrice(
    items: { productId: string; country: string; currency: CurrencyCode }[]
  ): Promise<PriceCalculationResult[]> {
    throw new Error("PricingService.batchCalculatePrice not implemented");
  }

  /** Get current exchange rate for a currency pair. */
  async getExchangeRate(
    from: CurrencyCode,
    to: CurrencyCode
  ): Promise<CurrencyConversion> {
    throw new Error("PricingService.getExchangeRate not implemented");
  }
}
