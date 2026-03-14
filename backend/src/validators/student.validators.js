const { body, param, validationResult } = require("express-validator");

const NUMERIC_ONLY_REGEX = /^\d+$/;
const ALLOWED_GRADES = Object.freeze(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const ALLOWED_STREAMS = Object.freeze([
  "Peace",
  "Joy",
  "Hope",
  "Grace",
  "Humble",
]);

const studentIdParamValidator = [
  param("studentId")
    .exists({ checkFalsy: true })
    .withMessage("studentId is required.")
    .bail()
    .isInt({ min: 1 })
    .withMessage("studentId must be a positive integer.")
    .toInt(),
];

const createStudentAdmissionValidator = [
  body("admissionNumber")
    .exists({ checkFalsy: true })
    .withMessage("admissionNumber is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("admissionNumber must be between 1 and 50 characters."),
  body("firstName")
    .exists({ checkFalsy: true })
    .withMessage("firstName is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("firstName is too long."),
  body("lastName")
    .exists({ checkFalsy: true })
    .withMessage("lastName is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("lastName is too long."),
  body("grade")
    .exists({ checkFalsy: true })
    .withMessage("grade is required.")
    .bail()
    .isString()
    .trim()
    .isIn(ALLOWED_GRADES)
    .withMessage("grade must be between 1 and 9."),
  body("stream")
    .exists({ checkFalsy: true })
    .withMessage("stream is required.")
    .bail()
    .isString()
    .trim()
    .isIn(ALLOWED_STREAMS)
    .withMessage("stream must be one of: Peace, Joy, Hope, Grace, Humble."),
  body("parentContact")
    .exists({ checkFalsy: true })
    .withMessage("parentContact is required.")
    .bail()
    .isString()
    .trim()
    .matches(NUMERIC_ONLY_REGEX)
    .withMessage("parentContact must contain numbers only.")
    .isLength({ min: 9, max: 20 })
    .withMessage("parentContact length is invalid."),
  body("admissionDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("admissionDate must be a valid date."),
];

const updateStudentParentContactValidator = [
  ...studentIdParamValidator,
  body("parentContact")
    .exists({ checkFalsy: true })
    .withMessage("parentContact is required.")
    .bail()
    .isString()
    .trim()
    .matches(NUMERIC_ONLY_REGEX)
    .withMessage("parentContact must contain numbers only.")
    .isLength({ min: 9, max: 20 })
    .withMessage("parentContact length is invalid."),
];

const withdrawStudentValidator = [
  ...studentIdParamValidator,
  body("withdrawalDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("withdrawalDate must be a valid date."),
  body("withdrawalReason")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("withdrawalReason must be at most 255 characters."),
];

const MASTER_DATA_FIELDS = [
  "admissionNumber",
  "firstName",
  "lastName",
  "grade",
  "stream",
  "admissionDate",
];

const updateStudentMasterDataValidator = [
  ...studentIdParamValidator,
  body("admissionNumber")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("admissionNumber must be between 1 and 50 characters."),
  body("firstName")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("firstName is too long."),
  body("lastName")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("lastName is too long."),
  body("grade")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isIn(ALLOWED_GRADES)
    .withMessage("grade must be between 1 and 9."),
  body("stream")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isIn(ALLOWED_STREAMS)
    .withMessage("stream must be one of: Peace, Joy, Hope, Grace, Humble."),
  body("admissionDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("admissionDate must be a valid date."),
  body().custom((_value, { req }) => {
    const hasAtLeastOneField = MASTER_DATA_FIELDS.some(
      (field) => typeof req.body?.[field] !== "undefined"
    );

    if (!hasAtLeastOneField) {
      throw new Error(
        "At least one master data field is required (admissionNumber, firstName, lastName, grade, stream, admissionDate)."
      );
    }

    return true;
  }),
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
  createStudentAdmissionValidator,
  updateStudentParentContactValidator,
  withdrawStudentValidator,
  updateStudentMasterDataValidator,
  validate,
};
