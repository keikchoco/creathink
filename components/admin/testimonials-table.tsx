"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LinkIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import {
  publishTestimonialAction,
  archiveTestimonialAction,
  deleteTestimonialAction,
  reorderTestimonialsAction,
  setTestimonialImageHiddenAction,
} from "@/actions/testimonials"
import type { InferredTestimonialInput } from "@/schemas/testimonial.schema"
import { DataTable, type DataTableColumn } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { FormDialog } from "@/components/admin/form-dialog"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TestimonialForm } from "@/components/admin/testimonial-form"
import { StarRating } from "@/components/shared/star-rating"
import { TestimonialAvatar } from "@/components/shared/testimonial-avatar"

export interface TestimonialRow {
  id: string
  clientName: string
  company: string
  status: "draft" | "published" | "archived"
  order: number
  rating: number
  ratings: {
    quality: number
    communication: number
    valueForMoney: number
  } | null
  createdAt: string
  image: string
  imageHidden: boolean
  linkToken: string | null
  linkStatus: "pending" | "submitted" | null
  submittedAt: string | null
  defaultValues: InferredTestimonialInput
}

interface TestimonialsTableProps {
  rows: TestimonialRow[]
  total: number
  page: number
  limit: number
  projectOptions: { id: string; title: string }[]
}

function TestimonialsTable({
  rows,
  total,
  page,
  limit,
  projectOptions,
}: TestimonialsTableProps) {
  const router = useRouter()
  const [editingRow, setEditingRow] = React.useState<TestimonialRow | null>(
    null
  )
  const [viewingRow, setViewingRow] = React.useState<TestimonialRow | null>(
    null
  )
  const [deletingRow, setDeletingRow] = React.useState<TestimonialRow | null>(
    null
  )
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function runAction(
    action: (
      id: string
    ) => Promise<{ success: boolean; error?: { message: string } }>,
    id: string,
    successMessage: string
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
    const response = await reorderTestimonialsAction(orderedIds)
    if (!response.success) {
      toast.error(response.error.message)
      router.refresh()
      return
    }
    toast.success("Order updated")
    router.refresh()
  }

  async function handleCopyLink(row: TestimonialRow) {
    if (!row.linkToken) return
    const link = `${window.location.origin}/testimonials/create?token=${row.linkToken}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Testimonial link copied to clipboard")
    } catch {
      toast.error("Unable to copy the link. Please try again.")
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingRow) return
    setIsDeleting(true)
    const response = await deleteTestimonialAction(deletingRow.id)
    setIsDeleting(false)
    if (!response.success) {
      toast.error(response.error?.message ?? "Something went wrong")
      return
    }
    toast.success("Testimonial deleted")
    setDeletingRow(null)
    router.refresh()
  }

  const columns: DataTableColumn<TestimonialRow>[] = [
    {
      key: "project",
      label: "Project",
      render: (row) => {
        const project = projectOptions.find(
          (project) => project.id === row.defaultValues.projectId
        )
        return project ? project.title : "—"
      },
    },
    {
      key: "clientName",
      label: "Client",
      render: (row) => (
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => setEditingRow(row)}
        >
          {row.clientName || (
            <span className="text-muted-foreground italic">
              Awaiting client
            </span>
          )}
        </button>
      ),
    },
    { key: "company", label: "Company", render: (row) => row.company },
    {
      key: "rating",
      label: "Rating",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <StarRating rating={row.rating} variant="value" />
          {row.ratings && (
            <span className="text-xs text-muted-foreground">
              Quality {row.ratings.quality} · Comm. {row.ratings.communication}{" "}
              · Value {row.ratings.valueForMoney}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <span className="capitalize">{row.status}</span>,
    },
    // { key: "order", label: "Order", render: (row) => row.order },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        basePath="/admin/testimonials"
        getRowId={(row) => row.id}
        searchPlaceholder="Search testimonials..."
        onReorder={handleReorder}
        rowActions={(row) => (
          <>
            {row.status !== "published" &&
              row.linkStatus !== "pending" &&
              (row.linkStatus === "submitted" || row.status === "archived") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingRow(row)}
                >
                  View
                </Button>
              )}
            {row.image && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runAction(
                    (id) =>
                      setTestimonialImageHiddenAction(id, !row.imageHidden),
                    row.id,
                    row.imageHidden
                      ? "Photo is now visible"
                      : "Photo is now hidden"
                  )
                }
              >
                {row.imageHidden ? <EyeIcon /> : <EyeOffIcon />}
                {row.imageHidden ? "Show photo" : "Hide photo"}
              </Button>
            )}
            {row.linkStatus === "pending" && row.linkToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(row)}
              >
                <LinkIcon />
                Copy link
              </Button>
            )}
            {row.status !== "published" && row.linkStatus !== "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runAction(
                    publishTestimonialAction,
                    row.id,
                    "Testimonial published"
                  )
                }
              >
                Publish
              </Button>
            )}
            {row.status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runAction(
                    archiveTestimonialAction,
                    row.id,
                    "Testimonial archived"
                  )
                }
              >
                Archive
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRow(row)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingRow(row)}
            >
              Delete
            </Button>
          </>
        )}
      />

      <FormDialog
        open={viewingRow !== null}
        onOpenChange={(open) => !open && setViewingRow(null)}
        title="Testimonial details"
      >
        {viewingRow && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <TestimonialAvatar
                image={viewingRow.imageHidden ? "" : viewingRow.image}
                name={viewingRow.defaultValues.clientName}
                size={56}
              />
              <div className="flex flex-col">
                <span className="font-medium">
                  {viewingRow.defaultValues.clientName || "—"}
                </span>
                {(viewingRow.defaultValues.position ||
                  viewingRow.defaultValues.company) && (
                  <span className="text-sm text-muted-foreground">
                    {[
                      viewingRow.defaultValues.position,
                      viewingRow.defaultValues.company,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {viewingRow.image && viewingRow.imageHidden && (
                  <span className="text-xs text-muted-foreground italic">
                    Photo hidden from public display
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Rating</span>
              <StarRating rating={viewingRow.rating} showValue />
              {viewingRow.ratings && (
                <span className="text-xs text-muted-foreground">
                  Quality {viewingRow.ratings.quality} · Communication{" "}
                  {viewingRow.ratings.communication} · Value for money{" "}
                  {viewingRow.ratings.valueForMoney}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Review</span>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {viewingRow.defaultValues.review || "—"}
              </p>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Related project
                </span>
                <span>
                  {projectOptions.find(
                    (project) =>
                      project.id === viewingRow.defaultValues.projectId
                  )?.title ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className="capitalize">{viewingRow.status}</span>
              </div>
              {viewingRow.submittedAt && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Submitted by client
                  </span>
                  <span>
                    {new Date(viewingRow.submittedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t pt-4">
              {viewingRow.status !== "published" && (
                <Button
                  onClick={async () => {
                    await runAction(
                      publishTestimonialAction,
                      viewingRow.id,
                      "Testimonial published"
                    )
                    setViewingRow(null)
                  }}
                >
                  Publish
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRow(viewingRow)
                  setViewingRow(null)
                }}
              >
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setViewingRow(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={editingRow !== null}
        onOpenChange={(open) => !open && setEditingRow(null)}
        title="Edit testimonial"
      >
        {editingRow && (
          <TestimonialForm
            testimonialId={editingRow.id}
            defaultValues={editingRow.defaultValues}
            projectOptions={projectOptions}
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
        title="Delete testimonial?"
        description={
          deletingRow
            ? `Review from "${deletingRow.clientName}" will be removed.`
            : undefined
        }
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export { TestimonialsTable }
