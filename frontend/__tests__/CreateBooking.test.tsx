import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../../frontend/pages/api/createBooking"; 
import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

// Mock amqplib
vi.mock("amqplib");

describe("POST /api/createBooking", () => {
  const channelMock: Partial<Channel> = {
    assertQueue: vi.fn(),
    sendToQueue: vi.fn(),
    consume: vi.fn(),
    ack: vi.fn(),
    close: vi.fn(),
  };

  const connectionMock: Partial<Connection> = {
    createChannel: vi.fn().mockResolvedValue(channelMock),
    close: vi.fn(),
  };

  vi.mocked(amqp.connect).mockResolvedValue(connectionMock as Connection);

  const mockRequest = (body: Record<string, any>): Partial<NextApiRequest> => ({
    method: "POST",
    body,
  });

  const mockResponse = () => {
    const res: Partial<NextApiResponse> = {};
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();
    return res;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); 
  });

  it("publishes to the booking queue and listens to authenticateQueue", async () => {
    const req = mockRequest({
      dentistId: "dentist123",
      patientEmail: "test@example.com",
      timeSlot: { start: "2025-01-01T10:00:00Z", end: "2025-01-01T11:00:00Z" },
    }) as NextApiRequest;

    const res = mockResponse() as NextApiResponse;

    (channelMock.consume as any).mockImplementationOnce((queue, callback) => {
      const msg: ConsumeMessage = {
        content: Buffer.from(JSON.stringify({ success: true, token: "test-token" })),
        fields: {} as any,
        properties: {} as any,
      };
      callback(msg);
    });

    await handler(req, res);

    expect(amqp.connect).toHaveBeenCalled();
    expect(connectionMock.createChannel).toHaveBeenCalled();
    expect(channelMock.assertQueue).toHaveBeenCalledWith("pearl-fix/booking/create", { durable: true });
    expect(channelMock.sendToQueue).toHaveBeenCalledWith(
      "pearl-fix/booking/create",
      Buffer.from(JSON.stringify({
        dentistId: "dentist123",
        patientEmail: "test@example.com",
        timeSlot: { start: "2025-01-01T10:00:00Z", end: "2025-01-01T11:00:00Z" },
      })),
      { persistent: true }
    );
    expect(channelMock.consume).toHaveBeenCalledWith(
      "pearl-fix/booking/create/authenticate",
      expect.any(Function),
      { noAck: false }
    );
    expect(channelMock.ack).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Booking creation successful" });
  });
});