import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { base64url, EncryptJWT } from "jose";
import Patient from "../models/Patient";
import { IPatient } from "../models/Patient";

declare global {
  namespace Express {
    interface Request {
      patient?: {
        id: string;
      };
    }
  }
}

export const register: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if patient exists
    let patient: IPatient | null;
    patient = await Patient.findOne({ email });
    if (patient) {
      res.status(400).json({ message: "Patient already exists" });
      return;
    }
    // Create new patient
    patient = new Patient({
      name,
      email,
      password,
    });
    // Hash password
    const salt = await bcrypt.genSalt(10);
    patient.password = await bcrypt.hash(password, salt);

    // Save patient
    await patient.save();

    // Return token
    const payload = {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
      },
    };

    // generate JWT token
    const secretKey = base64url.decode(process.env.JWT_SECRET!);
    console.log("Decoded JWT_SECRET length:", secretKey.length); // Should print: 32
    if (secretKey.length !== 32) {
        throw new Error('Invalid JWT_SECRET length. It must be a 32-byte base64-encoded string for A256GCM.');
    }

    const token = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setExpirationTime('1h')
    .encrypt(secretKey);

    res.json({ token });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

// Login patient
export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if patient exists
    let patient: IPatient | null;
    patient = await Patient.findOne({ email });
    if (!patient) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Return token
    const payload = {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
      },
    };

    // generate JWT token
    const secretKey = base64url.decode(process.env.JWT_SECRET!);
    console.log("Decoded JWT_SECRET length:", secretKey.length); // Should print: 32
    if (secretKey.length !== 32) {
        throw new Error('Invalid JWT_SECRET length. It must be a 32-byte base64-encoded string for A256GCM.');
    }

    const token = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setExpirationTime('1h')
    .encrypt(secretKey);

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user
export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    if (!req.patient) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }
    const patient = await Patient.findById(req.patient.id).select(["-password", "-id"]); // Exclude password
    res.json(patient);
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};
