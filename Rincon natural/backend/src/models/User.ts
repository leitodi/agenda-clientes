import mongoose, { InferSchemaType, Model } from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'admin' },
  },
  {
    timestamps: true,
  }
)

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId }

const User = (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>('User', userSchema)

export default User
