const crypto = require("crypto");
const path = require("path");
const {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

let r2Client;

const getR2Config = () => {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucketName = String(process.env.R2_BUCKET_NAME || "").trim();
  const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
  };
};

const ensureR2Configured = () => {
  const config = getR2Config();
  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const error = new Error(
      `Cloudflare R2 is not configured. Missing: ${missingKeys.join(", ")}.`
    );
    error.code = "R2_NOT_CONFIGURED";
    throw error;
  }

  return config;
};

const getR2Client = () => {
  if (!r2Client) {
    const config = ensureR2Configured();

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return r2Client;
};

const normalizeFileName = (fileName) => {
  const baseName = path.basename(String(fileName || "").trim()) || "incident-image";
  return baseName.replace(/[^\w.-]+/g, "_").slice(0, 255);
};

const resolveFileExtension = (file) => {
  const originalExtension = path.extname(String(file.originalname || "")).trim();
  if (originalExtension) {
    return originalExtension.toLowerCase();
  }

  const mimeType = String(file.mimetype || "").toLowerCase();

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/heic") {
    return ".heic";
  }

  if (mimeType === "image/heif") {
    return ".heif";
  }

  return ".jpg";
};

const buildFileKey = ({ userId, file }) => {
  return buildFileKeyForFolder({
    folder: "incident-reports",
    userId,
    file,
  });
};

const buildFileKeyForFolder = ({ folder, userId, file }) => {
  const extension = resolveFileExtension(file);
  const date = new Date();
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return [
    String(folder || "uploads").trim() || "uploads",
    String(userId),
    year,
    month,
    `${crypto.randomUUID()}${extension}`,
  ].join("/");
};

const uploadFilesToR2 = async ({ files, userId, folder = "uploads" }) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const config = ensureR2Configured();
  const client = getR2Client();
  const uploadedFiles = [];

  try {
    for (const file of files) {
      const fileKey = buildFileKeyForFolder({ folder, userId, file });

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
        })
      );

      uploadedFiles.push({
        fileName: normalizeFileName(file.originalname),
        fileKey,
        fileUrl: `${config.publicBaseUrl}/${fileKey}`,
      });
    }

    return uploadedFiles;
  } catch (error) {
    if (uploadedFiles.length > 0) {
      await deleteFilesFromR2(
        uploadedFiles.map((uploadedFile) => uploadedFile.fileKey)
      );
    }

    const uploadError = new Error("Failed to upload files to Cloudflare R2.");
    uploadError.code = "R2_UPLOAD_FAILED";
    uploadError.cause = error;
    throw uploadError;
  }
};

const uploadIncidentImagesToR2 = async ({ files, userId }) => {
  return uploadFilesToR2({
    files,
    userId,
    folder: "incident-reports",
  });
};

const deleteFilesFromR2 = async (fileKeys) => {
  if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
    return;
  }

  try {
    const config = ensureR2Configured();
    const client = getR2Client();

    await Promise.all(
      fileKeys.map((fileKey) =>
        client.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: fileKey,
          })
        )
      )
    );
  } catch (error) {
    console.error("Failed to delete incident images from Cloudflare R2:", error);
  }
};

const deleteIncidentImagesFromR2 = async (fileKeys) => {
  await deleteFilesFromR2(fileKeys);
};

module.exports = {
  uploadFilesToR2,
  uploadIncidentImagesToR2,
  deleteFilesFromR2,
  deleteIncidentImagesFromR2,
};
