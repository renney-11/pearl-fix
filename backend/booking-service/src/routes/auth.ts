import { Router, Request, Response, NextFunction } from "express";
import { getCurrentUser, login, register } from "../controllers/authController";
import authenticate from "../middlewares/authenticate";

const router = Router();

// create a new route for the register endpoint
router.route("/register").post(register);

// create a new route for the login endpoint
router.route("/login").post(login);

// create a new route for the user endpoint
router.route("/user").get(authenticate, getCurrentUser);

// export the router
export default router;
