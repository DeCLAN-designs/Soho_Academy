const express = require("express");
const {
  getNumberPlates,
  login,
  logout,
  me,
  refresh,
  register,
} = require("../controllers/auth.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");
const {
  loginValidator,
  refreshTokenValidator,
  registerValidator,
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

router.get("/number-plates", getNumberPlates);
router.get("/me", authenticate, me);
router.post("/logout", logout);

module.exports = router;
