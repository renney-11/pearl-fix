import { register, login, registerDentist } from "../controllers/authController";
import Patient from "../models/Patient";
import Dentist from "../models/Dentist";
import { generateToken } from "../utils/tokenUtils";
import { Request, Response, NextFunction } from 'express';

jest.mock("../models/Patient");
jest.mock("../models/Dentist");
jest.mock("../utils/tokenUtils");
jest.mock("../mqtt/MqttHandler", () => {
  return {
    MQTTHandler: jest.fn().mockImplementation(() => {
      return {
        publish: jest.fn().mockResolvedValue(true),
        initialize: jest.fn().mockResolvedValue(true),
        connect: jest.fn().mockResolvedValue(true),
        subscribe: jest.fn().mockResolvedValue(true),
      };
    }),
  };
});

describe("AuthController", () => {
  describe("register", () => {

    it("should return a 405 status if patient when using register", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "johndoe@example.com",
          password: "password123",
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();
    
      await register(req, res, next);
    
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: "Use the message queue to register patients" });
      expect(next).not.toHaveBeenCalled();
    });    
  });

  describe("registerDentist", () => {

    it("should return a 400 status if dentist already exists", async () => {
      const req = {
        body: {
          name: "Dr. Smith",
          email: "smith@example.com",
          password: "password123",
          fikaBreak: { start: "15:00", end: "16:00" },
          lunchBreak: { start: "12:00", end: "13:00" },
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      (Dentist.findOne as jest.Mock).mockResolvedValueOnce({ email: "smith@example.com" });

      await registerDentist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Dentist already exists" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should register a new dentist and return a token", async () => {
      const req = {
        body: {
          name: "Dr. Smith",
          email: "smith@example.com",
          password: "password123",
          fikaBreak: { start: "15:00", end: "16:00" },
          lunchBreak: { start: "12:00", end: "13:00" },
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      const newDentist = {
        _id: "123456789",
        name: "Dr. Smith",
        email: "smith@example.com",
        password: "password123",
        fikaBreak: { start: "15:00", end: "16:00" },
        lunchBreak: { start: "12:00", end: "13:00" },
      };

      (Dentist.prototype.save as jest.Mock).mockResolvedValueOnce(newDentist);

      (generateToken as jest.Mock).mockResolvedValueOnce("token123");

      await registerDentist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ token: "token123" });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should return a 405 status if patient tries to login via HTTP", async () => {
      const req = {
        body: {
          email: "johndoe@example.com",
          password: "password123",
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();
    
      await login(req, res, next);
    
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: "Use the message queue to login users" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return a 405 status if dentist tries to login via HTTP", async () => {
      const req = {
        body: {
          email: "dentist@example.com",
          password: "password123",
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();
    
      await login(req, res, next);
    
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: "Use the message queue to login users" });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
