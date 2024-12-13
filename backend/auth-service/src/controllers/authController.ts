import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { MQTTHandler } from "../mqtt/MqttHandler";
import Patient from "../models/Patient";
import Dentist from "../models/Dentist";
import { IPatient } from "../models/Patient";
import { IDentist } from "../models/Dentist";
import { validateFields, validateStringLength, validateEmailFormat, validateNameHasSpace } from "../middlewares/validators";
import { generateToken } from "../utils/tokenUtils"; // Import generateToken

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        type: "patient" | "dentist";
      };
    }
  }
}


const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

(async () => {
  try {
    await mqttHandler.connect();

    // Subscribe to the patient registration queue
    await mqttHandler.subscribe("pearl-fix/authentication/register", async (msg) => {
      try {
        console.log("Message received on registration:", msg);

        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse message:", err);
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ error: "Invalid message format" })
          );
          return;
        }

        const { name, email, password } = parsedMessage;

        const req = { body: { name, email, password } } as any;
        const res = {
          status: (code: number) => ({
            json: (data: any) => {
              throw new Error(JSON.stringify({ code, ...data }));
            },
          }),
        } as any;

        if (!validateFields(req, res, ["name", "email", "password"])) return;
        if (!validateStringLength(req, res, "name", 32, 8)) return;
        if (!validateStringLength(req, res, "email", 32, 8)) return;
        if (!validateStringLength(req, res, "password", 32, 8)) return;
        if (!validateEmailFormat(req, res, "email")) return;
        if (!validateNameHasSpace(req, res, "name")) return;

        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) {
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ error: "Patient already exists" })
          );
          console.log("Patient already exists:", email);
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const patient = new Patient({ name, email, password: hashedPassword });
        await patient.save();

        const token = await generateToken({ id: patient.id, type: "patient" });
        await mqttHandler.publish(
          "pearl-fix/authentication/authenticate",
          JSON.stringify({ token })
        );
        console.log("Patient registered and token published:", { name, email });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error processing registration message:", errorMessage);

        await mqttHandler.publish(
          "pearl-fix/authentication/authenticate",
          JSON.stringify({ message: "Error registering patient", error: errorMessage })
        );
      }
    });

    // Subscribe to the login queue
    await mqttHandler.subscribe("pearl-fix/authentication/login", async (msg) => {
      try {
        console.log("Message received on login:", msg);

        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse login message:", err);
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ message: "Invalid message format" })
          );
          return;
        }

        const { email, password } = parsedMessage;

        if (!email || !password) {
          console.error("Missing email or password in login request");
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ message: "Missing email or password" })
          );
          return;
        }

        const patient = await Patient.findOne({ email });

        if (!patient || !(await bcrypt.compare(password, patient.password))) {
          console.error("Invalid credentials for email:", email);
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ message: "Invalid credentials" })
          );
          return;
        }

        const token = await generateToken({ id: patient.id, type: "patient" });
        await mqttHandler.publish(
          "pearl-fix/authentication/authenticate",
          JSON.stringify({ token })
        );
        console.log("Login successful and token published for email:", email);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error processing login message:", errorMessage);

        await mqttHandler.publish(
          "pearl-fix/authentication/authenticate",
          JSON.stringify({ message: "Error during login", error: errorMessage })
        );
      }
    });

    // login method for dentists only
    await mqttHandler.subscribe("pearl-fix/authentication/dentist/login", async (msg) => {
      try {
        console.log("Message received on login:", msg);

        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse login message:", err);
          await mqttHandler.publish(
            "pearl-fix/authentication/dentist/authenticate",
            JSON.stringify({ message: "Invalid message format" })
          );
          return;
        }

        const { email, password } = parsedMessage;

        if (!email || !password) {
          console.error("Missing email or password in login request");
          await mqttHandler.publish(
            "pearl-fix/authentication/dentist/authenticate",
            JSON.stringify({ message: "Missing email or password" })
          );
          return;
        }

        const dentist = await Dentist.findOne({ email });

        if (!dentist || !(await bcrypt.compare(password, dentist.password))) {
          console.error("Invalid credentials for email:", email);
          await mqttHandler.publish(
            "pearl-fix/authentication/dentist/authenticate",
            JSON.stringify({ message: "Invalid credentials" })
          );
          return;
        }

        const token = await generateToken({ id: dentist.id, type: "dentist" });
        await mqttHandler.publish(
          "pearl-fix/authentication/dentist/authenticate",
          JSON.stringify({ token })
        );
        console.log("Login successful and token published for email:", email);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error processing login message:", errorMessage);

        await mqttHandler.publish(
          "pearl-fix/authentication/dentist/authenticate",
          JSON.stringify({ message: "Error during login", error: errorMessage })
        );
      }
    });

    // Create booking with patient
    await mqttHandler.subscribe("pearl-fix/booking/create/patient/email", async (msg) => {
      try {
        console.log("Message received from booking-service:", msg);
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse create booking message:", err);
          return;
        }

        const { email } = parsedMessage;

        if (!email) {
          console.error("Missing patient email in create booking request");
          await mqttHandler.publish(
            "pearl-fix/booking/create/patient",
            JSON.stringify({ message: "Missing email" })
          );
          return;
        }
        let patient: IPatient | null = await Patient.findOne({ email });
        if (!patient) {
          await mqttHandler.publish(
            "pearl-fix/booking/create/patient",
            JSON.stringify({ error: "Patient with this email does not exist." })
          );
          return;
        }
        await mqttHandler.publish(
          "pearl-fix/booking/create/patient",
          JSON.stringify({ patient })
        );
        console.log("Patient found successfully", patient);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error processing find patient message:", errorMessage);
      }
    });
    await mqttHandler.subscribe("pearl-fix/booking/update/patient", handleBookingUpdatePatientMessage);

    await mqttHandler.subscribe("pearl-fix/booking/update/dentist", handleBookingUpdateDentistMessage);

    // Create clinic with dentist
    await mqttHandler.subscribe("pearl-fix/clinic/create/email", async (msg) => {
      try {
        console.log("Message received from clinic-service:", msg);

        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse cetae clinic message:", err);
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ message: "Invalid message format" })
          );
          return;
        }

        const { email } = parsedMessage;

        if (!email) {
          console.error("Missing email in create clinic request");
          await mqttHandler.publish(
            "pearl-fix/authentication/authenticate",
            JSON.stringify({ message: "Missing email" })
          );
          return;
        }

        let dentist: IDentist | null = await Dentist.findOne({ email });
        // let userType: "patient" | "dentist" = "patient";

        if (!dentist) {
          await mqttHandler.publish(
            "pearl-fix/clinic/create/dentist",
            JSON.stringify({ error: "Dentist with this email does not exist." })
          );
          return;
        }

        await mqttHandler.publish(
          "pearl-fix/clinic/create/dentist",
          JSON.stringify({ dentist })
        );
        console.log("Dentist found successfully", dentist);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error processing find dentist message:", errorMessage);

      }
    });
    
    await mqttHandler.subscribe("pearl-fix/clinic/create/id", handleClinicCreateIdMessage);

    await mqttHandler.subscribe("pearl-fix/availability/remove", async (msg) => {
      try {
        console.log("Message received for availability update:", msg);
    
        const parsedMessage = JSON.parse(msg);
        const { dentistId, availabilityId } = parsedMessage;
    
        if (!dentistId) {
          console.error("Missing dentistId in availability update message");
          return;
        }
    
        if (availabilityId === null) {
          await Dentist.updateOne(
            { _id: dentistId },
            { $set: { availability: [] } } // Clear the availability array
          );
          console.log(`All availability references removed for dentist ${dentistId}`);
        } else {
          // Update dentist's availability field
          await Dentist.updateOne(
            { _id: dentistId },
            { $addToSet: { availability: availabilityId } }
          );
          console.log(`Availability updated for dentist ${dentistId}`);
        }
      } catch (err) {
        console.error("Error processing availability update message:", err);
      }
    });

    // Create availability with dentist
    await mqttHandler.subscribe("pearl-fix/availability/create/email", async (msg) => {
      try {
        console.log("Message received from availability-service:", msg);

        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse create availability message:", err);
          return;
        }

        const { email } = parsedMessage;

        if (!email) {
          console.error("Missing email in create availability request");
          await mqttHandler.publish(
            "pearl-fix/availability/create/dentist",
            JSON.stringify({ message: "Missing email" })
          );
          return;
        }

        let dentist: IDentist | null = await Dentist.findOne({ email });
        // let userType: "patient" | "dentist" = "patient";

        if (!dentist) {
          await mqttHandler.publish(
            "pearl-fix/availability/create/dentist",
            JSON.stringify({ error: "Dentist with this email does not exist." })
          );
          return;
        }

        await mqttHandler.publish(
          "pearl-fix/availability/create/dentist",
          JSON.stringify({ dentist })
        );
        console.log("Dentist found successfully", dentist);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error processing find dentist message:", errorMessage);
      }
    });
    await mqttHandler.subscribe("pearl-fix/availability/create/id", handleAvailabilityCreateIdMessage);

    console.log("Subscriptions for registration and login initialized.");
  } catch (error) {
    console.error("Failed to connect or initialize RabbitMQ subscriptions:", error);
  }

  // for closing mqtt on ctrl+c in terminal
  process.on('SIGINT', async () => {
    try {
      console.log("SIGINT received, closing MQTTHandler connection.");
      await mqttHandler.close();
      process.exit(0);
    } catch (error) {
      console.error("Error closing MQTTHandler connection:", error);
      process.exit(1);
    }
  });
  
})();

    // Update the dentist's availability and bookings fields
const handleBookingUpdateDentistMessage = async (msg: string): Promise<void> => {
  try {
    console.log("Message received on booking update dentist:", msg);

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse booking update message:", err);
      return;
    }

    const { dentistId, availability, booking } = parsedMessage;

    if (!dentistId || !availability?._id || !booking?._id) {
      console.error("Missing dentist ID, availability ID, or booking ID in message");
      return;
    }

    const updatedDentist = await Dentist.findOneAndUpdate(
      { _id: dentistId },
      {
        $push: { bookings: booking._id },
        $set: { availability: availability._id },
      },
      { new: true }
    );

    if (!updatedDentist) {
      console.error(`Dentist with ID ${dentistId} not found`);
    } else {
      console.log(`Successfully updated dentist with booking and availability:`, updatedDentist);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error processing booking update dentist message:", errorMessage);
  }
};

    // Update the patient's bookings field
const handleBookingUpdatePatientMessage = async (msg: string): Promise<void> => {
  try {
    console.log("Message received on booking update patient:", msg);

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse booking update message:", err);
      return;
    }

    const { patientId, booking } = parsedMessage;

    if (!patientId || !booking?._id) {
      console.error("Missing patient ID or booking ID in message");
      return;
    }

    const updatedPatient = await Patient.findOneAndUpdate(
      { _id: patientId },
      { $push: { bookings: booking._id } },
      { new: true }
    );

    if (!updatedPatient) {
      console.error(`Patient with ID ${patientId} not found`);
    } else {
      console.log(`Successfully updated patient with booking:`, updatedPatient);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error processing booking update message:", errorMessage);
  }
};

const handleClinicCreateIdMessage = async (msg: string): Promise<void> => {
  try {
    console.log("Message received on clinic create ID:", msg);

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse clinic create ID message:", err);
      return;
    }

    const { id: clinicId, emails } = parsedMessage;

    if (!clinicId || !Array.isArray(emails)) {
      console.error("Missing clinic ID or dentist emails in message");
      return;
    }

    // Update the dentist's clinic field for each email
    for (const email of emails) {
      const updatedDentist = await Dentist.findOneAndUpdate(
        { email }, // Find the dentist by email
        { clinic: clinicId }, // Set the clinic field to the clinic ID
        { new: true } // Return the updated document
      );

      if (!updatedDentist) {
        console.error(`Dentist with email ${email} not found`);
      } else {
        console.log(`Successfully updated dentist:`, updatedDentist);
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error processing clinic ID message:", errorMessage);
  }
};

const handleAvailabilityCreateIdMessage = async (msg: string): Promise<void> => {
  try {
    console.log("Message received on availability create ID:", msg);

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse availability create ID message:", err);
      return;
    }

    const { id: availabilityId, email } = parsedMessage;

    if (!availabilityId || !email || typeof email !== "string") {
      console.error("Missing availability ID or dentist email in message");
      return;
    }

    // Update the dentist's availability field using the provided email
    const updatedDentist = await Dentist.findOneAndUpdate(
      { email }, // Find the dentist by email
      { $push: { availability: availabilityId } }, // Add the availability ID to the availability array
      { new: true } // Return the updated document
    );

    if (!updatedDentist) {
      console.error(`Dentist with email ${email} not found`);
    } else {
      console.log(`Successfully updated dentist:`, updatedDentist);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error processing availability ID message:", errorMessage);
  }
};

export const register: RequestHandler = async (req, res): Promise<void> => {
  res.status(405).json({ message: "Use the message queue to register patients" });
};

export const login: RequestHandler = async (req, res): Promise<void> => {
  res.status(405).json({ message: "Use the message queue to login users" });
};

export const registerDentist: RequestHandler = async (req, res): Promise<void> => {
  console.log('Received request to register dentist'); // Debug log
  const { name, email, password, fikaBreak, lunchBreak } = req.body;

  try {
    if (!validateFields(req, res, ["name", "email", "password"])) return;
    if (!validateStringLength(req, res, "name", 32, 8)) return;
    if (!validateStringLength(req, res, "email", 32, 8)) return;
    if (!validateStringLength(req, res, "password", 32, 8)) return;
    if (!validateEmailFormat(req, res, "email")) return;
    if (!validateNameHasSpace(req, res, "name")) return;

    const existingDentist = await Dentist.findOne({ email });
    if (existingDentist) {
      await mqttHandler.publish("pearl-fix/authentication/authenticate", JSON.stringify({ message: "Dentist already exists" }));
      res.status(400).json({ message: "Dentist already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dentist = new Dentist({
      name,
      email,
      password: hashedPassword,
      fikaBreak,
      lunchBreak,
    });
    await dentist.save();

    const token = await generateToken({ id: dentist.id, type: "dentist" });
    await mqttHandler.publish("pearl-fix/authentication/authenticate", JSON.stringify({ token }));

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error in dentist registration:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCurrentUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user =
      req.user.type === "patient"
        ? await Patient.findById(req.user.id).select("-password")
        : await Dentist.findById(req.user.id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};