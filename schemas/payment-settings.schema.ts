import { z } from "zod"

export const paymentMethodEntrySchema = z.object({
  method: z.enum(["bank_transfer", "gcash", "paypal", "cash", "credit_card", "other"]),
  label: z.string().min(1, "Label is required").max(100),
  details: z.string().min(1, "Details are required").max(500),
  enabled: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
})

export const paymentSettingsSchema = z.object({
  methods: z.array(paymentMethodEntrySchema).max(20, "Too many payment methods"),
})

export type InferredPaymentMethodEntry = z.infer<typeof paymentMethodEntrySchema>
export type InferredPaymentSettingsInput = z.infer<typeof paymentSettingsSchema>
