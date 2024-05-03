import {verifyJWT} from '../middlewares/auth.middleware.js'
import { toggleCommentLike, toggleVideoLike, toggleTweetLike, getLikedVideos } from '../controllers/like.controller.js'
import { Router } from 'express'

const router = Router();
router.use(verifyJWT)
router.route("/toggle/v/:videoId").patch(toggleVideoLike)
router.route("/toggle/c/:commentId").patch(toggleCommentLike)
router.route("/toggle/t/:tweetId").patch(toggleTweetLike)
router.route("/likedVideos").get(getLikedVideos)

export default router;