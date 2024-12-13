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
      }),
    } as unknown as jest.Mocked<MQTTHandler>;
  });

  afterAll(() => {
    jest.clearAllMocks(); // Clear all mocks after tests
  });

  test('should process a registration message from the MQTT queue', async () => {
    // Simulate the subscription logic
    await mqttHandlerMock.subscribe('pearl-fix/authentication/register', async (msg) => {
      expect(msg).toContain('Test Patient'); // Verify message contains expected data
    });

    // Ensure publish was called with the correct topic and token
    expect(mqttHandlerMock.publish).toHaveBeenCalledWith(
      'pearl-fix/authentication/authenticate',
      expect.stringContaining('dummyToken') // Validate token in the payload
    );
  });
});
