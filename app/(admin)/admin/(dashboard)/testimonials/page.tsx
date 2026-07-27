import { requirePermission } from "@/lib/permissions"
import { testimonialService } from "@/services/testimonial.service"
import { projectService } from "@/services/project.service"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"
import { TestimonialsTable, type TestimonialRow } from "@/components/admin/testimonials-table"
import { NewTestimonialButton } from "@/components/admin/new-testimonial-button"
import { Button } from "@/components/ui/button";

interface AdminTestimonialsPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function AdminTestimonialsPage({ searchParams }: AdminTestimonialsPageProps) {
  try {
    await requirePermission("testimonials", "view")
  } catch {
    return (
      <ErrorState
        title="No permission"
        description="You don't have permission to view testimonials."
      />
    )
  }

  const params = await searchParams
  const page = Number(params.page ?? "1") || 1
  const limit = 20

  let rows: TestimonialRow[] = []
  let total = 0
  let loadFailed = false

  try {
    const result = await testimonialService.list(
      {},
      { page, limit, sort: params.sort, search: params.q },
    )

    rows = result.items.map((item) => ({
      id: String(item._id),
      clientName: item.clientName,
      company: item.company,
      status: item.status,
      order: item.order,
      rating: item.rating,
      createdAt: new Date(item.createdAt).toISOString(),
      defaultValues: {
        clientName: item.clientName,
        position: item.position,
        company: item.company,
        image: item.image ?? "",
        review: item.review,
        rating: item.rating,
        projectId: item.projectId ? String(item.projectId) : null,
        order: item.order,
        userFilled: item.userFilled ?? false,
      },
    }))
    total = result.total
  } catch {
    loadFailed = true
  }

  let projectOptions: { id: string; title: string }[] = []
  try {
    const result = await projectService.list({ status: "published" }, { limit: 100 })
    projectOptions = result.items.map((item) => ({ id: String(item._id), title: item.title }))
  } catch {
    projectOptions = []
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
        <Typography as="h1" variant="h1">
          Testimonials
        </Typography>
        <NewTestimonialButton projectOptions={projectOptions} />
      </div>

      {loadFailed ? (
        <ErrorState
          title="Unable to load testimonials"
          description="The database isn't reachable right now. Check MONGODB_URI in .env.local."
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No testimonials yet" description="Add your first client review." />
      ) : (
        <TestimonialsTable
          rows={rows}
          total={total}
          page={page}
          limit={limit}
          projectOptions={projectOptions}
        />
      )}
    </div>
  )
}
