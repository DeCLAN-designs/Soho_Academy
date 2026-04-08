const multer = require("multer");

const MAX_COMPLAINT_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_COMPLAINT_ATTACHMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (String(file.mimetype || "").toLowerCase().startsWith("image/")) {
      callback(null, true);
      return;
    }

    const error = new Error("Only image files are allowed.");
    error.code = "UNSUPPORTED_COMPLAINT_ATTACHMENT_TYPE";
    callback(error);
  },
});

const uploadComplaintAttachment = (req, res, next) => {
  upload.single("attachment")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "The attachment photo must be 5MB or smaller.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Only one attachment photo is allowed.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Failed to process the complaint attachment.",
      });
    }

    if (error && error.code === "UNSUPPORTED_COMPLAINT_ATTACHMENT_TYPE") {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed for complaint attachments.",
      });
    }

    return next(error);
  });
};

module.exports = {
  uploadComplaintAttachment,
  MAX_COMPLAINT_ATTACHMENT_SIZE_BYTES,
};
