const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "aardvark-stories-images";

const imageSizes = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
  original: { width: null, height: null },
};

async function optimizeAndUploadImage(buffer, folder, options = {}) {
  const {
    generateSizes = ["medium", "thumbnail"],
    quality = 80,
    format = "webp",
    fit = "inside",
  } = options;

  try {
    const filenameBase = `${folder}/${Date.now()}-${uuidv4()}`;
    const metadata = await sharp(buffer).metadata();
    const results = {};

    for (const size of generateSizes) {
      const config = imageSizes[size];
      if (!config) continue;

      let processedImage;

      if (size === "original") {
        processedImage = await sharp(buffer)
          .toFormat(format, { quality })
          .toBuffer();
      } else {
        processedImage = await sharp(buffer)
          .resize({
            width: config.width,
            height: config.height,
            fit,
            withoutEnlargement: true,
          })
          .toFormat(format, { quality })
          .toBuffer();
      }

      const key = `${filenameBase}-${size}.${format}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: processedImage,
          ContentType: `image/${format}`,
          CacheControl: "public, max-age=31536000",
        })
      );

      results[size] = key;
    }

    return {
      success: true,
      keys: results,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
      },
    };
  } catch (error) {
    console.error("Image optimization error:", error);
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
}

function getImageUrl(key) {
  if (!key) return null;
  return `https://${BUCKET_NAME}.s3.${
    process.env.AWS_REGION || "eu-north-1"
  }.amazonaws.com/${key}`;
}

module.exports = {
  optimizeAndUploadImage,
  getImageUrl,
  imageSizes,
};
