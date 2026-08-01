export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_CURRENCIES = ["PHP", "USD"] as const

export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number]

export const PAYMENT_METHODS = [
  "bank_transfer",
  "gcash",
  "paypal",
  "cash",
  "credit_card",
  "other",
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  gcash: "GCash",
  paypal: "PayPal",
  cash: "Cash",
  credit_card: "Credit Card",
  other: "Other",
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  partially_paid: "Partially Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

/**
 * Client-facing wording for the same underlying status. "Sent" is an
 * internal/delivery term that reads oddly to the person who received the
 * invoice — they see "Awaiting Payment" instead. The status itself (and
 * every gating rule around it) is unchanged; this only affects labels shown
 * on the public invoice page and PDF.
 */
export const INVOICE_CLIENT_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Awaiting Payment",
  paid: "Paid",
  partially_paid: "Partially Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

export type DiscountType = "fixed" | "percentage"

export const INVOICE_ACTIVITY_TYPES = [
  "created",
  "updated",
  "duplicated",
  "status_changed",
  "sent",
  "payment_recorded",
  "payment_updated",
  "payment_deleted",
] as const

export type InvoiceActivityType = (typeof INVOICE_ACTIVITY_TYPES)[number]
