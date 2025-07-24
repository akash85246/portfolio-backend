import express from "express";
import {
  signInGoogle,
  signInGithub,
  signOut,
  userDelete,
  googleCallback,
  githubCallback,
  loginUpdate,
  userInfo,
} from "../controllers/auth.controller.js";
import verifyUser from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/google/signin", signInGoogle);
router.get("/github/signin", signInGithub);

router.get("/google/callback", googleCallback);
router.get("/github/callback", githubCallback);

router.get("/signout", signOut);
router.get("/user", verifyUser, userInfo);

router.put("/updateLogin", verifyUser, loginUpdate);
router.delete("/delete", userDelete);

export default router;
