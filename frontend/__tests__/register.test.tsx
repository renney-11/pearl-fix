import { describe, it, expect, vi } from "vitest";
import handler from "../pages/api/register";
import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

vi.mock("amqplib");

describe("POST /api/register", () => {
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("publishes to the registerQueue and listens to authenticateQueue", async () => {
    const req = mockRequest({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    }) as NextApiRequest;

    const res = mockResponse() as NextApiResponse;

    (channelMock.consume as any).mockImplementationOnce((queue, callback) => {
      const msg: ConsumeMessage = {
        content: Buffer.from(JSON.stringify({ token: "test-token" })),
        fields: {} as any,
        properties: {} as any,
      };
      callback(msg);
    });

    await handler(req, res);

    expect(amqp.connect).toHaveBeenCalled();
    expect(connectionMock.createChannel).toHaveBeenCalled();
    expect(channelMock.assertQueue).toHaveBeenCalledWith("pearl-fix/authentication/register", { durable: true });
    expect(channelMock.sendToQueue).toHaveBeenCalledWith(
      "pearl-fix/authentication/register",
      Buffer.from(JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      })),
      { persistent: true }
    );

    expect(channelMock.consume).toHaveBeenCalledWith(
      "pearl-fix/authentication/authenticate",
      expect.any(Function),
      { noAck: false }
    );
    expect(channelMock.ack).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: "test-token" });
  });

  it("returns 500 if there is an error", async () => {
    vi.mocked(amqp.connect).mockRejectedValue(new Error("Connection error"));

    const req = mockRequest({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    }) as NextApiRequest;

    const res = mockResponse() as NextApiResponse;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error." });
  });
});
