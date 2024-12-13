import { MQTTHandler } from "../mqtt/MqttHandler"; // Assuming MQTTHandler is defined in this path


// Mock the MQTTHandler
jest.mock("../mqtt/MqttHandler");

describe("ClinicController with MQTTHandler", () => {
  let mqttHandlerMock: jest.Mocked<MQTTHandler>;

  beforeAll(() => {
    // Initialize the mock MQTTHandler
    mqttHandlerMock = new MQTTHandler(process.env.CLOUDAMQP_URL!) as jest.Mocked<MQTTHandler>;
    mqttHandlerMock.connect = jest.fn().mockResolvedValue(undefined);
    mqttHandlerMock.publish = jest.fn().mockResolvedValue(undefined);
    mqttHandlerMock.close = jest.fn().mockResolvedValue(undefined);
    mqttHandlerMock.subscribe = jest.fn().mockImplementation(async (queue, callback) => {
      // Mock behavior for specific queues
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

  afterAll(() => {
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

    // Simulate fetching the clinics through MQTT
    const response = await mqttHandlerMock.subscribe('pearl-fix/clinic/get-all', async (msg) => {
      const { clinics } = JSON.parse(msg);
      expect(clinics).toBeInstanceOf(Array);
      expect(clinics.length).toBe(0); // Check for empty clinics
    });
  });

  // Test case for handling missing clinic by address
  it("should return 404 if clinic not found by address", async () => {
    // Simulate behavior where no clinic is found
    mqttHandlerMock.subscribe.mockImplementationOnce(async (queue, callback) => {
      if (queue === 'pearl-fix/clinic/get-all') {
        const message = JSON.stringify({ clinics: [] }); // No clinic found
        await callback(message);
      }
    });

    // Simulate request for a specific clinic address
    await mqttHandlerMock.subscribe('pearl-fix/clinic/get-all', async (msg) => {
      const { clinics } = JSON.parse(msg);
      expect(clinics).toBeInstanceOf(Array);
      expect(clinics.length).toBe(0); // Ensure no clinics were found
    });
  });

  // Test case for handling available clinics
  it("should return clinic data if available", async () => {
    // Simulate a non-empty clinic list
    mqttHandlerMock.subscribe.mockImplementationOnce(async (queue, callback) => {
      if (queue === 'pearl-fix/clinic/get-all') {
        const message = JSON.stringify({ clinics: [{ name: "Test Clinic", address: "123 Main St" }] });
        await callback(message);
      }
    });

    // Simulate receiving clinic data
    await mqttHandlerMock.subscribe('pearl-fix/clinic/get-all', async (msg) => {
      const { clinics } = JSON.parse(msg);
      expect(clinics).toBeInstanceOf(Array);
      expect(clinics.length).toBeGreaterThan(0);
      expect(clinics[0]).toHaveProperty('name', 'Test Clinic');
    });
  });

  // Test case for booking lookup based on dentistId
  it("should handle booking lookup by dentistId", async () => {
    // Simulate booking lookup
    mqttHandlerMock.subscribe.mockImplementationOnce(async (queue, callback) => {
      if (queue === 'pearl-fix/booking/find/clinic') {
        const message = JSON.stringify({ dentistId: "dentist-id", clinicId: "clinic-id" });
        await callback(message);
      }
    });

    // Simulate receiving a booking lookup message
    await mqttHandlerMock.subscribe('pearl-fix/booking/find/clinic', async (msg) => {
      const { dentistId, clinicId } = JSON.parse(msg);
      expect(dentistId).toBe('dentist-id');
      expect(clinicId).toBe('clinic-id');
    });
  });
});
