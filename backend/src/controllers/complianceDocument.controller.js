const {
  createComplianceDocument,
  listComplianceDocumentsByUser,
} = require("../services/complianceDocument.service.js");

const createDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Add a compliance document file before submitting.",
    });
  }

  try {
    const document = await createComplianceDocument({
      payload: req.body || {},
      documentFile: req.file,
      createdByUserId: Number(req.user.sub),
    });

    return res.status(201).json({
      success: true,
      message: "Compliance document uploaded successfully.",
      data: {
        document,
      },
    });
  } catch (error) {
    if (error && error.code === "INVALID_VALIDITY_RANGE") {
      return res.status(400).json({
        success: false,
        message: "Validity To must be the same as or later than Validity From.",
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
        message: "Failed to upload the compliance document.",
      });
    }

    console.error("Create compliance document error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload compliance document.",
    });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await listComplianceDocumentsByUser({
      createdByUserId: Number(req.user.sub),
    });

    return res.status(200).json({
      success: true,
      message: "Compliance documents retrieved successfully.",
      data: {
        documents,
      },
    });
  } catch (error) {
    console.error("Get compliance documents error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch compliance documents.",
    });
  }
};

module.exports = {
  createDocument,
  getDocuments,
};
