import { Router } from "express";
import {
  createBooking,
  cancelBookingByPatient,
  cancelBookingByDentist
} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.route("/create").post(createBooking);
router.route("/patient-cancel-booking/:bookingId").delete(cancelBookingByPatient);
router.route("/dentist-cancel-booking/:bookingId").delete(cancelBookingByDentist);

export default router;
