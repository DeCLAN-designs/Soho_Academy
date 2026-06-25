const express = require("express");
const {
  getParentRequests,
  getParentRequest,
  reviewParentRequest,
} = require("../controllers/parentTransport.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");
const {
  parentTransportRequestIdValidator,
  reviewParentTransportRequestValidator,
  validate,
} = require("../validators/parent.validators.js");

const router = express.Router();

const managerAuth = [
  authenticate,
  authorizeRoles("Transport Manager", "School Admin"),
];

router.get("/parent-requests", ...managerAuth, getParentRequests);
router.get(
  "/parent-requests/:requestId",
  ...managerAuth,
  parentTransportRequestIdValidator,
  validate,
  getParentRequest
);
router.patch(
  "/parent-requests/:requestId/review",
  ...managerAuth,
  parentTransportRequestIdValidator,
  reviewParentTransportRequestValidator,
  validate,
  reviewParentRequest
);

module.exports = router;
