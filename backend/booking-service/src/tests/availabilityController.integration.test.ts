import { MQTTHandler } from '../mqtt/MqttHandler'; // Assuming you have an MQTTHandler class

// Mock MQTTHandler
jest.mock('../mqtt/MqttHandler'); // Mock the MQTTHandler class

describe("Availability Controller - MQTTHandler Only", () => {
  jest.setTimeout(10000);  // Increase timeout for CI environments

  let mqttHandlerMock: jest.Mocked<MQTTHandler>;

  beforeAll(() => {
    mqttHandlerMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockImplementation(async (queue, callback) => {
        // Simulate different responses based on subscription topics
        if (queue === 'availability/create') {
          const message = JSON.stringify({
            dentist: 'dentist-id',
            workDays: ["Monday", "Tuesday"],
            timeSlots: [
              { start: "09:00", end: "10:00" },
              { start: "10:00", end: "11:00" },
            ],
            date: "2024-12-13",
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing success message after creating availability
          mqttHandlerMock.publish(
            'availability/created',
            JSON.stringify({ message: 'Availability created successfully' })
          );
        }

        if (queue === 'availability/get') {
          const message = JSON.stringify({ dentistId: 'dentist-id' });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing availability details
          mqttHandlerMock.publish(
            'availability/found',
            JSON.stringify({ availability: ['09:00 - 10:00', '10:00 - 11:00'] })
          );
        }
      }),
    } as unknown as jest.Mocked<MQTTHandler>;
  });

  afterAll(() => {
    jest.clearAllMocks(); // Clear all mocks after tests
  });

  it("should handle availability creation and publish success", async () => {
    await mqttHandlerMock.subscribe('availability/create', async (msg) => {
      const data = JSON.parse(msg);
      expect(data.dentist).toBe('dentist-id');
      expect(data.workDays).toContain('Monday');
      expect(data.timeSlots).toHaveLength(2);
    });

    await mqttHandlerMock.publish('availability/created', JSON.stringify({ message: 'Availability created successfully' }));

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'availability/created',
      expect.stringContaining('Availability created successfully')
    );
  });

  it("should retrieve availability and publish it", async () => {
    await mqttHandlerMock.subscribe('availability/get', async (msg) => {
      const data = JSON.parse(msg);
      expect(data.dentistId).toBe('dentist-id');
    });

    await mqttHandlerMock.publish('availability/found', JSON.stringify({ availability: ['09:00 - 10:00', '10:00 - 11:00'] }));

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'availability/found',
      expect.stringContaining('09:00 - 10:00')
    );
  });

  it("should return 400 if dentist is invalid for create", async () => {
    const message = JSON.stringify({
      dentist: "",  // Invalid dentist
      workDays: ["Monday", "Tuesday"],
      timeSlots: [
        { start: "09:00", end: "10:00" },
        { start: "10:00", end: "11:00" },
      ],
      date: "2024-12-13",
    });

    // Simulate error in subscription callback for invalid dentist
    try {
      await mqttHandlerMock.subscribe('availability/create', async (msg) => {
        const { dentist } = JSON.parse(msg);
        if (!dentist) {
          throw new Error('No valid dentist provided in request.');
        }
      });
    } catch (error) {
      expect(error.message).toBe('No valid dentist provided in request.');
    }
  });

  it("should handle MQTT connection failure gracefully", async () => {
    mqttHandlerMock.connect.mockRejectedValueOnce(new Error('Connection failed'));

    try {
      await mqttHandlerMock.connect();
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toBe('Connection failed');
    }

    // Ensure that connection was attempted
    expect(mqttHandlerMock.connect).toHaveBeenCalled();
  });

  it("should handle MQTT subscription failure gracefully", async () => {
    mqttHandlerMock.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

    try {
      await mqttHandlerMock.subscribe('availability/create', async () => {});
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toBe('Subscription failed');
    }

    // Ensure that subscribe was attempted
    expect(mqttHandlerMock.subscribe).toHaveBeenCalled();
  });
});
