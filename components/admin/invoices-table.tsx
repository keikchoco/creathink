"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import {
  duplicateInvoiceAction,
  deleteInvoiceAction,
} from "@/actions/invoices"
import { DataTable, type DataTableColumn } from "@/components/admin/data-table"
import { InvoiceStatusBadge } from "@/components/admin/invoice-status-badge"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/currency"
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type InvoiceCurrency,
  type InvoiceStatus,
} from "@/types/invoice"

export interface InvoiceRow {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  status: InvoiceStatus
  currency: InvoiceCurrency
  total: number
  totalPaid: number
  dueDate: string | null
  createdAt: string
}

interface InvoicesTableProps {
  rows: InvoiceRow[]
  total: number
  page: number
  limit: number
}

function InvoicesTable({ rows, total, page, limit }: InvoicesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [deletingRow, setDeletingRow] = React.useState<InvoiceRow | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [email, setEmail] = React.useState(searchParams.get("email") ?? "")

  function applyFilter(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete("page")
    router.push(`/admin/invoices?${params.toString()}`)
  }

  async function handleDuplicate(row: InvoiceRow) {
    const response = await duplicateInvoiceAction(row.id)
    if (!response.success) {
      toast.error(response.error.message)
      return
    }
    toast.success("Invoice duplicated")
    router.push(`/admin/invoices/${response.data.id}`)
  }

  async function handleDeleteConfirm() {
    if (!deletingRow) return
    setIsDeleting(true)
    const response = await deleteInvoiceAction(deletingRow.id)
    setIsDeleting(false)
    if (!response.success) {
      toast.error(response.error.message)
      return
    }
    toast.success("Invoice deleted")
    setDeletingRow(null)
    router.refresh()
  }

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      key: "invoiceNumber",
      label: "Invoice",
      render: (row) => (
        <Link href={`/admin/invoices/${row.id}`} className="font-medium hover:underline">
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div className="flex flex-col">
          <span>{row.customerName || <span className="text-muted-foreground">—</span>}</span>
          {row.customerEmail && (
            <span className="text-xs text-muted-foreground">{row.customerEmail}</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: "total",
      label: "Total",
      render: (row) => (
        <div className="flex flex-col">
          <span>{formatCurrency(row.total, row.currency)}</span>
          {row.totalPaid > 0 && row.totalPaid < row.total && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(row.totalPaid, row.currency)} paid
            </span>
          )}
        </div>
      ),
    },
    {
      key: "dueDate",
      label: "Due",
      render: (row) =>
        row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—",
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select
            value={searchParams.get("status") ?? "all"}
            onValueChange={(value) =>
              applyFilter({ status: value === "all" ? null : (value as string) })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INVOICE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {INVOICE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            applyFilter({ email })
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Customer email</span>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="client@example.com"
              className="w-56"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Created from</span>
          <Input
            type="date"
            value={searchParams.get("from") ?? ""}
            onChange={(event) => applyFilter({ from: event.target.value })}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Created to</span>
          <Input
            type="date"
            value={searchParams.get("to") ?? ""}
            onChange={(event) => applyFilter({ to: event.target.value })}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Due from</span>
          <Input
            type="date"
            value={searchParams.get("dueFrom") ?? ""}
            onChange={(event) => applyFilter({ dueFrom: event.target.value })}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Due to</span>
          <Input
            type="date"
            value={searchParams.get("dueTo") ?? ""}
            onChange={(event) => applyFilter({ dueTo: event.target.value })}
            className="w-40"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        basePath="/admin/invoices"
        getRowId={(row) => row.id}
        searchPlaceholder="Search invoice #, customer..."
        rowActions={(row) => (
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/admin/invoices/${row.id}`} />}
            >
              View
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDuplicate(row)}>
              Duplicate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingRow(row)}>
              Delete
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={deletingRow !== null}
        onOpenChange={(open) => !open && setDeletingRow(null)}
        title="Delete invoice?"
        description={
          deletingRow
            ? `Invoice ${deletingRow.invoiceNumber} and its payment history will be permanently removed.`
            : undefined
        }
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export { InvoicesTable }
