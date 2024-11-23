import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { base64url, EncryptJWT } from "jose";
import User from "../models/User";
import { IUser } from "../models/User";
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
mqttHandler.connect(); // Ensure RabbitMQ connection is established

// Register User
export const register: RequestHandler = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    let user: IUser | null;
    user = await User.findOne({ email });
    if (user) {
      const errorMessage = { message: "User already exists" };
      res.status(400).json(errorMessage);
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
      return;
    }

    user = new User({ name, email, password, role });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    const secretKey = base64url.decode(process.env.JWT_SECRET!);

    if (secretKey.length !== 32) {
      throw new Error('Invalid JWT_SECRET length. It must be 32 bytes for A256GCM.');
    }

    const token = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setExpirationTime("1h")
      .encrypt(secretKey);

    res.json({ token });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
  } catch (error) {
    console.error(error);
    const errorMessage = { message: "Server error" };
    res.status(500).json(errorMessage);
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
  }
};

// Login User
export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user: IUser | null;
    user = await User.findOne({ email });
    if (!user) {
      const errorMessage = { message: "Invalid credentials" };
      res.status(400).json(errorMessage);
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const errorMessage = { message: "Invalid credentials" };
      res.status(400).json(errorMessage);
      await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
      return;
    }

    const payload = { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    const secretKey = base64url.decode(process.env.JWT_SECRET!);

    if (secretKey.length !== 32) {
      throw new Error('Invalid JWT_SECRET length. It must be 32 bytes for A256GCM.');
    }

    const token = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setExpirationTime("1h")
      .encrypt(secretKey);

    res.json({ token });
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
  } catch (error) {
    console.error(error);
    const errorMessage = { message: "Server error" };
    res.status(500).json(errorMessage);
    await mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
  }
};

// Get Current User
export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }
    const user = await User.findById(req.user.id).select(["-password", "-id"]); // Exclude sensitive fields
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
