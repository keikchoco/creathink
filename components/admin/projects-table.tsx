"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  publishProjectAction,
  archiveProjectAction,
  restoreProjectAction,
  deleteProjectAction,
  reorderProjectsAction,
} from "@/actions/projects"
import type { InferredProjectInput } from "@/schemas/project.schema"
import { DataTable, type DataTableColumn } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { FormDialog } from "@/components/admin/form-dialog"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { ProjectForm } from "@/components/admin/project-form"

export interface ProjectRow {
  id: string
  title: string
  slug: string
  category: string
  status: "draft" | "published" | "archived"
  featured: boolean
  order: number
  deletedAt: string | null
  createdAt: string
  defaultValues: InferredProjectInput
}

interface ProjectsTableProps {
  rows: ProjectRow[]
  total: number
  page: number
  limit: number
}

function ProjectsTable({ rows, total, page, limit }: ProjectsTableProps) {
  const router = useRouter()
  const [editingRow, setEditingRow] = React.useState<ProjectRow | null>(null)
  const [deletingRow, setDeletingRow] = React.useState<ProjectRow | null>(null)
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
    const response = await reorderProjectsAction(orderedIds)
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
    const response = await deleteProjectAction(deletingRow.id)
    setIsDeleting(false)
    if (!response.success) {
      toast.error(response.error?.message ?? "Something went wrong")
      return
    }
    toast.success("Project deleted")
    setDeletingRow(null)
    router.refresh()
  }

  const columns: DataTableColumn<ProjectRow>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
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
    { key: "category", label: "Category", render: (row) => row.category },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <span className="capitalize">{row.deletedAt ? "Deleted" : row.status}</span>
      ),
    },
    { key: "featured", label: "Featured", render: (row) => (row.featured ? "Yes" : "—") },
    // { key: "order", label: "Order", render: (row) => row.order },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
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
        basePath="/admin/projects"
        getRowId={(row) => row.id}
        searchPlaceholder="Search projects..."
        onReorder={handleReorder}
        rowActions={(row) =>
          row.deletedAt ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runAction(restoreProjectAction, row.id, "Project restored")}
            >
              Restore
            </Button>
          ) : (
            <>
              {row.status !== "published" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runAction(publishProjectAction, row.id, "Project published")}
                >
                  Publish
                </Button>
              )}
              {row.status !== "archived" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runAction(archiveProjectAction, row.id, "Project archived")}
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
          )
        }
      />

      <FormDialog
        open={editingRow !== null}
        onOpenChange={(open) => !open && setEditingRow(null)}
        title="Edit project"
      >
        {editingRow && (
          <ProjectForm
            projectId={editingRow.id}
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
        title="Delete project?"
        description={
          deletingRow
            ? `"${deletingRow.title}" will be moved to trash. You can restore it later.`
            : undefined
        }
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export { ProjectsTable }
