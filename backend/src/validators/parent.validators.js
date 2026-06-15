const { body, param, validationResult } = require("express-validator");

const REQUEST_TYPES = Object.freeze([
  "route_change",
  "complaint",
  "general_support",
]);

const parentTransportRequestIdValidator = [
  param("requestId")
    .exists({ checkFalsy: true })
    .withMessage("requestId is required.")
    .bail()
    .isInt({ min: 1 })
    .withMessage("requestId must be a positive integer.")
    .toInt(),
];

const createParentTransportRequestValidator = [
  body("studentId")
    .exists({ checkFalsy: true })
    .withMessage("studentId is required.")
    .bail()
    .isInt({ min: 1 })
    .withMessage("studentId must be a positive integer.")
    .toInt(),

  body("requestType")
    .exists({ checkFalsy: true })
    .withMessage("requestType is required.")
    .bail()
    .isIn(REQUEST_TYPES)
    .withMessage(`requestType must be one of: ${REQUEST_TYPES.join(", ")}.`),

  body("requestTitle")
    .exists({ checkFalsy: true })
    .withMessage("requestTitle is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("requestTitle must be between 1 and 255 characters."),

  body("requestDetails")
    .exists({ checkFalsy: true })
    .withMessage("requestDetails is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage("requestDetails is required."),

  body("requestedPickupLocation")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("requestedPickupLocation is too long."),

  body("requestedDropoffLocation")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("requestedDropoffLocation is too long."),

  body("preferredEffectiveDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("preferredEffectiveDate must be a valid date (YYYY-MM-DD)."),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  return next();
};

module.exports = {
  createParentTransportRequestValidator,
  parentTransportRequestIdValidator,
  validate,
};
