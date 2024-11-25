import mongoose, { Schema, Document } from 'mongoose';

export interface IClinic extends Document {
  city: string;
  address: string;
  clinicName: string;
  password: string;
  openingHours: {
    start: string; 
    end: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

const ClinicSchema: Schema = new Schema({
  city: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  clinicName: { type: String, required: true },
  password: { type: String, required: true },
  openingHours: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
});

export default mongoose.model<IClinic>('Clinic', ClinicSchema);