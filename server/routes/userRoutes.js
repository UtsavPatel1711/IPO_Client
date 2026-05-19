import express from "express";
import { loginUser, requestEmailOtp, verifyEmailOtp } from "../controllers/userController.js";

const router = express.Router();

router.post("/request-otp", requestEmailOtp);
router.post("/verify-otp", verifyEmailOtp);
router.post("/login", loginUser);

export default router;
