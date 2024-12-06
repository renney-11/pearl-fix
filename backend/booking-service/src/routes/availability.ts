import { Router } from "express";
import {
    createAvailability,
} from "../controllers/availabilityController";

const router = Router();

// Create a new booking
router.route("/create").post(createAvailability);

export default router;
