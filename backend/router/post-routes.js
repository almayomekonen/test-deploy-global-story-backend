const express = require("express");
const { guard } = require("../middleware/guard");
const { postUpload } = require("../config/s3-config");
const { processUploadedImages } = require("../middleware/imageProcessing");
const { intelligentCache, invalidateCache } = require("../middleware/cache");
const {
  createPost,
  getAllPosts,
  getPostById,
  getPostsByCategory,
  getUserPosts,
  updatePost,
  deletePost,
  addComment,
  likePost,
  deleteComment,
  getPopularPosts,
} = require("../controllers/posts");

const routes = express.Router();

routes.get("/popular", intelligentCache(), getPopularPosts);
routes.get("/", intelligentCache(), getAllPosts);
routes.get("/category/:category", intelligentCache(), getPostsByCategory);
routes.get("/:id", intelligentCache(), getPostById);
routes.get("/user/:userId", getUserPosts);

routes.post(
  "/",
  guard,
  postUpload.array("images", 5),
  processUploadedImages,
  createPost
);

routes.put("/:id", guard, updatePost);
routes.delete("/:id", guard, deletePost);

routes.post("/:id/comments", guard, addComment);
routes.delete("/:id/comments/:commentId", guard, deleteComment);

routes.put("/:id/like", guard, likePost);

routes.use((req, res, next) => {
  res.on("finish", () => {
    if (req.method !== "GET" && res.statusCode >= 200 && res.statusCode < 300) {
      const path = req.path;

      if (path.match(/^\/[a-f0-9]{24}/)) {
        const postId = path.split("/")[1].split("?")[0];
        invalidateCache(`/api/posts/${postId}`);
      }

      invalidateCache("/api/posts");
      invalidateCache("/api/posts/popular");

      if (req.body && req.body.category) {
        invalidateCache(`/api/posts/category/${req.body.category}`);
      }
    }
  });

  next();
});

module.exports = routes;
