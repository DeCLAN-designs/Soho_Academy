const express = require("express");
const { me } = require("../controllers/auth.controller.js");
const { getUsers, updateUserController, deleteUserController } = require("../controllers/users.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Require authentication for user listing and restrict to Transport Manager / School Admin
router.get("/", authenticate, authorizeRoles("Transport Manager", "School Admin"), getUsers);
router.get(
  "/me",
  authenticate,
  me
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("Transport Manager", "School Admin"),
  updateUserController
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("Transport Manager", "School Admin"),
  deleteUserController
);

module.exports = router;
