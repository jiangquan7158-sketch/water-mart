// === Catalog Module ===
// Manages product categories, brands, and tag taxonomies.

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface ProductCategory {
  productId: string;
  categoryId: string;
  isPrimary: boolean;
}

export class CatalogService {
  /** List all active categories, optionally filtered by parent. */
  async getCategories(parentId?: string | null): Promise<Category[]> {
    throw new Error("CatalogService.getCategories not implemented");
  }

  /** Get a single category by ID or slug. */
  async getCategory(identifier: string): Promise<Category | null> {
    throw new Error("CatalogService.getCategory not implemented");
  }

  /** Return the full category tree. */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    throw new Error("CatalogService.getCategoryTree not implemented");
  }

  /** List all active brands. */
  async getBrands(): Promise<Brand[]> {
    throw new Error("CatalogService.getBrands not implemented");
  }

  /** Get a single brand by ID or slug. */
  async getBrand(identifier: string): Promise<Brand | null> {
    throw new Error("CatalogService.getBrand not implemented");
  }

  /** List tags, optionally filtered by group. */
  async getTags(group?: string): Promise<Tag[]> {
    throw new Error("CatalogService.getTags not implemented");
  }

  /** Assign categories to a product. */
  async assignCategoriesToProduct(
    productId: string,
    assignments: ProductCategory[]
  ): Promise<void> {
    throw new Error("CatalogService.assignCategoriesToProduct not implemented");
  }

  /** Get categories assigned to a product. */
  async getProductCategories(productId: string): Promise<ProductCategory[]> {
    throw new Error("CatalogService.getProductCategories not implemented");
  }
}
