"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authenticate_1 = __importDefault(require("../middlewares/authenticate"));
const router = (0, express_1.Router)();
// create a new route for the register endpoint
router.route("/register").post(authController_1.register);
// create a new route for the login endpoint
router.route("/login").post(authController_1.login);
// create a new route for the user endpoint
router.route("/user").get(authenticate_1.default, authController_1.getCurrentUser);
// export the router
exports.default = router;
