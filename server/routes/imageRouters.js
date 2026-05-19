import express from "express";
import { imageControllerHealth } from "../controllers/imageController.js";

const router = express.Router();

router.get("/health", imageControllerHealth);

export default router;
