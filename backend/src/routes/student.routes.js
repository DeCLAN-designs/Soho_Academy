const express = require("express");
const {
  admitStudent,
  changeParentContact,
  getStudentsDashboardData,
  markStudentWithdrawal,
  updateStudentMasterRecord,
} = require("../controllers/student.controller.js");
const {
  createStudentAdmissionValidator,
  updateStudentMasterDataValidator,
  updateStudentParentContactValidator,
  validate,
  withdrawStudentValidator,
} = require("../validators/student.validators.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.use(authenticate, authorizeRoles("School Admin"));

router.get("/", getStudentsDashboardData);

router.post("/admissions", createStudentAdmissionValidator, validate, admitStudent);

router.patch(
  "/:studentId/parent-contact",
  updateStudentParentContactValidator,
  validate,
  changeParentContact
);

router.patch(
  "/:studentId/withdrawal",
  withdrawStudentValidator,
  validate,
  markStudentWithdrawal
);

router.patch(
  "/:studentId/master-data",
  updateStudentMasterDataValidator,
  validate,
  updateStudentMasterRecord
);

module.exports = router;
