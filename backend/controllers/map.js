const User = require("../models/User");
const Post = require("../models/Post");

exports.getMapData = async (req, res) => {
  try {
    console.log("Fetching map data");

    const usersByCountry = await User.aggregate([
      {
        $match: {
          country: { $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
          userIds: { $push: "$_id" },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          userIds: 1,
          _id: 0,
        },
      },
    ]);

    console.log("Users by country results:", usersByCountry);

    const results = await Promise.all(
      usersByCountry.map(async (country) => {
        const post = await Post.findOne({
          user: { $in: country.userIds },
        }).sort({ createdAt: -1 });

        return {
          name: country.name,
          count: country.count,
          postId: post ? post._id : null,
        };
      })
    );

    console.log("Final map data results:", results);

    return res.json({
      success: true,
      countries: results,
    });
  } catch (err) {
    console.error("Error fetching country data:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
