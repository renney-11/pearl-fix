import { RequestHandler } from "express";
import Clinic from "../models/Clinic";
import { MQTTHandler } from "../mqtt/MqttHandler";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}


// Initialize the MQTT handler
const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

(async () => {
  try {
    await mqttHandler.connect();

    // Subscribe to the getAllClinic topic
    await mqttHandler.subscribe("pearl-fix/clinic/get-all", async (msg) => {
      console.log("Message received on getAllClinic topic:", msg || "No payload provided");
    
      try {
        const clinics = await Clinic.find();
        console.log("Clinics fetched successfully:", clinics);
    
        await mqttHandler.publish(
          "pearl-fix/clinic/all-data",
          JSON.stringify({ clinics })
        );
    
        console.log("Clinics published successfully.");
      } catch (error) {
        console.error("Error fetching clinics:", error);
        await mqttHandler.publish(
          "pearl-fix/clinic/all-data",
          JSON.stringify({ error: "Error fetching clinics", details: error })
        );
      }
    });

    // Subscribe to the topic to receive dentistId
    await mqttHandler.subscribe("pearl-fix/booking/find/clinic", async (msg) => {
      console.log("Message received on 'pearl-fix/booking/find/clinic' topic:", msg || "No payload provided");
    
      try {
        const { dentistId } = JSON.parse(msg.toString());
        
        if (!dentistId) {
          console.error("Missing dentistId in the message");
          return;
        }

        // Find clinic associated with the dentistId
        const clinic = await Clinic.findOne({ dentists: { $in: [dentistId] } });
        if (!clinic) {
          console.error("No clinic found for the given dentistId:", dentistId);
          return;
        }

        await mqttHandler.publish(
          "pearl-fix/booking/clinic",
          JSON.stringify({ clinic })
        );
        console.log("Clinic found and published successfully:", clinic);
      } catch (error) {
        console.error("Error fetching clinic by dentist:", error);
        await mqttHandler.publish(
          "pearl-fix/booking/clinic",
          JSON.stringify({ error: "Error fetching clinic by dentist", details: error })
        );
      }
    });

  } catch (error) {
    console.error("Error connecting MQTT handler:", error);
  } finally {
    // close the broker connection when the application is shut down, ctrl+c
    process.on("SIGINT", async () => {
      await mqttHandler.close();
      console.log("MQTT connection closed.");
      process.exit(0);
    });
  }
})();



export const createClinic: RequestHandler = async (req, res): Promise<void> => {
  const { city, address, clinicName, openingHours, coordinates, dentists } = req.body;

  try {
    // Check if clinic already exists
    if (!mqttHandler.isConnected()) {
      console.log("MQTT handler is not connected, connecting...");
      await mqttHandler.connect(); // Ensure the connection is established only once
      console.log("MQTT connected successfully");
    } else {
      console.log("MQTT handler already connected");
    }
    
    const clinicExists = await Clinic.findOne({ address });
    if (clinicExists) {
      res.status(400).json({ message: "Clinic with this address already exists" });
      return;
    }

    // Publish dentists' emails to the topic
    if (Array.isArray(dentists) && dentists.length > 0) {
      for (const email of dentists) {
        if (typeof email === "string" && email.trim() !== "") {
          await mqttHandler.publish(
            "pearl-fix/clinic/create/email",
            JSON.stringify({ email })
          );
          console.log(`Published successful message to "pearl-fix/clinic/create/email": ${email}`);
        } else {
          console.error("Invalid email format in dentists array.");
        }
      }
    } else {
      console.error("No valid dentists provided.");
    }

    // Collect dentist data from the subscription
    const receivedDentists: any[] = await new Promise((resolve, reject) => {
      const dentistsData: any[] = [];
      const timeout = setTimeout(() => {
        // Resolve with collected dentists after timeout
        if (dentistsData.length > 0) {
          resolve(dentistsData);
        } else {
          reject(new Error("No dentists received from MQTT subscription"));
        }
      }, 5000); // Adjust timeout based on expected delays

      mqttHandler.subscribe("pearl-fix/clinic/create/dentist", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on /clinic/create/dentist topic:", message);

          if (message.dentist) {
            dentistsData.push(message.dentist);
          }
        } catch (error) {
          console.error("Error processing dentist message:", error);
        }
      });
    });


    // Create a new clinic with received dentists
    const newClinic = new Clinic({
      city,
      address,
      clinicName,
      openingHours,
      coordinates,
      dentists: receivedDentists, // Store received dentists
    });

    // Save the clinic to the database
    await newClinic.save();

    // Return the clinic details as response
    res.status(201).json({
      message: "Clinic created successfully",
      clinic: {
        id: newClinic.id,
        clinicName: newClinic.clinicName,
        city: newClinic.city,
        address: newClinic.address,
        openingHours: newClinic.openingHours,
        coordinates: newClinic.coordinates,
        dentists: receivedDentists, // Include dentists in the response
      },
    });
    console.log(newClinic);
    

    mqttHandler.close();
  } catch (error) {
    console.error("Error during clinic creation:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// Get all clinics
export const getAllClinics: RequestHandler = async (req, res): Promise<void> => {
  try {
    const clinics = await Clinic.find();

    // Prevent caching of the response
    res.setHeader('Cache-Control', 'no-store');

    res.status(200).json({ clinics });
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