"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/permissions"
import { projectService } from "@/services/project.service"
import { projectRepository } from "@/repositories/project.repository"
import { createAuditLog } from "@/lib/audit-log"
import { ValidationError, formatZodError } from "@/lib/errors"
import { successResponse, errorResponse } from "@/lib/api-response"
import { applyReorder } from "@/lib/reorder"
import { projectSchema } from "@/schemas/project.schema"
import type { ApiResponse } from "@/types/api"

export async function createProjectAction(input: unknown): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("projects", "edit")

    const parsed = projectSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const project = await projectService.create(parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "CREATE",
      resource: "projects",
      resourceId: String(project._id),
      newValue: parsed.data,
    })

    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")

    return successResponse({ id: String(project._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updateProjectAction(
  id: string,
  input: unknown,
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("projects", "edit")

    const parsed = projectSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const project = await projectService.update(id, parsed.data, admin.userId)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "projects",
      resourceId: id,
      newValue: parsed.data,
    })

    revalidatePath("/admin/projects")
    revalidatePath(`/admin/projects/${id}`)
    revalidatePath("/")
    revalidatePath("/portfolio")
    revalidatePath(`/portfolio/${project.slug}`)

    return successResponse({ id: String(project._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function publishProjectAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("projects", "edit")
    const project = await projectService.publish(id, admin.userId)
    await createAuditLog({ userId: admin.userId, action: "PUBLISH", resource: "projects", resourceId: id })
    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")
    revalidatePath(`/portfolio/${project.slug}`)
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function archiveProjectAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("projects", "edit")
    const project = await projectService.archive(id, admin.userId)
    await createAuditLog({ userId: admin.userId, action: "ARCHIVE", resource: "projects", resourceId: id })
    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")
    revalidatePath(`/portfolio/${project.slug}`)
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function deleteProjectAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("projects", "edit")
    const project = await projectService.getById(id)
    await projectService.remove(id, admin.userId)
    await createAuditLog({ userId: admin.userId, action: "DELETE", resource: "projects", resourceId: id })
    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")
    revalidatePath(`/portfolio/${project.slug}`)
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function restoreProjectAction(id: string): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("projects", "edit")
    const project = await projectService.restore(id)
    await createAuditLog({ userId: admin.userId, action: "RESTORE", resource: "projects", resourceId: id })
    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")
    revalidatePath(`/portfolio/${project.slug}`)
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function reorderProjectsAction(ids: unknown): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("projects", "edit")

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== "string")
    ) {
      throw new ValidationError("Invalid order")
    }

    await applyReorder(projectRepository, ids as string[])

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "projects",
      resourceId: "reorder",
      newValue: { ids },
    })

    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function reorderProjectAction(id: string, direction: "up" | "down"): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("projects", "edit")

    if (direction !== "up" && direction !== "down") {
      throw new ValidationError("Invalid direction")
    }

    const current = await projectService.getById(id)
    const { items } = await projectRepository.findAll({}, { sort: "order", limit: 200 })
    const index = items.findIndex((item) => String(item._id) === id)

    if (index === -1) {
      return successResponse(null)
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1
    const swapItem = items[swapIndex]

    if (!swapItem) {
      return successResponse(null)
    }

    await projectRepository.update(id, { order: swapItem.order })
    await projectRepository.update(String(swapItem._id), { order: current.order })

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "projects",
      resourceId: id,
      newValue: { order: swapItem.order },
    })

    revalidatePath("/admin/projects")
    revalidatePath("/")
    revalidatePath("/portfolio")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}
