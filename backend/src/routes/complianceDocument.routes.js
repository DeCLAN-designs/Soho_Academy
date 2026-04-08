const express = require("express");
const {
  createDocument,
  getDocuments,
} = require("../controllers/complianceDocument.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");
const {
  uploadComplianceDocument,
} = require("../middlewares/complianceDocumentUpload.middleware.js");
const {
  createComplianceDocumentValidator,
  validate,
} = require("../validators/complianceDocument.validators.js");

const router = express.Router();

router.use(authenticate, authorizeRoles("Driver"));

router.get("/documents", getDocuments);

router.post(
  "/documents",
  uploadComplianceDocument,
  createComplianceDocumentValidator,
  validate,
  createDocument
);

module.exports = router;
