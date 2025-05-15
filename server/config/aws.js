const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// S3 operations
const uploadToS3 = async (fileBuffer, key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  });

  await s3Client.send(command);
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
};

const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key
  });
  
  await s3Client.send(command);
};

const listS3Files = async (prefix) => {
  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Prefix: prefix
  });
  
  const response = await s3Client.send(command);
  return response.Contents || [];
};

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  listS3Files,
  getSignedUrl
};