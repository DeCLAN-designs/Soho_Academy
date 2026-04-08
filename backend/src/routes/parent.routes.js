const express = require("express");
const { getMyChildren } = require("../controllers/parent.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.use(authenticate, authorizeRoles("Parent"));

router.get("/children", getMyChildren);

module.exports = router;

