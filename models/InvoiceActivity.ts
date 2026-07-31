import { Schema, model, models, type Document, type Model, type Types } from "mongoose"

import type { InvoiceActivityType } from "@/types/invoice"

export interface InvoiceActivityDocument extends Document {
  invoiceId: Types.ObjectId
  type: InvoiceActivityType
  message: string
  userId: string | null
  meta: Record<string, unknown> | null
  createdAt: Date
}

const invoiceActivitySchema = new Schema<InvoiceActivityDocument>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    type: {
      type: String,
      enum: [
        "created",
        "updated",
        "duplicated",
        "status_changed",
        "sent",
        "payment_recorded",
        "payment_updated",
        "payment_deleted",
      ],
      required: true,
    },
    message: { type: String, required: true },
    userId: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

invoiceActivitySchema.index({ invoiceId: 1, createdAt: -1 })

export const InvoiceActivity: Model<InvoiceActivityDocument> =
  models.InvoiceActivity ??
  model<InvoiceActivityDocument>("InvoiceActivity", invoiceActivitySchema)
