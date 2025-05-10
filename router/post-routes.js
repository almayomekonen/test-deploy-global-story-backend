const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { guard } = require("../middleware/guard");
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

const postDir = path.join(__dirname, "../uploads/posts");
if (!fs.existsSync(postDir)) {
  fs.mkdirSync(postDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/posts");
  },
  filename: (req, file, cb) => {
    cb(null, `post-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const mimeType = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

const routes = express.Router();

routes.get("/popular", getPopularPosts);
routes.post("/", guard, upload.array("images", 5), createPost);
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
