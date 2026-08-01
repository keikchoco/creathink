"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/permissions"
import { createAuditLog } from "@/lib/audit-log"
import { successResponse, errorResponse } from "@/lib/api-response"
import { ValidationError, formatZodError } from "@/lib/errors"
import { paymentSettingsService } from "@/services/payment-settings.service"
import { paymentSettingsSchema } from "@/schemas/payment-settings.schema"
import type { ApiResponse } from "@/types/api"
import type { PaymentMethodEntry } from "@/models/PaymentSettings"

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/blog",
  "/contact",
  "/contact/service-inquiry",
  "/privacy-policy",
  "/terms",
]

export async function refreshCacheAction(): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("settings", "edit")

    for (const path of PUBLIC_PATHS) {
      revalidatePath(path, "layout")
    }
    revalidatePath("/portfolio/[slug]", "page")
    revalidatePath("/blog/[slug]", "page")

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "settings",
      resourceId: "cache",
    })

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updatePaymentMethodsAction(
  input: unknown,
): Promise<ApiResponse<{ methods: PaymentMethodEntry[] }>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    const parsed = paymentSettingsSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const methods = await paymentSettingsService.update(parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: "payment-methods",
      newValue: { count: methods.length },
    })

    revalidatePath("/admin/invoices/settings")
    revalidatePath("/invoice/[publicId]", "page")

    return successResponse({ methods })
  } catch (error) {
    return errorResponse(error)
  }
}
