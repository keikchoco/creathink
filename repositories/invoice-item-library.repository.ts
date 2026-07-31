import "server-only"

import { connectToDatabase } from "@/lib/database"
import {
  InvoiceItemLibrary,
  type InvoiceItemLibraryDocument,
} from "@/models/InvoiceItemLibrary"
import type { InvoiceCurrency } from "@/types/invoice"

async function search(
  query: string,
  currency: InvoiceCurrency,
  limit = 20,
): Promise<InvoiceItemLibraryDocument[]> {
  await connectToDatabase()

  const filter: Record<string, unknown> = { currency }
  if (query) {
    filter.name = { $regex: query, $options: "i" }
  }

  const items = await InvoiceItemLibrary.find(filter)
    .sort("-usageCount name")
    .limit(limit)
    .lean()

  return items as unknown as InvoiceItemLibraryDocument[]
}

/**
 * Append-only upsert: an exact (name, unitPrice, currency) match bumps its
 * usage counter; anything else becomes a brand-new library entry. Existing
 * entries are never modified in place.
 */
async function recordUsage(item: {
  name: string
  description?: string
  unitPrice: number
  currency: InvoiceCurrency
}): Promise<void> {
  await connectToDatabase()

  await InvoiceItemLibrary.findOneAndUpdate(
    { name: item.name, unitPrice: item.unitPrice, currency: item.currency },
    {
      $inc: { usageCount: 1 },
      $setOnInsert: {
        name: item.name,
        description: item.description ?? "",
        unitPrice: item.unitPrice,
        currency: item.currency,
      },
    },
    { upsert: true },
  )
}

export const invoiceItemLibraryRepository = { search, recordUsage }
