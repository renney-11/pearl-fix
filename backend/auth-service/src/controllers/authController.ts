import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { MQTTHandler } from "../../../mqtt/MqttHandler";
import Patient from "../models/Patient";
import Dentist from "../models/Dentist";
import { IPatient } from "../models/Patient";
import { IDentist } from "../models/Dentist";
import { validateFields, validateStringLength, validateEmailFormat, validateDentistOptionalFields } from "../middlewares/validators";
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
mqttHandler.connect(); // Ensure RabbitMQ connection is established

// Register a new patient
export const register: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input fields
  if (!validateFields(req, res, ["name", "email", "password"])) return;
  if (!validateStringLength(req, res, "name", 32)) return;
  if (!validateEmailFormat(req, res, "email")) return;
  if (!validateStringLength(req, res, "email", 32)) return;
  if (!validateStringLength(req, res, "password", 32)) return;

  try {
    let patient = await Patient.findOne({ email });
    if (patient) {
      res.status(400).json({ message: "Patient already exists" });
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Patient already exists" }));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    patient = new Patient({ name, email, password: hashedPassword });
    await patient.save();
    const token = await generateToken({ id: patient.id, type: "patient" });
    res.json({ token });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Server error" }));
  }
};

// Register a new dentist
export const registerDentist: RequestHandler = async (req, res) => {
  const { name, email, password, fikaBreak, lunchBreak, workdays } = req.body;

  // Validate required fields
  if (!validateFields(req, res, ["name", "email", "password"])) return;
  if (!validateStringLength(req, res, "name", 32)) return;
  if (!validateEmailFormat(req, res, "email")) return;
  if (!validateStringLength(req, res, "email", 32)) return;
  if (!validateStringLength(req, res, "password", 32)) return;

  // Validate optional fields
  if (!validateDentistOptionalFields(req, res)) return;

  try {
    let dentist = await Dentist.findOne({ email });
    if (dentist) {
      res.status(400).json({ message: "Dentist already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const dentistData = {
      name,
      email,
      password: hashedPassword,
      fikaBreak: fikaBreak || { start: "15:00", end: "16:00" },
      lunchBreak: lunchBreak || { start: "12:00", end: "13:00" },
      workdays: workdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    };

    dentist = new Dentist(dentistData);
    await dentist.save();

    const token = await generateToken({ id: dentist.id, type: "dentist" });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
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
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Invalid credentials" }));
      return;
    }

    const token = await generateToken({ id: user.id, type: userType });
    res.json({ token });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Server error" }));
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