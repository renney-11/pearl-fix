import mongoose, { Schema, Document } from "mongoose";

export interface IPatient extends Document {
  name: string;
  email: string;
  password: string;
  bookings: mongoose.Types.ObjectId[]; // List of Booking IDs
}

const PatientSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  },
  { timestamps: true } // Add createdAt and updatedAt timestamps
);

export default mongoose.model<IPatient>("Patient", PatientSchema);
