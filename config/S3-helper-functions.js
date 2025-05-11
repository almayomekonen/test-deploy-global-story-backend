const {
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { s3Client } = require("./s3-config");

const deleteFileFromS3 = async (key) => {
  if (!key) return null;

  const deleteParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    const result = await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`Successfully deleted file: ${key}`);
    return result;
  } catch (error) {
    console.error(`Error deleting file ${key}:`, error);
    throw error;
  }
};

const deleteFilesFromS3 = async (keys) => {
  if (!keys || keys.length === 0) return null;

  const deleteParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
      Quiet: false,
    },
  };

  try {
    const result = await s3Client.send(new DeleteObjectsCommand(deleteParams));
    console.log(`Successfully deleted ${keys.length} files from S3`);
    return result;
  } catch (error) {
    console.error("Error deleting multiple files from S3:", error);
    throw error;
  }
};

module.exports = {
  deleteFileFromS3,
  deleteFilesFromS3,
};
