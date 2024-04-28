import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { APIError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid Video Id");

  const video = await Video.findById(videoId, { _id: 1 });
  if (!video) throw new APIError(200, "Video not found");

  try {
    const commentAggregate = Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                avatar: "$avatar.url",
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      },
    ]);
  } catch (error) {
    console.log("Error in aggregiation", error);
    throw new APIError(
      500,
      error.message || "Inter server error in comment aggregitaion"
    );
  }

  const options = {
    page,
    limit,
    customLables: {
      docs: "comments",
      totalDocs: "totalComments",
    },
    skip: (page - 1) * limit,
    limit: parseInt(limit),
  };

  Comment.aggregatePaginate(commentAggregate, options)
    .then((result) => {
      if (result?.comment.length === 0) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "No comments found"));
      }
      return res.status(200).json(new ApiResponse(200, result, "success"));
    })
    .catch((error) => {
      console.log(error);
      res
        .status(500)
        .json(new APIError(500, error.message || "Internal Server Error"));
    });
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid Video Id");
  const { content } = req.body;
  if (content?.trim() === "") throw new APIError(404, "content is required");
  const [video, user] = Promise.all([
    Video.findById(videoId),
    User.findById(req.user?._id),
  ]);
  if (!user) throw new APIError(404, "User not found");
  if (!video) throw new APIError(404, "Video not found");

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });
  if (!comment)
    throw new APIError(500, "something went wrong while adding comment");
  return res.status(200).json(new ApiResponse(200, comment, "Success"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) throw new APIError(404, "comment not found");
  const comment = await Comment.findById(commentId, { _id: 1 });
  if (!comment) throw new APIError(404, "No comment found for this id");
  const { content } = req.body;
  if (content?.trim() === "") throw new APIError(404, "content is required");
  const updatedComment = Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );
  if (!updateComment)
    throw new APIError(500, "Something went wrong while updating comment");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "comment updated Successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (isValidObjectId(commentId)) throw new APIError(404, "Not found");
  const comment = await Comment.findById(commentId, { _id: 1 });
  if (!comment) throw new APIError(404, "Not found");
  const removeComment = await Comment.findByIdAndDelete(commentId);
  if (!removeComment) {
    throw new APIError(500, "comment wasn't deleted");
  }
  res
    .status(200)
    .json(new ApiResponse(200, [], "Comment deleted successfully"));
});

export { addComment, deleteComment, getVideoComments, updateComment };
