const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
      const result = await s3Client.send(new PutObjectCommand(params));
      
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

      await s3Client.send(new DeleteObjectCommand(params));
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
