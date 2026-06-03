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
const { uploadProfilePhoto } = require("../middlewares/profileUpload.middleware.js");
const {
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  updateProfileValidator,
  validate,
} = require("../validators/auth.validators.js");

const router = express.Router();

router
  .route("/register")
  .post(registerValidator, validate, register)
  .all((_req, res) =>
    res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST /api/auth/register.",
    })
  );

router
  .route("/login")
  .post(loginValidator, validate, login)
  .all((_req, res) =>
    res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST /api/auth/login.",
    })
  );

router
  .route("/refresh")
  .post(refreshTokenValidator, validate, refresh)
  .all((_req, res) =>
    res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST /api/auth/refresh.",
    })
  );

router.get("/number-plates", authenticate, getNumberPlates);
router.get("/me", authenticate, me);
router.patch(
  "/profile",
  authenticate,
  uploadProfilePhoto,
  updateProfileValidator,
  validate,
  updateProfile
);
router.post("/logout", authenticate, logout);

module.exports = router;
