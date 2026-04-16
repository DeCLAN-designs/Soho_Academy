const multer = require("multer");

const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_PHOTO_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const mime = String(file.mimetype || "").toLowerCase();
    if (mime.startsWith("image/") && mime !== "image/svg+xml") {
      callback(null, true);
      return;
    }

    const error = new Error("Only raster image files are allowed (SVG is not permitted).");
    error.code = "UNSUPPORTED_PROFILE_PHOTO_TYPE";
    callback(error);
  },
});

const uploadProfilePhoto = (req, res, next) => {
  upload.single("profilePhoto")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "The passport photo must be 5MB or smaller.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Only one passport photo is allowed.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Failed to process the passport photo upload.",
      });
    }

    if (error && error.code === "UNSUPPORTED_PROFILE_PHOTO_TYPE") {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed for passport photos.",
      });
    }

    return next(error);
  });
};

module.exports = {
  uploadProfilePhoto,
  MAX_PROFILE_PHOTO_SIZE_BYTES,
};
