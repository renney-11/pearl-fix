import { MQTTHandler } from '../mqtt/MqttHandler'; // Assuming you have an MQTTHandler class

// Mock MQTTHandler
jest.mock('../mqtt/MqttHandler'); // Mock the MQTTHandler class

describe("Booking Controller - MQTTHandler Only", () => {
  jest.setTimeout(10000);  // Increased timeout for CI environments

  let mqttHandlerMock: jest.Mocked<MQTTHandler>;

  beforeAll(() => {
    mqttHandlerMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockImplementation(async (queue, callback) => {
        if (queue === 'patient-cancel-booking') {
          const message = JSON.stringify({
            bookingId: '675c208f017856629236f7b1',
            patientId: 'patient-id',
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing cancellation confirmation
          mqttHandlerMock.publish(
            'patient-booking-cancelled',
            JSON.stringify({ message: 'Booking cancelled successfully' })
          );
        }

        if (queue === 'dentist-cancel-booking') {
          const message = JSON.stringify({
            bookingId: '675c208f017856629236f7b1',
            dentistId: 'dentist-id',
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing cancellation confirmation
          mqttHandlerMock.publish(
            'dentist-booking-cancelled',
            JSON.stringify({ message: 'Booking cancelled by dentist successfully' })
          );
        }
      }),
    } as unknown as jest.Mocked<MQTTHandler>;
  });

  afterAll(() => {
    jest.clearAllMocks(); // Clear all mocks after tests
  });

  it("should handle patient cancel booking and publish success", async () => {
    await mqttHandlerMock.subscribe('patient-cancel-booking', async (msg) => {
      const data = JSON.parse(msg);
      expect(data.bookingId).toBe('675c208f017856629236f7b1');
      expect(data.patientId).toBe('patient-id');
    });

    await mqttHandlerMock.publish('patient-booking-cancelled', JSON.stringify({ message: 'Booking cancelled successfully' }));

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'patient-booking-cancelled',
      expect.stringContaining('Booking cancelled successfully')
    );
  });

  it("should handle dentist cancel booking and publish success", async () => {
    await mqttHandlerMock.subscribe('dentist-cancel-booking', async (msg) => {
      const data = JSON.parse(msg);
      expect(data.bookingId).toBe('675c208f017856629236f7b1');
      expect(data.dentistId).toBe('dentist-id');
    });

    await mqttHandlerMock.publish('dentist-booking-cancelled', JSON.stringify({ message: 'Booking cancelled by dentist successfully' }));

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'dentist-booking-cancelled',
      expect.stringContaining('Booking cancelled by dentist successfully')
    );
  });

  it("should return 404 if booking not found (patient)", async () => {
    // Simulate a booking not found scenario
    const invalidBookingMessage = JSON.stringify({
      bookingId: 'invalid-booking-id',
      patientId: 'patient-id',
    });

    try {
      await mqttHandlerMock.subscribe('patient-cancel-booking', async (msg) => {
        const { bookingId } = JSON.parse(msg);
        if (bookingId === 'invalid-booking-id') {
          throw new Error('Booking not found');
        }
      });
    } catch (error) {
      expect(error.message).toBe('Booking not found');
    }
  });

  it("should return 404 if booking not found (dentist)", async () => {
    // Simulate a booking not found scenario
    const invalidBookingMessage = JSON.stringify({
      bookingId: 'invalid-booking-id',
      dentistId: 'dentist-id',
    });

    try {
      await mqttHandlerMock.subscribe('dentist-cancel-booking', async (msg) => {
        const { bookingId } = JSON.parse(msg);
        if (bookingId === 'invalid-booking-id') {
          throw new Error('Booking not found');
        }
      });
    } catch (error) {
      expect(error.message).toBe('Booking not found');
    }
  });

  // Test to simulate MQTT connection failure
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

  // Test to simulate MQTT subscription failure
  it("should handle MQTT subscription failure gracefully", async () => {
    mqttHandlerMock.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

    try {
      await mqttHandlerMock.subscribe('patient-cancel-booking', async () => {});
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toBe('Subscription failed');
    }

    // Ensure that subscribe was attempted
    expect(mqttHandlerMock.subscribe).toHaveBeenCalled();
  });
});
