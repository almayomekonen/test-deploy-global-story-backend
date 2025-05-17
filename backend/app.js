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

mongoose
  .connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    maxPoolSize: 10,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
