import type { ContentStatus } from "./lifecycle"

export interface Testimonial {
  _id: string
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
  projectId: string | null
  order: number
  imageHidden?: boolean
  status: ContentStatus
  createdAt: Date
  updatedAt: Date
}
