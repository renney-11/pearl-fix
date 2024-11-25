import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { base64url, EncryptJWT } from "jose";
import { MQTTHandler } from "../../../mqtt/MqttHandler";
import Patient from "../models/Patient";
import Dentist from "../models/Dentist";
import { IPatient } from "../models/Patient";
import { IDentist } from "../models/Dentist";

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
mqttHandler.connect(); // Ensure RabbitMQ connection is established

// Register a new patient
export const register: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let patient = await Patient.findOne({ email });
    if (patient) {
      res.status(400).json({ message: "Patient already exists" });
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Patient already exists" })); // Convert object to string
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    patient = new Patient({ name, email, password: hashedPassword });
    await patient.save();
    const token = await generateToken({ id: patient.id, type: "patient" });
    res.json({ token });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(error)); // Convert object to string
  }
};

// Register a new dentist
export const registerDentist: RequestHandler = async (req, res) => {
  const { name, email, password, fikaBreak, lunchBreak, workdays } = req.body;

  try {
    let dentist = await Dentist.findOne({ email });
    if (dentist) {
      res.status(400).json({ message: "Dentist already exists" });
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Dentist already exists" })); // Convert object to string
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    dentist = new Dentist({
      name,
      email,
      password: hashedPassword,
      fikaBreak,
      lunchBreak,
      workdays,
    });
    await dentist.save();

    const token = await generateToken({ id: dentist.id, type: "dentist" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(error)); // Convert object to string
  }
};

// Login for both patients and dentists
export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user: IPatient | IDentist | null;
    let userType: "patient" | "dentist";

    user = await Patient.findOne({ email });
    userType = "patient";

    if (!user) {
      user = await Dentist.findOne({ email });
      userType = "dentist";
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(400).json({ message: "Invalid credentials" });
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Invalid credentials" })); // Convert object to string
      return;
    }

    const token = await generateToken({ id: user.id, type: userType });
    res.json({ token });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
  } catch (error) {
    console.error(error);
    const errorMessage = { message: "Server error" };
    res.status(500).json(errorMessage);
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
  }
};

// Get current user details
export const getCurrentUser: RequestHandler = async (req, res) => {
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
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to generate JWT token
const generateToken = async (payload: { id: string; type: "patient" | "dentist" }) => {
  const secretKey = base64url.decode(process.env.JWT_SECRET!);
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setExpirationTime("1h")
    .encrypt(secretKey);
};
