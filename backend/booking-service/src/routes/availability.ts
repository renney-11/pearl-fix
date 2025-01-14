import { Router } from "express";
import {
    createAvailability,
    //getAvailability,
    removeAvailability,
    getAvailabilitiesForClinic,
    metrics,
} from "../controllers/availabilityController";


const router = Router();

// Create a new booking
router.route("/create").post(createAvailability);
//router.route("/:dentistId").get(getAvailability);
router.route("/clinic/:address").get(getAvailabilitiesForClinic);
router.route("/:dentistId/:timeSlotId").delete(removeAvailability);
router.route("/metrics").get(metrics);


export default router;
