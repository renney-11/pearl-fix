import http from 'k6/http';
import { check, sleep } from 'k6';

// Patient data
const patients = [
  {
    name: "Manely Abbasi",
    email: "manely@gmail.com",
    password: "12345678",
    bookings: [], // No bookings for this patient
  },
];

// Dentist data
const dentists = [
  {
    _id: "67812bd6d7bc9afe1e8d49c5",
    name: "Dr. Reney",
    email: "reney@example.com",
    password: "securePassword123",
  },
];

// Timeslot data
const timeSlot = {
  start: "2025-01-15T10:00:00Z",
  end: "2025-01-15T11:00:00Z",
};

// Clinic data
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
    { duration: '1m', target: 10 }, // Ramp-up to 10 users over 1 minute
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '1m', target: 0 },  // Ramp-down to 0 users over 1 minute
  ],
};

export default function () {
  // Prepare booking data
  const bookingData = {
    dentistId: dentists[0]._id,
    patientEmail: patients[0].email,
    timeSlot: timeSlot,
  };

  // Create booking
  const res = http.post(`http://localhost:7000/api/v1/booking/create`, JSON.stringify(bookingData), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Check for successful booking creation
  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time is < 500ms': (r) => r.timings.duration < 500,
  });

  console.log(`Booking response: ${JSON.stringify(res.json())}`);

  sleep(1); // Simulate user wait time
}
