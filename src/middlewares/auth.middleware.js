import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token){
            throw new APIError(401, "Unauthorized request")
        }
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKENT_SECRET);
       const user =  await User.findById(decodedToken?._id).select("-password -refreshToken")
       if (!user){
        throw APIError(401, "Invalid Access Token")
       }
       req.user = user;
       next()
    } catch (error) {
        throw new APIError(401, error?.message || "Invalid access token")
    }
})

export {verifyJWT};