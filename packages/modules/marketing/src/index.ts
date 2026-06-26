// ─── Marketing Module ───────────────────────────────────────────────
export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export interface Coupon { id: string; code: string; type: CouponType; value: number; minOrderAmount: number | null; maxUses: number; currentUses: number; startsAt: string | null; expiresAt: string | null; }
export interface CouponValidation { valid: boolean; discount: number; reason?: string; }
export interface Campaign { id: string; name: string; type: string; startsAt: string; endsAt: string; status: "draft" | "active" | "ended"; }

export class MarketingService {
  async createCoupon(_input: Omit<Coupon, "id" | "currentUses">): Promise<Coupon> { throw new Error("Not implemented"); }
  async validateCoupon(_code: string, _cartTotal: number): Promise<CouponValidation> { throw new Error("Not implemented"); }
  async applyCoupon(_id: string): Promise<void> { throw new Error("Not implemented"); }
  async listCoupons(): Promise<{ data: Coupon[]; total: number }> { throw new Error("Not implemented"); }
  async getActiveCampaigns(): Promise<Campaign[]> { return []; }
}
