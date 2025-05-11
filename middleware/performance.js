const compression = require("compression");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const responseTime = require("response-time");

const compressionMiddleware = compression({
  level: 6,
  threshold: 0,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
});

const monitorResponseTime = responseTime((req, res, time) => {
  if (time > 500) {
    console.warn(
      `Slow response: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`
    );
  }
});

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "*.amazonaws.com"],
      connectSrc: ["'self'", "*.amazonaws.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
});

const setCacheHeaders = (req, res, next) => {
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|css|js)$/i)) {
    res.setHeader("Cache-Control", "public, max-age=31536000");
  } else if (req.method === "GET" && req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "public, max-age=60");
  } else {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
};

const applyPerformanceMiddleware = (app) => {
  app.use(compressionMiddleware);
  app.use(securityHeaders);
  app.use(setCacheHeaders);
  app.use(monitorResponseTime);
  app.use("/api/", apiLimiter);

  return {
    shutdown: () => {
      console.log("Gracefully shutting down performance middleware...");
    },
  };
};

module.exports = {
  applyPerformanceMiddleware,
  compressionMiddleware,
  securityHeaders,
  setCacheHeaders,
  apiLimiter,
  monitorResponseTime,
};
