import Link from "next/link"
import { QuoteIcon, ArrowUpRightIcon } from "lucide-react"

import type { Testimonial } from "@/types/testimonial"
import { Section } from "@/components/shared/section"
import { Container } from "@/components/shared/container"
import { Typography } from "@/components/shared/typography"
import { Stack } from "@/components/shared/stack"
import { SectionLabel } from "@/components/shared/section-label"
import { EmptyState } from "@/components/shared/empty-state"
import { StarRating } from "@/components/shared/star-rating"
import { TestimonialAvatar } from "@/components/shared/testimonial-avatar"
import { TestimonialSpotlightCard } from "@/components/public/testimonial-spotlight-card"
import { FadeIn } from "@/components/motion/fade-in"
import { SlideUp } from "@/components/motion/slide-up"

type TestimonialItem = Pick<
  Testimonial,
  "_id" | "clientName" | "position" | "company" | "image" | "review" | "rating"
> & {
  projectTitle?: string
}

interface TestimonialsSectionProps {
  testimonials: TestimonialItem[]
  index?: string
  totalCount?: number
  viewAllHref?: string
}

function TestimonialsSection({ testimonials, index, totalCount, viewAllHref }: TestimonialsSectionProps) {
  const spotlightTestimonials = testimonials.slice(0, 3)
  const remainingTestimonials = testimonials.slice(3)
  const hasMore = viewAllHref !== undefined && (totalCount ?? testimonials.length) > testimonials.length

  return (
    <Section>
      <Container size="lg">
        <FadeIn>
          <Stack gap="sm" className="mb-10 max-w-xl">
            <SectionLabel index={index}>Testimonials</SectionLabel>
            <Typography variant="h2">What clients say</Typography>
          </Stack>
        </FadeIn>

        {testimonials.length === 0 ? (
          <EmptyState
            title="No testimonials yet"
            description="Client reviews will appear here once published."
          />
        ) : (
          <>
            {spotlightTestimonials.length > 0 && (
              <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {spotlightTestimonials.map((testimonial, i) => (
                  <SlideUp key={testimonial._id} delay={i * 0.08}>
                    <TestimonialSpotlightCard testimonial={testimonial} />
                  </SlideUp>
                ))}
              </div>
            )}

            {remainingTestimonials.length > 0 && (
              <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
                {remainingTestimonials.map((testimonial, i) => (
                  <SlideUp key={testimonial._id} delay={i * 0.08}>
                    <div className="flex h-full flex-col gap-6 border-t border-border pt-6">
                      <div className="flex items-center justify-between">
                        <QuoteIcon className="size-6 text-primary" />
                        <StarRating rating={testimonial.rating} variant="value" />
                      </div>
                      <p className="text-lg leading-relaxed text-foreground">
                        {testimonial.review}
                      </p>
                      <div className="mt-auto flex items-center gap-3">
                        <TestimonialAvatar image={testimonial.image} name={testimonial.clientName} size={40} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {testimonial.clientName}
                          </p>
                          {(testimonial.position || testimonial.company) && (
                            <p className="text-xs text-muted-foreground">
                              {[testimonial.position, testimonial.company]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                          {testimonial.projectTitle && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {testimonial.projectTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </SlideUp>
                ))}
              </div>
            )}

            {hasMore && (
              <FadeIn className="mt-10 flex justify-center">
                <Link
                  href={viewAllHref}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  View all testimonials
                  <ArrowUpRightIcon className="size-3.5" />
                </Link>
              </FadeIn>
            )}
          </>
        )}
      </Container>
    </Section>
  )
}

export { TestimonialsSection }
