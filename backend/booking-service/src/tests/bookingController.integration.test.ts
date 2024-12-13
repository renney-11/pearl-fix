import request from "supertest";
import mongoose from "mongoose";
import app from "../app"; // Ensure this imports your Express app
import Availability from "../models/Availability";
import Booking from "../models/Booking";

describe("Booking Controller", () => {
  jest.setTimeout(20000); // Increased timeout for long-running tests

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://localhost:27017/booking-test", {
      });
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Availability.deleteMany({});
    await Booking.deleteMany({});
  });

  describe("POST /api/v1/booking/create", () => {

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/v1/booking/create")
        .send({
          dentistId: "",
          patientEmail: "",
          timeSlot: {},
        });

      console.log(response.body); // Debugging log

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Missing required fields");
    });
  });

  describe("DELETE /api/v1/patient-cancel-booking/:bookingId", () => {
    it("should return 404 if booking not found", async () => {
      const response = await request(app)
        .delete(`/api/v1/patient-cancel-booking/675c208f017856629236f7b1`)
        .send({ patientId: new mongoose.Types.ObjectId() });
  
      console.log(response.body); // Debugging log
  
      expect(response.status).toBe(404);
      expect(response.body).toEqual({});
    });
  });
  

    it("should return 404 if booking not found (dentist)", async () => {
      const response = await request(app)
        .delete(`/api/v1/dentist-cancel-booking/675c208f017856629236f7b1`)
        .send({ dentistId: new mongoose.Types.ObjectId() });

      console.log(response.body); // Debugging log

      expect(response.status).toBe(404);
      expect(response.body).toEqual({});
    });
  });
