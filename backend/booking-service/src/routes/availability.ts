import { Router } from "express";
import {
    createAvailability,
    getAvailability,
    removeAvailability,
} from "../controllers/availabilityController";


const router = Router();

// Create a new booking
router.route("/create").post(createAvailability);
router.route("/:dentistId").get(getAvailability);
router.route("/:dentistId/:timeSlotId").delete(removeAvailability);

export default router;
