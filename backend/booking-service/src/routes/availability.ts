import { Router } from "express";
import {
    createAvailability,
    getAvailability,
} from "../controllers/availabilityController";


const router = Router();

// Create a new booking
router.route("/create").post(createAvailability);
router.route("/:dentistId").get(getAvailability);

export default router;
