import http from 'k6/http';
import { check, sleep } from 'k6';

// Patient data
const patients = [
  {
    email: "manely@gmail.com", // Patient email
    password: "12345678",
  },
];

// Dentist data
const dentists = [
  {
    _id: "67812bd6d7bc9afe1e8d49c5", // Unique dentist ID
    name: "Dr. Reney",
    email: "reney@example.com",
    password: "securePassword123",
  },
];

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
  dentists: [dentists[0].email],
};

// Test options for stress testing
export let options = {
  stages: [
    { duration: '1m', target: 1000}, 
    { duration: '1m', target: 500 }, 
    { duration: '1m', target:  0},   // Ramp-down to 0 users over 1 minute
  ],
};

export default function () {
  // Mock date: 20th January 2025
  let currentDate = new Date(2025, 0, 20); // Set specific date to 20th January 2025

  // Create availability for the dentist for the mock date
  const availabilityPayload = JSON.stringify({
    clinicId: clinic._id,
    dentist: dentists[0].email,
    date: currentDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    timeSlots: [
      { start: "13:00", end: "14:00" }, // Mock timeslot from 13:00 to 14:00
    ],
  });

  const availabilityRes = http.post('http://localhost:7000/api/v1/availability/create', availabilityPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  // Check if availability creation is successful
  check(availabilityRes, {
    'availability status is 201': (r) => r.status === 201,
  });

  // Log the availability creation response for debugging
  console.log(`Availability Creation Response: ${JSON.stringify(availabilityRes.json())}`);

  // Adding a sleep to ensure the availability is registered properly
  sleep(2); // Wait for 2 seconds to ensure availability is processed

  // Simulate patient booking for the same date and timeslot
  const bookingData = {
    dentistId: dentists[0]._id, // Using the dentist's unique ID
    patientEmail: patients[0].email, // Using the patient's email
    timeSlot: {
      start: `${currentDate.toISOString().split('T')[0]}T13:00:00`,  // Mock timeslot start
      end: `${currentDate.toISOString().split('T')[0]}T14:00:00`,    // Mock timeslot end
    },
  };

  const bookingRes = http.post('http://localhost:7000/api/v1/booking/create', JSON.stringify(bookingData), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Check if booking is successful
  check(bookingRes, {
    'booking status is 201': (r) => r.status === 201,
  });

  // Log the response for debugging
  console.log(`Booking Response: ${JSON.stringify(bookingRes.json())}`);

  sleep(1); // Simulate user wait time
}
