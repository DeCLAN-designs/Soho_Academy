const { body, validationResult } = require("express-validator");

/**
 * =====================================================
 * Constants
 * =====================================================
 */
const ALLOWED_ROLES = Object.freeze([
  "Parent",
  "Driver",
  "Bus Assistant",
  "Transport Manager",
]);

/**
 * =====================================================
 * Helpers
 * =====================================================
 */

const NUMERIC_ONLY_REGEX = /^\d+$/;
const ROLES_REQUIRING_NUMBER_PLATE = ["Driver", "Bus Assistant"];

const normalizeNumberPlate = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

/**
 * =====================================================
 * Register Validator
 * =====================================================
 */
const registerValidator = [
  body("firstName")
    .exists({ checkFalsy: true })
    .withMessage("firstName is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("firstName is too long."),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("email is required.")
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage("Invalid email format.")
    .normalizeEmail(),

  body("lastName")
    .exists({ checkFalsy: true })
    .withMessage("lastName is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("lastName is too long."),

  body("phoneNumber")
    .exists({ checkFalsy: true })
    .withMessage("phoneNumber is required.")
    .bail()
    .isString()
    .trim()
    .matches(NUMERIC_ONLY_REGEX)
    .withMessage("phoneNumber must contain numbers only.")
    .isLength({ min: 9, max: 20 })
    .withMessage("phoneNumber length is invalid."),

  body("numberPlate")
    .if(body("role").isIn(ROLES_REQUIRING_NUMBER_PLATE))
    .exists({ checkFalsy: true })
    .withMessage("numberPlate is required for Driver and Bus Assistant.")
    .bail()
    .customSanitizer(normalizeNumberPlate)
    .isString()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("numberPlate must be between 3 and 20 characters."),

  body("role")
    .exists({ checkFalsy: true })
    .withMessage("role is required.")
    .bail()
    .isString()
    .trim()
    .isIn(ALLOWED_ROLES)
    .withMessage("Invalid role selected."),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("password is required.")
    .bail()
    .isString()
    .isLength({ min: 6, max: 255 })
    .withMessage("Password must be between 6 and 255 characters."),
];

/**
 * =====================================================
 * Login Validator
 * =====================================================
 */
const loginValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("email is required.")
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage("Invalid email format.")
    .normalizeEmail(),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("password is required.")
    .bail()
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage("password is invalid."),
];

/**
 * =====================================================
 * Refresh Token Validator
 * =====================================================
 */
const refreshTokenValidator = [
  body("refreshToken")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("refreshToken cannot be empty."),
];

/**
 * =====================================================
 * Validation Middleware
 * =====================================================
 */
const validate = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors: result.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};

module.exports = {
  ALLOWED_ROLES,
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  validate,
};
