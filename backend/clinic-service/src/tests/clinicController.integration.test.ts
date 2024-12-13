import request from "supertest";
import app from "../app"; // Assume this is where your express app is defined
import { config } from "dotenv";
import mongoose from "mongoose";
import { MQTTHandler } from "../mqtt/MqttHandler";

// Load environment variables from .env file
config();

// Mock the MQTTHandler
jest.mock("../mqtt/MqttHandler");

describe("ClinicController", () => {
  let mqttHandlerMock: jest.Mocked<MQTTHandler>;

  beforeAll(async () => {
    // Initialize the mock MQTTHandler
    mqttHandlerMock = new MQTTHandler(process.env.CLOUDAMQP_URL!) as jest.Mocked<MQTTHandler>;
    mqttHandlerMock.connect = jest.fn().mockResolvedValue(undefined);
    mqttHandlerMock.publish = jest.fn().mockResolvedValue(undefined);
    mqttHandlerMock.close = jest.fn().mockResolvedValue(undefined);
    mqttHandlerMock.subscribe = jest.fn().mockImplementation(async (queue, callback) => {
      // Custom logic for different topics
      if (queue === 'pearl-fix/clinic/get-all') {
        const message = JSON.stringify({ clinics: [{ name: "Test Clinic" }] });
        await callback(message);
      }
      if (queue === 'pearl-fix/booking/find/clinic') {
        const message = JSON.stringify({ dentistId: "dentist-id" });
        await callback(message);
      }
    });
  });

  afterAll(async () => {
    await mongoose.connection.close(); // Ensure the Mongoose connection is closed
    await mqttHandlerMock.close(); // Ensure MQTT handler is closed
    jest.clearAllMocks(); // Clear mocks after tests
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  // Test case for getting all clinics
  it("should handle empty clinics array gracefully", async () => {
    // Mock MQTTHandler to return an empty clinics array
    mqttHandlerMock.subscribe.mockImplementationOnce(async (queue, callback) => {
      if (queue === 'pearl-fix/clinic/get-all') {
        const message = JSON.stringify({ clinics: [] });
        await callback(message);
      }
    });

    const response = await request(app).get("/api/v1/clinic/");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("clinics");
    expect(response.body.clinics).toBeInstanceOf(Array);
    expect(response.body.clinics.length).toBe(0);
  });

  // Test case for getting a clinic by address
  it("should return 404 if clinic not found by address", async () => {
    const response = await request(app).get(`/api/v1/clinic/nonexistent-address`);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Clinic not found");
  });
});
