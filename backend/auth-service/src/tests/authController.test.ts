import request from 'supertest';
import app from '../app';

describe('AuthController', () => {
  it('should register a new patient', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: `johndoe-${Date.now()}@example.com`,
        password: 'password123',
      });

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
      .post('/api/v1/auth/register-dentist')
      .send(newDentistData);
  
    console.log("Response: ", response.body);
  
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });  
});
