const express = require("express");
const {
  deleteStudentAssignmentById,
  getStudentAssignments,
  patchStudentAssignment,
  postStudentAssignment,
} = require("../controllers/studentAssignments.controller.js");

const router = express.Router();

router.get("/student-assignments", getStudentAssignments);
router.post("/student-assignments", postStudentAssignment);
router.patch("/student-assignments/:id", patchStudentAssignment);
router.delete("/student-assignments/:id", deleteStudentAssignmentById);

module.exports = router;
