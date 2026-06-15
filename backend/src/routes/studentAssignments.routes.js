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

router.use(authenticate);
router.use(authorizeRoles("School Admin", "Transport Manager"));

router.get("/student-assignments", getStudentAssignments);
router.post("/student-assignments", postStudentAssignment);
router.patch("/student-assignments/:id", patchStudentAssignment);
router.delete("/student-assignments/:id", deleteStudentAssignmentById);

module.exports = router;
