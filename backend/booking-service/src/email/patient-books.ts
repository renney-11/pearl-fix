import nodemailer from 'nodemailer';

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmailConfirmation = async (
  patientEmail: string,
  patientName: string,
  timeSlot: { start: string, end: string },
  clinicName: string,
  clinicAddress: string,
  dentistEmail: string
) => {
  
  // Format the date
  const startDate = new Date(timeSlot.start);
  const endDate = new Date(timeSlot.end);

  const formattedDate = startDate.toISOString().split('T')[0]; // e.g., 2025-01-17
  const formattedTime = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')}-${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`; // e.g., 08:00-09:00
  
  // Patient confirmation email options
  const patientMailOptions = {
    from: process.env.EMAIL_USER,    // Sender's email
    to: patientEmail,                // Recipient's email
    subject: 'Booking Confirmation', // Subject of the email
    text: `Dear ${patientName},\n\nYour booking has been confirmed for:\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nClinic: ${clinicName}\nAddress: ${clinicAddress}\n\nThank you for choosing us!\n\nBest regards,\nPearl-Fix`,
    html: `<p>Dear ${patientName},</p><p>Your booking has been confirmed for:</p><p><strong>Date:</strong> ${formattedDate}</p><p><strong>Time:</strong> ${formattedTime}</p><p><strong>Clinic:</strong> ${clinicName}</p><p><strong>Address:</strong> ${clinicAddress}</p><p>Thank you for choosing us!</p><p>Best regards,<br/>Pearl-Fix</p>`,
  };

  // Dentist confirmation email options
  const dentistMailOptions = {
    from: process.env.EMAIL_USER,    // Sender's email
    to: dentistEmail,                // Recipient's email (Dentist's email)
    subject: 'New Patient Booking',  // Subject of the email
    text: `Dear Dentist,\n\nPatient ${patientName} has booked an appointment for:\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nClinic: ${clinicName}\nAddress: ${clinicAddress}\n\nPlease ensure all preparations are in place for this appointment.\n\nBest regards,\nPearl-Fix`,
    html: `<p>Dear Dentist,</p><p>Patient <strong>${patientName}</strong> has booked an appointment for:</p><p><strong>Date:</strong> ${formattedDate}</p><p><strong>Time:</strong> ${formattedTime}</p><p><strong>Clinic:</strong> ${clinicName}</p><p><strong>Address:</strong> ${clinicAddress}</p><p>Please ensure all preparations are in place for this appointment.</p><p>Best regards,<br/>Pearl-Fix</p>`,
  };

  // Send both emails
  await transporter.sendMail(patientMailOptions);
  console.log(`Booking confirmation email sent to: ${patientEmail}`);

  await transporter.sendMail(dentistMailOptions);
  console.log(`New patient booking email sent to: ${dentistEmail}`);
};

export default sendEmailConfirmation;
