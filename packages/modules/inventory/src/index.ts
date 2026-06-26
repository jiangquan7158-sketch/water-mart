// === Inventory Module ===
// Stock management, reservations, and warehouse operations.

export type StockKeepingUnit = string;

export interface InventoryRecord {
  sku: StockKeepingUnit;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  isBackorderable: boolean;
  backorderEta: string | null;
  lastRestockedAt: string;
  updatedAt: string;
}

export interface StockReservation {
  id: string;
  sku: StockKeepingUnit;
  quantity: number;
  reservedFor: string; // e.g. cartId, orderId
  expiresAt: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  sku: StockKeepingUnit;
  quantity: number; // positive = restock, negative = deduction
  reason: "restock" | "damage" | "loss" | "return" | "correction" | "other";
  note: string;
  performedBy: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isActive: boolean;
}

export class InventoryService {
  /** Get current stock record for a given SKU and optional warehouse. */
  async checkStock(
    sku: StockKeepingUnit,
    warehouseId?: string
  ): Promise<InventoryRecord | null> {
    throw new Error("InventoryService.checkStock not implemented");
  }

  /** Batch check stock across multiple SKUs. */
  async batchCheckStock(
    skus: StockKeepingUnit[]
  ): Promise<InventoryRecord[]> {
    throw new Error("InventoryService.batchCheckStock not implemented");
  }

  /** Reserve stock, e.g. when an item is added to cart. Returns reservation ID. */
  async reserve(
    sku: StockKeepingUnit,
    quantity: number,
    reservedFor: string,
    ttlSeconds?: number
  ): Promise<StockReservation> {
    throw new Error("InventoryService.reserve not implemented");
  }

  /** Release a reservation, e.g. when a cart expires or order is cancelled. */
  async release(reservationId: string): Promise<void> {
    throw new Error("InventoryService.release not implemented");
  }

  /** Adjust stock quantity (restock, damage, loss, return, correction). */
  async adjust(adjustment: Omit<StockAdjustment, "id" | "createdAt">): Promise<StockAdjustment> {
    throw new Error("InventoryService.adjust not implemented");
  }

  /** List warehouses. */
  async getWarehouses(): Promise<Warehouse[]> {
    throw new Error("InventoryService.getWarehouses not implemented");
  }

  /** Check if a product is in stock at any warehouse. */
  async isInStock(sku: StockKeepingUnit): Promise<boolean> {
    throw new Error("InventoryService.isInStock not implemented");
  }
}
