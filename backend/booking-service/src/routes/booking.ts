import { Router } from "express";
import {
  createBooking,
  cancelBookingByPatient,
  cancelBookingByDentist,
  getBookingsForPatient,
  getBookingsForDentist
} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.route("/create").post(createBooking);
router.route("/patient-cancel-booking").delete(cancelBookingByPatient);
router.route("/dentist-cancel-booking/:bookingId").delete(cancelBookingByDentist);
router.route("/getBookingsForPatients").get(getBookingsForPatient);
router.route("/getBookingsForDentist").get(getBookingsForDentist);


export default router;
