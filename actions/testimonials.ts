"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/permissions"
import { testimonialService } from "@/services/testimonial.service"
import { testimonialRepository } from "@/repositories/testimonial.repository"
import { createAuditLog } from "@/lib/audit-log"
import { ValidationError, formatZodError } from "@/lib/errors"
import { successResponse, errorResponse } from "@/lib/api-response"
import { isRateLimited } from "@/lib/rate-limit"
import { applyReorder } from "@/lib/reorder"
import {
  testimonialSchema,
  clientTestimonialSchema,
} from "@/schemas/testimonial.schema"
import type { ApiResponse } from "@/types/api"

export async function createTestimonialAction(
  input: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    const parsed = testimonialSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const testimonial = await testimonialService.create(parsed.data)

    await createAuditLog({
      userId: admin.userId,
      action: "CREATE",
      resource: "testimonials",
      resourceId: String(testimonial._id),
      newValue: parsed.data,
    })

    revalidatePath("/admin/testimonials")
    revalidatePath("/")

    return successResponse({ id: String(testimonial._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updateTestimonialAction(
  id: string,
  input: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    const parsed = testimonialSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    const testimonial = await testimonialService.update(id, parsed.data)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "testimonials",
      resourceId: id,
      newValue: parsed.data,
    })

    revalidatePath("/admin/testimonials")
    revalidatePath("/")

    return successResponse({ id: String(testimonial._id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function publishTestimonialAction(
  id: string
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("testimonials", "edit")
    await testimonialService.publish(id)
    await createAuditLog({
      userId: admin.userId,
      action: "PUBLISH",
      resource: "testimonials",
      resourceId: id,
    })
    revalidatePath("/admin/testimonials")
    revalidatePath("/")
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function archiveTestimonialAction(
  id: string
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("testimonials", "edit")
    await testimonialService.archive(id)
    await createAuditLog({
      userId: admin.userId,
      action: "ARCHIVE",
      resource: "testimonials",
      resourceId: id,
    })
    revalidatePath("/admin/testimonials")
    revalidatePath("/")
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function deleteTestimonialAction(
  id: string
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("testimonials", "edit")
    await testimonialService.remove(id)
    await createAuditLog({
      userId: admin.userId,
      action: "DELETE",
      resource: "testimonials",
      resourceId: id,
    })
    revalidatePath("/admin/testimonials")
    revalidatePath("/")
    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function generateTestimonialLinkAction(
  projectId: unknown
): Promise<ApiResponse<{ token: string }>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    if (typeof projectId !== "string" || projectId.length === 0) {
      throw new ValidationError("A project is required to generate a testimonial link.")
    }

    const { token, id } = await testimonialService.createLink(projectId)

    await createAuditLog({
      userId: admin.userId,
      action: "CREATE",
      resource: "testimonials",
      resourceId: id,
      newValue: { projectId, linkStatus: "pending" },
    })

    revalidatePath("/admin/testimonials")

    return successResponse({ token })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function submitClientTestimonialAction(
  token: unknown,
  formData: FormData
): Promise<ApiResponse<null>> {
  try {
    if (typeof token !== "string" || token.length === 0) {
      throw new ValidationError("This testimonial link is invalid.")
    }

    const parsed = clientTestimonialSchema.safeParse({
      clientName: formData.get("clientName"),
      position: formData.get("position") ?? "",
      company: formData.get("company") ?? "",
      review: formData.get("review"),
      ratingQuality: formData.get("ratingQuality"),
      ratingCommunication: formData.get("ratingCommunication"),
      ratingValueForMoney: formData.get("ratingValueForMoney"),
      website: formData.get("website") ?? "",
    })
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    if (parsed.data.website) {
      return successResponse(null)
    }

    if (isRateLimited(`testimonial:${token}`)) {
      throw new ValidationError("Too many submissions. Please try again later.")
    }

    const photo = formData.get("photo")

    await testimonialService.submitByToken(
      token,
      parsed.data,
      photo instanceof File ? photo : null
    )

    // No revalidatePath here: it would refresh the client's current route,
    // replacing the form (and its success state) with the "link already used"
    // page. The admin list is dynamically rendered and needs no invalidation.

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function setTestimonialImageHiddenAction(
  id: string,
  hidden: boolean
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    await testimonialService.setImageHidden(id, hidden === true)

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "testimonials",
      resourceId: id,
      newValue: { imageHidden: hidden === true },
    })

    revalidatePath("/admin/testimonials")
    revalidatePath("/")
    revalidatePath("/testimonials")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function reorderTestimonialsAction(
  ids: unknown
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== "string")
    ) {
      throw new ValidationError("Invalid order")
    }

    await applyReorder(testimonialRepository, ids as string[])

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "testimonials",
      resourceId: "reorder",
      newValue: { ids },
    })

    revalidatePath("/admin/testimonials")
    revalidatePath("/")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function reorderTestimonialAction(
  id: string,
  direction: "up" | "down"
): Promise<ApiResponse<null>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    if (direction !== "up" && direction !== "down") {
      throw new ValidationError("Invalid direction")
    }

    const current = await testimonialService.getById(id)
    const { items } = await testimonialRepository.findAll(
      {},
      { sort: "order", limit: 200 }
    )
    const index = items.findIndex((item) => String(item._id) === id)

    if (index === -1) {
      return successResponse(null)
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1
    const swapItem = items[swapIndex]

    if (!swapItem) {
      return successResponse(null)
    }

    await testimonialRepository.update(id, { order: swapItem.order })
    await testimonialRepository.update(String(swapItem._id), {
      order: current.order,
    })

    await createAuditLog({
      userId: admin.userId,
      action: "UPDATE",
      resource: "testimonials",
      resourceId: id,
      newValue: { order: swapItem.order },
    })

    revalidatePath("/admin/testimonials")
    revalidatePath("/")

    return successResponse(null)
  } catch (error) {
    return errorResponse(error)
  }
}
