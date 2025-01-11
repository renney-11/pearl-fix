import mongoose, { Schema, Document } from "mongoose";

export interface IMetric extends Document {
  name: string; // Name of the metric
  value: number; // Current value of the metric
}

const MetricSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 0 },
});

export default mongoose.model<IMetric>("Metric", MetricSchema);
