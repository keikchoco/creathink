import { Schema, model, models, type Document, type Model, type Types } from "mongoose"
import type { ContentStatus } from "@/types/lifecycle"

export type TestimonialLinkStatus = "pending" | "submitted"

export interface TestimonialDocument extends Document {
  clientName: string
  position: string
  company: string
  image?: string
  review: string
  rating: number
  ratings?: {
    quality: number
    communication: number
    valueForMoney: number
  } | null
  projectId: Types.ObjectId | null
  order: number
  status: ContentStatus
  createdAt: Date
  updatedAt: Date
  userFilled?: boolean
  imageHidden?: boolean
  linkToken?: string | null
  linkStatus?: TestimonialLinkStatus | null
  submittedAt?: Date | null
}

const testimonialSchema = new Schema<TestimonialDocument>(
  {
    clientName: { type: String, default: "" },
    position: { type: String, default: "" },
    company: { type: String, default: "" },
    image: { type: String, default: "" },
    review: { type: String, default: "" },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    ratings: {
      type: {
        quality: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        valueForMoney: { type: Number, min: 1, max: 5 },
      },
      default: null,
      _id: false,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published", "archived"], required: true, default: "draft" },
    userFilled: { type: Boolean, default: false },
    imageHidden: { type: Boolean, default: false },
    linkToken: { type: String, default: null },
    linkStatus: { type: String, enum: ["pending", "submitted"], default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

testimonialSchema.index({ status: 1 })
testimonialSchema.index({ order: 1 })
testimonialSchema.index({ linkToken: 1 }, { unique: true, sparse: true })

export const Testimonial: Model<TestimonialDocument> =
  models.Testimonial ?? model<TestimonialDocument>("Testimonial", testimonialSchema)
