const multer = require("multer");

const MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const mimeType = String(file.mimetype || "").toLowerCase();
    const isAllowedImage = mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
    const isAllowedPdf = mimeType === "application/pdf";

    if (isAllowedImage || isAllowedPdf) {
      callback(null, true);
      return;
    }

    const error = new Error("Only PDF or image files are allowed.");
    error.code = "UNSUPPORTED_COMPLIANCE_DOCUMENT_TYPE";
    callback(error);
  },
});

const uploadComplianceDocument = (req, res, next) => {
  upload.single("documentFile")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "The compliance document must be 10MB or smaller.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Only one compliance document file is allowed.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Failed to process the compliance document upload.",
      });
    }

    if (error && error.code === "UNSUPPORTED_COMPLIANCE_DOCUMENT_TYPE") {
      return res.status(400).json({
        success: false,
        message: "Only PDF or image files are allowed for compliance documents.",
      });
    }

    return next(error);
  });
};

module.exports = {
  uploadComplianceDocument,
  MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES,
};
