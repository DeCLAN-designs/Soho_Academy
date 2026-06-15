const express = require("express");
const {
  getMyChildren,
  getMyTransportRequests,
  getMyTransportRequest,
  createMyTransportRequest,
} = require("../controllers/parent.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");
const {
  createParentTransportRequestValidator,
  parentTransportRequestIdValidator,
  validate,
} = require("../validators/parent.validators.js");

const router = express.Router();

const parentAuth = [authenticate, authorizeRoles("Parent")];

router.get("/children", ...parentAuth, getMyChildren);
router.get("/transport-requests", ...parentAuth, getMyTransportRequests);
router.get(
  "/transport-requests/:requestId",
  ...parentAuth,
  parentTransportRequestIdValidator,
  validate,
  getMyTransportRequest
);
router.post(
  "/transport-requests",
  ...parentAuth,
  createParentTransportRequestValidator,
  validate,
  createMyTransportRequest
);

module.exports = router;
