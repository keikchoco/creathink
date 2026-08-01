import "server-only"

import { connectToDatabase } from "@/lib/database"
import { PaymentSettings, type PaymentMethodEntry, type PaymentSettingsDocument } from "@/models/PaymentSettings"

const SINGLETON_QUERY = {}

async function get(): Promise<PaymentSettingsDocument | null> {
  await connectToDatabase()
  return PaymentSettings.findOne(SINGLETON_QUERY)
}

async function upsert(
  methods: PaymentMethodEntry[],
  updatedBy: string,
): Promise<PaymentSettingsDocument> {
  await connectToDatabase()
  return PaymentSettings.findOneAndUpdate(
    SINGLETON_QUERY,
    { methods, updatedBy },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
}

export const paymentSettingsRepository = { get, upsert }
