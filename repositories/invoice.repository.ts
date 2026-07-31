import "server-only"

import { connectToDatabase } from "@/lib/database"
import { Invoice, type InvoiceDocument } from "@/models/Invoice"
import { Counter } from "@/models/Counter"
import type { InvoiceStatus } from "@/types/invoice"
import type { PaginatedResult } from "@/types/api"

export interface InvoiceFilter {
  status?: InvoiceStatus
  customerEmail?: string
  invoiceNumber?: string
  createdFrom?: Date
  createdTo?: Date
  dueFrom?: Date
  dueTo?: Date
  search?: string
}

export interface InvoiceListOptions {
  page?: number
  limit?: number
  sort?: string
}

async function findAll(
  filter: InvoiceFilter,
  { page = 1, limit = 20, sort = "-createdAt" }: InvoiceListOptions = {},
): Promise<PaginatedResult<InvoiceDocument>> {
  await connectToDatabase()

  const query: Record<string, unknown> = {}

  if (filter.status === "overdue") {
    query.status = { $in: ["sent", "partially_paid"] }
    query.dueDate = { $ne: null, $lt: new Date() }
  } else if (filter.status) {
    query.status = filter.status
  }

  if (filter.customerEmail) {
    query["customer.email"] = { $regex: filter.customerEmail, $options: "i" }
  }
  if (filter.invoiceNumber) {
    query.invoiceNumber = { $regex: filter.invoiceNumber, $options: "i" }
  }
  if (filter.createdFrom || filter.createdTo) {
    query.createdAt = {
      ...(filter.createdFrom ? { $gte: filter.createdFrom } : {}),
      ...(filter.createdTo ? { $lte: filter.createdTo } : {}),
    }
  }
  if (filter.dueFrom || filter.dueTo) {
    query.dueDate = {
      ...(filter.dueFrom ? { $gte: filter.dueFrom } : {}),
      ...(filter.dueTo ? { $lte: filter.dueTo } : {}),
    }
  }
  if (filter.search) {
    query.$or = [
      { invoiceNumber: { $regex: filter.search, $options: "i" } },
      { "customer.name": { $regex: filter.search, $options: "i" } },
      { "customer.email": { $regex: filter.search, $options: "i" } },
    ]
  }

  const [items, total] = await Promise.all([
    Invoice.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(query),
  ])

  return { items: items as unknown as InvoiceDocument[], total, page, limit }
}

async function findById(id: string): Promise<InvoiceDocument | null> {
  await connectToDatabase()
  return Invoice.findById(id)
}

async function findByPublicId(publicId: string): Promise<InvoiceDocument | null> {
  await connectToDatabase()
  return Invoice.findOne({ publicId })
}

async function create(data: Partial<InvoiceDocument>): Promise<InvoiceDocument> {
  await connectToDatabase()
  return Invoice.create(data)
}

async function update(
  id: string,
  data: Partial<InvoiceDocument> | Record<string, unknown>,
): Promise<InvoiceDocument | null> {
  await connectToDatabase()
  return Invoice.findByIdAndUpdate(id, data, { new: true })
}

async function hardDelete(id: string): Promise<void> {
  await connectToDatabase()
  await Invoice.findByIdAndDelete(id)
}

async function nextInvoiceNumber(): Promise<string> {
  await connectToDatabase()

  const now = new Date()
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("")

  const counter = await Counter.findOneAndUpdate(
    { _id: `invoice-${datePart}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )

  return `INV-${datePart}-${String(counter.seq).padStart(4, "0")}`
}

interface InvoiceStats {
  totalRevenue: number
  outstandingRevenue: number
  paidCount: number
  overdueCount: number
  draftCount: number
  invoicesThisMonth: number
  revenueThisMonth: number
  averageInvoiceValue: number
}

async function stats(): Promise<Record<string, InvoiceStats>> {
  await connectToDatabase()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const results = await Invoice.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    {
      $group: {
        _id: "$currency",
        totalRevenue: { $sum: "$totalPaid" },
        outstandingRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$status", "draft"] },
              0,
              { $subtract: ["$total", "$totalPaid"] },
            ],
          },
        },
        paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["sent", "partially_paid"]] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        draftCount: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
        invoicesThisMonth: {
          $sum: { $cond: [{ $gte: ["$createdAt", monthStart] }, 1, 0] },
        },
        revenueThisMonth: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", monthStart] }, "$totalPaid", 0],
          },
        },
        invoiceCount: { $sum: 1 },
        invoiceValueTotal: { $sum: "$total" },
      },
    },
  ])

  const byCurrency: Record<string, InvoiceStats> = {}
  for (const row of results) {
    byCurrency[row._id as string] = {
      totalRevenue: row.totalRevenue,
      outstandingRevenue: Math.max(0, row.outstandingRevenue),
      paidCount: row.paidCount,
      overdueCount: row.overdueCount,
      draftCount: row.draftCount,
      invoicesThisMonth: row.invoicesThisMonth,
      revenueThisMonth: row.revenueThisMonth,
      averageInvoiceValue:
        row.invoiceCount > 0 ? row.invoiceValueTotal / row.invoiceCount : 0,
    }
  }

  return byCurrency
}

export const invoiceRepository = {
  findAll,
  findById,
  findByPublicId,
  create,
  update,
  hardDelete,
  nextInvoiceNumber,
  stats,
}

export type { InvoiceStats }
