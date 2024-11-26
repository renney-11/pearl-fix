import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  dentistId: string;
  patientId?: string;
  status: 'available' | 'booked' | 'canceled';
  timeSlot: {
    start: Date;
    end: Date;
  };
  clinicId: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema: Schema = new Schema(
  {
    dentistId: { type: String, required: true },
    patientId: { type: String },
    status: {
      type: String,
      enum: ['available', 'booked', 'canceled'],
      default: 'available',
    },
    timeSlot: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    clinicId: { type: String, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
