import { Router } from "express";
import { uploadVideo, getAllVideos, getVidoeById, deleteVideo, updateVideoDetails } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkOwner } from "../middlewares/owner.middleware.js";

const router = Router();
router.use(verifyJWT)
router.route("/uploadVideo").post(
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideo
);
router.route("/").get(getAllVideos)
router.route("/:videoId").get(getVidoeById)
router.route("/deleteVideo").delete(verifyJWT, checkOwner, deleteVideo)
router.route("/:videoId").patch(verifyJWT, checkOwner, updateVideoDetails)

export default router;
