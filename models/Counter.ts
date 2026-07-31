import { Schema, model, models, type Model } from "mongoose"

export interface CounterDocument {
  _id: string
  seq: number
}

const counterSchema = new Schema<CounterDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
)

export const Counter: Model<CounterDocument> =
  models.Counter ?? model<CounterDocument>("Counter", counterSchema)
