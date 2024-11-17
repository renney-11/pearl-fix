import { RequestHandler } from "express";
import jose from "jose";

const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Authorization header missing or malformed" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token using jose
    const secretKey = jose.base64url.decode(process.env.JWT_SECRET!);
    const decodedToken = await jose.jwtDecrypt(token, secretKey);

    req.user = decodedToken.payload.user as { id: string };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

export default authenticate;
