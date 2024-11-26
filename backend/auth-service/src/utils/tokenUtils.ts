import { base64url, EncryptJWT } from "jose";

export const generateToken = async (payload: { id: string; type: "patient" | "dentist" }) => {
  const secretKey = base64url.decode(process.env.JWT_SECRET!);
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setExpirationTime("1h")
    .encrypt(secretKey);
};
