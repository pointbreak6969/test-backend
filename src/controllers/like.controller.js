import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleLike = async (Model, resourceId, userId) => {
  if (!isValidObjectId(resourceId))
    throw new APIError(400, "Invalid Resource Id");
  if (!isValidObjectId(userId)) throw new APIError(400, "Invalid UserId");
  const resource = await Model.findById(resourceId);
  if (!resource) throw new APIError(404, "No resource found");
  const resourceField = Model.modelName.toLowerCase();
  const isLiked = await Like.findOne({
    [resourceField]: resourceId,
    likedBy: userId,
  });
  var response;
  try {
    response = isLiked
      ? await Like.deleteOne({ [resourceField]: resourceId, likedBy: userId })
      : await Like.create({ [resourceField]: resourceId, likedBy: userId });
  } catch (error) {
    console.log("toggleLike error", error);
    throw new APIError(
      500,
      error.message || "Internal server error in toggleLike"
    );
  }
  const totalLikes = await Like.countDocuments({ [resourceField]: resourceId });
  return { response, isLiked, totalLikes };
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) throw new APIError(404, "Invalid video link");
  const { response, isLiked, totalLikes } = await toggleLike(
    Video,
    videoId,
    req.user?._id
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { response, totalLikes },
        isLiked === null ? "Liked Successfully" : "removed like successfully"
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { response, isLiked, totalLikes } = await toggleLike(
    Comment,
    commentId,
    req.user?._id
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { response, totalLikes },
        isLiked === null ? "Liked Successfully" : "removed like successfully"
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId))
    throw new APIError(404, "No valid comment found");
  const { response, isLiked, totalLikes } = await toggleLike(
    Tweet,
    tweetId,
    req.user?._id
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { response, totalLikes },
        isLiked === null ? "Liked Successfully" : "removed like successfully"
      )
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new APIError(401, "Unauthorized request");
  const userId = req.user?._id;
  const videoPipeline = [
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localFields: "video",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: "$avatar.url",
            },
          },
        ],
      },
    },
    {
      $addFields: {
        videoFile: "$videoFile.url",
      },
    },
    {
      $addFields: {
        thumbnail: "$thumbnail.url",
      },
    },
    {
      $unwind: "$video",
    },
    {
      $replaceRoot: {
        newRoot: "$video",
      },
    },
  ];
  try {
    const likedVideo = await Like.aggregate(pipeline)
    return res.status(200).json(new ApiResponse(200, likedVideo, "Liked videos fetched Successfully"))
  } catch (error) {
    console.log("getLikedVideos:", error)
    throw new APIError(500, error?.message || "Internal server error in getLikedVideos")
  }
});

export {
    toggleCommentLike,
    toggleLike,
    toggleTweetLike,
    getLikedVideos,
    toggleVideoLike
}
