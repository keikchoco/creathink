import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/permissions"
import { invoiceService } from "@/services/invoice.service"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { InvoiceForm, type InvoiceFormValues } from "@/components/admin/invoice-form"

interface EditInvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  try {
    await requirePermission("invoices", "edit")
  } catch {
    return (
      <ErrorState
        title="No permission"
        description="You don't have permission to edit invoices."
      />
    )
  }

  const { id } = await params

  let defaultValues: InvoiceFormValues
  let invoiceNumber: string
  try {
    const invoice = await invoiceService.getById(id)
    invoiceNumber = invoice.invoiceNumber
    defaultValues = {
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        company: invoice.customer.company ?? "",
        billingAddress: invoice.customer.billingAddress ?? "",
      },
      items: invoice.items.map((item) => ({
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      currency: invoice.currency,
      discountType: invoice.discountType ?? "none",
      discountValue: invoice.discountValue,
      dueDate: invoice.dueDate
        ? new Date(invoice.dueDate).toISOString().slice(0, 10)
        : "",
      notes: invoice.notes ?? "",
    }
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Typography as="h1" variant="h1">
        Edit {invoiceNumber}
      </Typography>
      <InvoiceForm invoiceId={id} defaultValues={defaultValues} />
    </div>
  )
}
