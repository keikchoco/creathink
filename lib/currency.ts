import type { InvoiceCurrency } from "@/types/invoice"

const FORMATTERS: Record<InvoiceCurrency, Intl.NumberFormat> = {
  PHP: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  AUD: new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }),
}

export function formatCurrency(amount: number, currency: InvoiceCurrency): string {
  return FORMATTERS[currency].format(amount)
}
