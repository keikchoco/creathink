import type { Metadata } from "next"

import { projectService } from "@/services/project.service"
import { serviceService } from "@/services/service.service"
import { testimonialService } from "@/services/testimonial.service"
import { Hero } from "@/components/public/hero"
import { FeaturedWork } from "@/components/public/featured-work"
import { Section } from "@/components/shared/section"
import { Container } from "@/components/shared/container"
import { Typography } from "@/components/shared/typography"
import { Stack } from "@/components/shared/stack"
import { SectionLabel } from "@/components/shared/section-label"
import { ServicesGrid } from "@/components/public/services-grid"
import { AboutPreview } from "@/components/public/about-preview"
import { ProcessSection } from "@/components/public/process-section"
import { TestimonialsSection } from "@/components/public/testimonials-section"
import { CtaSection } from "@/components/public/cta-section"
import { FadeIn } from "@/components/motion/fade-in"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default async function HomePage() {
  const [projectsResult, servicesResult, testimonialsResult] =
    await Promise.all([
      projectService.list(
        { status: "published" },
        { limit: 12, sort: "order" }
      ),
      serviceService.list({ status: "published" }, { limit: 6, sort: "order" }),
      testimonialService.list(
        { status: "published" },
        { limit: 6, sort: "order" }
      ),
    ])

  const featuredProjects = projectsResult.items.filter(
    (project) => project.featured
  )
  const projectsToShow = (
    featuredProjects.length > 0 ? featuredProjects : projectsResult.items
  ).slice(0, 3)

  return (
    <>
      <Hero />

      <FeaturedWork
        index="01"
        projects={projectsToShow.map((project) => ({
          slug: project.slug,
          title: project.title,
          shortDescription: project.shortDescription,
          coverImage: project.coverImage,
          category: project.category,
          technologies: project.technologies,
          websiteLink: project.websiteLink,
        }))}
      />

      <Section background="muted">
        <Container size="lg">
          <FadeIn>
            <Stack gap="sm" className="mb-10 max-w-xl">
              <SectionLabel index="02">Capabilities</SectionLabel>
              <Typography variant="h2">How we help</Typography>
            </Stack>
          </FadeIn>
          <ServicesGrid
            services={servicesResult.items.map((service) => ({
              _id: String(service._id),
              title: service.title,
              description: service.description,
              icon: service.icon,
              features: service.features,
            }))}
          />
        </Container>
      </Section>

      <AboutPreview index="03" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Typography variant="body-lg">
              Loading process section...
            </Typography>
          </div>
        }
      >
        <ProcessSection index="04" />
        
      </Suspense>

      <TestimonialsSection
        index="05"
        testimonials={testimonialsResult.items.map((testimonial) => ({
          _id: String(testimonial._id),
          clientName: testimonial.clientName,
          position: testimonial.position,
          company: testimonial.company,
          image: testimonial.image,
          review: testimonial.review,
          rating: testimonial.rating,
        }))}
        totalCount={testimonialsResult.total}
        viewAllHref={testimonialsResult.total > 6 ? "/testimonials" : undefined}
      />

      <CtaSection />
    </>
  )
}
