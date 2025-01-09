import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Clinic from "../models/Clinic";

export const validateCreateClinic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { city, address, clinicName, openingHours, coordinates, dentists } = req.body;

  // Checks required fields
  const requiredFields = ["city", "address", "clinicName", "openingHours", "coordinates"];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      res.status(400).json({ message: `Missing required field: ${field}` });
      return;
    }
  }

  // Validate openingHours
  if (!openingHours.start || !openingHours.end) {
    res.status(400).json({ message: "Opening hours must include start and end times." });
    return;
  }

  // Validate coordinates
  const { latitude, longitude } = coordinates;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({ message: "Invalid coordinates." });
    return;
  }

  // Check for existing clinic with the same address
  const clinicExists = await Clinic.findOne({ address });
  if (clinicExists) {
    res.status(400).json({ message: "A clinic with this address already exists." });
    return;
  }

  // Validate dentists
  if (Array.isArray(dentists)) {
    for (const dentistId of dentists) {
      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        res.status(400).json({ message: `Invalid dentist ID: ${dentistId}` });
        return;
      }
    }
  }

  next();
};
