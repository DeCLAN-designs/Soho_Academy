const express = require("express");
const {
  getNumberPlates,
  login,
  logout,
  me,
  refresh,
  register,
  updateProfile,
} = require("../controllers/auth.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");
const { createRateLimiter } = require("../middlewares/rateLimiter.middleware.js");
const { uploadProfilePhoto } = require("../middlewares/profileUpload.middleware.js");
const {
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  updateProfileValidator,
  validate,
} = require("../validators/auth.validators.js");

const router = express.Router();

// Rate limiters for sensitive auth endpoints
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many attempts, please try again after 15 minutes.",
});

router
  .route("/register")
  .post(authLimiter, registerValidator, validate, register)
  .all((_req, res) =>
    res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST /api/auth/register.",
    })
  );

router
  .route("/login")
  .post(authLimiter, loginValidator, validate, login)
  .all((_req, res) =>
    res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST /api/auth/login.",
    })
  );

router
  .route("/refresh")
  .post(authLimiter, refreshTokenValidator, validate, refresh)
  .all((_req, res) =>
    res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST /api/auth/refresh.",
    })
  );

router.get("/number-plates", getNumberPlates);
router.get("/me", authenticate, me);
router.patch(
  "/profile",
  authenticate,
  uploadProfilePhoto,
  updateProfileValidator,
  validate,
  updateProfile
);
router.post("/logout", logout);

module.exports = router;
