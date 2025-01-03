import nodemailer from 'nodemailer';

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Use Gmail's SMTP service
  auth: {
    user: process.env.EMAIL_USER, // Email address from the .env file
    pass: process.env.EMAIL_PASS, // Password or App Password from the .env file
  },
});

const sendEmailConfirmation = async (patientEmail: string, patientName: string, timeSlot: { start: string, end: string }) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,    // Sender's email
    to: patientEmail,                // Recipient's email
    subject: 'Booking Confirmation', // Subject of the email
    text: `Dear ${patientName},\n\nYour booking has been confirmed for the following time slot:\n\nStart: ${timeSlot.start}\nEnd: ${timeSlot.end}\n\nThank you for choosing us!`,
    html: `<p>Dear ${patientName},</p><p>Your booking has been confirmed for the following time slot:</p><p><strong>Start:</strong> ${timeSlot.start}</p><p><strong>End:</strong> ${timeSlot.end}</p><p>Thank you for choosing us!</p>`,
  };

  return transporter.sendMail(mailOptions);
};

export default sendEmailConfirmation;
