import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const like = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (like) {
    await Like.findByIdAndDelete(like?._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  await Like.create({
    likedBy: req.user?._id,
    video: videoId,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const like = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (like) {
    await Like.findByIdAndDelete(like?._id);
    return res.status(200).json(200, { isLiked: false });
  }

  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(200, { isLiked: true });
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid Tweet ID");
  }

  const like = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (like) {
    await Like.findByIdAndDelete(like?._id);

    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    // {
    //   $lookup: {
    //     from: "users",
    //     localField: "likedBy",
    //     foreignField: "_id",
    //     as: "likedByDetails",
    //   },
    // },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "videos",
      },
    },
    // {
    //   $lookup: {
    //     from: "tweets",
    //     localField: "tweet",
    //     foreignField: "_id",
    //     as: "tweets",
    //   },
    // },
    {
      $match: {
        "videos.0": { $exists: true }, // Ensure there is at least one video in the "videos" array
      },
    },
    {
      $addFields: {
        // likedByDetails: {
        //   $first: "$likedByDetails",
        // },
        videosCount: {
          $size: "$videos",
        },
        videos: {
          $first: "$videos"
        }
        // tweetsCount: {
        //   $size: "$tweets",
        // },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        videos: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            userName: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
