import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { requirePermission } from "@/lib/permissions"
import { invoiceService, effectiveStatus } from "@/services/invoice.service"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { InvoicesTable, type InvoiceRow } from "@/components/admin/invoices-table"
import { INVOICE_STATUSES, type InvoiceStatus } from "@/types/invoice"

interface AdminInvoicesPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

export default async function AdminInvoicesPage({ searchParams }: AdminInvoicesPageProps) {
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

  const params = await searchParams
  const page = Number(params.page ?? "1") || 1
  const limit = 20

  const status = INVOICE_STATUSES.includes(params.status as InvoiceStatus)
    ? (params.status as InvoiceStatus)
    : undefined

  let rows: InvoiceRow[] = []
  let total = 0
  let loadFailed = false

  try {
    const result = await invoiceService.list(
      {
        status,
        customerEmail: params.email,
        search: params.q,
        createdFrom: parseDate(params.from),
        createdTo: parseDate(params.to, true),
        dueFrom: parseDate(params.dueFrom),
        dueTo: parseDate(params.dueTo, true),
      },
      { page, limit, sort: params.sort || "-createdAt" },
    )

    rows = result.items.map((invoice) => ({
      id: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email,
      status: effectiveStatus(invoice),
      currency: invoice.currency,
      total: invoice.total,
      totalPaid: invoice.totalPaid,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
      createdAt: new Date(invoice.createdAt).toISOString(),
    }))
    total = result.total
  } catch {
    loadFailed = true
  }

  const hasFilters = Boolean(
    params.status || params.email || params.q || params.from || params.to || params.dueFrom || params.dueTo,
  )

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
        <Typography as="h1" variant="h1">
          Invoices
        </Typography>
        <Button render={<Link href="/admin/invoices/new" />}>
          <PlusIcon />
          New Invoice
        </Button>
      </div>

      {loadFailed ? (
        <ErrorState
          title="Unable to load invoices"
          description="The database isn't reachable right now. Check MONGODB_URI in .env.local."
        />
      ) : rows.length === 0 && !hasFilters ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice to start billing clients."
        />
      ) : (
        <InvoicesTable rows={rows} total={total} page={page} limit={limit} />
      )}
    </div>
  )
}
