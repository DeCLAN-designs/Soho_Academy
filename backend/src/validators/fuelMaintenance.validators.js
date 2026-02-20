const { body, validationResult } = require("express-validator");

const REQUEST_TYPES = Object.freeze([
  "Fuel",
  "Service",
  "Repair and Maintenance",
  "Compliance",
]);

const REQUEST_CATEGORIES = Object.freeze([
  "Fuels & Oils",
  "Body Works and Body Parts",
  "Mechanical",
  "Wiring",
  "Puncture & Tires",
  "Insurance",
  "RSL",
  "Inspection / Speed Governors",
]);

const CONFIRMED_BY_OPTIONS = Object.freeze(["Erick", "Douglas", "James"]);

const normalizeNumberPlate = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const createFuelMaintenanceRequestValidator = [
  body("requestDate")
    .exists({ checkFalsy: true })
    .withMessage("requestDate is required.")
    .bail()
    .isISO8601()
    .withMessage("requestDate must be a valid date (YYYY-MM-DD)."),

  body("numberPlate")
    .exists({ checkFalsy: true })
    .withMessage("numberPlate is required.")
    .bail()
    .customSanitizer(normalizeNumberPlate)
    .isString()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("numberPlate must be between 3 and 20 characters."),

  body("currentMileage")
    .exists({ checkFalsy: true })
    .withMessage("currentMileage is required.")
    .bail()
    .isInt({ min: 0 })
    .withMessage("currentMileage must be a non-negative integer.")
    .toInt(),

  body("requestType")
    .exists({ checkFalsy: true })
    .withMessage("requestType is required.")
    .bail()
    .isIn(REQUEST_TYPES)
    .withMessage(
      `requestType must be one of: ${REQUEST_TYPES.join(", ")}.`
    ),

  body("requestedBy")
    .exists({ checkFalsy: true })
    .withMessage("requestedBy is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("requestedBy is too long."),

  body("category")
    .exists({ checkFalsy: true })
    .withMessage("category is required.")
    .bail()
    .isIn(REQUEST_CATEGORIES)
    .withMessage(`category must be one of: ${REQUEST_CATEGORIES.join(", ")}.`),

  body("description")
    .exists({ checkFalsy: true })
    .withMessage("description is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("description is too long."),

  body("amount")
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value === null || typeof value === "undefined") {
        return null;
      }

      const normalized = String(value).trim();
      return normalized.length === 0 ? null : normalized;
    })
    .custom((value, { req }) => {
      const requestType = String(req.body?.requestType || "");

      if (requestType === "Fuel") {
        if (value === null || typeof value === "undefined") {
          throw new Error("amount is required when requestType is Fuel.");
        }

        const numericValue = Number(value);

        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          throw new Error("amount must be greater than zero.");
        }
      } else if (value !== null && typeof value !== "undefined") {
        const numericValue = Number(value);

        if (!Number.isFinite(numericValue) || numericValue < 0) {
          throw new Error("amount must be a valid non-negative number.");
        }
      }

      return true;
    }),

  body("confirmedBy")
    .exists({ checkFalsy: true })
    .withMessage("confirmedBy is required.")
    .bail()
    .isString()
    .trim()
    .isIn(CONFIRMED_BY_OPTIONS)
    .withMessage(
      `confirmedBy must be one of: ${CONFIRMED_BY_OPTIONS.join(", ")}.`
    ),
];

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
  REQUEST_TYPES,
  REQUEST_CATEGORIES,
  CONFIRMED_BY_OPTIONS,
  createFuelMaintenanceRequestValidator,
  validate,
};
