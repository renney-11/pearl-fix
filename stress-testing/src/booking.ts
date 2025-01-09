import http from 'k6/http';
import { check, sleep } from 'k6';

// Function to generate a random alphanumeric string of 24 characters
function generateRandomId() {
  const chars = '0123456789abcdef';  // MongoDB ObjectId characters (hexadecimal)
  let randomId = '';
  for (let i = 0; i < 24; i++) {
    randomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomId;
}

// Function to generate a random email for dentist
function generateRandomEmailForDentist() {
  const timestamp = Date.now().toString().slice(-6);  
  const randomString = Math.random().toString(36).substring(2, 8); 
  return `dentist${timestamp}${randomString}@example.com`; 
}

// Function to generate a random email for patient
function generateRandomEmailForPatient() {
  const timestamp = Date.now().toString().slice(-6);  
  const randomString = Math.random().toString(36).substring(2, 8); 
  return `patient${timestamp}${randomString}@example.com`; 
}

// Function to generate random coordinates
function generateRandomCoordinates() {
  const lat = 57.7222 + (Math.random() - 0.5) * 0.1;
  const lon = 12.2712 + (Math.random() - 0.5) * 0.1;  
  return { latitude: lat, longitude: lon };
}

// Function to generate a random clinic address
function generateRandomAddress() {
  const streetNames = ["Dental", "Smile", "Health", "Care", "Wellness"];
  const streetTypes = ["Street", "Avenue", "Road", "Lane"];
  const randomStreetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const randomStreetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  const randomNumber = Math.floor(Math.random() * 1000);  // Random number for street number
  return `${randomNumber} ${randomStreetName} ${randomStreetType}`;
}


function getClinic(address) {
  console.log(`Fetching clinic for address: ${address}`);
  
  const clinicId = generateRandomId(); 
  console.log(`Fetched clinic ID for address "${address}": ${clinicId}`);
  
  return clinicId;
}

// Function to create availability for a dentist in the clinic
function createAvailability(dentistId, clinicId, availabilityId) {
  const timeSlotStart = new Date();
  timeSlotStart.setHours(10, 0, 0, 0); 
  const timeSlotEnd = new Date(timeSlotStart.getTime() + 60 * 60 * 1000);  // 1 hour later

  const availabilityData = {
    dentist: dentistId,
    clinicId: clinicId,  
    workDays: ['Monday', 'Wednesday', 'Friday'], 
    timeSlots: [
      { start: timeSlotStart.toISOString(), end: timeSlotEnd.toISOString() },
    ],
    date: '2025-01-10', 
    availabilityId: availabilityId 
  };

  console.log('Creating availability for Dentist:', dentistId, 'at Clinic ID:', clinicId, 'with time slot:', availabilityData.timeSlots[0].start, 'to', availabilityData.timeSlots[0].end);

  const createAvailabilityRes = http.post('http://localhost:7000/api/v1/availability/create/availability', JSON.stringify(availabilityData), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Create Availability Response Status:', createAvailabilityRes.status);
  console.log('Create Availability Response Body:', createAvailabilityRes.body);

  check(createAvailabilityRes, {
    'availability creation accepted': (r) => r.status === 202, 
  });

  if (createAvailabilityRes.status !== 202) {
    console.error('Availability Creation failed. Status code:', createAvailabilityRes.status);
    return null;
  } else {
    console.log('Availability creation accepted, still processing...');
  }
}

// Function to create a booking
function createBooking(patientId, dentistId, clinicId, availabilityId) {
  // Example of booking date and time setup
  const bookingDate = '2025-01-10'; 
  const bookingTime = '10:00:00'; 
  const timeSlotStart = new Date(`${bookingDate}T${bookingTime}`);
  const timeSlotEnd = new Date(timeSlotStart.getTime() + 60 * 60 * 1000);  // 1 hour later

  // Construct booking data
  const bookingData = {
    patientId: patientId,      
    dentistId: dentistId,    
    clinicId: clinicId,       
    availabilityId: availabilityId,
    date: bookingDate,       
    timeSlot: {        
      start: timeSlotStart.toISOString(),
      end: timeSlotEnd.toISOString(),
    },
    status: 'confirmed', 
  };

  console.log('Creating booking for Patient:', patientId, 'with Dentist:', dentistId, 'at Clinic ID:', clinicId, 'using Availability ID:', availabilityId, 'for time slot:', bookingData.timeSlot.start, 'to', bookingData.timeSlot.end);

 
  const createBookingRes = http.post('http://localhost:7000/api/v1/booking/create/bookings', JSON.stringify(bookingData), {
    headers: { 'Content-Type': 'application/json' },
  });


  console.log('Create Booking Response Status:', createBookingRes.status);
  console.log('Create Booking Response Body:', createBookingRes.body);

  check(createBookingRes, {
    'booking creation accepted': (r) => r.status === 201,  // Assuming 201 is the success code
  });


  if (createBookingRes.status !== 201) {
    console.error('Booking Creation failed. Status code:', createBookingRes.status);
  } else {
    console.log('Booking creation accepted, processing...');
  }
}

export let options = {
  stages: [
    { duration: '1m', target: 30 }, 
    { duration: '30s', target: 0 }, 
  ],
};

export default function () {
  // Register Dentist
  const dentistEmail = generateRandomEmailForDentist();
  const dentistPassword = 'testpassword';

  console.log(`Registering Dentist with Email: ${dentistEmail}`);

  const registerDentistRes = http.post('http://localhost:5000/api/v1/auth/create', JSON.stringify({
    name: 'Test Dentist',
    email: dentistEmail,
    password: dentistPassword,
    specialty: 'General Dentistry',
    licenseNumber: 'D123456789',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Dentist Registration Response Status:', registerDentistRes.status);
  console.log('Dentist Registration Response Body:', registerDentistRes.body);

  check(registerDentistRes, {
    'dentist registration successful': (r) => r.status === 200,
  });

  if (registerDentistRes.status !== 200) {
    console.error('Dentist Registration failed');
    return;
  }

  // Register Patient 
  const patientEmail = generateRandomEmailForPatient();
  const patientPassword = 'testpassword';

  console.log(`Registering Patient with Email: ${patientEmail}`);

  const registerPatientRes = http.post('http://localhost:5000/api/v1/auth/register', JSON.stringify({
    name: 'Test Patient',
    email: patientEmail,
    password: patientPassword,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Patient Registration Response Status:', registerPatientRes.status);
  console.log('Patient Registration Response Body:', registerPatientRes.body);

  check(registerPatientRes, {
    'patient registration successful': (r) => r.status === 200,
  });

  if (registerPatientRes.status !== 200) {
    console.error('Patient Registration failed');
    return;
  }

  // Now, create a clinic with the dentist's email and random coordinates
  const clinicCoordinates = generateRandomCoordinates();
  const clinicAddress = generateRandomAddress(); 

  const clinicData = {
    city: 'Lerum',
    address: clinicAddress,
    clinicName: 'Lerum Smile Care',
    openingHours: {
      start: '10:00',
      end: '20:00'
    },
    coordinates: clinicCoordinates, 
    dentists: [dentistEmail], 
  };

  console.log(`Creating Clinic with Dentists: ${clinicData.dentists.join(', ')} at Address: ${clinicData.address} and Coordinates: ${clinicCoordinates.latitude}, ${clinicCoordinates.longitude}`);

  const createClinicRes = http.post('http://localhost:6000/api/v1/clinic/create', JSON.stringify(clinicData), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Create Clinic Response Status:', createClinicRes.status);
  console.log('Create Clinic Response Body:', createClinicRes.body);

  check(createClinicRes, {
    'clinic creation successful': (r) => r.status === 201,
  });

  if (createClinicRes.status !== 201) {
    console.error('Clinic Creation failed');
    return;
  }

  const clinicId = getClinic(clinicAddress);

  const dentistId = generateRandomId();
  const availabilityId = generateRandomId(); 

  createAvailability(dentistId, clinicId, availabilityId);
  createBooking(generateRandomId(), dentistId, clinicId, availabilityId);

  sleep(1);  // Simulate a 1-second delay between iterations
}
