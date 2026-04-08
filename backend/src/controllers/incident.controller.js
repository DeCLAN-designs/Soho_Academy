const {
  createIncidentReport,
  listIncidentReportsByUser,
} = require("../services/incident.service.js");

const createReport = async (req, res) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Add at least one scene or vehicle photo before submitting.",
    });
  }

  try {
    const report = await createIncidentReport({
      payload: req.body || {},
      files: req.files || [],
      createdByUserId: Number(req.user.sub),
    });

    return res.status(201).json({
      success: true,
      message: "Incident report created successfully.",
      data: {
        report,
      },
    });
  } catch (error) {
    if (error && error.code === "DRIVER_NUMBER_PLATE_NOT_ASSIGNED") {
      return res.status(400).json({
        success: false,
        message: "No number plate is assigned to this driver account.",
      });
    }

    if (error && error.code === "NUMBER_PLATE_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        message:
          "The assigned number plate is not active. Update the vehicle assignment first.",
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
        message: "Failed to upload one or more incident photos to Cloudflare R2.",
      });
    }

    console.error("Create incident report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create incident report.",
    });
  }
};

const getReports = async (req, res) => {
  try {
    const reports = await listIncidentReportsByUser({
      createdByUserId: Number(req.user.sub),
    });

    return res.status(200).json({
      success: true,
      message: "Incident reports retrieved successfully.",
      data: {
        reports,
      },
    });
  } catch (error) {
    console.error("Get incident reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch incident reports.",
    });
  }
};

module.exports = {
  createReport,
  getReports,
};
