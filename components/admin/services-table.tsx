"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  publishServiceAction,
  archiveServiceAction,
  deleteServiceAction,
  reorderServicesAction,
} from "@/actions/services"
import type { InferredServiceInput } from "@/schemas/service.schema"
import { DataTable, type DataTableColumn } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { FormDialog } from "@/components/admin/form-dialog"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { ServiceForm } from "@/components/admin/service-form"

export interface ServiceRow {
  id: string
  title: string
  status: "draft" | "published" | "archived"
  order: number
  createdAt: string
  defaultValues: InferredServiceInput
}

interface ServicesTableProps {
  rows: ServiceRow[]
  total: number
  page: number
  limit: number
}

function ServicesTable({ rows, total, page, limit }: ServicesTableProps) {
  const router = useRouter()
  const [editingRow, setEditingRow] = React.useState<ServiceRow | null>(null)
  const [deletingRow, setDeletingRow] = React.useState<ServiceRow | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function runAction(
    action: (id: string) => Promise<{ success: boolean; error?: { message: string } }>,
    id: string,
    successMessage: string,
  ) {
    const response = await action(id)
    if (!response.success) {
      toast.error(response.error?.message ?? "Something went wrong")
      return
    }
    toast.success(successMessage)
    router.refresh()
  }

  async function handleReorder(orderedIds: string[]) {
    const response = await reorderServicesAction(orderedIds)
    if (!response.success) {
      toast.error(response.error.message)
      router.refresh()
      return
    }
    toast.success("Order updated")
    router.refresh()
  }

  async function handleDeleteConfirm() {
    if (!deletingRow) return
    setIsDeleting(true)
    const response = await deleteServiceAction(deletingRow.id)
    setIsDeleting(false)
    if (!response.success) {
      toast.error(response.error?.message ?? "Something went wrong")
      return
    }
    toast.success("Service deleted")
    setDeletingRow(null)
    router.refresh()
  }

  const columns: DataTableColumn<ServiceRow>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => setEditingRow(row)}
        >
          {row.title}
        </button>
      ),
    },
    { key: "status", label: "Status", render: (row) => <span className="capitalize">{row.status}</span> },
    { key: "order", label: "Order", render: (row) => row.order },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        basePath="/admin/services"
        getRowId={(row) => row.id}
        searchPlaceholder="Search services..."
        onReorder={handleReorder}
        rowActions={(row) => (
          <>
            {row.status !== "published" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction(publishServiceAction, row.id, "Service published")}
              >
                Publish
              </Button>
            )}
            {row.status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction(archiveServiceAction, row.id, "Service archived")}
              >
                Archive
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditingRow(row)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingRow(row)}>
              Delete
            </Button>
          </>
        )}
      />

      <FormDialog
        open={editingRow !== null}
        onOpenChange={(open) => !open && setEditingRow(null)}
        title="Edit service"
      >
        {editingRow && (
          <ServiceForm
            serviceId={editingRow.id}
            defaultValues={editingRow.defaultValues}
            onSuccess={() => {
              setEditingRow(null)
              router.refresh()
            }}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={deletingRow !== null}
        onOpenChange={(open) => !open && setDeletingRow(null)}
        title="Delete service?"
        description={deletingRow ? `"${deletingRow.title}" will be removed.` : undefined}
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export { ServicesTable }
