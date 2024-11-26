import { Router } from "express";
import {
  getCurrentUser,
  login,
  register,
  registerDentist,
} from "../controllers/authController";
import authenticate from "../middlewares/authenticate";

const router = Router();

router.route("/register").post(register);
router.route("/create").post(registerDentist);
router.route("/login").post(login);
router.route("/user").get(authenticate, getCurrentUser);

export default router;
