import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

function generateRandomEmail() {
  const timestamp = Date.now().toString().slice(-6);  
  const randomString = Math.random().toString(36).substring(2, 8); 
  return `patient${timestamp}${randomString}@example.com`; 
}

export let options = {
  stages: [
    { duration: '1m', target: 198 },  
    { duration: '30s', target: 0 }, 
  ],
};

export default function () {
  // Generate a random email for patient registration
  const email = generateRandomEmail();
  const password = 'testpassword';

  console.log(`Using Random Email: ${email}`);

  // Register patient request
  const registerPatientRes = http.post('http://localhost:5000/api/v1/patient/register', JSON.stringify({
    name: 'Test Patient',
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Registration Response Status:', registerPatientRes.status);
  console.log('Registration Response Body:', registerPatientRes.body);

  check(registerPatientRes, {
    'registration successful': (r) => r.status === 200,
  });

  if (registerPatientRes.status !== 200) {
    console.error('Registration failed, skipping user fetch');
    return; // Exit early if registration fails
  }

  // Extract token from registration response
  const token = registerPatientRes.json('token');
  if (!token) {
    console.error('Error: No token received from registration');
    return; 
  }
  console.log('Received Token:', token);

  // Fetch user details with token
  const userRes = http.get('http://localhost:5000/api/v1/patient/details', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('User Details Response Status:', userRes.status);
  console.log('User Details Response Body:', userRes.body);

  check(userRes, {
    'user fetched successfully': (r) => r.status === 200,
  });

  sleep(1);  
}
