import mongoose, { Schema, Document } from "mongoose";

export interface ITimeSlot {
  start: Date;
  end: Date;
  status: "available" | "booked";
}

export interface IAvailability extends Document {
  dentistId: mongoose.Types.ObjectId; // Reference to the Dentist
  workDays: string[];
  timeSlots: ITimeSlot[];
}

const TimeSlotSchema: Schema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, enum: ["available", "booked"], default: "available" },
});

const AvailabilitySchema: Schema = new Schema(
  {
    dentistId: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
    workDays: {
      type: [String],
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      required: true,
    },
    timeSlots: { type: [TimeSlotSchema], required: true },
  },
  { timestamps: true } // Add createdAt and updatedAt timestamps
);

export default mongoose.model<IAvailability>("Availability", AvailabilitySchema);
