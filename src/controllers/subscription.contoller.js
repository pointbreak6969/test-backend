import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";

const getUserSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId))
    throw new APIError(401, "Invalid channel Id");
  const user = await User.findById(req.user?._id, { _id: 1 });
  if (!user) throw new APIError(404, "User not found");
  const pipeline = [
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              fulllname: 1,
              username: 1,
              avatar: "$avatar.url",
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscriber: {
          $first: "$subscriber",
        },
      },
    },
  ];
  try {
    const subscribers = await Subscription.aggregate(pipeline);
    const subscriberList = subscribers.map((item) => item.subscriber);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscriberList,
          "Subscriber List fetched Successfully"
        )
      );
  } catch (error) {
    console.log("get User subscribed channel error:", error);
    throw new APIError(
      500,
      error.message || "Internal server error in getUserSubscriberChannels"
    );
  }
});

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId))
    throw new APIError(401, "Invalid channel id");
  if (!req.user?._id) throw new APIError(401, "Unauthorized access");
  const subscribedId = req.user?._id;
  const isSubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: subscribedId,
  });
  try {
    let response = isSubscribed
      ? await Subscription.deleteOne({
          channel: channelId,
          subscriber: subscribedId,
        })
      : await Subscription.create({
          channel: channelId,
          subscriber: subscribedId,
        });
    return res
      .status(200)
      .json(
        new ApiResponse(
          300,
          response,
          isSubscribed === null
            ? "Subscribed Successfully"
            : "Unsubscribed Successfully"
        )
      );
  } catch (error) {
    console.log("toggleSubscripiton error:", error);
    throw new APIError(
      500,
      error.message || "Interna server error in toggle Subscription"
    );
  }
});

//controller returns a list of channel subscribed by the user
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscribedId } = req.params;
  if (!isValidObjectId(subscribedId))
    throw new APIError(401, "Invalid Subscriber Id");
  if (!req.user?._id) throw new APIError(401, "Unauthorized user");
  try {
    const channelSubscribedTo = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscribedId),
        },
      },
      {
        $lookup: {
            from :"users",
            localField: "channel",
            foreignField: "_id",
            as: "subscribedTo", 
            pipeline: [
                {
                    $project: {
                        fulllname: 1,
                        username: 1,
                        avatar: "$avatar.url"
                    }
                }
            ]
        }
      }, 
      {
        $unwind: "$subscribedTo"
      }, {
        $project: {
            subscribedChannel: "$subscribedTo"
        }
      }
    ]);
    const channelSubs = channelSubscribedTo.map(item => item.subscribedChannel)
    return res.status(200).json(new ApiResponse(200, channelSubs, "channel subscribed by owner fetched successfully"))
  } catch (error) {
    console.log("getSubscribedChannelsByOwner error ::", error)
    throw new APIError(
        500,
        error?.message || "Internal server error in getSubscribedChannelsByOwner"
    )
  }
});
export {
    getSubscribedChannels, toggleSubscription, getUserSubscribedChannels
}