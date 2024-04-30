import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { APIError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_ClOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    console.log("Error while uploading on cloudinary", error);
    return null;
  }
};

const deleteOnCloudinary = async (oldImageUrl, publicId) => {
  try {
    if (!(oldImageUrl || publicId))
      throw new APIError(404, "No found found to be deleted");
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: `${oldImageUrl.includes("image") ? "image" : "video"}`,
    });
    console.log("Assest deleted from cloudinary", result);
  } catch (error) {
    console.log("Error while deleting asset", error);
    throw new APIError(500, error?.message || "Server error");
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
