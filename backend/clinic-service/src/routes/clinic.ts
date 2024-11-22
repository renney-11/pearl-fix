import { Router, Request, Response, NextFunction } from "express";
import {  createClinic,getAllClinics,getClinicByAddress,} from "../controllers/clinicController";

const router = Router();

// create a new route for the create clinic endpoint
router.route("/create").post(createClinic);

// Get all clinics
router.route("/").get(getAllClinics);

// Get a single clinic by address
router.route("/:address").get(getClinicByAddress);
// export the router
export default router;
