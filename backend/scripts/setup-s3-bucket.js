const {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
} = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const createBucket = async () => {
  try {
    const createBucketParams = {
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: process.env.AWS_REGION,
      },
    };

    await s3Client.send(new CreateBucketCommand(createBucketParams));
    console.log(`Bucket ${bucketName} created successfully`);
  } catch (error) {
    if (
      error.name === "BucketAlreadyExists" ||
      error.name === "BucketAlreadyOwnedByYou"
    ) {
      console.log(`Bucket ${bucketName} already exists`);
    } else {
      console.error("Error creating bucket:", error);
      throw error;
    }
  }
};

const setCorsPolicy = async () => {
  try {
    const corsParams = {
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    };

    await s3Client.send(new PutBucketCorsCommand(corsParams));
    console.log(`CORS policy set for bucket ${bucketName}`);
  } catch (error) {
    console.error("Error setting CORS policy:", error);
    throw error;
  }
};

const setPublicReadPolicy = async () => {
  try {
    const publicReadPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    const policyParams = {
      Bucket: bucketName,
      Policy: JSON.stringify(publicReadPolicy),
    };

    await s3Client.send(new PutBucketPolicyCommand(policyParams));
    console.log(`Public read policy set for bucket ${bucketName}`);
  } catch (error) {
    console.error("Error setting public read policy:", error);
    throw error;
  }
};

const setupS3Bucket = async () => {
  try {
    await createBucket();
    await setCorsPolicy();
    await setPublicReadPolicy();
    console.log("S3 bucket setup completed successfully");
  } catch (error) {
    console.error("S3 bucket setup failed:", error);
  }
};

setupS3Bucket();
