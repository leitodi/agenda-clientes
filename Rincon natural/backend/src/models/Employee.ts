import mongoose, { InferSchemaType, Model } from 'mongoose'

const scheduleSchema = new mongoose.Schema(
  {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
  },
  {
    _id: false,
  }
)

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    role: { type: String, default: 'empleado' },
    salary: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    schedule: { type: scheduleSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
)

export type EmployeeDocument = InferSchemaType<typeof employeeSchema> & {
  _id: mongoose.Types.ObjectId
}

const Employee =
  (mongoose.models.Employee as Model<EmployeeDocument>) ||
  mongoose.model<EmployeeDocument>('Employee', employeeSchema)

export default Employee
