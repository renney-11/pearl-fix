import { Router } from "express";
import {
  createBooking,
} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.route("/create").post(createBooking);

export default router;
