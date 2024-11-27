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

(async () => {
  try {
    await mqttHandler.connect();
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
  }
})();

export const register: RequestHandler = async (req, res): Promise<void> => {
  const { name, email, password } = req.body;

  // Validate input fields
  if (!validateFields(req, res, ["name", "email", "password"])) return;
  if (!validateStringLength(req, res, "name", 32)) return;
  if (!validateEmailFormat(req, res, "email")) return;
  if (!validateStringLength(req, res, "email", 32)) return;
  if (!validateStringLength(req, res, "password", 32)) return;

  try {
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Patient already exists" }));
      res.status(400).json({ message: "Patient already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const patient = new Patient({ name, email, password: hashedPassword });
    await patient.save();

    const token = await generateToken({ id: patient.id, type: "patient" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token }));

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error in patient registration:", error);
    res.status(500).json({ message: "Server error" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Server error" }));
  }
};

export const registerDentist: RequestHandler = async (req, res): Promise<void> => {
  console.log('Received request to register dentist'); // Debug log
  const { name, email, password, fikaBreak, lunchBreak, workdays } = req.body;

  try {
    const existingDentist = await Dentist.findOne({ email });
    if (existingDentist) {
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Dentist already exists" }));
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
      workdays,
    });
    await dentist.save();

    const token = await generateToken({ id: dentist.id, type: "dentist" });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token }));

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error in dentist registration:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login: RequestHandler = async (req, res): Promise<void> => {
  const { email, password } = req.body;

  try {
    let user: IPatient | IDentist | null = await Patient.findOne({ email });
    let userType: "patient" | "dentist" = "patient";

    if (!user) {
      user = await Dentist.findOne({ email });
      userType = "dentist";
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ message: "Invalid credentials" }));
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = await generateToken({ id: user.id, type: userType });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token }));

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error in login:", error);
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
