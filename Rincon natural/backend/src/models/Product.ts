import mongoose, { InferSchemaType, Model } from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    providerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider',
      },
    ],
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: ['kg', 'g', 'unidad'] },
    minimumStock: { type: Number, default: 10, min: 0 },
    soldQuantity: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
)

export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId
}

const Product =
  (mongoose.models.Product as Model<ProductDocument>) ||
  mongoose.model<ProductDocument>('Product', productSchema)

export default Product
