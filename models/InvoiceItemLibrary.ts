import { Schema, model, models, type Document, type Model } from "mongoose"

import type { InvoiceCurrency } from "@/types/invoice"

export interface InvoiceItemLibraryDocument extends Document {
  name: string
  description?: string
  unitPrice: number
  currency: InvoiceCurrency
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

const invoiceItemLibrarySchema = new Schema<InvoiceItemLibraryDocument>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["PHP", "USD"], required: true },
    usageCount: { type: Number, default: 1 },
  },
  { timestamps: true },
)

invoiceItemLibrarySchema.index({ name: 1, unitPrice: 1, currency: 1 }, { unique: true })

export const InvoiceItemLibrary: Model<InvoiceItemLibraryDocument> =
  models.InvoiceItemLibrary ??
  model<InvoiceItemLibraryDocument>("InvoiceItemLibrary", invoiceItemLibrarySchema)
