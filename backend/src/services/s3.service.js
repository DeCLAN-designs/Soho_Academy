const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Lazy-initialise the S3 client so the module can be safely required even when
// AWS credentials are not yet available (e.g. during tests or when only R2 is
// used).  The client is created on first actual use.
let s3Client;

const getS3Client = () => {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS S3 is not configured. Missing one or more of: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.'
      );
    }

    s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return s3Client;
};

const uploadFilesToS3 = async ({ files, userId, folder }) => {
  const uploadedFiles = [];

  for (const file of files) {
    const fileKey = `${folder}/${userId}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const result = await getS3Client().send(new PutObjectCommand(params));
      
      const fileUrl = `${process.env.S3_BUCKET_URL}/${fileKey}`;
      
      uploadedFiles.push({
        fileName: file.originalname,
        fileKey: fileKey,
        fileUrl: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('S3_UPLOAD_FAILED');
    }
  }

  return uploadedFiles;
};

const deleteFilesFromS3 = async (fileKeys) => {
  try {
    for (const fileKey of fileKeys) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
      };

      await getS3Client().send(new DeleteObjectCommand(params));
    }
  } catch (error) {
    console.error('Error deleting files from S3:', error);
    throw new Error('S3_DELETE_FAILED');
  }
};

module.exports = {
  uploadFilesToS3,
  deleteFilesFromS3,
};
