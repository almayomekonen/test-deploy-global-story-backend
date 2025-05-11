const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const { applyPerformanceMiddleware } = require("./middleware/performance");

const authRoutes = require("./router/user-routes");
const postRoutes = require("./router/post-routes");
const mapRoutes = require("./router/mapRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const performanceMiddleware = applyPerformanceMiddleware(app);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://pulished-global-stories.vercel.app",
            "https://global-stories.onrender.com",
          ]
        : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", mapRoutes);

app.use(errorHandler);

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.26zhx4l.mongodb.net/${process.env.DB_NAME}`,
    {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("HTTP server closed");

        mongoose.connection.close(false).then(() => {
          console.log("MongoDB connection closed");

          performanceMiddleware.shutdown();
          process.exit(0);
        });
      });
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
