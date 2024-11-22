import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import Clinic from "../models/Clinic";
import { IClinic } from "../models/Clinic";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const createClinic: RequestHandler = async (req, res): Promise<void> => {
  const { city, address, clinicName, password, openingHours, coordinates } = req.body;

  try {
    // Check if clinic already exists
    let clinic: IClinic | null;
    clinic = await Clinic.findOne({ address });
    if (clinic) {
      res.status(400).json({ message: "Clinic with this address already exists" });
      return;
    }

    // Create new clinic
    clinic = new Clinic({
      city,
      address,
      clinicName,
      password,
      openingHours,
      coordinates,
    });

    // Save the clinic to the database
    await clinic.save();

    // Return the clinic details as response (without a token)
    res.status(201).json({
      message: "Clinic created successfully",
      clinic: {
        id: clinic.id,
        clinicName: clinic.clinicName,
        city: clinic.city,
        address: clinic.address,
        openingHours: clinic.openingHours,
        coordinates: clinic.coordinates,
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
