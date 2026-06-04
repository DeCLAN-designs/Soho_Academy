const {
  createStudentAssignment,
  deleteStudentAssignment,
  listStudentAssignments,
  updateStudentAssignment,
} = require("../services/studentAssignments.service.js");

const handleAssignmentError = (res, error, defaultMessage) => {
  if (error && error.code === "STUDENT_REQUIRED") return res.status(400).json({ success: false, message: "Student is required." });
  if (error && error.code === "ROUTE_REQUIRED") return res.status(400).json({ success: false, message: "Route is required." });
  if (error && error.code === "STOP_REQUIRED") return res.status(400).json({ success: false, message: "Stop is required." });
  if (error && error.code === "STUDENT_NOT_FOUND") return res.status(404).json({ success: false, message: "Student not found." });
  if (error && error.code === "ROUTE_NOT_FOUND") return res.status(404).json({ success: false, message: "Route not found." });
  if (error && error.code === "STOP_NOT_FOUND") return res.status(404).json({ success: false, message: "Stop not found." });
  if (error && error.code === "STOP_ROUTE_MISMATCH") return res.status(400).json({ success: false, message: "Selected stop does not belong to the selected route." });
  if (error && error.code === "ASSIGNMENT_NOT_FOUND") return res.status(404).json({ success: false, message: "Assignment not found." });
  if (error && error.code === "NO_ASSIGNMENT_FIELDS") return res.status(400).json({ success: false, message: "No assignment fields were provided for update." });

  console.error(defaultMessage, error);
  return res.status(500).json({ success: false, message: defaultMessage });
};

const getStudentAssignments = async (_req, res) => {
  try {
    const assignments = await listStudentAssignments();
    return res.status(200).json({ success: true, message: "Assignments retrieved successfully.", data: { assignments } });
  } catch (error) {
    return handleAssignmentError(res, error, "Failed to load student assignments.");
  }
};

const postStudentAssignment = async (req, res) => {
  try {
    const assignment = await createStudentAssignment({ payload: req.body || {} });
    return res.status(201).json({ success: true, message: "Assignment created successfully.", data: { assignment } });
  } catch (error) {
    return handleAssignmentError(res, error, "Failed to create student assignment.");
  }
};

const patchStudentAssignment = async (req, res) => {
  try {
    const assignment = await updateStudentAssignment({ id: Number(req.params.id), payload: req.body || {} });
    return res.status(200).json({ success: true, message: "Assignment updated successfully.", data: { assignment } });
  } catch (error) {
    return handleAssignmentError(res, error, "Failed to update student assignment.");
  }
};

const deleteStudentAssignmentById = async (req, res) => {
  try {
    const result = await deleteStudentAssignment({ id: Number(req.params.id) });
    return res.status(200).json({ success: true, message: "Assignment deleted successfully.", data: result });
  } catch (error) {
    return handleAssignmentError(res, error, "Failed to delete student assignment.");
  }
};

module.exports = {
  deleteStudentAssignmentById,
  getStudentAssignments,
  patchStudentAssignment,
  postStudentAssignment,
};
