import { Router } from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.route("/create").post(createBooking);

// Get all bookings
router.route("/").get(getAllBookings);

// Get a single booking by ID
router.route("/:id").get(getBookingById);

// Update booking status (e.g., mark as booked, cancelled)
router.route("/:id/status").patch(updateBookingStatus);

export default router;
