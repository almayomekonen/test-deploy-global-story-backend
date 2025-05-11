const express = require("express");
const { guard } = require("../middleware/guard");
const { postUpload } = require("../config/s3-config");
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

routes.get("/popular", getPopularPosts);
routes.post("/", guard, postUpload.array("images", 5), createPost);
routes.get("/", getAllPosts);
routes.get("/category/:category", getPostsByCategory);
routes.get("/user/:userId", getUserPosts);
routes.get("/:id", getPostById);
routes.put("/:id", guard, updatePost);
routes.delete("/:id", guard, deletePost);
routes.post("/:id/comments", guard, addComment);
routes.delete("/:id/comments/:commentId", guard, deleteComment);
routes.put("/:id/like", guard, likePost);

module.exports = routes;
