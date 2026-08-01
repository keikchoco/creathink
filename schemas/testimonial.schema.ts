import { z } from "zod"

import { objectIdSchema } from "@/schemas/common.schema"

export const testimonialSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(200),
  position: z.string().max(200).optional().default(""),
  company: z.string().max(200).optional().default(""),
  image: z.string().optional().default(""),
  review: z.string().min(1, "Review is required").max(120, "Review must be 120 characters or less"),
  ratingQuality: z.coerce.number().int().min(1, "Rate the quality").max(5).default(5),
  ratingCommunication: z.coerce.number().int().min(1, "Rate the communication").max(5).default(5),
  ratingValueForMoney: z.coerce.number().int().min(1, "Rate the value for money").max(5).default(5),
  projectId: objectIdSchema.nullable().optional(),
  order: z.coerce.number().int().default(0),
})

export type InferredTestimonialInput = z.infer<typeof testimonialSchema>

export const clientTestimonialSchema = z.object({
  clientName: z.string().min(1, "Your name is required").max(200),
  position: z.string().max(200).optional().default(""),
  company: z.string().max(200).optional().default(""),
  review: z.string().min(1, "Please write your review").max(120, "Review must be 120 characters or less"),
  ratingQuality: z.coerce
    .number()
    .int()
    .min(1, "Please rate the quality of the service")
    .max(5),
  ratingCommunication: z.coerce
    .number()
    .int()
    .min(1, "Please rate the communication")
    .max(5),
  ratingValueForMoney: z.coerce
    .number()
    .int()
    .min(1, "Please rate the value for money")
    .max(5),
  website: z.string().optional(),
})

export type ClientTestimonialInput = z.infer<typeof clientTestimonialSchema>
