require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");

async function createIndexes() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.26zhx4l.mongodb.net/${process.env.DB_NAME}`,
      {
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
      }
    );

    console.log("Connected to MongoDB");

    console.log("Creating indexes for Posts collection...");

    await Post.collection.createIndex({ createdAt: -1 });

    await Post.collection.createIndex({ category: 1, createdAt: -1 });

    await Post.collection.createIndex({ user: 1, createdAt: -1 });

    await Post.collection.createIndex({ "likes.user": 1 });

    await Post.collection.createIndex({ "comments.user": 1 });

    await Post.collection.createIndex({ isStaffPick: 1, createdAt: -1 });

    console.log("Creating indexes for Users collection...");

    await User.collection.createIndex({ email: 1 }, { unique: true });

    await User.collection.createIndex({ name: "text" });

    await User.collection.createIndex({ country: 1 });

    console.log("All indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

createIndexes()
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
