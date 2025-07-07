import asyncHandler from "express-async-handler";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { getAuth } from "@clerk/express";

export const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture");

  return res.status(200).json({ comments });
});

export const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = getAuth(req);
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ message: "Comment is required" });
  }

  const user = await User.findOne({ clerkId: userId });
  const post = await Post.findById(postId);

  if (!user || !post) {
    return res.status(404).json({ message: "User or post not found" });
  }

  const comment = await Comment.create({
    user: user._id,
    post: postId,
    content,
  });

  await Post.findByIdAndUpdate(postId, {
    $push: { comments: comment._id },
  });

  // send notification
  if (post.user.toString() !== user._id.toString()) {
    await Notification.create({
      from: user._id,
      to: post.user,
      type: "comment",
      post: post._id,
    });
  }

  return res
    .status(201)
    .json({ comment, message: "Comment created successfully" });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { userId } = getAuth(req);

  const user = await User.findOne({ clerkId: userId });
  const comment = await Comment.findById(commentId);

  if (!user || !comment) {
    return res.status(404).json({ message: "User or comment not found" });
  }

  if (comment.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to delete this comment" });
  }

  // delete comment from post
  await Post.findByIdAndUpdate(comment.post, {
    $pull: { comments: comment._id },
  });

  // delete comment
  await Comment.findByIdAndDelete(commentId);

  return res.status(200).json({ message: "Comment deleted successfully" });
});
