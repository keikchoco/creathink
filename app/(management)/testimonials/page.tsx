import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { testimonialService } from "@/services/testimonial.service"
import { projectService } from "@/services/project.service"
import { TestimonialsSection } from "@/components/public/testimonials-section"

const MINIMUM_TESTIMONIALS_FOR_PAGE = 6

export const metadata: Metadata = {
  title: "Testimonials",
  description: "What clients say about working with CreaThink.",
  alternates: { canonical: "/testimonials" },
}

export default async function TestimonialsPage() {
  const { items, total } = await testimonialService.list(
    { status: "published" },
    { limit: 100, sort: "order" },
  )

  if (total <= MINIMUM_TESTIMONIALS_FOR_PAGE) {
    notFound()
  }

  const projectsById = new Map<string, { title: string }>()
  try {
    const projects = await projectService.list({ status: "published" }, { limit: 100 })
    for (const project of projects.items) {
      projectsById.set(String(project._id), { title: project.title })
    }
  } catch {
    // Testimonials still render without project links if projects fail to load.
  }

  return (
    <TestimonialsSection
      index="01"
      testimonials={items.map((testimonial) => {
        const project = testimonial.projectId
          ? projectsById.get(String(testimonial.projectId))
          : undefined

          // console.log("project", testimonial)
        return {
          _id: String(testimonial._id),
          clientName: testimonial.clientName,
          position: testimonial.position,
          company: testimonial.company,
          image: testimonial.imageHidden ? "" : testimonial.image,
          review: testimonial.review,
          rating: testimonial.rating,
          projectTitle: project?.title,
        }
      })}
    />
  )
}
