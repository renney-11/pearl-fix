import bcrypt from "bcryptjs";
import { RequestHandler } from "express";
import { jwtDecrypt } from "jose";
import { jwtVerify, JWTPayload } from "jose";
import mongoose from "mongoose";
import { validateEmailFormat, validateFields, validateNameHasSpace, validateStringLength } from "../middlewares/validators";
import Dentist, { IDentist } from "../models/Dentist";
import Patient, { IPatient } from "../models/Patient";
import { MQTTHandler } from "../mqtt/MqttHandler";
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

    mqttHandler.subscribe("pearl-fix/booking/find/patient-id", async (msg) => {
      try {
        // Parse the incoming message to extract the patientId
        const { patientId } = JSON.parse(msg.toString());
    
        if (!patientId) {
          console.error("Received patientId is missing.");
          return;
        }
    
        console.log(`Received patientId: ${patientId}. Fetching patient details...`);
    
        // Fetch the patient from the database using the patientId
        const patient = await Patient.findById(patientId).select("name email");
    
        if (!patient) {
          console.error(`No patient found for patientId: ${patientId}`);
          return;
        }
    
        console.log(`Patient details retrieved for patientId ${patientId}:`, patient);
    
        // Publish the patient's details to a response topic
        await mqttHandler.publish(
          "pearl-fix/booking/patient-email", // Topic to publish patient details
          JSON.stringify({
            patient: {
              id: patient._id,
              name: patient.name,
              email: patient.email,
            },
          })
        );
    
        console.log(`Published patient details for patientId ${patientId} to "pearl-fix/booking/patient-email".`);
      } catch (error) {
        console.error("Error processing patientId message:", error);
      }
    });
    

    // Subscribe to the topic where the dentist email is published
mqttHandler.subscribe("pearl-fix/booking/find/dentist-id", async (msg) => {
  try {
    // Parse the incoming message to extract the dentist's email
    const { email } = JSON.parse(msg.toString());

    if (!email) {
      console.error("Received email is missing.");
      return;
    }

    // Fetch the dentist by the provided email from the database
    const dentist = await Dentist.findOne({ email }).select("_id");

    if (!dentist) {
      console.error("Dentist not found in the database.");
      return;
    }

    const dentistId = dentist._id;
    console.log("Found dentistId:", dentistId);

    // Now publish the dentistId to the relevant topic
    await mqttHandler.publish(
      "pearl-fix/booking/find/dentist-email",  // This is the topic we are publishing to
      JSON.stringify({ dentistId })  // Send the dentistId in the message
    );
    
    console.log(`Published dentistId to "pearl-fix/booking/find/dentist-id": ${dentistId}`);
    
  } catch (error) {
    console.error("Error processing dentist email:", error);
  }
});

    // Subscribe to the topic where the booking service requests to find a dentist for a clinic
await mqttHandler.subscribe("pearl-fix/booking/find/dentist/for-clinic", async (msg) => {
  try {
    console.log("Message received from booking-service:", msg);

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse message:", err);
      return;
    }

    const { clinicId } = parsedMessage;  // Extract the clinicId from the message

    if (!clinicId) {
      console.error("Missing clinicId in the request");
      return;
    }

    // Find the dentist associated with the clinic
    let dentist: IDentist | null = await Dentist.findOne({ clinic: new mongoose.Types.ObjectId(clinicId) });

    if (!dentist) {
      console.error("No dentist found for clinicId:", clinicId);
      return;
    }

    console.log("Dentist found:", dentist);

    // Publish the dentist's email to a new topic for further processing
    await mqttHandler.publish(
      "pearl-fix/booking/find/dentist/email", // New topic to notify the relevant service
      JSON.stringify({ email: dentist.email }) // Send the dentist's email
    );
    console.log(`Published dentist's email to "pearl-fix/booking/find/dentist/email": ${dentist.email}`);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error processing find dentist message:", errorMessage);
  }
});

await mqttHandler.subscribe("pearl-fix/booking/canceled", async (msg) => {
  try {
    console.log("Message received from booking-service for cancellation:", msg);

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse cancellation message:", err);
      return;
    }

    const { bookingId } = parsedMessage; // Extract the bookingId

    if (!bookingId) {
      console.error("Missing bookingId in the request");
      return;
    }

    // Find the patient who has this booking
    const patient = await Patient.findOne({ bookings: bookingId });
    if (!patient) {
      console.error("No patient found for bookingId:", bookingId);
      return;
    }

    // Find the dentist who has this booking
    const dentist = await Dentist.findOne({ bookings: bookingId });
    if (!dentist) {
      console.error("No dentist found for bookingId:", bookingId);
      return;
    }

    console.log("Dentist and Patient found:", dentist.email, patient.email);

    // Publish dentist email
    await mqttHandler.publish(
      "pearl-fix/booking/canceled/dentist-email",
      JSON.stringify({ email: dentist.email })
    );
    console.log(`Published dentist's email to "pearl-fix/booking/canceled/dentist-email": ${dentist.email}`);

    // Publish patient email
    await mqttHandler.publish(
      "pearl-fix/booking/canceled/patient-email",
      JSON.stringify({ email: patient.email })
    );
    console.log(`Published patient's email to "pearl-fix/booking/canceled/patient-email": ${patient.email}`);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error processing canceled booking message:", errorMessage);
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

  await mqttHandler.subscribe("pearl-fix/authentication/verify-dentist", async (msg) => {
    try {
      const message = JSON.parse(msg.toString());
      console.log("Received MQTT message on 'pearl-fix/authentication/verify-dentist':", message);
  
      // Extract the token from the message
      const token = message.token;
  
      if (!token) {
        console.error("No token provided in the message.");
        return;
      }
  
      // Here you can add your token validation logic
      const decoded = await validateToken(token); // You need to implement this function
      if (!decoded) {
        console.error("Invalid token.");
        return;
      }
  
      const { id, type } = decoded;
  
      // Fetch the user based on the decoded token's id and type
      let user;
      if (type === "patient") {
        user = await Patient.findById(id).select("-password");
      } else if (type === "dentist") {
        user = await Dentist.findById(id).select("-password");
      }
  
      if (!user) {
        console.error(`User with ID ${id} not found.`);
        return;
      }
  
      // Now you can perform further logic with the validated user
      console.log("User verified:", user);
      await mqttHandler.publish(
        "pearl-fix/authentication/verify-dentist/email",
        JSON.stringify({ success: true, email: user.email })
      );
    } catch (error) {
      console.error("Error processing verify dentist message:", error);
    }
  });

  await mqttHandler.subscribe("pearl-fix/authentication/verify-patient", async (msg) => {
    console.log("Received MQTT message on 'pearl-fix/authentication/verify-patient':", msg.toString());
  
    try {
      // Parse the incoming message
      let message;
      try {
        message = JSON.parse(msg.toString());
      } catch (parseError) {
        console.error("Failed to parse MQTT message:", msg.toString(), parseError);
        return;
      }
  
      const { token } = message;
      if (!token) {
        console.error("No token provided in the message.");
        return;
      }
  
      // Validate the token
      const decoded = await validateToken(token);
      if (!decoded) {
        console.error("Invalid token provided:", token);
        return;
      }
  
      const { id, type } = decoded;
  
      // Ensure the user type is 'patient'
      if (type !== "patient") {
        console.error("Token is not associated with a patient:", decoded);
        return;
      }
  
      // Fetch the patient data
      const patient = await Patient.findById(id).select("-password");
      if (!patient) {
        console.error(`Patient with ID ${id} not found.`);
        await mqttHandler.publish(
          "pearl-fix/authentication/verify-patient/email",
          JSON.stringify({ success: false, error: "Patient not found" })
        );
        return;
      }
  
      console.log("Patient verified:", patient);
  
      // Publish a success message with the patient's email
      await mqttHandler.publish(
        "pearl-fix/authentication/verify-patient/email",
        JSON.stringify({ success: true, email: patient.email })
      );
      console.log("Published email response to 'pearl-fix/authentication/verify-patient/email':", patient.email);
  
    } catch (error) {
      console.error("Error processing verify patient message:", error);
  
      // Always publish a failure message if any error occurs
      await mqttHandler.publish(
        "pearl-fix/authentication/verify-patient/email",
        JSON.stringify({ success: false, error: "Internal server error" })
      );
    }
  });
  
  function getStoredTokenForUser(id: any) {
    throw new Error("Function not implemented.");
  }
  
  
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

export const getCurrentUser: RequestHandler = async (req, res): Promise<void> => {
  res.status(405).json({ message: "Use the message queue to getCurrent users" });
};

export const registerDentist: RequestHandler = async (req, res): Promise<void> => {
  console.log('Received request to register dentist'); // Debug log
  const { name, email, password, fikaBreak, lunchBreak } = req.body;

  try {
    if (!validateFields(req, res, ["name", "email", "password"])) return;
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

async function validateToken(token: string) {
  try {
    // Ensure your JWT secret key is a Buffer and is properly decoded
    const secretKey = Buffer.from(process.env.JWT_SECRET!, 'base64');  // This assumes your secret is base64 encoded.

    // Use jwtDecrypt from 'jose' to validate and decode the JWT
    const { payload } = await jwtDecrypt(token, secretKey);

    // Return the decoded payload (which includes user data)
    return payload;
  } catch (error) {
    console.error("Token validation failed:", error);
    return null;
  }
}
