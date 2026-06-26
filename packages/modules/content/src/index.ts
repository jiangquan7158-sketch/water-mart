// Content CMS Module
export interface Page { id: string; slug: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; translations: Record<string, { title: string; content: string }>; meta: { seoTitle?: string; seoDescription?: string }; publishedAt: string | null; }
export interface BlogPost { id: string; slug: string; translations: Record<string, { title: string; excerpt: string; content: string }>; tags: string[]; }
export interface NavigationItem { id: string; label: Record<string, string>; url: string; parentId: string | null; sortOrder: number; }

export class ContentService {
  async getPage(slug: string): Promise<Page | null> { void slug; throw new Error("Not implemented"); }
  async createPage(input: Omit<Page, "id" | "publishedAt">): Promise<Page> { void input; throw new Error("Not implemented"); }
  async publishPage(id: string): Promise<Page> { void id; throw new Error("Not implemented"); }
  async listPages(): Promise<{ data: Page[]; total: number }> { throw new Error("Not implemented"); }
}
