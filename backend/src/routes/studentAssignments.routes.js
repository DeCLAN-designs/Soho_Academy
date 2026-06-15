const express = require("express");
const {
  deleteStudentAssignmentById,
  getStudentAssignments,
  patchStudentAssignment,
  postStudentAssignment,
} = require("../controllers/studentAssignments.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

const adminAuth = [authenticate, authorizeRoles("School Admin", "Transport Manager")];

router.get("/student-assignments", ...adminAuth, getStudentAssignments);
router.post("/student-assignments", ...adminAuth, postStudentAssignment);
router.patch("/student-assignments/:id", ...adminAuth, patchStudentAssignment);
router.delete("/student-assignments/:id", ...adminAuth, deleteStudentAssignmentById);

module.exports = router;
