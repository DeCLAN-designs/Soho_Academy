const multer = require("multer");

const MAX_INCIDENT_IMAGE_COUNT = 5;
const MAX_INCIDENT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_INCIDENT_IMAGE_SIZE_BYTES,
    files: MAX_INCIDENT_IMAGE_COUNT,
  },
  fileFilter: (_req, file, callback) => {
    if (String(file.mimetype || "").toLowerCase().startsWith("image/")) {
      callback(null, true);
      return;
    }

    const invalidTypeError = new Error("Only image files are allowed.");
    invalidTypeError.code = "UNSUPPORTED_INCIDENT_IMAGE_TYPE";
    callback(invalidTypeError);
  },
});

const uploadIncidentImages = (req, res, next) => {
  upload.array("images", MAX_INCIDENT_IMAGE_COUNT)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Each incident image must be 5MB or smaller.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "You can upload a maximum of 5 incident images.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Failed to process the incident image upload.",
      });
    }

    if (error && error.code === "UNSUPPORTED_INCIDENT_IMAGE_TYPE") {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed for incident uploads.",
      });
    }

    return next(error);
  });
};

module.exports = {
  uploadIncidentImages,
  MAX_INCIDENT_IMAGE_COUNT,
  MAX_INCIDENT_IMAGE_SIZE_BYTES,
};
