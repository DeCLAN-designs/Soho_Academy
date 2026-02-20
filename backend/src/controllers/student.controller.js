const {
  createStudentAdmission,
  listStudentsDashboardData,
  updateStudentMasterData,
  updateStudentParentContact,
  withdrawStudent,
} = require("../services/student.service.js");

const handleServiceError = (res, error, defaultMessage) => {
  if (error && error.code === "STUDENT_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: "Student not found.",
    });
  }

  if (error && error.code === "ADMISSION_NUMBER_EXISTS") {
    return res.status(409).json({
      success: false,
      message: "A student with this admission number already exists.",
    });
  }

  if (error && error.code === "STUDENT_ALREADY_WITHDRAWN") {
    return res.status(409).json({
      success: false,
      message: "Student is already withdrawn.",
    });
  }

  if (error && error.code === "PARENT_CONTACT_UNCHANGED") {
    return res.status(400).json({
      success: false,
      message: "New parent contact must be different from the current one.",
    });
  }

  if (error && error.code === "NO_MASTER_DATA_FIELDS") {
    return res.status(400).json({
      success: false,
      message:
        "No master data fields were provided. Submit at least one field to update.",
    });
  }

  console.error(defaultMessage, error);

  return res.status(500).json({
    success: false,
    message: defaultMessage,
  });
};

const getStudentsDashboardData = async (_req, res) => {
  try {
    const dashboardData = await listStudentsDashboardData();

    return res.status(200).json({
      success: true,
      message: "Student data retrieved successfully.",
      data: dashboardData,
    });
  } catch (error) {
    return handleServiceError(
      res,
      error,
      "Failed to retrieve student dashboard data."
    );
  }
};

const admitStudent = async (req, res) => {
  const {
    admissionNumber,
    firstName,
    lastName,
    className,
    grade,
    parentContact,
    admissionDate,
  } = req.body || {};

  try {
    const student = await createStudentAdmission({
      admissionNumber,
      firstName,
      lastName,
      className,
      grade,
      parentContact,
      admissionDate,
    });

    return res.status(201).json({
      success: true,
      message: "Student admission created successfully.",
      data: {
        student,
      },
    });
  } catch (error) {
    return handleServiceError(res, error, "Failed to create student admission.");
  }
};

const changeParentContact = async (req, res) => {
  const studentId = Number(req.params.studentId);
  const { parentContact } = req.body || {};

  try {
    const student = await updateStudentParentContact({
      studentId,
      parentContact,
      changedByUserId: Number(req.user.sub),
    });

    return res.status(200).json({
      success: true,
      message: "Parent contact updated successfully.",
      data: {
        student,
      },
    });
  } catch (error) {
    return handleServiceError(res, error, "Failed to update parent contact.");
  }
};

const markStudentWithdrawal = async (req, res) => {
  const studentId = Number(req.params.studentId);
  const { withdrawalDate, withdrawalReason } = req.body || {};

  try {
    const student = await withdrawStudent({
      studentId,
      withdrawalDate,
      withdrawalReason,
    });

    return res.status(200).json({
      success: true,
      message: "Student withdrawal recorded successfully.",
      data: {
        student,
      },
    });
  } catch (error) {
    return handleServiceError(res, error, "Failed to record student withdrawal.");
  }
};

const updateStudentMasterRecord = async (req, res) => {
  const studentId = Number(req.params.studentId);

  try {
    const student = await updateStudentMasterData({
      studentId,
      payload: req.body || {},
    });

    return res.status(200).json({
      success: true,
      message: "Student master data updated successfully.",
      data: {
        student,
      },
    });
  } catch (error) {
    return handleServiceError(res, error, "Failed to update student master data.");
  }
};

module.exports = {
  getStudentsDashboardData,
  admitStudent,
  changeParentContact,
  markStudentWithdrawal,
  updateStudentMasterRecord,
};
