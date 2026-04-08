const { body, validationResult } = require("express-validator");

const TIMING_OPTIONS = Object.freeze(["Morning", "Evening"]);
const COMPLAINT_TYPES = Object.freeze([
  "Learner",
  "Driver",
  "Bus",
  "Community",
  "Bus Assistant",
  "Other",
]);

const normalizeNumberPlate = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const createComplaintReportValidator = [
  body("numberPlate")
    .exists({ checkFalsy: true })
    .withMessage("numberPlate is required.")
    .bail()
    .customSanitizer(normalizeNumberPlate)
    .isString()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("numberPlate must be between 3 and 20 characters."),

  body("timing")
    .exists({ checkFalsy: true })
    .withMessage("timing is required.")
    .bail()
    .isIn(TIMING_OPTIONS)
    .withMessage(`timing must be one of: ${TIMING_OPTIONS.join(", ")}.`),

  body("tripNumber")
    .exists({ checkFalsy: true })
    .withMessage("tripNumber is required.")
    .bail()
    .isInt({ min: 1, max: 5 })
    .withMessage("tripNumber must be between 1 and 5.")
    .toInt(),

  body("complaintType")
    .exists({ checkFalsy: true })
    .withMessage("complaintType is required.")
    .bail()
    .isIn(COMPLAINT_TYPES)
    .withMessage(
      `complaintType must be one of: ${COMPLAINT_TYPES.join(", ")}.`
    ),

  body("learnerName")
    .optional({ nullable: true })
    .customSanitizer((value) =>
      value === null || typeof value === "undefined" ? "" : String(value).trim()
    )
    .custom((value, { req }) => {
      const complaintType = String(req.body?.complaintType || "").trim();

      if (complaintType === "Learner" && !String(value || "").trim()) {
        throw new Error("learnerName is required when complaintType is Learner.");
      }

      return true;
    }),

  body("details")
    .exists({ checkFalsy: true })
    .withMessage("details is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("details is too long."),
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
  TIMING_OPTIONS,
  COMPLAINT_TYPES,
  createComplaintReportValidator,
  validate,
};
