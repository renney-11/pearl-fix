import { RequestHandler } from "express";
import Availability from "../models/Availability";

export const createAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, workDays, timeSlots } = req.body;

  try {
    const availability = new Availability({
      dentistId,
      workDays,
      timeSlots,
    });

    await availability.save();

    res.status(201).json({
      message: "Availability created successfully",
      availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId } = req.params;

  try {
    const availability = await Availability.findOne({ dentistId });

    if (!availability) {
      res.status(404).json({ message: "Availability not found" });
      return;
    }

    res.status(200).json({ availability });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId } = req.params;
  const { workDays, timeSlots } = req.body;

  try {
    const availability = await Availability.findOneAndUpdate(
      { dentistId },
      { workDays, timeSlots },
      { new: true }
    );

    if (!availability) {
      res.status(404).json({ message: "Availability not found" });
      return;
    }

    res.status(200).json({
      message: "Availability updated successfully",
      availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
