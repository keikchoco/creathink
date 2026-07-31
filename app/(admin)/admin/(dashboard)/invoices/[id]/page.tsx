import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/permissions"
import { invoiceService, effectiveStatus } from "@/services/invoice.service"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { InvoiceStatusBadge } from "@/components/admin/invoice-status-badge"
import {
  InvoiceDetail,
  type InvoiceDetailData,
  type InvoiceActivityData,
} from "@/components/admin/invoice-detail"

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  try {
    await requirePermission("invoices", "view")
  } catch {
    return (
      <ErrorState
        title="No permission"
        description="You don't have permission to view invoices."
      />
    )
  }

  const { id } = await params

  let invoice: InvoiceDetailData
  let activities: InvoiceActivityData[] = []
  try {
    const [document, activityDocs] = await Promise.all([
      invoiceService.getById(id),
      invoiceService.getActivity(id),
    ])

    invoice = {
      id: String(document._id),
      invoiceNumber: document.invoiceNumber,
      publicId: document.publicId,
      status: effectiveStatus(document),
      currency: document.currency,
      customer: {
        name: document.customer.name,
        email: document.customer.email,
        company: document.customer.company ?? "",
        billingAddress: document.customer.billingAddress ?? "",
      },
      items: document.items.map((item) => ({
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      discountType: document.discountType,
      discountValue: document.discountValue,
      subtotal: document.subtotal,
      discountAmount: document.discountAmount,
      total: document.total,
      totalPaid: document.totalPaid,
      payments: document.payments.map((payment) => ({
        id: String(payment._id),
        amount: payment.amount,
        paymentDate: new Date(payment.paymentDate).toISOString(),
        method: payment.method,
        reference: payment.reference ?? "",
        notes: payment.notes ?? "",
      })),
      dueDate: document.dueDate ? new Date(document.dueDate).toISOString() : null,
      paidAt: document.paidAt ? new Date(document.paidAt).toISOString() : null,
      sentAt: document.sentAt ? new Date(document.sentAt).toISOString() : null,
      lastSentAt: document.lastSentAt ? new Date(document.lastSentAt).toISOString() : null,
      sentCount: document.sentCount,
      notes: document.notes ?? "",
      createdAt: new Date(document.createdAt).toISOString(),
      updatedAt: new Date(document.updatedAt).toISOString(),
    }

    activities = activityDocs.map((activity) => ({
      id: String(activity._id),
      type: activity.type,
      message: activity.message,
      createdAt: new Date(activity.createdAt).toISOString(),
    }))
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Typography as="h1" variant="h1">
          {invoice.invoiceNumber}
        </Typography>
        <InvoiceStatusBadge status={invoice.status} />
      </div>
      <InvoiceDetail invoice={invoice} activities={activities} />
    </div>
  )
}
