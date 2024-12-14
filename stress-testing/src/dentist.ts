import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // 10 users for 1 minute
    { duration: '2m', target: 50 },  // 50 users for 2 minutes
    { duration: '1m', target: 100 }, // 100 users for 1 minute
  ],
};

export default function () {
  // Static email for dentist registration
  const email = 'entist@example.com';
  const password = 'testpassword';

  console.log(`Using Email: ${email}`);

  // Register dentist request
  const registerDentistRes = http.post('http://localhost:5000/api/v1/auth/create', JSON.stringify({
    name: 'Test Dentist',
    email: email,
    password: password,
    specialty: 'General Dentistry', // Assuming dentists have a specialty field
    licenseNumber: 'D123456789', // Assuming there's a license number
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Registration Response Status:', registerDentistRes.status);
  console.log('Registration Response Body:', registerDentistRes.body);

  check(registerDentistRes, {
    'registration successful': (r) => r.status === 200,
  });

  if (registerDentistRes.status !== 200) {
    console.error('Registration failed, skipping user fetch');
    return; // Exit early if registration fails
  }

  // Extract token from registration response
  const token = registerDentistRes.json('token');
  if (!token) {
    console.error('Error: No token received from registration');
    return;  // Exit if token is not found
  }
  console.log('Received Token:', token);

  // Fetch user details with token
  const userRes = http.get('http://localhost:5000/api/v1/auth/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('User Details Response Status:', userRes.status);
  console.log('User Details Response Body:', userRes.body);

  check(userRes, {
    'user fetched successfully': (r) => r.status === 200,
  });

  sleep(1);  // Simulate a 1-second delay between requests
}
