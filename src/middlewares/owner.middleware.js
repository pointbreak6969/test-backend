import { APIError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const checkOwner = (resourcekey, model) =>
  asyncHandler(async (req, _, next) => {
    try {
      const resourceId = req.params[resourcekey];
      const resource = await model.findById(resourceId);
      if (!resourceId) throw new APIError(404, ` resource is not found`);
      if (!resource)
        throw new APIError(404, `${resource} resource is not found`);
      if (resource.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(
          401,
          "You are not authorized to access this resource"
        );
      }
      next();
    } catch (error) {
      console.error("Error in owner middleware:", error);
      next(error);
    }
  });

  export {checkOwner};
