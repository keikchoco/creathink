import "server-only"
import { Types } from "mongoose"

import {
  testimonialRepository,
  type TestimonialFilter,
} from "@/repositories/testimonial.repository"
import { NotFoundError } from "@/lib/errors"
import type { TestimonialDocument } from "@/models/Testimonial"
import type { ListQueryOptions, PaginatedResult } from "@/types/api"
import type { InferredTestimonialInput } from "@/schemas/testimonial.schema"
import { projectRepository } from "@/repositories/project.repository"

function toRepositoryInput(input: InferredTestimonialInput) {
  return {
    ...input,
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

export const testimonialService = {
  list,
  getById,
  create,
  update,
  publish,
  archive,
  remove,
}
