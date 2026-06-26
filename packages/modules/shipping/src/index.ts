// ─── Shipping Module ───────────────────────────────────────────────────────────
export interface ShippingRate { carrier: string; serviceName: string; serviceCode: string; estimatedDays: { min: number; max: number }; price: { amount: number; currency: string }; }
export interface ShipmentTracking { trackingNumber: string; carrier: string; status: "pending" | "in_transit" | "out_for_delivery" | "delivered"; events: Array<{ timestamp: string; location: string; description: string }>; estimatedDelivery: string | null; }
export interface CreateShipmentInput { orderId: string; origin: { name: string; street: string; city: string; state: string; zip: string; country: string }; destination: { name: string; street: string; city: string; state: string; zip: string; country: string }; items: Array<{ name: string; quantity: number; weight: number }>; }
export interface Shipment extends CreateShipmentInput { id: string; tracking: ShipmentTracking | null; labelUrl: string | null; status: "created" | "label_generated" | "in_transit" | "delivered"; cost: { amount: number; currency: string }; createdAt: string; }
export interface ShippingZone { id: string; name: string; countries: string[]; rates: ShippingRate[]; freeShippingAbove: { amount: number; currency: string } | null; }

export class ShippingService {
  async calculateRates(destination: { country: string; zip?: string }, items: Array<{ weight: number; quantity: number }>): Promise<ShippingRate[]> {
    return [
      { carrier: "Standard", serviceName: "Standard Shipping", serviceCode: "STD", estimatedDays: { min: 7, max: 14 }, price: { amount: 9.99, currency: "USD" } },
      { carrier: "Express", serviceName: "Express Shipping", serviceCode: "EXP", estimatedDays: { min: 3, max: 5 }, price: { amount: 19.99, currency: "USD" } },
    ];
  }
  async createShipment(_input: CreateShipmentInput): Promise<Shipment> { throw new Error("Not implemented"); }
  async track(_trackingNumber: string, _carrier: string): Promise<ShipmentTracking> { throw new Error("Not implemented"); }
  async getShippingZones(): Promise<ShippingZone[]> { return []; }
  async saveShippingZone(_zone: Omit<ShippingZone, "id"> & { id?: string }): Promise<ShippingZone> { throw new Error("Not implemented"); }
  async deleteShippingZone(_id: string): Promise<void> { throw new Error("Not implemented"); }
}
