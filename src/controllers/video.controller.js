import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!title || !description) {
    throw new ApiError(400, "All Fields are Required");
  }

  let videoFileLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video File is Required");
  }

  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is Required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  if (!videoFile) {
    throw new ApiError(
      200,
      "Something went wrong while uploading VideoFile on Cloudinary"
    );
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(
      400,
      "Something went wrong while uploading Thumbnail on Cloudinary"
    );
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user?._id,
    duration: videoFile?.duration || 0,
  });

  const isVideoCreated = await Video.findById(video._id);

  if (!isVideoCreated) {
    throw new ApiError(500, "Something went wrong while create a Video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const isVideoExist = await Video.findById(videoId);
  if (!isVideoExist) {
    throw new ApiError(400, "Video with this Id does not exists");
  }
  //TODO: get video by id
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const fetchVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: {
        views: 1,
      },
    },
    {
      new: true,
    }
  );
  // const video = await Video.findById(videoId);
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
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
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              userName: 1,
              avatar: 1,
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        isPublished: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(500, "failed to fetch video");
  }
  console.log(video);

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  // console.log(fetchVideo);
  console.log(video);

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video Fetched Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const isVideoExist = await Video.findById(videoId);

  if (!isVideoExist) {
    throw new ApiError("Video with this Id does not exits");
  }

  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "All Fields are Required");
  }

  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail?.url || "",
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const isVideoExist = await Video.findById(videoId);

  if (!isVideoExist) {
    throw new ApiError("Video with this Id does not exits");
  }

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError("Video with this Id does not exits");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can not toogle publish status as you are not the owner"
    );
  }

  const toggledVideoPublishResponse = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        toggledVideoPublishResponse.isPublished,
        "Video publish toggled successfully"
      )
    );
});

// const getAllVideos = asyncHandler(async (req, res) => {
//   const {
//     page = 1,
//     limit = 10,
//     query,
//     sortBy = "createdAt",
//     sortType = "desc",
//     userId,
//   } = req.query;

//   const matchConditions = {};

//   // If there's a query parameter, use it to search by title or description
//   if (query) {
//     matchConditions.$or = [
//       { title: { $regex: query, $options: "i" } },
//       { description: { $regex: query, $options: "i" } },
//     ];
//   }

//   // If a userId is provided, filter by userId
//   if (userId) {
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       throw new ApiError(400, "Invalid user Id");
//     }
//     matchConditions.owner = userId;
//   }

//   // Create aggregation pipeline
//   const aggregate = Video.aggregate([
//     { $match: matchConditions },
//     { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "ownerDetails",
//         pipeline: [
//           {
//             $project: {
//               userName: 1,
//               avatar: 1,
//             },
//           },
//         ],
//       },
//     },
//     {
//       $unwind: "$ownerDetails",
//     },
//   ]);

//   // Use aggregatePaginate to handle pagination
//   const options = {
//     page: parseInt(page), // Current page
//     limit: parseInt(limit), // Number of items per page
//   };

//   const result = await Video.aggregatePaginate(aggregate, options);

//   // Return paginated results
//   res
//     .status(200)
//     .json(new ApiResponse(200, result, "Videos fetched Successfully"));
// });

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const matchQuery = {};

  if (query) {
    matchQuery.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User Id");
    }
    matchQuery.owner = userId;
  }

  const videoAggregate = Video.aggregate([
    {
      $match: { ...matchQuery, isPublished: true },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              userName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    },
  ]);

  if (!videoAggregate) {
    throw new ApiError(400, "Does not found");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos Fetched Successfully"));
});

export {
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
};
