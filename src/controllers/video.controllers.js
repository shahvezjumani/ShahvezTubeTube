import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if (!(title && description)) {
    throw new ApiError(200, "All fields are required");
  }

  let videoFileLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  }
  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "VideoFile is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile?.url || "",
    thumbnail: thumbnail?.url || "",
    duration: videoFile?.duration || "",
    owner: req?.user,
  });

  const videoExist = await Video.findById(video._id);
  if (!videoExist) {
    throw new ApiError(500, "Failed to Upload VideoFile");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Successfully Published"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!videoId) {
    throw new ApiError(200, "Video Id is required");
  }

  const newVideoId = new mongoose.Types.ObjectId(videoId);
  // const video = await Video.findById(newVideoId);

  // if (!video) {
  //   throw new ApiError(200, "Video does not exists");
  // }

  const video = await Video.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(videoId) },
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
            $project: {
              fullName: 1,
              userName: 1,
              avatar: 1,
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
        likesCount: {
          $size: "$likes",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Successfully get video"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  if (!isValidObjectId(videoId)) {
    throw new ApiError(200, "Invalid User Id");
  }

  const { title, description } = req.body;

  console.log(title, description);

  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(200, "All Fields are required");
  }
  const thumbnailLocalPath = req.file?.path;
  // if (
  //   req.file &&
  //   Array.isArray(req.file.thumbnail) &&
  //   req.file.thumbnail.length > 0
  // ) {
  //   thumbnailLocalPath = req.file.thumbnail.path;
  // }

  if (!thumbnailLocalPath) {
    new ApiError(200, "Thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  console.log(thumbnail);

  if (!thumbnail) {
    throw new ApiError(500, "Failed to upload on cloudinary");
  }

  const video = await Video.findByIdAndUpdate(
    new mongoose.Types.ObjectId(videoId),
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Successfully updated video file"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!videoId) {
    throw new ApiError(200, "Invalid video ID");
  }

  const video = await Video.findById(new mongoose.Types.ObjectId(videoId));

  if (!video) {
    throw new ApiError(200, "Video is already deleted");
  }

  const deletedVideo = await Video.findByIdAndDelete(
    new mongoose.Types.ObjectId(videoId)
  );

  // const video = await Video.findById(new mongoose.Types.ObjectId(videoId));

  if (!deletedVideo) {
    throw new ApiError(500, "Unable to delete video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully Deleted Video"));
});
export { publishAVideo, getVideoById, updateVideo, deleteVideo };
