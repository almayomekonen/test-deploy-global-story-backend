const { s3Client } = require("../config/s3-config");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { optimizeImage, IMAGE_SIZES } = require("../config/s3-config");
const path = require("path");

const processUploadedImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const MAX_CONCURRENT = 2;
    const processedImages = [];

    for (let i = 0; i < req.files.length; i += MAX_CONCURRENT) {
      const batch = req.files.slice(i, i + MAX_CONCURRENT);
      const batchPromises = [];

      for (const file of batch) {
        if (!file.mimetype.startsWith("image/")) {
          processedImages.push(file.key);
          continue;
        }

        const originalKey = file.key;
        const extname = path.extname(originalKey);
        const baseKey = originalKey.replace(extname, "");

        processedImages.push(originalKey);

        const fileBuffer = file.buffer;

        if (!fileBuffer) {
          console.warn(
            `No buffer available for ${originalKey}, skipping optimization`
          );
          continue;
        }

        const sizesToProcess = ["thumbnail", "medium"];

        for (const size of sizesToProcess) {
          const dimensions = IMAGE_SIZES[size];
          const newKey = `${baseKey}-${size}${extname}`;

          const processPromise = (async () => {
            try {
              const optimizedBuffer = await optimizeImage(
                fileBuffer,
                dimensions
              );

              const uploadParams = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: newKey,
                Body: optimizedBuffer,
                ContentType: file.mimetype,
                ACL: "public-read",
              };

              await s3Client.send(new PutObjectCommand(uploadParams));
              return newKey;
            } catch (err) {
              console.error(
                `Error processing ${size} version of ${originalKey}:`,
                err
              );
              return null;
            }
          })();

          batchPromises.push(processPromise);
        }
      }

      const batchResults = await Promise.all(batchPromises);
      processedImages.push(...batchResults.filter(Boolean));
    }

    req.processedImages = processedImages;
    next();
  } catch (error) {
    console.error("Image processing error:", error);
    req.processedImages = req.files ? req.files.map((file) => file.key) : [];
    next();
  }
};

module.exports = {
  processUploadedImages,
};
