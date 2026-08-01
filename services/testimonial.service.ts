import "server-only"
import { randomBytes } from "crypto"
import { put } from "@vercel/blob"
import { Types } from "mongoose"

import {
  testimonialRepository,
  type TestimonialFilter,
} from "@/repositories/testimonial.repository"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { TestimonialDocument } from "@/models/Testimonial"
import type { ListQueryOptions, PaginatedResult } from "@/types/api"
import type {
  InferredTestimonialInput,
  ClientTestimonialInput,
} from "@/schemas/testimonial.schema"
import { projectRepository } from "@/repositories/project.repository"

function toRepositoryInput(input: InferredTestimonialInput) {
  const { ratingQuality, ratingCommunication, ratingValueForMoney, ...rest } = input
  const ratings = {
    quality: ratingQuality,
    communication: ratingCommunication,
    valueForMoney: ratingValueForMoney,
  }

  return {
    ...rest,
    ratings,
    rating:
      Math.round(
        ((ratings.quality + ratings.communication + ratings.valueForMoney) / 3) * 10
      ) / 10,
    projectId: input.projectId ? new Types.ObjectId(input.projectId) : null,
  }
}

async function list(
  filter: TestimonialFilter,
  options?: ListQueryOptions
): Promise<PaginatedResult<TestimonialDocument>> {
  return testimonialRepository.findAll(filter, options)
}

async function getById(id: string): Promise<TestimonialDocument> {
  const testimonial = await testimonialRepository.findById(id)
  if (!testimonial) throw new NotFoundError("Testimonial not found")
  return testimonial
}

async function create(
  input: InferredTestimonialInput
): Promise<TestimonialDocument> {
  return testimonialRepository.create({
    ...toRepositoryInput(input),
    status: "draft",
  })
}

async function update(
  id: string,
  input: InferredTestimonialInput
): Promise<TestimonialDocument> {
  const updated = await testimonialRepository.update(
    id,
    toRepositoryInput(input)
  )
  if (!updated) throw new NotFoundError("Testimonial not found")
  return updated
}

async function publish(id: string): Promise<TestimonialDocument> {
  const updated = await testimonialRepository.setStatus(id, "published")
  if (!updated) throw new NotFoundError("Testimonial not found")
  return updated
}

async function archive(id: string): Promise<TestimonialDocument> {
  const updated = await testimonialRepository.setStatus(id, "archived")
  if (!updated) throw new NotFoundError("Testimonial not found")
  return updated
}

async function remove(id: string): Promise<void> {
  await getById(id)
  await testimonialRepository.hardDelete(id)
}

async function createLink(
  projectId: string
): Promise<{ token: string; id: string }> {
  const project = await projectRepository.findById(projectId)
  if (!project) throw new NotFoundError("Project not found")

  const token = randomBytes(24).toString("base64url")

  const testimonial = await testimonialRepository.create({
    clientName: "",
    position: "",
    company: "",
    image: "",
    review: "",
    rating: 5,
    projectId: new Types.ObjectId(projectId),
    order: 0,
    status: "draft",
    userFilled: true,
    linkToken: token,
    linkStatus: "pending",
  })

  return { token, id: String(testimonial._id) }
}

async function getPendingByToken(token: string): Promise<TestimonialDocument | null> {
  const testimonial = await testimonialRepository.findByLinkToken(token)
  if (!testimonial || testimonial.linkStatus !== "pending") return null
  return testimonial
}

const CLIENT_PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const CLIENT_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024

async function submitByToken(
  token: string,
  input: ClientTestimonialInput,
  photo?: File | null
): Promise<TestimonialDocument> {
  const testimonial = await getPendingByToken(token)
  if (!testimonial) {
    throw new NotFoundError("This testimonial link is invalid or has already been used.")
  }

  let imageUrl: string | undefined

  if (photo && photo.size > 0) {
    if (!CLIENT_PHOTO_ALLOWED_TYPES.includes(photo.type)) {
      throw new ValidationError("Unsupported photo type. Allowed: JPEG, PNG, WebP.")
    }
    if (photo.size > CLIENT_PHOTO_MAX_SIZE_BYTES) {
      throw new ValidationError("Photo is too large. Maximum size is 5MB.")
    }

    const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg"
    const blob = await put(
      `testimonials/${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`,
      photo,
      { access: "public" }
    )
    imageUrl = blob.url
  }

  const ratings = {
    quality: input.ratingQuality,
    communication: input.ratingCommunication,
    valueForMoney: input.ratingValueForMoney,
  }
  const averageRating =
    Math.round(
      ((ratings.quality + ratings.communication + ratings.valueForMoney) / 3) * 10
    ) / 10

  const updated = await testimonialRepository.update(String(testimonial._id), {
    clientName: input.clientName,
    position: input.position,
    company: input.company,
    review: input.review,
    rating: averageRating,
    ratings,
    ...(imageUrl ? { image: imageUrl } : {}),
    status: "draft",
    linkStatus: "submitted",
    submittedAt: new Date(),
  })
  if (!updated) throw new NotFoundError("Testimonial not found")
  return updated
}

async function setImageHidden(
  id: string,
  hidden: boolean
): Promise<TestimonialDocument> {
  const updated = await testimonialRepository.update(id, { imageHidden: hidden })
  if (!updated) throw new NotFoundError("Testimonial not found")
  return updated
}

export const testimonialService = {
  list,
  getById,
  create,
  update,
  publish,
  archive,
  remove,
  createLink,
  getPendingByToken,
  submitByToken,
  setImageHidden,
}
