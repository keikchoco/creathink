import type { Testimonial } from "@/types/testimonial"
import { StarRating } from "@/components/shared/star-rating"
import { TestimonialAvatar } from "@/components/shared/testimonial-avatar"

interface TestimonialSpotlightCardProps {
  testimonial: Pick<Testimonial, "_id" | "clientName" | "position" | "company" | "image" | "review" | "rating">
}

function TestimonialSpotlightCard({ testimonial }: TestimonialSpotlightCardProps) {
  return (
    <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-sm">
      <TestimonialAvatar
        image={testimonial.image}
        name={testimonial.clientName}
        size={64}
        className="ring-1 ring-border"
      />
      <div>
        <p className="text-base font-semibold text-foreground">{testimonial.clientName}</p>
        {(testimonial.position || testimonial.company) && (
          <p className="text-xs text-muted-foreground">
            {[testimonial.position, testimonial.company].filter(Boolean).join(", ")}
          </p>
        )}
      </div>
      <StarRating rating={testimonial.rating} showValue />
      <p className="text-sm leading-relaxed text-muted-foreground">&quot;{testimonial.review}&quot;</p>
    </div>
  )
}

export { TestimonialSpotlightCard }
