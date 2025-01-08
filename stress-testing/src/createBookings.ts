import http from 'k6/http';
import { check, sleep } from 'k6';

// Function to generate a random email for dentist
function generateRandomEmailForDentist() {
  const timestamp = Date.now().toString().slice(-6);  
  const randomString = Math.random().toString(36).substring(2, 8); 
  return `dentist${timestamp}${randomString}@example.com`; 
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

export let options = {
  stages: [
    { duration: '1m', target: 30 },  // Ramp up to 30 users for 1 minute
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


  // Now, create a clinic with the dentist's email and random coordinates
  const clinicCoordinates = generateRandomCoordinates();
  const clinicAddress = generateRandomAddress(); 

  const clinicData = {
    city: 'Lerum',
    address: clinicAddress,  // Use the randomly generated address
    clinicName: 'Lerum Smile Care',
    openingHours: {
      start: '10:00',
      end: '20:00'
    },
    coordinates: clinicCoordinates,  // Use the randomly generated coordinates
    dentists: [dentistEmail], // Use the dentist email from the registration
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

  console.log('Clinic Created Successfully:', createClinicRes.body);

  sleep(1);  // Simulate a 1-second delay between iterations
}
