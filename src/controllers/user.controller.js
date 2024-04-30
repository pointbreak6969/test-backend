import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation - not empty
  // check whether the user already exists: username, email
  //check images, check for avatar
  //upload them to cloudinary, avatar
  //create user objet - create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return response

  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some((field) => field.trim() === "")
  ) {
    throw new APIError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new APIError(409, "User with email or username already taken");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(req.files);
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar local path not found");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new APIError(400, "avatar file can't be uploaded on cloudinary");
  }
  console.log(avatar);

  const user = await User.create({
    fullname,
    avatar: {
      publicId: avatar.public_id,
      url: avatar.url,
    },
    coverImage:
      {
        publicId: coverImage.public_id,
        url: coverImage.url,
      } || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new APIError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  const { email, username, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new APIError(400, "username or email is required");
  }

  // Here is an alternative of above code based on logic discussed in video:
  // if (!(username || email)) {
  //     throw new ApiError(400, "username or email is required")

  // }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new APIError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new APIError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new APIError(401, "unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new APIError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new APIError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefereshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newrefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isOldPasswordCorrect) {
    throw new APIError(400, "Invalid Old Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changed successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  console.log({ fullname, email });
  if (!fullname || !email) {
    throw new APIError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      fullname: fullname,
      email: email,
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const { publicId, url } = req.user?.avatar;
  console.log(req.user.avatar);

  // if (!(publicId || url))
  //   throw new APIError(404, "Something went wrong while updating user avatar");
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new APIError(400, "Error while uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  // if (url) {
  //   try {
  //     await deleteOnCloudinary(url, publicId);
  //   } catch (error) {
  //     console.log(`Failed to delete old image from cloudinary server ${error}`);
  //     throw new APIError(500, error.message || "Server Error");
  //   }
  // }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Avatar Image updated successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const { publicId, url } = req.user?.coverImage;
  if (!(publicId || url))
    throw new APIError(404, "Something went wrong while updating cover image");
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new APIError(400, "Cover Image file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new APIError(400, "Error while uploading on image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  if (url) {
    try {
      await deleteOnCloudinary(url, publicId);
    } catch (error) {
      console.log("Error while deleting cover image from cloudinary");
      throw new APIError(500, "Internal Server Error");
    }
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Cover Image updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetched successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new APIError(400, "username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), // user ley kunai channel ko profile kholxa through username. so tesle kholyako profile ko information hami sanga database ma xa. database bata tesko id extract garyem
      },
    },
    {
      $lookup: {
        // total number of subscribers khojna paryo tesko lagi lookup lagyako
        from: "subscriptions", //kata bata khojne. hamro subscription model bata
        localField: "_id", // tyo khojyako user ko id
        foreignField: "channel", // subscription model ma chai documents banyako hunxa. tyo sabai documents ma dui ota field hunxan subscriber ra channnel. total numbers of subscribers find garna hami ley tyo search huna lagyako user ko id chai channel field ma gayera khojxam. jati ota channel field ma tyo id match garxa teti nai hamro subscribers hunxan
        as: "subscribers", // count garyako result lai as a subscriber result present garyem
      },
    },
    {
      $lookup: {
        // aaba hamro kaam kati ota channel lai subscribe garyako xa vanyera patta lagaune ho
        from: "subscriptions", // patta lagauna feri jana paryo subscription model ma
        localField: "_id", // hami aaile searched user document ma xam. aani yo document ma tyo searched user ko detail _id field ma stored xa
        foreignField: "subscriber", // tyo _id leyera gayem hami subscription model ma. yo model ma dherai nai documents xan. tee documents ma chai kati ota document ma subscriber field ma chai yo id xa hai vanyera khojxan josle hami lai total number of subscribed accounts dinxa
        as: "subscribedTo", // pako results lai as an array named subscribedTo ma send garxam
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers", // hami ley ta result array ma paunxam. so tyo array ko size calculate garyako
        },
        channelIsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          // aaba hami ley tyo search garyako user lai subscribe garyako xa ki nai vanyera patta lagaun paryo.
          $cond: {
            // tesko lagi ta tyo searched user ko document ko subscriber field ma tesko naam xa ki nai check garxam
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        // yo step bata result return garxam. result chai k k return garni ho tani vanyera yeha mention garxam
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelIsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        emaiL: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new APIError(200, "channel doesn't exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "user channel fetched succesfully"));
});

const getWatchHistroy = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistroy",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].getWatchHistroy,
        "Watch Histroy fetched successfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistroy,
};
