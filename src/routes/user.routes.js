import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/changeCurrentPassword").post(verifyJWT, changeCurrentPassword);
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);
router.route("updateAccountDetails").post(verifyJWT, updateAccountDetails);
router
  .route("/updateUserAvatar")
  .post(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("updateUserCoverImage").post(
  verifyJWT,
  upload.single("coverImage"),

  updateUserCoverImage
);
export default router;
