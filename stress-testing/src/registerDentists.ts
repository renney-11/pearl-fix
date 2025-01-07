import http from 'k6/http';
import { check } from 'k6';

// Function to generate a random email
function generateRandomEmail() {
  const timestamp = Date.now().toString().slice(-6);  // Use only the last 6 digits of the timestamp
  const randomString = Math.random().toString(36).substring(2, 8); // Short random string (6 characters)
  return `dentist${timestamp}${randomString}@example.com`; // Ensure the length stays within limits
}

export let options = {
  stages: [
    { duration: '1m', target: 300 },  // 10 users for 1 minute
    { duration: '30s', target: 0 }, // 100 users for 1 minute
  ],
};

export default function () {
  // Generate a random email for dentist registration
  const email = generateRandomEmail();
  const password = 'testpassword';

  console.log(`Using Random Email: ${email}`);

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
    console.error('Registration failed');
  }
}
