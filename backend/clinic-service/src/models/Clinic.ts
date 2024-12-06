import mongoose, { Schema, Document } from 'mongoose';

export interface IClinic extends Document {
  city: string;
  address: string;
  clinicName: string;
  openingHours: {
    start: string; 
    end: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  dentists: [mongoose.Types.ObjectId];
}

const ClinicSchema: Schema = new Schema({
  city: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  clinicName: { type: String, required: true },
  openingHours: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  dentists: [{type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Dentist'}],
});

export default mongoose.model<IClinic>('Clinic', ClinicSchema);