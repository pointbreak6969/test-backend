import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { Router } from "express";

const router = Router()

import { verifyJWT } from "../middlewares/auth.middleware.js";

router.route("/addComment").post(verifyJWT, addComment)
router.route("/deleteComment").delete(verifyJWT, deleteComment)
router.route("/getVideoComments").get(getVideoComments)
router.route("/updateComment").patch(updateComment)


export default router;