import { RequestHandler } from "express";
import { jwtDecrypt } from "jose";

const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authorization header missing or malformed" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const secretKey = Buffer.from(process.env.JWT_SECRET!, 'base64');
    const decodedToken = await jwtDecrypt(token, secretKey);
    req.patient = decodedToken.payload.patient as { id: string };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

export default authenticate;
