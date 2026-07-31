"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/permissions"
import { serviceService } from "@/services/service.service"
import { serviceRepository } from "@/repositories/service.repository"
import { createAuditLog } from "@/lib/audit-log"
import { ValidationError, formatZodError } from "@/lib/errors"
import { successResponse, errorResponse } from "@/lib/api-response"
import { applyReorder } from "@/lib/reorder"
import { serviceSchema } from "@/schemas/service.schema"
import type { ApiResponse } from "@/types/api"

export async function createServiceAction(input: unknown): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("services", "edit")

    const parsed = serviceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const service = await serviceService.create(parsed.data)

    await createAuditLog({
      userId: admin.userId,
      action: "CREATE",
      resource: "services",
      resourceId: String(service._id),
      newValue: parsed.data,
    })

    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")

    return successResponse({ id: String(service._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updateServiceAction(
  id: string,
  input: unknown,
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("services", "edit")

    const parsed = serviceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const service = await serviceService.update(id, parsed.data)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "services",
      resourceId: id,
      newValue: parsed.data,
    })

    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")

    return successResponse({ id: String(service._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function publishServiceAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("services", "edit")
    await serviceService.publish(id)
    await createAuditLog({ userId: admin.userId, action: "PUBLISH", resource: "services", resourceId: id })
    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function archiveServiceAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("services", "edit")
    await serviceService.archive(id)
    await createAuditLog({ userId: admin.userId, action: "ARCHIVE", resource: "services", resourceId: id })
    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function deleteServiceAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("services", "edit")
    await serviceService.remove(id)
    await createAuditLog({ userId: admin.userId, action: "DELETE", resource: "services", resourceId: id })
    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function reorderServicesAction(ids: unknown): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("services", "edit")

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== "string")
    ) {
      throw new ValidationError("Invalid order")
    }

    await applyReorder(serviceRepository, ids as string[])

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "services",
      resourceId: "reorder",
      newValue: { ids },
    })

    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function reorderServiceAction(id: string, direction: "up" | "down"): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("services", "edit")

    if (direction !== "up" && direction !== "down") {
      throw new ValidationError("Invalid direction")
    }

    const current = await serviceService.getById(id)
    const { items } = await serviceRepository.findAll({}, { sort: "order", limit: 200 })
    const index = items.findIndex((item) => String(item._id) === id)

    if (index === -1) {
      return successResponse(null)
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1
    const swapItem = items[swapIndex]

    if (!swapItem) {
      return successResponse(null)
    }

    await serviceRepository.update(id, { order: swapItem.order })
    await serviceRepository.update(String(swapItem._id), { order: current.order })

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "services",
      resourceId: id,
      newValue: { order: swapItem.order },
    })

    revalidatePath("/admin/services")
    revalidatePath("/")
    revalidatePath("/services")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}
