import { Schema, model, models, type Document, type Model, type Types } from "mongoose"
import type { ContentStatus } from "@/types/lifecycle"

export interface TestimonialDocument extends Document {
  clientName: string
  position: string
  company: string
  image?: string
  review: string
  rating: number
  projectId: Types.ObjectId | null
  order: number
  status: ContentStatus
  createdAt: Date
  updatedAt: Date
  userFilled?: boolean
}

const testimonialSchema = new Schema<TestimonialDocument>(
  {
    clientName: { type: String, required: true },
    position: { type: String, required: true },
    company: { type: String, required: true },
    image: { type: String, default: "" },
    review: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published", "archived"], required: true, default: "draft" },
  },
  { timestamps: true },
)

testimonialSchema.index({ status: 1 })
testimonialSchema.index({ order: 1 })

export const Testimonial: Model<TestimonialDocument> =
  models.Testimonial ?? model<TestimonialDocument>("Testimonial", testimonialSchema)
