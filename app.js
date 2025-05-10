const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("rate-limiter-flexible");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./router/user-routes");
const postRoutes = require("./router/post-routes");
const mapRoutes = require("./router/mapRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = new rateLimit.RateLimiterMemory({
  points: 100,
  duration: 60,
});

app.use(helmet());

const allowedOrigins = [
  "https://test-deploy-global-story-jm22szwpw-miel-team.vercel.app",
  "https://test-deploy-global-story.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(errorHandler);

const uploadsDir = path.join(__dirname, "uploads");
const profilesDir = path.join(uploadsDir, "profiles");
const postsDir = path.join(uploadsDir, "posts");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir);
}

if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir);
}

app.use((req, res, next) => {
  limiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send("Too Many Requests");
    });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Main API routes with /api prefix
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", mapRoutes);

// Also support routes without /api prefix for flexibility
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);

app.get("/", (req, res) => {
  res.send("Global Stories API is running");
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.26zhx4l.mongodb.net/${process.env.DB_NAME}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
