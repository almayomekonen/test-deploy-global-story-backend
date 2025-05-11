const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const multer = require("multer");
const path = require("path");

const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
const AWS_S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME || "aardvark-stories-images";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const createS3Upload = (bucketFolder) => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: AWS_S3_BUCKET_NAME,

      key: function (req, file, cb) {
        const fileName = `${bucketFolder}/${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${path.extname(file.originalname)}`;
        cb(null, fileName);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const fileTypes = /jpeg|jpg|png|gif/;
      const mimeType = fileTypes.test(file.mimetype);
      const extname = fileTypes.test(
        path.extname(file.originalname).toLowerCase()
      );

      if (mimeType && extname) {
        return cb(null, true);
      }
      cb(new Error("Only image files are allowed!"));
    },
  });
};

const profileUpload = createS3Upload("profiles");
const postUpload = createS3Upload("posts");

const getS3Url = (key) => {
  if (!key) return null;
  return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};

module.exports = {
  s3Client,
  profileUpload,
  postUpload,
  getS3Url,
};
