const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required!"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is reuired!"],
    },
    category: {
      type: String,
      enum: ["Culture", "Tech", "Personal", "Learning", "Other"],
      default: "Other",
    },
    images: [String],
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        text: {
          type: String,
          required: true,
        },
        name: {
          type: String,
        },
        profileImage: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    language: {
      type: String,
      default: "English",
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
