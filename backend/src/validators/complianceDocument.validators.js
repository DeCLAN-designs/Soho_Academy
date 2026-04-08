const { body, validationResult } = require("express-validator");

const DOCUMENT_RELATED_TO_VALUES = Object.freeze(["Driver"]);
const DOCUMENT_TYPES = Object.freeze([
  "Insurance",
  "NTSA Inspection",
  "Speed Governor",
  "RSL",
  "Driving License",
  "PSV",
  "Police Clearance",
  "Warranty Certificate",
  "Other",
]);

const createComplianceDocumentValidator = [
  body("relatedTo")
    .exists({ checkFalsy: true })
    .withMessage("relatedTo is required.")
    .bail()
    .isIn(DOCUMENT_RELATED_TO_VALUES)
    .withMessage(`relatedTo must be one of: ${DOCUMENT_RELATED_TO_VALUES.join(", ")}.`),

  body("documentType")
    .exists({ checkFalsy: true })
    .withMessage("documentType is required.")
    .bail()
    .isIn(DOCUMENT_TYPES)
    .withMessage(`documentType must be one of: ${DOCUMENT_TYPES.join(", ")}.`),

  body("validFromDate")
    .exists({ checkFalsy: true })
    .withMessage("validFromDate is required.")
    .bail()
    .isISO8601()
    .withMessage("validFromDate must be a valid date (YYYY-MM-DD)."),

  body("validToDate")
    .exists({ checkFalsy: true })
    .withMessage("validToDate is required.")
    .bail()
    .isISO8601()
    .withMessage("validToDate must be a valid date (YYYY-MM-DD)."),

  body().custom((_value, { req }) => {
    const validFromDate = String(req.body?.validFromDate || "").trim();
    const validToDate = String(req.body?.validToDate || "").trim();

    if (!validFromDate || !validToDate) {
      return true;
    }

    if (new Date(`${validToDate}T00:00:00`).getTime() < new Date(`${validFromDate}T00:00:00`).getTime()) {
      throw new Error("validToDate must be the same as or later than validFromDate.");
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
  DOCUMENT_RELATED_TO_VALUES,
  DOCUMENT_TYPES,
  createComplianceDocumentValidator,
  validate,
};
