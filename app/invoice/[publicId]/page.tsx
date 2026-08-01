import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { invoiceService, effectiveStatus } from "@/services/invoice.service"
import { paymentSettingsService } from "@/services/payment-settings.service"
import { formatCurrency } from "@/lib/currency"
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/site"
import { InvoiceStatusBadge } from "@/components/public/invoice-status-badge"
import { InvoiceViewActions } from "@/components/public/invoice-view-actions"

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
}

interface PublicInvoicePageProps {
  params: Promise<{ publicId: string }>
}

function formatDate(value: Date | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const { publicId } = await params
  const invoice = await invoiceService.getByPublicId(publicId)

  if (!invoice) notFound()

  const status = effectiveStatus(invoice)
  const balance = Math.max(0, invoice.total - invoice.totalPaid)
  const showPaymentMethods = status !== "paid" && status !== "cancelled" && balance > 0
  const paymentMethods = showPaymentMethods ? await paymentSettingsService.listEnabled() : []

  return (
    <div className="min-h-screen bg-muted/40 py-10 print:bg-white print:py-0">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
        <div className="flex items-center justify-between print:hidden">
          <span className="font-heading text-lg font-semibold">{SITE_NAME}</span>
          <InvoiceViewActions publicId={publicId} />
        </div>

        <div className="rounded-xl border bg-background p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-lg bg-[#0d0f0c] px-4 py-2.5 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/Creathink_Name_logo_-_PNG.png"
                  alt={SITE_NAME}
                  className="h-6 w-auto"
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {SITE_URL.replace(/^https?:\/\//, "")}
                <br />
                {CONTACT_EMAIL}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold tracking-wide">INVOICE</h2>
              <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
              <div className="mt-2">
                <InvoiceStatusBadge status={status} />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-between gap-6">
            <div className="max-w-xs">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Billed To
              </h3>
              <p className="mt-1 font-medium">{invoice.customer.name || "—"}</p>
              {invoice.customer.email && (
                <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
              )}
              {invoice.customer.company && (
                <p className="text-sm text-muted-foreground">{invoice.customer.company}</p>
              )}
              {invoice.customer.billingAddress && (
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {invoice.customer.billingAddress}
                </p>
              )}
            </div>
            <div className="text-sm">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Dates
              </h3>
              <p className="mt-1">
                <span className="text-muted-foreground">Issued:</span>{" "}
                {formatDate(invoice.createdAt)}
              </p>
              <p>
                <span className="text-muted-foreground">Due:</span>{" "}
                {formatDate(invoice.dueDate)}
              </p>
              {invoice.paidAt && (
                <p>
                  <span className="text-muted-foreground">Paid:</span>{" "}
                  {formatDate(invoice.paidAt)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground text-left text-xs uppercase">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit Price</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.quantity * item.unitPrice, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-64 justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex w-64 justify-between">
                <span className="text-muted-foreground">
                  Discount
                  {invoice.discountType === "percentage"
                    ? ` (${invoice.discountValue}%)`
                    : ""}
                </span>
                <span>-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex w-64 justify-between border-t-2 border-foreground pt-2 text-base font-bold">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            {invoice.totalPaid > 0 && (
              <>
                <div className="flex w-64 justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>-{formatCurrency(invoice.totalPaid, invoice.currency)}</span>
                </div>
                <div className="flex w-64 justify-between font-semibold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balance, invoice.currency)}</span>
                </div>
              </>
            )}
          </div>

          {paymentMethods.length > 0 && (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Payment Methods
              </h3>
              <div className="mt-2 flex flex-col gap-3">
                {paymentMethods.map((method) => (
                  <div key={String(method._id)} className="text-sm">
                    <p className="font-medium">{method.label}</p>
                    <p className="whitespace-pre-line text-muted-foreground">
                      {method.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoice.notes && (
            <div className="mt-8">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Notes
              </h3>
              <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                {invoice.notes}
              </p>
            </div>
          )}

          <p className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
            Thank you for your business. {SITE_NAME} ·{" "}
            {SITE_URL.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>
    </div>
  )
}
