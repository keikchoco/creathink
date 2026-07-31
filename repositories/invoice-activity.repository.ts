import "server-only"
import { Types } from "mongoose"

import { connectToDatabase } from "@/lib/database"
import {
  InvoiceActivity,
  type InvoiceActivityDocument,
} from "@/models/InvoiceActivity"
import type { InvoiceActivityType } from "@/types/invoice"

async function log(entry: {
  invoiceId: string
  type: InvoiceActivityType
  message: string
  userId?: string | null
  meta?: Record<string, unknown> | null
}): Promise<void> {
  await connectToDatabase()
  await InvoiceActivity.create({
    invoiceId: new Types.ObjectId(entry.invoiceId),
    type: entry.type,
    message: entry.message,
    userId: entry.userId ?? null,
    meta: entry.meta ?? null,
  })
}

async function findByInvoice(
  invoiceId: string,
  limit = 100,
): Promise<InvoiceActivityDocument[]> {
  await connectToDatabase()
  const items = await InvoiceActivity.find({ invoiceId: new Types.ObjectId(invoiceId) })
    .sort("-createdAt")
    .limit(limit)
    .lean()
  return items as unknown as InvoiceActivityDocument[]
}

export const invoiceActivityRepository = { log, findByInvoice }
