import { Router } from "express";
import {
  createBooking,
  cancelBookingByPatient,
  cancelBookingByDentist,
  getBookingsForPatient,
  getBookingsForDentist,
  createBookings,

} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.route("/create").post(createBooking);
router.route("/create/bookings").post(createBookings);
router.route("/patient-cancel-booking").delete(cancelBookingByPatient);
router.route("/dentist-cancel-booking").delete(cancelBookingByDentist);
router.route("/getBookingsForPatients").get(getBookingsForPatient);
router.route("/getBookingsForDentist").get(getBookingsForDentist);


export default router;
