import { z } from "zod"

import { emailSchema } from "@/schemas/common.schema"

export const invoiceItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(200),
  description: z.string().max(1000).optional().default(""),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
})

export const invoiceSchema = z
  .object({
    customer: z.object({
      name: z.string().max(200).optional().default(""),
      email: z
        .string()
        .max(254)
        .optional()
        .default("")
        .refine(
          (value) => value === "" || emailSchema.safeParse(value).success,
          "Invalid email address"
        ),
      company: z.string().max(200).optional().default(""),
      billingAddress: z.string().max(1000).optional().default(""),
    }),
    items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required"),
    currency: z.enum(["PHP", "USD"]),
    discountType: z.enum(["fixed", "percentage"]).nullable().default(null),
    discountValue: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    dueDate: z.string().optional().default(""),
    notes: z.string().max(2000).optional().default(""),
  })
  .superRefine((data, context) => {
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )

    if (data.discountType === "percentage" && data.discountValue > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Percentage discount cannot exceed 100%",
      })
    }

    if (data.discountType === "fixed" && data.discountValue > subtotal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Discount cannot exceed the subtotal",
      })
    }

    if (data.dueDate) {
      const due = new Date(data.dueDate)
      if (Number.isNaN(due.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueDate"],
          message: "Invalid due date",
        })
      }
    }
  })

export type InferredInvoiceInput = z.infer<typeof invoiceSchema>
export type InferredInvoiceItemInput = z.infer<typeof invoiceItemSchema>

export const invoicePaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method: z.enum(["bank_transfer", "gcash", "paypal", "cash", "credit_card", "other"]),
  reference: z.string().max(200).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
})

export type InferredInvoicePaymentInput = z.infer<typeof invoicePaymentSchema>
