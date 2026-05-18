const { body, param, validationResult } = require("express-validator");

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

const REQUEST_STATUSES = Object.freeze([
  "Pending",
  "Approved",
  "Rejected",
  "Completed",
]);

const normalizeNumberPlate = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const createFuelMaintenanceRequestValidator = [
  body("requestDate")
    .exists({ checkFalsy: true })
    .withMessage("requestDate is required.")
    .bail()
    .isISO8601()
    .withMessage("requestDate must be a valid date (YYYY-MM-DD)."),

  body("requestTime")
    .exists({ checkFalsy: true })
    .withMessage("requestTime is required.")
    .bail()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage("requestTime must be a valid time (HH:MM or HH:MM:SS)."),

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
    .isLength({ max: 255 })
    .withMessage("confirmedBy is too long."),
];

const updateFuelMaintenanceRequestValidator = createFuelMaintenanceRequestValidator;

const updateFuelMaintenanceStatusValidator = [
  body("status")
    .exists({ checkFalsy: true })
    .withMessage("status is required.")
    .bail()
    .isIn(REQUEST_STATUSES)
    .withMessage(`status must be one of: ${REQUEST_STATUSES.join(", ")}.`),
];

const fuelMaintenanceRequestIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer.")
    .toInt(),
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
  REQUEST_STATUSES,
  createFuelMaintenanceRequestValidator,
  fuelMaintenanceRequestIdValidator,
  updateFuelMaintenanceRequestValidator,
  updateFuelMaintenanceStatusValidator,
  validate,
};
