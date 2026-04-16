const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

let s3Client;

const getS3Client = () => {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      const error = new Error(
        'AWS S3 is not configured. Missing: AWS_REGION, AWS_ACCESS_KEY_ID, or AWS_SECRET_ACCESS_KEY.'
      );
      error.code = 'S3_NOT_CONFIGURED';
      throw error;
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
  const client = getS3Client();

  for (const file of files) {
    const fileKey = `${folder}/${userId}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      await client.send(new PutObjectCommand(params));
      
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
    const client = getS3Client();

    for (const fileKey of fileKeys) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
      };

      await client.send(new DeleteObjectCommand(params));
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
