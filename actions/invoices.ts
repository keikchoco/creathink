"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/permissions"
import { invoiceService } from "@/services/invoice.service"
import { createAuditLog } from "@/lib/audit-log"
import { ValidationError, formatZodError } from "@/lib/errors"
import { successResponse, errorResponse } from "@/lib/api-response"
import { invoiceSchema, invoicePaymentSchema } from "@/schemas/invoice.schema"
import type { ApiResponse } from "@/types/api"
import type { InvoiceCurrency } from "@/types/invoice"

export interface LibraryItemOption {
  id: string
  name: string
  description: string
  unitPrice: number
}

export async function createInvoiceAction(
  input: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    const parsed = invoiceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const invoice = await invoiceService.create(parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "CREATE",
      resource: "invoices",
      resourceId: String(invoice._id),
      newValue: { invoiceNumber: invoice.invoiceNumber },
    })

    revalidatePath("/admin/invoices")

    return successResponse({ id: String(invoice._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updateInvoiceAction(
  id: string,
  input: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    const parsed = invoiceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const invoice = await invoiceService.update(id, parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: id,
      newValue: { invoiceNumber: invoice.invoiceNumber },
    })

    revalidatePath("/admin/invoices")
    revalidatePath(`/admin/invoices/${id}`)

    return successResponse({ id })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function duplicateInvoiceAction(
  id: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    const copy = await invoiceService.duplicate(id, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "CREATE",
      resource: "invoices",
      resourceId: String(copy._id),
      newValue: { duplicatedFrom: id },
    })

    revalidatePath("/admin/invoices")

    return successResponse({ id: String(copy._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function deleteInvoiceAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    await invoiceService.remove(id, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "DELETE",
      resource: "invoices",
      resourceId: id,
    })

    revalidatePath("/admin/invoices")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function setInvoiceStatusAction(
  id: string,
  status: string
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    if (!["paid", "cancelled", "sent", "draft"].includes(status)) {
      throw new ValidationError("Invalid status")
    }

    await invoiceService.setStatus(
      id,
      status as "paid" | "cancelled" | "sent" | "draft",
      admin.userId
    )

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: id,
      newValue: { status },
    })

    revalidatePath("/admin/invoices")
    revalidatePath(`/admin/invoices/${id}`)

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function recordInvoicePaymentAction(
  id: string,
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    const parsed = invoicePaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    await invoiceService.recordPayment(id, parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: id,
      newValue: { paymentRecorded: parsed.data.amount },
    })

    revalidatePath("/admin/invoices")
    revalidatePath(`/admin/invoices/${id}`)

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updateInvoicePaymentAction(
  id: string,
  paymentId: string,
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    const parsed = invoicePaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    await invoiceService.updatePayment(id, paymentId, parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: id,
      newValue: { paymentUpdated: paymentId },
    })

    revalidatePath("/admin/invoices")
    revalidatePath(`/admin/invoices/${id}`)

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function deleteInvoicePaymentAction(
  id: string,
  paymentId: string
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    await invoiceService.deletePayment(id, paymentId, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: id,
      newValue: { paymentDeleted: paymentId },
    })

    revalidatePath("/admin/invoices")
    revalidatePath(`/admin/invoices/${id}`)

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function sendInvoiceAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("invoices", "edit")

    await invoiceService.send(id, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "invoices",
      resourceId: id,
      newValue: { sent: true },
    })

    revalidatePath("/admin/invoices")
    revalidatePath(`/admin/invoices/${id}`)

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function searchInvoiceItemLibraryAction(
  query: string,
  currency: string
): Promise<ApiResponse<LibraryItemOption[]>> {
  try {
    await requirePermission("invoices", "view")

    if (currency !== "PHP" && currency !== "USD") {
      throw new ValidationError("Invalid currency")
    }

    const items = await invoiceService.searchLibrary(
      typeof query === "string" ? query.slice(0, 100) : "",
      currency as InvoiceCurrency
    )

    return successResponse(
      items.map((item) => ({
        id: String(item._id),
        name: item.name,
        description: item.description ?? "",
        unitPrice: item.unitPrice,
      }))
    )
  } catch (error) {
    return errorResponse(error)
  }
}
