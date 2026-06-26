// ─── Customer Module ───────────────────────────────────────────────
export type MembershipTier = "bronze" | "silver" | "gold" | "diamond";
export interface CustomerProfile { id: string; email: string; name: string | null; avatar: string | null; locale: string; membershipTier: MembershipTier; points: number; totalSpent: number; orderCount: number; }
export interface CustomerAddress { id: string; type: "SHIPPING" | "BILLING"; name: string; phone?: string; street: string; city: string; state?: string; zip: string; country: string; isDefault: boolean; }
export interface RegisterInput { email: string; password: string; name?: string; locale?: string; }
export interface LoginInput { email: string; password: string; }
export interface AuthResult { user: CustomerProfile; token: string; expiresAt: string; }

export class CustomerService {
  async register(_input: RegisterInput): Promise<AuthResult> { throw new Error("Not implemented"); }
  async login(_input: LoginInput): Promise<AuthResult> { throw new Error("Not implemented"); }
  async getProfile(_userId: string): Promise<CustomerProfile | null> { throw new Error("Not implemented"); }
  async updateProfile(_userId: string, _data: Record<string, unknown>): Promise<CustomerProfile> { throw new Error("Not implemented"); }
  async getAddresses(_userId: string): Promise<CustomerAddress[]> { return []; }
  async addAddress(_userId: string, _address: unknown): Promise<CustomerAddress> { throw new Error("Not implemented"); }
  calculateTier(totalSpent: number): MembershipTier { if (totalSpent >= 5000) return "diamond"; if (totalSpent >= 2000) return "gold"; if (totalSpent >= 500) return "silver"; return "bronze"; }
}
