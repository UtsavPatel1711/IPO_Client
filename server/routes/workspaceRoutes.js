import express from "express";
import { loadWorkspace, saveWorkspace } from "../controllers/workspaceController.js";

const router = express.Router();

router.post("/", saveWorkspace);
router.get("/:email", loadWorkspace);

export default router;
