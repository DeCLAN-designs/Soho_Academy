const {
  listTransportRequestsForManager,
  getTransportRequestForManager,
  reviewTransportRequest,
} = require("../services/parent.service.js");

const getParentRequests = async (req, res) => {
  try {
    const requests = await listTransportRequestsForManager();

    return res.status(200).json({
      success: true,
      message: "Parent transport requests retrieved successfully.",
      data: {
        requests,
      },
    });
  } catch (error) {
    console.error("Get transport manager parent requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve parent transport requests.",
    });
  }
};

const getParentRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    const detail = await getTransportRequestForManager({ requestId });

    return res.status(200).json({
      success: true,
      message: "Parent transport request retrieved successfully.",
      data: detail,
    });
  } catch (error) {
    if (error && error.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Transport request not found.",
      });
    }

    console.error("Get transport manager parent request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve parent transport request.",
    });
  }
};

const reviewParentRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    const reviewerUserId = Number(req.user.sub);
    const detail = await reviewTransportRequest({
      requestId,
      reviewerUserId,
      status: req.body?.status,
      managerReviewNotes: req.body?.managerReviewNotes ?? null,
    });

    return res.status(200).json({
      success: true,
      message: "Parent transport request reviewed successfully.",
      data: detail,
    });
  } catch (error) {
    if (error && error.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Transport request not found.",
      });
    }

    if (error && error.code === "REQUEST_ALREADY_REVIEWED") {
      return res.status(400).json({
        success: false,
        message: "This request has already been reviewed.",
      });
    }

    if (error && error.code === "INVALID_REVIEW_STATUS") {
      return res.status(400).json({
        success: false,
        message: "Invalid review status.",
      });
    }

    console.error("Review parent transport request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to review parent transport request.",
    });
  }
};

module.exports = {
  getParentRequests,
  getParentRequest,
  reviewParentRequest,
};
