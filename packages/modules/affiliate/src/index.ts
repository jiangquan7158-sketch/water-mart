// ─── Affiliate Module ──────────────────────────────────────────────
export type AffiliateStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
export interface AffiliateProfile { id: string; userId: string; code: string; commissionRate: number; balance: number; totalEarned: number; status: AffiliateStatus; totalSales: number; totalConversions: number; }
export interface AffiliateLink { id: string; url: string; clicks: number; conversions: number; earnings: number; }
export interface AffiliateEarning { id: string; orderId: string; amount: number; rate: number; status: "pending" | "approved" | "paid"; }

export class AffiliateService {
  async register(_userId: string, _code?: string): Promise<AffiliateProfile> { throw new Error("Not implemented"); }
  async createLink(_affiliateId: string, _url: string): Promise<AffiliateLink> { throw new Error("Not implemented"); }
  async trackClick(_linkId: string): Promise<void> { throw new Error("Not implemented"); }
  async calculateCommission(_orderId: string, _code: string): Promise<number> { throw new Error("Not implemented"); }
  async listAffiliates(_filters?: Record<string, unknown>): Promise<{ data: AffiliateProfile[]; total: number }> { throw new Error("Not implemented"); }
}
