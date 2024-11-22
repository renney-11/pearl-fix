import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { base64url, EncryptJWT } from "jose";
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

// Register a new patient
export const register: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let patient = await Patient.findOne({ email });
    if (patient) {
      res.status(400).json({ message: "Patient already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    patient = new Patient({ name, email, password: hashedPassword });
    await patient.save();

    const token = await generateToken({ id: patient.id, type: "patient" });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Register a new dentist
export const registerDentist: RequestHandler = async (req, res) => {
  const { name, email, password, fikaBreak, lunchBreak, workdays } = req.body;

  try {
    let dentist = await Dentist.findOne({ email });
    if (dentist) {
      res.status(400).json({ message: "Dentist already exists" });
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
      return;
    }

    const token = await generateToken({ id: user.id, type: userType });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
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
