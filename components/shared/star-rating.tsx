import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  max?: number
  variant?: "stars" | "value"
  showValue?: boolean
  className?: string
  starClassName?: string
}

function StarRating({
  rating,
  max = 5,
  variant = "stars",
  showValue = false,
  className,
  starClassName,
}: StarRatingProps) {
  const rounded = Math.round(rating * 10) / 10

  if (variant === "value") {
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        role="img"
        aria-label={`Rated ${rounded} out of ${max} stars`}
      >
        <StarIcon className={cn("size-4 fill-primary text-primary", starClassName)} />
        <span className="text-sm font-medium text-foreground">{rounded.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="img"
      aria-label={`Rated ${rounded} out of ${max} stars`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, index) => {
          const fill = Math.min(Math.max(rounded - index, 0), 1)

          return (
            <span key={index} className="relative inline-flex">
              <StarIcon
                className={cn("size-4 fill-none text-muted-foreground/30", starClassName)}
              />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <StarIcon
                    className={cn("size-4 fill-primary text-primary", starClassName)}
                  />
                </span>
              )}
            </span>
          )
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-foreground">{rounded.toFixed(1)}</span>
      )}
    </div>
  )
}

export { StarRating }
