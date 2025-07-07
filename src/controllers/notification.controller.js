import asyncHandler from "express-async-handler";
import { getAuth } from "@clerk/express";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  const notifications = await Notification.find({ to: user._id })
    .sort({ createdAt: -1 })
    .populate("from", "username firstName lastName profilePicture")
    .populate("post", "content image")
    .populate("comment", "content");

  return res.status(200).json({ notifications });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const { userId } = getAuth(req);

  const user = await User.findOne({ clerkId: userId });

  if (!user)
    return res.status(404).json({ message: "User or notification not found" });

  const notification = await Notification.findByIdAndDelete(notificationId);
  if (!notification)
    return res.status(404).json({ message: "Notification not found" });

  return res.status(200).json({ message: "Notification deleted successfully" });
});
