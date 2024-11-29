import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import Clinic from "../models/Clinic";
import { IClinic } from "../models/Clinic";
import { MQTTHandler } from "../../../mqtt/MqttHandler";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

(async () => {
  try {
    await mqttHandler.connect();

    // Subscribe to the getAllClinics queue
    await mqttHandler.subscribe("tooth-beacon/clinics/get-all", async (msg) => {
      try {
        console.log("Message received for getAllClinics:", msg);

        // Process the request
        const clinics = await Clinic.find(); // Fetch all clinics

        // Publish the response
        await mqttHandler.publish(
          "tooth-beacon/clinics/response",
          JSON.stringify({ clinics })
        );
        console.log("Clinic data published:", clinics);
      } catch (error) {
        console.error("Error processing getAllClinics message:", error);

        // Publish an error message
        await mqttHandler.publish(
          "tooth-beacon/clinics/response",
          JSON.stringify({ message: "Error fetching clinics", error })
        );
      }
    });

    console.log("Subscription for getAllClinics initialized.");
  } catch (error) {
    console.error("Failed to connect or initialize RabbitMQ subscriptions:", error);
  }
})();

export const getAllClinics: RequestHandler = async (req, res): Promise<void> => {
  try {
    const clinics = await Clinic.find();  // Fetch all clinics
    res.status(200).json({ clinics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching clinics" });
  }
};

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

    // Creates a new clinic
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
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a clinic by address
export const getClinicByAddress: RequestHandler = async (req, res): Promise<void> => {
  const { address } = req.params;

  try {
    const clinic = await Clinic.findOne({ address });
    if (!clinic) {
      res.status(404).json({ message: "Clinic not found" });
      return;
    }

    res.status(200).json({ clinic });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
