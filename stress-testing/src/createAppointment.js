import { check } from 'k6';
import http from 'k6/http';  // Import the http module
import { sleep } from 'k6';

// Function to generate a random date in the future
function generateRandomDate() {
  const today = new Date();
  const randomDaysAhead = Math.floor(Math.random() * 30);  // Random days from today
  today.setDate(today.getDate() + randomDaysAhead);
  return today.toISOString().split('T')[0];  // Return date in YYYY-MM-DD format
}

// Function to generate random time slots between 9 AM and 6 PM
function generateRandomTimeSlots() {
  const startHour = Math.floor(Math.random() * (18 - 9 + 1)) + 9;  // Random start hour between 9AM and 6PM
  const startMinute = Math.floor(Math.random() * 60);
  const endHour = startHour + 1;  // Assuming 1-hour slots
  const endMinute = startMinute;

  const start = `${startHour}:${startMinute < 10 ? '0' + startMinute : startMinute}`;
  const end = `${endHour}:${endMinute < 10 ? '0' + endMinute : endMinute}`;

  return [{ start, end }];
}

export let options = {
  stages: [
    { duration: '20s', target: 10 },  // Ramp up to 10 users for 20 seconds
    { duration: '30s', target: 0 }, // Ramp down to 0 users in 30 seconds
  ],
};

export default function () {
  // Hardcoded dentist email and clinic ID
  const dentistEmail = "mais@example.com";
  const clinicId = "6761e1c358b216c1cc80f943";  // Hardcoded clinic ID

  // Generate random date and time slots
  const randomDate = generateRandomDate();
  const randomTimeSlots = generateRandomTimeSlots();
  const workDays = ["Monday", "Wednesday", "Friday"]; // Fixed workdays

  const availabilityData = {
    dentist: dentistEmail,
    date: randomDate,
    timeSlots: randomTimeSlots,
    workDays: workDays,  // Optional: if you want to specify work days
    clinicId: clinicId,  // Include the hardcoded clinic ID
  };

  console.log(`Creating Availability for Dentist: ${availabilityData.dentist} on Date: ${availabilityData.date}`);
  console.log(`Time Slots: ${JSON.stringify(availabilityData.timeSlots)}, Work Days: ${availabilityData.workDays.join(", ")}`);

  // API request to create availability
  const createAvailabilityRes = http.post(
    "http://localhost:7000/api/v1/availability/create",  // The URL to create availability
    JSON.stringify(availabilityData),  // The request body
    { headers: { "Content-Type": "application/json" } }  // Set the content type
  );

  console.log("Create Availability Response Status:", createAvailabilityRes.status);
  console.log("Create Availability Response Body:", createAvailabilityRes.body);

  // Check response
  check(createAvailabilityRes, {
    "availability creation successful": (r) => r.status === 201,
  });

  if (createAvailabilityRes.status !== 201) {
    console.error("Availability Creation failed:", createAvailabilityRes.body);
  } else {
    console.log("Availability Created Successfully!");
  }

  sleep(1);  // Simulate a 1-second delay between iterations
}
