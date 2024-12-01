import { Request, Response } from "express";

// Validate presence of required fields
export const validateFields = (req: Request, res: Response, fields: string[]): boolean => {
  for (const field of fields) {
    if (!req.body[field] || req.body[field].trim() === "") {
      const errorMessage = `All fields, ${fields.join(", ")}, are required`;
      res.status(400).json({ message: errorMessage });
      return false;
    }
  }
  return true;
};

// Validate max string length
export const validateStringLength = (
  req: Request,
  res: Response,
  field: string,
  maxLength: number,
  minLength: number = 0
): boolean => {
  const value = req.body[field];
  if (value) {
    if (value.length < minLength) {
      const errorMessage = `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${minLength} characters long`;
      res.status(400).json({ message: errorMessage });
      return false;
    }
    if (value.length > maxLength) {
      const errorMessage = `${field.charAt(0).toUpperCase() + field.slice(1)} must be less than or equal to ${maxLength} characters long`;
      res.status(400).json({ message: errorMessage });
      return false;
    }
  }
  return true;
};


// Validate email format
export const validateEmailFormat = (req: Request, res: Response, field: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (req.body[field] && !emailRegex.test(req.body[field])) {
    const errorMessage = "Invalid email format";
    res.status(400).json({ message: errorMessage });
    return false;
  }
  return true;
};

// Validate array of enum strings
export const validateEnumArray = (req: Request, res: Response, field: string, validValues: string[]): boolean => {
  if (req.body[field] && (!Array.isArray(req.body[field]) || !req.body[field].every((value: string) => validValues.includes(value)))) {
    const errorMessage = `${field} must be an array containing only the following values: ${validValues.join(", ")}`;
    res.status(400).json({ message: errorMessage });
    return false;
  }
  return true;
};

// Validate name contains a space (ensures first and last name)
export const validateNameHasSpace = (req: Request, res: Response, field: string): boolean => {
  const value = req.body[field];
  if (value && !value.includes(" ")) {
    const errorMessage = `${field.charAt(0).toUpperCase() + field.slice(1)} must include both first and last name separated by a space`;
    res.status(400).json({ message: errorMessage });
    return false;
  }
  return true;
};
