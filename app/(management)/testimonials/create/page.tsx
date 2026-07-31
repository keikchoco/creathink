import type { Metadata } from "next"

import { testimonialService } from "@/services/testimonial.service"
import { projectService } from "@/services/project.service"
import { ClientTestimonialForm } from "@/components/public/client-testimonial-form"
import { ErrorState } from "@/components/shared/error-state"
import { Typography } from "@/components/shared/typography"

export const metadata: Metadata = {
  title: "Share Your Testimonial",
  description: "Tell us about your experience working with CreaThink.",
  robots: { index: false, follow: false },
}

interface TestimonialCreatePageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function TestimonialCreatePage({ searchParams }: TestimonialCreatePageProps) {
  const { token } = await searchParams

  const testimonial = token ? await testimonialService.getPendingByToken(token) : null

  if (!testimonial) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-24">
        <ErrorState
          title="This link is invalid or has already been used"
          description="If you believe this is a mistake, please reach out to us so we can send you a new testimonial link."
        />
      </div>
    )
  }

  let projectTitle: string | undefined
  if (testimonial.projectId) {
    try {
      const project = await projectService.getById(String(testimonial.projectId))
      projectTitle = project.title
    } catch {
      projectTitle = undefined
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-24">
      <div className="mb-8 flex flex-col gap-2">
        <Typography as="h1" variant="h1">
          Share your experience
        </Typography>
        <p className="text-muted-foreground">
          We&apos;d love to hear about your experience working with us. Your testimonial helps
          others understand what it&apos;s like to partner with CreaThink.
        </p>
      </div>
      <ClientTestimonialForm token={token as string} projectTitle={projectTitle} />
    </div>
  )
}
