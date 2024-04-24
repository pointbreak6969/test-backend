import { APIError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model";

const verifyJWT = asyncHandler(async (req, res, next)=>{
    try {
        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
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