import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import Availability from "../models/Availability";
import { MQTTHandler } from "../mqtt/MqttHandler";

jest.mock("../mqtt/MqttHandler");

describe("Availability Controller", () => {
  jest.setTimeout(10000);

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://localhost:27017/availability-test", {
      });
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Availability.deleteMany({});
  });

  describe("POST /api/v1/availability/create", () => {

    it("should return 400 if dentist is invalid", async () => {
      const response = await request(app)
        .post("/api/v1/availability/create")
        .send({
          dentist: "",
          workDays: ["Monday", "Tuesday"],
          timeSlots: [
            { start: "09:00", end: "10:00" },
            { start: "10:00", end: "11:00" },
          ],
          date: "2024-12-13",
        });

      console.log(response.body); // Debugging log

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "No valid dentist provided in request.");
    });
  });

  describe("GET /api/v1/availability/:dentistId", () => {
    it("should get availability", async () => {
      const availability = new Availability({
        dentist: new mongoose.Types.ObjectId(),
        workDays: ["Monday", "Tuesday"],
        timeSlots: [
          { start: new Date(), end: new Date(), status: "available" },
        ],
      });
      await availability.save();

      const response = await request(app).get(`/api/v1/availability/${availability.dentist}`);

      console.log(response.body); // Debugging log

      expect(response.status).toBe(200);
      expect(response.body.availability).toHaveProperty("dentist", availability.dentist.toString());
    });

    it("should return 404 if availability not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/v1/availability/${invalidId}`);

      console.log(response.body); // Debugging log

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message", "Availability not found");
    });
  });

  describe("DELETE /api/v1/availability/:dentistId/:timeSlotId?", () => {
    it("should remove availability or time slot", async () => {
      const availability = new Availability({
        dentist: new mongoose.Types.ObjectId(),
        workDays: ["Monday", "Tuesday"],
        timeSlots: [
          { _id: new mongoose.Types.ObjectId(), start: new Date(), end: new Date(), status: "available" },
        ],
      });
      await availability.save();
  
      const response = await request(app).delete(`/api/v1/availability/${availability.dentist}/${availability.timeSlots[0]._id}`);
  
      console.log(response.body); // Debugging log
  
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Availability removed successfully");
    });
    
      it("should return 404 if availability not found", async () => {
        const invalidId = new mongoose.Types.ObjectId();
        const response = await request(app).delete(`/api/v1/availability/${invalidId}/nonexistenttimeslot`);
    
        console.log(response.body); // Debugging log
    
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("message", "Availability not found");
      });
    });
});
