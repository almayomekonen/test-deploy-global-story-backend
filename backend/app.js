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
const PORT = process.env.PORT || 4000;

const ENV = process.env.NODE_ENV || "development";
const MONGO_URL =
  ENV === "production"
    ? process.env.MONGO_URL
    : process.env.MONGO_LOCAL_URL ||
      "mongodb://127.0.0.1:27017/global-stories-dev";

// CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cache-Control headers
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

// Mongo connection
mongoose
  .connect(MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    maxPoolSize: 10,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    console.log(
      `✅ MongoDB connected to ${
        ENV === "production" ? "production" : "local"
      } database`
    );
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
