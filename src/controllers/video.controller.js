import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

    const video = Video.create({
      title,
      description,
      videoFile: { publicId: videoFile?.public_id, url: videoFile?.url },
      thumbnail: { publicId: thumbnail?.public_id, url: videoFile?.url },
      owner: req.user?._id,
      duration: videoFile?.duration,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(201, {
          ...video._doc,
          videoFile: videoFile.url,
          thumbnail: thumbnail.url,
        }, "Video Published Successfully")
      );
  } catch (error) {
    console.error("Error while publishing video :: ", error);
      throw new APIError(500, error?.message || 'Server Error while uploading video');
  }
});


export { uploadVideo };
