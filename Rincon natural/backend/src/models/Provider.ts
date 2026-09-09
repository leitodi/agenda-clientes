import mongoose, { InferSchemaType, Model } from 'mongoose'

const providerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

export type ProviderDocument = InferSchemaType<typeof providerSchema> & {
  _id: mongoose.Types.ObjectId
}

const Provider =
  (mongoose.models.Provider as Model<ProviderDocument>) ||
  mongoose.model<ProviderDocument>('Provider', providerSchema)

export default Provider
