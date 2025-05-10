const express = require("express");
const { guard } = require("../middleware/guard");
const {
  register,
  login,
  getCurrentUser,
  uploadImageProfile,
  getUserStats,
} = require("../controllers/auth");
const upload = require("../middleware/multer-upload");

const routes = express.Router();

routes.get("/stats", getUserStats);

routes.post("/register", register);

routes.post("/login", login);

routes.get("/me", guard, getCurrentUser);

routes.put(
  "/profile-image",
  guard,
  upload.single("profileImage"),
  uploadImageProfile
);

module.exports = routes;
