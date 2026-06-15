const {
  createComplaintReport,
  getComplaintFormMeta,
  listComplaintReportsByUser,
  updateComplaintStatus,
  listAllComplaintReports,
} = require("../services/complaint.service.js");

const getFormMeta = async (req, res) => {
  try {
    const meta = await getComplaintFormMeta({
      createdByUserId: Number(req.user.sub),
    });

    return res.status(200).json({
      success: true,
      message: "Complaint form data retrieved successfully.",
      data: meta,
    });
  } catch (error) {
    console.error("Get complaint form meta error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load complaint form data.",
    });
  }
};

const createReport = async (req, res) => {
  try {
    const report = await createComplaintReport({
      payload: req.body || {},
      attachmentFile: req.file || null,
      createdByUserId: Number(req.user.sub),
    });

    return res.status(201).json({
      success: true,
      message: "Complaint report created successfully.",
      data: {
        report,
      },
    });
  } catch (error) {
    if (error && error.code === "NUMBER_PLATE_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        message:
          "Selected bus or van number plate is not available. Choose an active number plate.",
      });
    }

    if (error && error.code === "LEARNER_NAME_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Learner name is required when complaint type is Learner.",
      });
    }

    if (error && error.code === "R2_NOT_CONFIGURED") {
      return res.status(500).json({
        success: false,
        message:
          "Cloudflare R2 is not configured on the server. Add the R2 environment variables and try again.",
      });
    }

    if (error && error.code === "R2_UPLOAD_FAILED") {
      return res.status(500).json({
        success: false,
        message: "Failed to upload the complaint attachment to Cloudflare R2.",
      });
    }

    console.error("Create complaint report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create complaint report.",
    });
  }
};

const getReports = async (req, res) => {
  try {
    const reports = await listComplaintReportsByUser({
      createdByUserId: Number(req.user.sub),
    });

    return res.status(200).json({
      success: true,
      message: "Complaint reports retrieved successfully.",
      data: {
        reports,
      },
    });
  } catch (error) {
    console.error("Get complaint reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint reports.",
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const complaintId = Number(req.params.id);
    const confirmedBy = [req.user.firstName, req.user.lastName]
      .filter((part) => Boolean(String(part || "").trim()))
      .join(" ")
      .trim();

    const updatedReport = await updateComplaintStatus({
      complaintId,
      status,
      confirmedBy,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint status updated successfully.",
      data: {
        report: updatedReport,
      },
    });
  } catch (error) {
    if (error && error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Status must be Pending, Approved, or Rejected.",
      });
    }

    if (error && error.code === "COMPLAINT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Complaint report not found.",
      });
    }

    console.error("Update complaint status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint status.",
    });
  }
};

const getAllReports = async (req, res) => {
  try {
    const pageNumber = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;

    const reports = await listAllComplaintReports({
      pageNumber,
      pageSize,
    });

    return res.status(200).json({
      success: true,
      message: "All complaint reports retrieved successfully.",
      data: {
        reports,
      },
    });
  } catch (error) {
    console.error("Get all complaint reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch all complaint reports.",
    });
  }
};

module.exports = {
  getFormMeta,
  createReport,
  getReports,
  updateStatus,
  getAllReports,
};
