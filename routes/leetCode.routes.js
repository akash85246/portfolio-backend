import express from "express";
import LeetCodeController from "../controllers/leeetCode.controller.js";

const router = express.Router();

router.get("/get-stats", LeetCodeController.getLeetStats);

export default router;