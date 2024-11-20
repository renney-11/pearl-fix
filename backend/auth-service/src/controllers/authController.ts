import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { base64url, EncryptJWT } from "jose";
import User from "../models/User";
import { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const register: RequestHandler = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user exists
    let user: IUser | null;
    user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ message: "User already exists" });
      return;
    }
    // Create new user
    user = new User({
      name,
      email,
      password,
      role,
    });
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Return token
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    // generate JWT token
    const secretKey = base64url.decode(process.env.JWT_SECRET!);
    const token = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" })
      .encrypt(secretKey);

    res.json({ token });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

// Login user
export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    let user: IUser | null;
    user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Return token
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    // generate JWT token
    const secretKey = base64url.decode(process.env.JWT_SECRET!);
    const token = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
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
    if (!req.user) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }
    const user = await User.findById(req.user.id).select(["-password", "-id"]); // Exclude password
    res.json(user);
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};
