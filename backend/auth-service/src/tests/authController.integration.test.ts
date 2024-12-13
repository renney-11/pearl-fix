import type { MQTTHandler } from '../mqtt/MqttHandler';

describe('MQTT Integration Tests', () => {
  let mqttHandlerMock: jest.Mocked<MQTTHandler>;

  beforeAll(() => {
    // Create a mock implementation of MQTTHandler
    mqttHandlerMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockImplementation(async (queue, callback) => {
        if (queue === 'pearl-fix/authentication/register') {
          const message = JSON.stringify({
            name: 'Test Patient',
            email: 'test@example.com',
            password: 'password123',
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing the token
          mqttHandlerMock.publish(
            'pearl-fix/authentication/authenticate',
            JSON.stringify({ token: 'dummyToken' })
          );
        }

        if (queue === 'pearl-fix/authentication/login') {
          const message = JSON.stringify({
            email: 'test@example.com',
            password: 'correctPassword',
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing the token
          mqttHandlerMock.publish(
            'pearl-fix/authentication/authenticate',
            JSON.stringify({ token: 'validToken' })
          );
        }

        if (queue === 'pearl-fix/booking/create/patient/email') {
          const message = JSON.stringify({
            email: 'test@example.com',
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing the booking details
          mqttHandlerMock.publish(
            'pearl-fix/booking/create/patient',
            JSON.stringify({ message: 'Booking successfully created' })
          );
        }

        if (queue === 'pearl-fix/booking/update/patient') {
          const message = JSON.stringify({
            patientId: 'patient-id',
            booking: { _id: 'booking-id' },
          });

          // Simulate the callback execution
          await callback(message);

          // Simulate publishing updated booking details
          mqttHandlerMock.publish(
            'pearl-fix/booking/update/patient',
            JSON.stringify({ message: 'Booking updated successfully' })
          );
        }
      }),
    } as unknown as jest.Mocked<MQTTHandler>;
  });

  afterAll(() => {
    jest.clearAllMocks(); // Clear all mocks after tests
  });

  test('should process a registration message from the MQTT queue', async () => {
    await mqttHandlerMock.subscribe('pearl-fix/authentication/register', async (msg) => {
      expect(msg).toContain('Test Patient'); // Verify message contains expected data
    });

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'pearl-fix/authentication/authenticate',
      expect.stringContaining('dummyToken') // Validate token in the payload
    );
  });

  test('should handle duplicate patient registration', async () => {
    const duplicatePatientMessage = JSON.stringify({
      name: 'Test Patient',
      email: 'test@example.com',
      password: 'password123',
    });

    await mqttHandlerMock.subscribe('pearl-fix/authentication/register', async (msg) => {
      const { name, email, password } = JSON.parse(msg);

      if (email === 'test@example.com') {
        await mqttHandlerMock.publish(
          'pearl-fix/authentication/authenticate',
          JSON.stringify({ message: 'Patient already exists' })
        );
      }
    });

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'pearl-fix/authentication/authenticate',
      expect.stringContaining('Patient already exists')
    );
  });

  test('should successfully login with valid credentials', async () => {
    const validLoginMessage = JSON.stringify({
      email: 'test@example.com',
      password: 'correctPassword',  // Correct password
    });

    mqttHandlerMock.publish.mockClear();

    await mqttHandlerMock.subscribe('pearl-fix/authentication/login', async (msg) => {
      const { email, password } = JSON.parse(msg);

      if (email === 'test@example.com' && password === 'correctPassword') {
        const token = 'validToken'; // Simulated token
        await mqttHandlerMock.publish(
          'pearl-fix/authentication/authenticate',
          JSON.stringify({ token })
        );
      }
    });

    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'pearl-fix/authentication/authenticate',
      expect.stringContaining('validToken')
    );
  });

  test('should successfully create an appointment for a patient', async () => {
    await mqttHandlerMock.subscribe('pearl-fix/booking/create/patient/email', async (msg) => {
      expect(msg).toContain('test@example.com');
    });

    await expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'pearl-fix/booking/create/patient',
      expect.stringContaining('Booking successfully created')
    );
  });

  test('should successfully update a patient\'s booking', async () => {
    await mqttHandlerMock.subscribe('pearl-fix/booking/update/patient', async (msg) => {
      const parsedMessage = JSON.parse(msg);
      expect(parsedMessage.patientId).toBe('patient-id');
      expect(parsedMessage.booking._id).toBe('booking-id');
    });

    await expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'pearl-fix/booking/update/patient',
      expect.stringContaining('Booking updated successfully')
    );
  });

  // New test for availability scenario
  test('should handle MQTT connection failure gracefully', async () => {
    // Simulate an unavailable MQTT service
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

  test('should handle MQTT subscription failure gracefully', async () => {
    // Simulate subscription failure
    mqttHandlerMock.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

    try {
      await mqttHandlerMock.subscribe('pearl-fix/authentication/register', async () => {});
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toBe('Subscription failed');
    }

    // Ensure that subscribe was attempted
    expect(mqttHandlerMock.subscribe).toHaveBeenCalled();
  });
});
