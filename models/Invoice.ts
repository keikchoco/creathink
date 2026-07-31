import { Schema, model, models, type Document, type Model, type Types } from "mongoose"

import type {
  DiscountType,
  InvoiceCurrency,
  InvoiceStatus,
  PaymentMethod,
} from "@/types/invoice"

export interface InvoiceLineItem {
  _id?: Types.ObjectId
  name: string
  description?: string
  quantity: number
  unitPrice: number
}

export interface InvoicePayment {
  _id?: Types.ObjectId
  amount: number
  paymentDate: Date
  method: PaymentMethod
  reference?: string
  notes?: string
  recordedBy: string
  createdAt: Date
}

export interface InvoiceCustomer {
  name: string
  email: string
  company?: string
  billingAddress?: string
}

export interface InvoiceDocument extends Document {
  invoiceNumber: string
  publicId: string
  customer: InvoiceCustomer
  items: InvoiceLineItem[]
  currency: InvoiceCurrency
  discountType: DiscountType | null
  discountValue: number
  subtotal: number
  discountAmount: number
  total: number
  payments: InvoicePayment[]
  totalPaid: number
  status: InvoiceStatus
  dueDate: Date | null
  paidAt: Date | null
  sentAt: Date | null
  lastSentAt: Date | null
  sentCount: number
  notes?: string
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

const lineItemSchema = new Schema<InvoiceLineItem>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: true },
)

const paymentSchema = new Schema<InvoicePayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    method: {
      type: String,
      enum: ["bank_transfer", "gcash", "paypal", "cash", "credit_card", "other"],
      required: true,
    },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    publicId: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      company: { type: String, default: "" },
      billingAddress: { type: String, default: "" },
    },
    items: { type: [lineItemSchema], required: true },
    currency: { type: String, enum: ["PHP", "USD"], required: true },
    discountType: { type: String, enum: ["fixed", "percentage", null], default: null },
    discountValue: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    payments: { type: [paymentSchema], default: [] },
    totalPaid: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "partially_paid", "overdue", "cancelled"],
      required: true,
      default: "draft",
    },
    dueDate: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
    sentCount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
)

invoiceSchema.index({ status: 1 })
invoiceSchema.index({ createdAt: -1 })
invoiceSchema.index({ dueDate: 1 })
invoiceSchema.index({ "customer.email": 1 })

export const Invoice: Model<InvoiceDocument> =
  models.Invoice ?? model<InvoiceDocument>("Invoice", invoiceSchema)
