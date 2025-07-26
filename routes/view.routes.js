import { postView, updateView, getTotalViewsCount } from "../controllers/view.controller.js";
import express from "express";
const router = express.Router();
router.post("/", postView);
router.patch("/", updateView);
router.get("/count", getTotalViewsCount);
export default router;