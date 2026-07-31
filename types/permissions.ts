export const RESOURCES = [
  "dashboard",
  "projects",
  "services",
  "testimonials",
  "homepage",
  "pages",
  "blog",
  "media",
  "messages",
  "inquiries",
  "invoices",
  "seo",
  "settings",
  "featureFlags",
  "users",
  "auditLogs",
] as const

export type Resource = (typeof RESOURCES)[number]

export const ACTIONS = ["view", "edit"] as const

export type Action = (typeof ACTIONS)[number]

export type Permissions = Partial<Record<Resource, Partial<Record<Action, boolean>>>>

export interface ClerkPublicMetadata {
  role?: "admin" | "super_admin" | "user"
  isSuperAdmin?: boolean
  permissions?: Permissions
}

export interface CurrentAdmin {
  userId: string
  role: ClerkPublicMetadata["role"]
  isSuperAdmin: boolean
  permissions: Permissions
}
