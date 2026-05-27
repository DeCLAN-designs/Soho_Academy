const express = require("express");
const { me } = require("../controllers/auth.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.get(
  "/me",
  authenticate,
  me
);

module.exports = router;
