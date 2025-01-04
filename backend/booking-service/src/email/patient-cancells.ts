import nodemailer from 'nodemailer';

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendCancellationEmail = async (
  patientEmail: string,
  timeSlot: { start: string, end: string },
  dentistEmail: string,
) => {
  // Format the date
  const startDate = new Date(timeSlot.start);
  const endDate = new Date(timeSlot.end);

  const formattedDate = startDate.toISOString().split('T')[0]; // e.g., 2025-01-17
  const formattedTime = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')}-${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`; // e.g., 08:00-09:00

  // Patient cancellation email options
  const patientMailOptions = {
    from: process.env.EMAIL_USER,    // Sender's email
    to: patientEmail,                // Recipient's email (Patient's email)
    subject: 'Appointment Canceled', // Subject of the email
    text: `Dear Patient,\n\nYour appointment scheduled for:\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nhas been successfully cancelled.\n\nBest regards,\nPearl-Fix`,
    html: `<p>Dear Patient,</p><p>Your appointment scheduled for:</p><p><strong>Date:</strong> ${formattedDate}</p><p><strong>Time:</strong> ${formattedTime}</p><p>has been successfully cancelled.</p><p>Best regards,<br/>Pearl-Fix</p>`,
  };

  // Dentist cancellation email options
  const dentistMailOptions = {
    from: process.env.EMAIL_USER,    // Sender's email
    to: dentistEmail,                // Recipient's email (Dentist's email)
    subject: 'Appointment Canceled', // Subject of the email
    text: `Dear dentist,\n\nYour appointment scheduled for:\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nhas been cancelled.\n\nBest regards,\nPearl-Fix`,
    html: `<p>Dear dentist,</p><p>Your appointment scheduled for:</p><p><strong>Date:</strong> ${formattedDate}</p><p><strong>Time:</strong> ${formattedTime}</p><p>has been cancelled.</p><p>Best regards,<br/>Pearl-Fix</p>`,
  };

  // Send both emails
  await transporter.sendMail(patientMailOptions);
  console.log(`Appointment cancellation email sent to: ${patientEmail}`);

  await transporter.sendMail(dentistMailOptions);
  console.log(`Appointment cancellation email sent to: ${dentistEmail}`);
};

export default sendCancellationEmail;
