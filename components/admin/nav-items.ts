import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  BriefcaseIcon,
  QuoteIcon,
  HomeIcon,
  FileTextIcon,
  NewspaperIcon,
  ImageIcon,
  MailIcon,
  InboxIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  FlagIcon,
  UsersIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react"

import type { Resource } from "@/types/permissions"

export interface AdminNavItem {
  title: string
  url: string
  resource: Resource
  icon: LucideIcon
}

export const adminNavItems: AdminNavItem[] = [
  { title: "Dashboard", url: "/admin", resource: "dashboard", icon: LayoutDashboardIcon },
  { title: "Projects", url: "/admin/projects", resource: "projects", icon: FolderKanbanIcon },
  { title: "Services", url: "/admin/services", resource: "services", icon: BriefcaseIcon },
  { title: "Testimonials", url: "/admin/testimonials", resource: "testimonials", icon: QuoteIcon },
  // { title: "Homepage", url: "/admin/homepage", resource: "homepage", icon: HomeIcon },
  // { title: "Pages", url: "/admin/pages", resource: "pages", icon: FileTextIcon },
  { title: "Blog", url: "/admin/blog", resource: "blog", icon: NewspaperIcon },
  { title: "Media", url: "/admin/media", resource: "media", icon: ImageIcon },
  { title: "Messages", url: "/admin/messages", resource: "messages", icon: MailIcon },
  { title: "Inquiries", url: "/admin/inquiries", resource: "inquiries", icon: InboxIcon },
  { title: "Invoices", url: "/admin/invoices", resource: "invoices", icon: ReceiptIcon },
  // { title: "SEO", url: "/admin/seo", resource: "seo", icon: SearchIcon },
  { title: "Settings", url: "/admin/settings", resource: "settings", icon: SettingsIcon },
  { title: "Feature Flags", url: "/admin/feature-flags", resource: "featureFlags", icon: FlagIcon },
  { title: "Users", url: "/admin/users", resource: "users", icon: UsersIcon },
  { title: "Audit Logs", url: "/admin/audit-logs", resource: "auditLogs", icon: ScrollTextIcon },
]
