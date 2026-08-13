const express = require("express");
const {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notifications.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin can create notifications
// All authenticated users can view their own notifications
router.use(authenticate);
router.get("/", getNotifications);
router.post("/", authorizeRoles("Transport Manager", "School Admin"), createNotification);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/all/read", markAllAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
