const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("ERROR:", err.message);
    console.error(err.stack);
  } else {
    console.error(`ERROR [${req.method} ${req.url}]: ${err.message}`);
  }

  if (req.files && req.files.length > 0) {
    console.log("Cleaning up uploaded files after error");
    req.files.forEach((file) => {
      if (file.key) {
        try {
          console.log(`Would delete file: ${file.key}`);
        } catch (cleanupErr) {
          console.error("Cleanup error:", cleanupErr);
        }
      }
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
