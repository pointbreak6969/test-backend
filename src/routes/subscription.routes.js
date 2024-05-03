import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {  getSubscribedChannels, toggleSubscription, getUserSubscribedChannels  } from "../controllers/subscription.contoller.js";

const router = express.Router()
router.use(verifyJWT)
router.route("/c/:channelId").get(getUserSubscribedChannels)
router.route("/c/:channelId").patch(toggleSubscription)
router.route("/u/:subscribedId").get(getSubscribedChannels)