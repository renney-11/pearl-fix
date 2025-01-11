import http from 'k6/http';
import { check, sleep } from 'k6';

// Mock data for dentists and clinic
const dentists = [
  {
    _id: "67812bd6d7bc9afe1e8d49c5",
    name: "Dr. Reney",
    email: "reney@example.com",
    password: "securePassword123",
  },
];

const clinic = {
  _id: "67813a7711cc662d5fde6545",
  city: 'Stockholm',
  address: 'Paktiani Street',
  clinicName: 'Reney Clinic',
  openingHours: {
    start: '09:00',
    end: '17:00',
  },
  dentists: ["reney@example.com"],
};


// Test options
export let options = {
  stages: [
    { duration: '1m', target: 1000 }, // Ramp-up to 2 users over 1 minute
    { duration: '30m', target: 500 }, // Stay at 10 users for 30 minutes
    { duration: '1m', target: 0 },  // Ramp-down to 0 users over 1 minute
  ],
};

// The URL for the create availability API endpoint
const url = 'http://localhost:7000/api/v1/availability/create';

// Payload for creating availabilities (mock clinic and dentist data)
const payload = JSON.stringify({
  clinicId: clinic._id,
  dentist: dentists[0].email,
  date: "2025-01-09", // Example date for availability
  timeSlots: [
    { start: "08:00", end: "09:00" },
  ],
  workDays: ["Monday", "Wednesday", "Friday"]
});

// Request headers
const params = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Default function for each VU (Virtual User)
export default function () {
  // Send the POST request to create availability
  const res = http.post(url, payload, params);

  // Check for successful availability creation and response time
  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time is < 500ms': (r) => r.timings.duration < 500,
  });

  // Log the response for debugging
  console.log(`Create Availability response: ${JSON.stringify(res.json())}`);

  sleep(1); // Simulate user wait time
}
