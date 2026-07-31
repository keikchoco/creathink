import { requirePermission } from "@/lib/permissions"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { InvoiceForm } from "@/components/admin/invoice-form"

export default async function NewInvoicePage() {
  try {
    await requirePermission("invoices", "edit")
  } catch {
    return (
      <ErrorState
        title="No permission"
        description="You don't have permission to create invoices."
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Typography as="h1" variant="h1">
        New Invoice
      </Typography>
      <InvoiceForm />
    </div>
  )
}
