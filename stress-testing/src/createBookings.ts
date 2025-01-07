import http from 'k6/http';
import { check } from 'k6';

// Function to generate a random email
function generateRandomEmail() {
  const timestamp = Date.now().toString().slice(-6);  // Use only the last 6 digits of the timestamp
  const randomString = Math.random().toString(36).substring(2, 8); // Short random string (6 characters)
  return `dentist${timestamp}${randomString}@example.com`; // Ensure the length stays within limits
}

// Function to generate random availability
function generateRandomAvailability() {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const startTime = '08:00'; // Start time for availability
  const endTime = '17:00'; // End time for availability
  const day = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)];

  return {
    day: day,
    startTime: startTime,
    endTime: endTime,
  };
}

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // 10 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users over 30 seconds
  ],
};

export default function () {
  // Step 1: Register the dentist
  const email = generateRandomEmail();
  const password = 'testpassword';

  console.log(`Using Random Email: ${email}`);

  const registerDentistRes = http.post('http://localhost:5000/api/v1/auth/create', JSON.stringify({
    name: 'Test Dentist',
    email: email,
    password: password,
    specialty: 'General Dentistry',
    licenseNumber: 'D123456789',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(registerDentistRes, {
    'registration successful': (r) => r.status === 200,
  });

  if (registerDentistRes.status !== 200) {
    console.error('Registration failed');
    return; // Stop further actions if registration failed
  }

  console.log('Received Token:', registerDentistRes.json('token'));

  // Step 2: Create availability for the dentist
  const availability = generateRandomAvailability();

  const createAvailabilityRes = http.post('http://localhost:7000/api/v1/availability/create', JSON.stringify({
    day: availability.day,
    startTime: availability.startTime,
    endTime: availability.endTime,
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${registerDentistRes.json('token')}`, // i think the problem is here
    },
  });

  console.log('Availability Creation Response Status:', createAvailabilityRes.status);
  console.log('Availability Creation Response Body:', createAvailabilityRes.body);

  check(createAvailabilityRes, {
    'availability creation successful': (r) => r.status === 200,
  });

  if (createAvailabilityRes.status !== 200) {
    console.error('Availability creation failed');
  }
}
