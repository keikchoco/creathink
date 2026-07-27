import { z } from "zod"

import { objectIdSchema } from "@/schemas/common.schema"

export const testimonialSchema = z.object({
  clientName: z.string().min(0, "Client name is required").max(200),
  position: z.string().min(0, "Position is required"),
  company: z.string().min(0, "Company is required"),
  image: z.string().optional().default(""),
  review: z.string().min(0, "Review is required"),
  rating: z.coerce.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5").default(5),
  projectId: objectIdSchema.nullable().optional(),
  order: z.coerce.number().int().default(0),
  userFilled: z.boolean().optional().default(false),
})

export type InferredTestimonialInput = z.infer<typeof testimonialSchema>
