import mongoose, { Schema, Document } from 'mongoose';

export interface IDentist extends Document {
  name: string;
  email: string;
  password: string;
  fikaBreak: { start: string; end: string };
  lunchBreak: { start: string; end: string };
  clinic: mongoose.Types.ObjectId;
}

const DentistSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fikaBreak: {
    start: { type: String, default: "15:00", required: true },
    end: { type: String, default: "16:00", required: true },   
  },
  lunchBreak: {
    start: { type: String, default: "12:00", required: true },
    end: { type: String, default: "13:00", required: true },
  },
  clinic: {type: mongoose.Schema.Types.ObjectId, ref: 'Clinic'}
});

// Export the model
export default mongoose.model<IDentist>('Dentist', DentistSchema);
