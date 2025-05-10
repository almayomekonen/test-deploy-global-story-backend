const Post = require("../models/Post");
const User = require("../models/User");

exports.createPost = async (req, res) => {
  try {
    const { title, content, category, language } = req.body;
    const images = req.files
      ? req.files.map(
          (file) =>
            `${req.protocol}://${req.get("host")}/uploads/posts/${
              file.filename
            }`
        )
      : [];

    const post = await Post.create({
      user: req.user.id,
      title,
      content,
      category,
      language,
      images,
    });

    const populatePost = await Post.findById(post._id).populate({
      path: "user",
      select: "name profileImage country",
    });

    res.status(201).json({
      success: true,
      data: populatePost,
    });
  } catch (error) {
    console.error("Create Post Failed: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate({
        path: "user",
        select: "name profileImage country",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    res.status(200).json({
      success: true,
      count: posts.length,
      total: totalPosts,
      data: posts,
    });
  } catch (error) {
    console.error("failed to Get Posts : ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPostsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const posts = await Post.find({ category })
      .populate({
        path: "user",
        select: "name profileImage country",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error("failed to Get Posts by catogory : ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: "user",
        select: "name profileImage country city bio",
      })
      .populate({
        path: "comments.user",
        select: "name profileImage",
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("failed to Get Posts by catogory: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ user: userId })
      .populate({
        path: "user",
        select: "name profileImage country",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error("Get user Posts failed: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      res.status(400).json({
        message: "Not authorized to update this post",
      });
    }

    const { title, content, category, language } = req.body;

    post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        category,
        language,
      },
      { new: true }
    ).populate({ path: "user", select: "name profileImage country" });

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Update post error: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this post" });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: "Post removed",
    });
  } catch (error) {
    console.error("Delete post error: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!post) {
      res.status(404).json({
        message: "Post not found",
      });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
      name: user.name,
      profileImage: user.profileImage,
    };

    post.comments.unshift(newComment);
    await post.save();

    res.status(200).json({
      success: true,
      data: post.comments,
    });
  } catch (error) {
    console.error("Add comment error: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      (like) => like.user.toString() === req.user.id
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (like) => like.user.toString() !== req.user.id
      );
    } else {
      post.likes.unshift({ user: req.user.id });
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post.likes,
    });
  } catch (error) {
    console.error("Like post error: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = post.comments.find(
      (comment) => comment._id.toString() === req.params.commentId
    );

    if (!comment) {
      res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this comment" });
    }

    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === req.params.commentId
    );

    post.comments.splice(commentIndex, 1);

    await post.save();

    res.status(200).json({
      success: true,
      data: post.comments,
      message: "Comment removed",
    });
  } catch (error) {
    console.error("Delete post error: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPopularPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    const timeWindow = req.query.timeWindow || "all";

    const timeFilter = {};
    if (timeWindow !== "all") {
      const now = new Date();

      let startDate;

      switch (timeWindow) {
        case "day":
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      timeFilter.createdAt = { $gte: startDate };
    }

    const staffPicks = await Post.find({
      ...timeFilter,
      isStaffPick: true,
    })
      .populate({ path: "user", select: "name profileImage country" })
      .populate({ path: "comments", select: "user" })
      .limit(limit);

    const engagingPosts = await Post.find({
      ...timeFilter,
      $or: [
        { "likes.0": { $exists: true } },
        { "comments.0": { $exists: true } },
      ],

      isStaffPick: { $ne: true },
    })
      .populate({ path: "user", select: "name profileImage country" })
      .populate({ path: "comments", select: "user" });

    const postScore = engagingPosts.map((post) => {
      const likesScore = post.likes.length * 1.5;
      const commentsScore = post.comments.length * 2.5;

      const daysOld =
        (new Date() - new Date(post.createdAt)) / (1000 * 60 * 60 * 24);

      const recencyBonus = Math.max(0, 7 - daysOld);

      const score = likesScore + commentsScore + recencyBonus;

      return {
        ...post.toObject(),
        engagementScore: score,
        displayFlag: score > 10 ? "popular" : score > 3 ? "rising" : "new",
      };
    });

    const rankedPosts = postScore.sort(
      (a, b) => b.engagementScore - a.engagementScore
    );

    const combined = [...staffPicks, ...rankedPosts];

    if (combined.length < limit) {
      const recentPosts = await Post.find({
        ...timeFilter,
        _id: { $nin: combined.map((p) => p._id) },
      })
        .populate({ path: "user", select: "name profileImage country" })
        .sort({ createdAt: -1 })
        .limit(limit - combined.length);

      const flaggedRecentPosts = recentPosts.map((post) => ({
        ...post.toObject(),
        engagementScore: 0.5,
        displayFlag: "new",
      }));

      combined.push(...flaggedRecentPosts);
    }

    const result = combined.slice(0, limit);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Get popular post error: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
