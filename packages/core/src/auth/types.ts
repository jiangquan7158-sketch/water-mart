// ─── Permissions ────────────────────────────────────────────────────────────
// Granular RBAC permission set for WaterMart admin panel.

export const Permission = {
  // Product management
  PRODUCT_VIEW:     'product:view',
  PRODUCT_CREATE:   'product:create',
  PRODUCT_EDIT:     'product:edit',
  PRODUCT_DELETE:   'product:delete',
  PRODUCT_PUBLISH:  'product:publish',

  // Order management
  ORDER_VIEW:       'order:view',
  ORDER_EDIT:       'order:edit',
  ORDER_CANCEL:     'order:cancel',
  ORDER_REFUND:     'order:refund',
  ORDER_EXPORT:     'order:export',

  // User management
  USER_VIEW:        'user:view',
  USER_CREATE:      'user:create',
  USER_EDIT:        'user:edit',
  USER_DELETE:      'user:delete',
  USER_BAN:         'user:ban',

  // Category management
  CATEGORY_VIEW:    'category:view',
  CATEGORY_CREATE:  'category:create',
  CATEGORY_EDIT:    'category:edit',
  CATEGORY_DELETE:  'category:delete',

  // Content (CMS)
  CONTENT_VIEW:     'content:view',
  CONTENT_EDIT:     'content:edit',
  CONTENT_PUBLISH:  'content:publish',

  // Marketing
  MARKETING_VIEW:   'marketing:view',
  COUPON_CREATE:    'coupon:create',
  COUPON_EDIT:      'coupon:edit',
  COUPON_DELETE:    'coupon:delete',
  NOTIFICATION_SEND: 'notification:send',

  // Affiliate
  AFFILIATE_VIEW:   'affiliate:view',
  AFFILIATE_APPROVE: 'affiliate:approve',
  AFFILIATE_SUSPEND: 'affiliate:suspend',
  AFFILIATE_PAYOUT:  'affiliate:payout',

  // Analytics
  ANALYTICS_VIEW:   'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',

  // Settings
  SETTINGS_VIEW:    'settings:view',
  SETTINGS_EDIT:    'settings:edit',

  // Import / Export
  IMPORT_DATA:      'import:data',
  EXPORT_DATA:      'export:data',

  // Review
  REVIEW_MODERATE:  'review:moderate',

  // Scraping
  SCRAPE_CREATE:    'scrape:create',
  SCRAPE_VIEW:      'scrape:view',
  SCRAPE_PUBLISH:   'scrape:publish',

  // System
  SYSTEM_LOGS:      'system:logs',
  SYSTEM_CONFIG:    'system:config',
  SYSTEM_HEALTH:    'system:health',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ─── Roles ──────────────────────────────────────────────────────────────────

export const Role = {
  CUSTOMER:    'CUSTOMER',
  ADMIN:       'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  MODERATOR:   'MODERATOR',
  EDITOR:      'EDITOR',
  AFFILIATE:   'AFFILIATE',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// ─── Role → Permission Mapping ──────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: [],

  ADMIN: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.PRODUCT_PUBLISH,
    Permission.ORDER_VIEW,
    Permission.ORDER_EDIT,
    Permission.ORDER_CANCEL,
    Permission.USER_VIEW,
    Permission.CATEGORY_VIEW,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_EDIT,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_PUBLISH,
    Permission.MARKETING_VIEW,
    Permission.COUPON_CREATE,
    Permission.COUPON_EDIT,
    Permission.NOTIFICATION_SEND,
    Permission.AFFILIATE_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.SCRAPE_VIEW,
    Permission.SCRAPE_CREATE,
    Permission.SCRAPE_PUBLISH,
    Permission.IMPORT_DATA,
    Permission.EXPORT_DATA,
    Permission.SYSTEM_HEALTH,
  ],

  SUPER_ADMIN: Object.values(Permission),

  MODERATOR: [
    Permission.PRODUCT_VIEW,
    Permission.ORDER_VIEW,
    Permission.USER_VIEW,
    Permission.USER_BAN,
    Permission.CATEGORY_VIEW,
    Permission.CONTENT_VIEW,
    Permission.REVIEW_MODERATE,
    Permission.ANALYTICS_VIEW,
  ],

  EDITOR: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.CATEGORY_VIEW,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_EDIT,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_EDIT,
  ],

  AFFILIATE: [
    Permission.AFFILIATE_VIEW,
  ],
};

// ─── Custom Permission ──────────────────────────────────────────────────────
// Add any extra permissions that are referenced but not in the enum

(Object.keys(Permission) as Array<keyof typeof Permission>).forEach((k) => {
  // Ensure all values in ROLE_PERMISSIONS are valid Permission entries
});

// REVIEW_MODERATE is used by MODERATOR role but not in the main Permission object
const REVIEW_MODERATE = 'review:moderate' as const;
Object.assign(ROLE_PERMISSIONS.MODERATOR, [
  ...ROLE_PERMISSIONS.MODERATOR,
  REVIEW_MODERATE,
]);

// ─── Session / Auth Types ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  avatar: string | null;
  role: Role;
  locale: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
  user?: User;
}

// ─── Auth Helpers ───────────────────────────────────────────────────────────

export function hasPermission(
  userRole: Role,
  permission: Permission,
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  // Super admin has all permissions
  if (userRole === 'SUPER_ADMIN') return true;
  return (permissions as readonly string[]).includes(permission);
}

export function hasAnyPermission(
  userRole: Role,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(userRole, p));
}

export function hasAllPermissions(
  userRole: Role,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(userRole, p));
}
