import mongoose, { InferSchemaType, Model } from 'mongoose'

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: ['kg', 'g', 'unidad'] },
    price: { type: Number, required: true, min: 0 },
  },
  {
    _id: true,
  }
)

const saleSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    saleDate: { type: Date, default: Date.now },
    total: { type: Number, required: true, min: 0 },
    items: { type: [saleItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
)

export type SaleDocument = InferSchemaType<typeof saleSchema> & {
  _id: mongoose.Types.ObjectId
}

const Sale = (mongoose.models.Sale as Model<SaleDocument>) || mongoose.model<SaleDocument>('Sale', saleSchema)

export default Sale
