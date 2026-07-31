import "server-only"

import { connectToDatabase } from "@/lib/database"
import { Testimonial, type TestimonialDocument } from "@/models/Testimonial"
import type { ListQueryOptions, PaginatedResult } from "@/types/api"

export interface TestimonialFilter {
  status?: "draft" | "published" | "archived"
}

async function findAll(
  filter: TestimonialFilter,
  { page = 1, limit = 20, sort = "order", search }: ListQueryOptions = {},
): Promise<PaginatedResult<TestimonialDocument>> {
  await connectToDatabase()

  const query: Record<string, unknown> = {}
  if (filter.status) query.status = filter.status
  if (search) query.clientName = { $regex: search, $options: "i" }

  const [items, total] = await Promise.all([
    Testimonial.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Testimonial.countDocuments(query),
  ])

  return { items: items as unknown as TestimonialDocument[], total, page, limit }
}

async function findById(id: string): Promise<TestimonialDocument | null> {
  await connectToDatabase()
  return Testimonial.findById(id)
}

async function findByLinkToken(token: string): Promise<TestimonialDocument | null> {
  await connectToDatabase()
  return Testimonial.findOne({ linkToken: token })
}

async function create(data: Partial<TestimonialDocument>): Promise<TestimonialDocument> {
  await connectToDatabase()
  return Testimonial.create(data)
}

async function update(
  id: string,
  data: Partial<TestimonialDocument>,
): Promise<TestimonialDocument | null> {
  await connectToDatabase()
  return Testimonial.findByIdAndUpdate(id, data, { new: true })
}

async function setStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<TestimonialDocument | null> {
  await connectToDatabase()
  return Testimonial.findByIdAndUpdate(id, { status }, { new: true })
}

async function hardDelete(id: string): Promise<void> {
  await connectToDatabase()
  await Testimonial.findByIdAndDelete(id)
}

export const testimonialRepository = {
  findAll,
  findById,
  findByLinkToken,
  create,
  update,
  setStatus,
  hardDelete,
}
