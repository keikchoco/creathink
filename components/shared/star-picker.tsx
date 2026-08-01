"use client"

import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StarPickerProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

function StarPicker({ id, label, value, onChange }: StarPickerProps) {
  return (
    <div className="flex items-center gap-1" id={id}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${label} ${star} out of 5 stars`}
          aria-pressed={value >= star}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <StarIcon
            className={cn(
              "size-5 transition-colors",
              value >= star
                ? "fill-primary text-primary"
                : "fill-none text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  )
}

export { StarPicker }
