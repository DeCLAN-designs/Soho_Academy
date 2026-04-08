const { body, validationResult } = require("express-validator");

const INCIDENT_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

const createIncidentReportValidator = [
  body("incidentDate")
    .exists({ checkFalsy: true })
    .withMessage("incidentDate is required.")
    .bail()
    .isISO8601()
    .withMessage("incidentDate must be a valid date (YYYY-MM-DD)."),

  body("incidentTime")
    .exists({ checkFalsy: true })
    .withMessage("incidentTime is required.")
    .bail()
    .matches(INCIDENT_TIME_REGEX)
    .withMessage("incidentTime must be a valid time (HH:MM)."),

  body("pointOfIncident")
    .exists({ checkFalsy: true })
    .withMessage("pointOfIncident is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("pointOfIncident is too long."),

  body("childrenInvolved")
    .exists({ checkFalsy: true })
    .withMessage("childrenInvolved is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("childrenInvolved is too long."),

  body("description")
    .exists({ checkFalsy: true })
    .withMessage("description is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("description is too long."),

  body("actionTaken")
    .exists({ checkFalsy: true })
    .withMessage("actionTaken is required.")
    .bail()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("actionTaken is too long."),
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
  createIncidentReportValidator,
  validate,
};
