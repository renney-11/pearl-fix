import { Router, Request, Response, NextFunction } from "express";
import { createClinic } from "../controllers/clinicController";

const router = Router();

// create a new route for the create clinic endpoint
router.route("/create").post(createClinic);

// export the router
export default router;
