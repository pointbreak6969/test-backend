import { verifyJWT } from "../middlewares/auth.middleware.js";
import {deleteTweet, updateTweet, getAllTweets, createTweet} from "../controllers/tweet.controller.js"
import { checkOwner } from "../middlewares/owner.middleware.js";
import { Tweet } from "../models/tweet.model.js";
import { Router } from "express";

const router = Router()
router.use(verifyJWT)
router.route("/").post(createTweet)
router.route("/:userId").get(getAllTweets)
router.route("/:tweetId").all(checkOwner('tweetId', Tweet)).patch(updateTweet).delete(deleteTweet)

export default router;

