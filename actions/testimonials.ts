"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/permissions"
import { testimonialService } from "@/services/testimonial.service"
import { testimonialRepository } from "@/repositories/testimonial.repository"
import { createAuditLog } from "@/lib/audit-log"
import { ValidationError, formatZodError } from "@/lib/errors"
import { successResponse, errorResponse } from "@/lib/api-response"
import { testimonialSchema } from "@/schemas/testimonial.schema"
import type { ApiResponse } from "@/types/api"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI as string

let client: MongoClient

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  return client
}

export async function createTestimonialAction(
  input: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const admin = await requirePermission("testimonials", "edit")

    const parsed = testimonialSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(formatZodError(parsed.error))
    }

    if (parsed.data.userFilled) {
      if (!parsed.data.projectId) {
        throw new ValidationError(
          "Project ID is required for user-filled testimonials"
        )
      }

      const mongoClient = await connectToDatabase()
      const db = mongoClient.db("test")
      const collection = db.collection("testimonials")

      const result = await collection.insertOne({
        ...parsed.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "draft",
        __v: 0,
      })

      return successResponse({ id: result.insertedId.toString() })
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
