const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const errorHandler = require("./middleware/errorHandler");
const { applyPerformanceMiddleware } = require("./middleware/performance");
const { intelligentCache } = require("./middleware/cache");

const authRoutes = require("./router/user-routes");
const postRoutes = require("./router/post-routes");
const mapRoutes = require("./router/mapRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const performanceMiddleware = applyPerformanceMiddleware(app);

const allowedOrigins = [
  "https://test-deploy-global-story-85733l9f7-miel-team.vercel.app/",
  "https://test-deploy-global-story.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
      return;
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  if (req.method === "GET") {
    if (req.path.match(/\/api\/posts\/popular/)) {
      res.set("Cache-Control", "public, max-age=300");
    } else if (req.path.match(/\/api\/posts\/[a-f0-9]{24}$/)) {
      res.set("Cache-Control", "public, max-age=60");
    } else if (req.path.match(/\/api\/posts$/)) {
      res.set("Cache-Control", "public, max-age=30");
    }
  } else {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  next();
});

app.use("/api", intelligentCache());

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", mapRoutes);

app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API is working!" });
});

app.use(errorHandler);

const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  maxPoolSize: 10,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.26zhx4l.mongodb.net/${process.env.DB_NAME}`,
    mongooseOptions
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

      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
