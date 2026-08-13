const express = require("express");
const {
  getMessages,
  createMessage,
  markMessageAsRead,
  deleteMessage,
} = require("../controllers/messages.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// All authenticated users can send/receive messages
router.use(authenticate);
router.get("/", getMessages);
router.post("/", createMessage);
router.patch("/:id/read", markMessageAsRead);
router.delete("/:id", deleteMessage);

module.exports = router;
