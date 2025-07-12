import express from "express";

import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";

import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import commentRoutes from "./routes/comment.route.js";
import notificationRoutes from "./routes/notification.route.js";
import { arcjetMiddleware } from "./middlerware/arcjet.middleware.js";

const app = express();
const port = ENV.PORT;

app.use(cors());
app.use(express.json());

app.use(clerkMiddleware());
// app.use(arcjetMiddleware);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  try {
    await connectDB();

    if (ENV.NODE_ENV !== "production") {
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    }
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

startServer();

export default app;
