import { Schema, model, models, type Document, type Model, type Types } from "mongoose"

import type { PaymentMethod } from "@/types/invoice"

export interface PaymentMethodEntry {
  _id?: Types.ObjectId
  method: PaymentMethod
  label: string
  details: string
  enabled: boolean
  order: number
}

export interface PaymentSettingsDocument extends Document {
  methods: PaymentMethodEntry[]
  updatedBy: string
  updatedAt: Date
}

const paymentMethodEntrySchema = new Schema<PaymentMethodEntry>(
  {
    method: {
      type: String,
      enum: ["bank_transfer", "gcash", "paypal", "cash", "credit_card", "other"],
      required: true,
    },
    label: { type: String, required: true },
    details: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true },
)

const paymentSettingsSchema = new Schema<PaymentSettingsDocument>(
  {
    methods: { type: [paymentMethodEntrySchema], default: [] },
    updatedBy: { type: String, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
)

export const PaymentSettings: Model<PaymentSettingsDocument> =
  models.PaymentSettings ??
  model<PaymentSettingsDocument>("PaymentSettings", paymentSettingsSchema)
