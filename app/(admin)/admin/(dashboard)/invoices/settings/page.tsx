import { requirePermission } from "@/lib/permissions"
import { paymentSettingsService } from "@/services/payment-settings.service"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { PaymentMethodsForm } from "@/components/admin/payment-methods-form"

export default async function InvoicePaymentSettingsPage() {
  try {
    await requirePermission("invoices", "edit")
  } catch {
    return (
      <ErrorState
        title="No permission"
        description="You don't have permission to manage payment methods."
      />
    )
  }

  let defaultValues
  try {
    const methods = await paymentSettingsService.list()
    defaultValues = methods.map((entry) => ({
      method: entry.method,
      label: entry.label,
      details: entry.details,
      enabled: entry.enabled,
    }))
  } catch {
    return (
      <ErrorState
        title="Unable to load payment methods"
        description="The database isn't reachable right now. Check MONGODB_URI in .env.local."
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography as="h1" variant="h1">
          Payment Methods
        </Typography>
        <p className="text-sm text-muted-foreground">
          These payment methods appear on the invoice email, the public invoice
          page, and the downloadable PDF for every invoice.
        </p>
      </div>
      <PaymentMethodsForm defaultValues={defaultValues} />
    </div>
  )
}
