import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import bcrypt from 'bcryptjs';
import Patient from '../models/Patient';

// Load environment variables from .env file
dotenv.config();

jest.mock('../mqtt/MqttHandler', () => {
  return {
    MQTTHandler: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        publish: jest.fn(),
      };
    }),
  };
});

describe('AuthController', () => {
  // Get MongoDB URI from environment variable or fallback to default
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tooth-beacon';

  beforeAll(async () => {
    console.log('Connecting to database using:', mongoUri); // For debugging purposes
    await mongoose.connect(mongoUri);
    await new Patient({
      name: "John Doe",
      email: "johndoe@example.com",
      password: await bcrypt.hash("password123", 10),
    }).save();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('should register a new patient', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: `janedoe-@example.com`,
        password: 'password123',
      });
      console.log('Response:', response.body); // Debugging line 
      console.log('Response Status:', response.status); // Debugging line

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should return 400 if patient already exists', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Patient already exists');
  });

  it('should login a patient and return a token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'johndoe@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should return 400 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'johndoe@example.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should get the current user details if authenticated', async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'johndoe@example.com',
        password: 'password123',
      });

    const token = loginResponse.body.token;

    const response = await request(app)
      .get('/api/v1/auth/user')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email', 'johndoe@example.com');
  });

  it('should return 401 if not authenticated', async () => {
    const response = await request(app)
      .get('/api/v1/auth/user');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authorization header missing or malformed');
  });

  test('should register a new dentist', async () => {
    const uniqueEmail = `dentist-${Date.now()}@example.com`;

    const newDentistData = {
      name: "Dr. John Doe",
      email: uniqueEmail,
      password: "StrongPassword123!",
      fikaBreak: {
        start: "15:00",
        end: "15:30"
      },
      lunchBreak: {
        start: "12:00",
        end: "12:30"
      },
      workdays: ["Monday", "Wednesday", "Friday"]
    };
  
    console.log("Sending request with data: ", newDentistData);
  
    const response = await request(app)
      .post('/api/v1/auth/create')
      .send(newDentistData);
  
    console.log("Response: ", response.body);
  
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });
});
