import asyncHandler from "express-async-handler";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import { getAuth } from "@clerk/express";
import cloudinary from "../config/cloudinary.js";

export const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });
  return res.status(200).json({ posts });
});

export const getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId)
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  if (!post) return res.status(404).json({ message: "Post not found" });

  return res.status(200).json({ post });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.find({ user: username._id });
  if (!user) return res.status(404).json({ message: "User not found" });

  const posts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  return res.status(200).json({ posts });
});

export const createPost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { content } = req.body;
  const imageFile = req.file;

  if (!content && !imageFile) {
    return res.status(400).json({ message: "Content or image is required" });
  }

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  let imageUrl = "";

  if (imageFile) {
    try {
      const base64Image = `data:${
        imageFile.mimetype
      };base64,${imageFile.buffer.toString("base64")}`;
      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "media_posts",
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ],
      });
      imageUrl = uploadResponse.secure_url;
    } catch (error) {
      console.log("Cloudinary error: ", error);
      return res.status(500).json({ message: "Error uploading image" });
    }
  }

  const post = await Post.create({
    user: user._id,
    content: content || "",
    image: imageUrl,
  });

  return res.status(201).json({ post, message: "Post created successfully" });
});

export const likePost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { postId } = req.params;

  const user = await User.findOne({ clerkId: userId });
  const post = await Post.findById(postId);

  if (!user || !post)
    return res.status(404).json({ message: "User or post not found" });

  const isLiked = post.likes.includes(user._id);
  if (isLiked) {
    //unlike
    await Post.findByIdAndUpdate(postId, {
      $pull: {
        likes: user._id,
      },
    });
  } else {
    //like
    await Post.findByIdAndUpdate(postId, {
      $push: {
        likes: user._id,
      },
    });

    // send notification
    if (post.user.toString() !== user._id.toString()) {
      await Notification.create({
        from: user._id,
        to: post.user,
        type: "like",
        post: post._id,
      });
    }
  }

  return res.status(200).json({
    message: isLiked ? "Post unliked successfully" : "Post liked successfully",
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = getAuth(req);

  const user = await User.findOne({ clerkId: userId });
  const post = await Post.findById(postId);
  if (!user || !post)
    return res.status(404).json({ message: "User or post not found" });

  //delete all comments
  await Comment.deleteMany({ post: postId });

  //delete post
  await Post.findByIdAndDelete(postId);

  return res.status(200).json({ message: "Post deleted successfully" });
});
