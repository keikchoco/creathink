import "server-only"

import { paymentSettingsRepository } from "@/repositories/payment-settings.repository"
import type { PaymentMethodEntry } from "@/models/PaymentSettings"
import type { InferredPaymentSettingsInput } from "@/schemas/payment-settings.schema"

function toPlainEntry(entry: PaymentMethodEntry): PaymentMethodEntry {
  return {
    _id: entry._id,
    method: entry.method,
    label: entry.label,
    details: entry.details,
    enabled: entry.enabled,
    order: entry.order,
  }
}

async function list(): Promise<PaymentMethodEntry[]> {
  const settings = await paymentSettingsRepository.get()
  if (!settings) return []
  return settings.methods.map(toPlainEntry).sort((a, b) => a.order - b.order)
}

async function listEnabled(): Promise<PaymentMethodEntry[]> {
  const methods = await list()
  return methods.filter((entry) => entry.enabled)
}

async function update(
  input: InferredPaymentSettingsInput,
  userId: string,
): Promise<PaymentMethodEntry[]> {
  const methods = input.methods.map((entry, index) => ({ ...entry, order: index }))
  const settings = await paymentSettingsRepository.upsert(methods, userId)
  return settings.methods.map(toPlainEntry)
}

export const paymentSettingsService = { list, listEnabled, update }
