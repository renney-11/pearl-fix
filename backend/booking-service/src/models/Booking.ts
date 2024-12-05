import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  dentistId: string;
  patientId: string;
  status: 'available' | 'booked';
  timeSlot: {
    start: Date;
    end: Date;
  };
  clinicId: string;
}

const BookingSchema: Schema = new Schema(
  {
    dentistId: { type: String, required: true },
    patientId: { type: String },
    status: {
      type: String,
      enum: ['available', 'booked'],
      default: 'available',
    },
    timeSlot: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    clinicId: { type: String, required: true },
  },
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
