import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: String;
  role: String;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['dentist', 'patient'],
    required: true,
    default: 'patient'
  },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
