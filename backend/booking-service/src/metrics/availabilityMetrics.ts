import { Gauge } from "prom-client";
import Metric from "../models/Metric";

// Shared gauge for availability
export const availabilityGauge = new Gauge({
  name: "availability_gauge",
  help: "Number of availabilities",
});

// Initialize gauge with stored value
export const initializeAvailabilityGauge = async () => {
  try {
    const metric = await Metric.findOne({ name: "availability_gauge" });
    const initialValue = metric?.value || 0;
    availabilityGauge.set(initialValue);
    console.log(`Initialized availability_gauge with value: ${initialValue}`);
  } catch (error) {
    console.error("Error initializing availability_gauge:", error);
  }
};

// Helper to get the current value of the gauge
const getCurrentGaugeValue = async (): Promise<number> => {
  const metrics = await availabilityGauge.get();
  return metrics.values[0]?.value || 0; // Extracts the current value
};

// Update the database whenever the gauge is modified
const updateMetricInDatabase = async () => {
  try {
    const currentValue = await getCurrentGaugeValue(); // Fetch current value
    await Metric.findOneAndUpdate(
      { name: "availability_gauge" },
      { value: currentValue },
      { upsert: true }
    );
    console.log(`Updated availability_gauge in database with value: ${currentValue}`);
  } catch (error) {
    console.error("Error updating availability_gauge in database:", error);
  }
};

// Increment function
export const incrementAvailability = (incrementBy: number = 1) => {
  availabilityGauge.inc(incrementBy); // Update the gauge
  updateMetricInDatabase(); // Update the database
};

// Decrement function
export const decrementAvailability = (decrementBy: number = 1) => {
  availabilityGauge.dec(decrementBy); // Update the gauge
  updateMetricInDatabase(); // Update the database
};
