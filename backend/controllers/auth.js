const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const bcrypt = require("bcrypt");
const { getS3Url } = require("../config/s3-config");

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, country, city, bio, languages } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists my friend" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      country,
      city,
      bio,
      languages,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        city: user.city,
        bio: user.bio,
        languages: user.languages,
        profileImage: null, // New user has no profile image yet
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    // Get S3 URL for profile image if it exists
    const profileImageUrl = user.profileImage
      ? getS3Url(user.profileImage)
      : null;

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        city: user.city,
        bio: user.bio,
        languages: user.languages,
        profileImage: profileImageUrl,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get S3 URL for profile image if it exists
    const profileImageUrl = user.profileImage
      ? getS3Url(user.profileImage)
      : null;

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        city: user.city,
        bio: user.bio,
        profileImage: profileImageUrl,
        languages: user.languages,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.uploadImageProfile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image not uploaded correctly" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profileImage) {
      try {
        await deleteFileFromS3(user.profileImage);
      } catch (s3Error) {
        console.error("Error deleting old profile image from S3:", s3Error);
      }
    }

    user.profileImage = req.file.key;
    await user.save();

    const profileImageUrl = getS3Url(user.profileImage);

    res.status(200).json({
      success: true,
      profileImage: profileImageUrl,
      message: "Profile image updated successfully",
    });
  } catch (error) {
    console.error("Profile image error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const uniqueCountries = await User.distinct("country").then(
      (countries) =>
        countries.filter((country) => country && country.trim() !== "").length
    );

    const totalPosts = await Post.countDocuments();

    res.status(200).json({
      success: true,
      totalPosts,
      totalUsers,
      uniqueCountries,
    });
  } catch (error) {
    console.error("Error getting user stats :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
