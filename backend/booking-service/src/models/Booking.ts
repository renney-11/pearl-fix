import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  dentistId: mongoose.Types.ObjectId; // Reference to the Dentist
  patientId: mongoose.Types.ObjectId; // Reference to the Patient
  availabilityId: mongoose.Types.ObjectId; // Reference to Availability
  timeSlot: {
    start: Date;
    end: Date;
  };
  status: "available" | "booked";
  clinicId: mongoose.Types.ObjectId; // Reference to the Clinic (optional)
}

const BookingSchema: Schema = new Schema(
  {
    dentistId: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    availabilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Availability", required: true },
    timeSlot: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ["available", "booked"],
      default: "booked",
    },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true },
  },
  { timestamps: true } // Add createdAt and updatedAt timestamps
);

export default mongoose.model<IBooking>("Booking", BookingSchema);
