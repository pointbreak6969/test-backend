import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Playlist } from "../models/playlist.model.js";
// import {Like} from "../models/like.model.js"

const uploadVideo = asyncHandler(async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!(title && description) || !(title.trim() && description.trim()))
      throw new APIError(404, "Please provide title and description");

    if (!req.files?.video[0].path && !req.files?.thumbnail[0].path)
      throw new APIError(404, "Please provide video and thumbnail");
    const videoLocalPath = req.files?.video[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    console.log(req.user);
    console.log(req.user?._id);
    const video = Video.create({
      title,
      description,
      videoFile: { publicId: videoFile?.public_id, url: videoFile?.url },
      thumbnail: { publicId: thumbnail?.public_id, url: videoFile?.url },
      owner: req.user?._id,
      duration: videoFile?.duration,
    });
    return res.status(200).json(
      new ApiResponse(
        201,
        {
          ...video._doc,
          videoFile: videoFile.url,
          thumbnail: thumbnail.url,
        },
        "Video Published Successfully"
      )
    );
  } catch (error) {
    console.error("Error while publishing video :: ", error);
    throw new APIError(
      500,
      error?.message || "Server Error while uploading video"
    );
  }
});

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 110,
    query = "",
    sortBy = "createdAt",
    sortType = 1,
    userId,
  } = req.query;
  const matchCondition = {
    $or: [
      {
        title: { $regex: query, $options: "i" },
      },
      {
        description: {
          $regex: query,
          $options: "i",
        },
      },
    ],
  };
  if (userId) {
    matchCondition.owner = new mongoose.Types.ObjectId(userId);
  }
  var vedioAggeregate;
  try {
    vedioAggeregate = Video.aggregate([
      {
        $match: matchCondition,
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
                fullname: 1,
                avatar: "$avatar.url",
                username: 1,
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
      {
        $sort: {
          [sortBy || "createdAt"]: sortType || 1,
        },
      },
    ]);
  } catch (error) {
    console.log("Error in aggregation", error);
    throw new APIError(
      500,
      error.message || "Internal server error while aggegration"
    );
  }

  const options = {
    page,
    limit,
    customLabels: {
      totalDocs: "totalVideos",
      docs: "videos",
    },
    skip: (page - 1) * limit,
    limit: parseInt(limit),
  };
  Video.aggregatePaginate(vedioAggeregate, options)
    .then((result) => {
      if (result.videos.length === 0 && userId) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "No videos found"));
      }
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Video fetched Successfully"));
    })
    .catch((error) => {
      console.log("Error:", error);
      throw new APIError(
        500,
        error.message || "Internal server error in vedio aggregate Paginate"
      );
    });
});

const getVidoeById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) throw new APIError(404, "No Video found");
  const findVideo = await Video.findById(videoId);
  if (!findVideo) throw new APIError(404, "No vidoe found");
  const user = await User.findById(req.user._id, { watchHistory: 1 });
  if (!user) throw new APIError(404, "User not found");
  if (!user.watchHistory.includes(videoId)) {
    await Video.findByIdAndUpdate(
      videoId,
      {
        $inc: { views: 1 },
      },
      {
        new: true,
      }
    );
  }
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: {
        watchHistory: videoId,
      },
    },
    {
      new: true,
    }
  );
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        form: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: "$avatar.url",
              fullname: 1,
              _id: 1,
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
  ]);
  console.log("Video ::", video[0]);
  if (!video) throw new APIError(500, "Video Details not found");
  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Fetched video successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;
  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid Video Id");
  const oldVideo = await Video.findById(videoId, { thumbnail: 1 });
  if (!oldVideo) throw new APIError(404, "No video found");
  if (
    !(thumbnailLocalPath || !(title || title.trim() === "")) ||
    !(!description || !description.trim() === "")
  )
    throw new APIError(400, "update files are required");

  const updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!updatedThumbnail)
    throw new APIError(500, "thumbnail not uploaded on cloudinary");

  const { publicId, url } = oldVideo?.thumbnail;
  if (!(publicId || url))
    throw new APIError(500, "old thumbnail url or publicId not found");
  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          publicId: updatedThumbnail.public_id,
          url: updatedThumbnail.url,
        },
      },
    },
    {
      new: true,
    }
  );
  if (!video){
    throw new APIError(500, "updated video not uploaded on database")
  }

return res.status(200).json(new ApiResponse(201, video, "video updated successfully"))
});

const deleteVideo = asyncHandler(async (req, res)=>{
  const {videoId} = req.params;
if (!isValidObjectId(videoId)) throw new APIError(400, "no valid video found")
try {
  const video = await Video.findById(videoId, {videoFile:1, thumbnail:1}).select("_id videoFile thumbnail")
  if (!video) throw new APIError(404, "No video found")
  await Video.findByIdAndDelete(videoId)
} catch (error) {
  console.log("error while deleting video: ", error)
}
  
})

export { uploadVideo, getAllVideos, getVidoeById, deleteVideo, updateVideoDetails, };
