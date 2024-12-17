import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

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
  const lat = 57.7222 + (Math.random() - 0.5) * 0.1;  // Random latitude around 57.7222
  const lon = 12.2712 + (Math.random() - 0.5) * 0.1;  // Random longitude around 12.2712
  return { latitude: lat, longitude: lon };
}

export let options = {
  stages: [
    { duration: '1m', target: 30 },  // Ramp up to 300 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users in 30 seconds
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

  // Extract dentist token from registration response
  const dentistToken = registerDentistRes.json('token');
  if (!dentistToken) {
    console.error('Error: No token received for Dentist');
    return;
  }

  console.log('Dentist Received Token:', dentistToken);

  // Fetch dentist user details with token
  const dentistUserRes = http.get('http://localhost:5000/api/v1/auth/user', {
    headers: {
      'Authorization': `Bearer ${dentistToken}`,
    },
  });

  console.log('Dentist User Details Response Status:', dentistUserRes.status);
  console.log('Dentist User Details Response Body:', dentistUserRes.body);

  check(dentistUserRes, {
    'dentist user fetched successfully': (r) => r.status === 200,
  });

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

  // Extract patient token from registration response
  const patientToken = registerPatientRes.json('token');
  if (!patientToken) {
    console.error('Error: No token received for Patient');
    return;
  }

  console.log('Patient Received Token:', patientToken);

  // Fetch patient user details with token
  const patientUserRes = http.get('http://localhost:5000/api/v1/auth/user', {
    headers: {
      'Authorization': `Bearer ${patientToken}`,
    },
  });

  console.log('Patient User Details Response Status:', patientUserRes.status);
  console.log('Patient User Details Response Body:', patientUserRes.body);

  check(patientUserRes, {
    'patient user fetched successfully': (r) => r.status === 200,
  });

  // Now, create a clinic with the dentist's email and random coordinates

  const clinicCoordinates = generateRandomCoordinates();  // Generate random coordinates

  const clinicData = {
    city: 'Lerum',
    address: '123 Dental Street',
    clinicName: 'Lerum Smile Care',
    openingHours: {
      start: '10:00',
      end: '20:00'
    },
    coordinates: clinicCoordinates,  // Use the randomly generated coordinates
    dentists: [dentistEmail], // Use the dentist email from the registration
  };

  console.log(`Creating Clinic with Dentists: ${clinicData.dentists.join(', ')} at Coordinates: ${clinicCoordinates.latitude}, ${clinicCoordinates.longitude}`);

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

  console.log('Clinic Created Successfully:', createClinicRes.body);

  sleep(1);  // Simulate a 1-second delay between iterations
}
