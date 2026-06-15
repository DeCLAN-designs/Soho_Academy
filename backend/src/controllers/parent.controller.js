const {
  listChildrenForParentUser,
  listTransportRequestsForParent,
  getTransportRequestForParent,
  createTransportRequestForParent,
} = require("../services/parent.service.js");

const getMyChildren = async (req, res) => {
  try {
    const parentUserId = Number(req.user.sub);
    const children = await listChildrenForParentUser({ parentUserId });

    return res.status(200).json({
      success: true,
      message: "Children retrieved successfully.",
      data: {
        children,
      },
    });
  } catch (error) {
    if (error && error.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Parent account not found.",
      });
    }

    console.error("Get parent children error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve children.",
    });
  }
};

const getMyTransportRequests = async (req, res) => {
  try {
    const parentUserId = Number(req.user.sub);
    const requests = await listTransportRequestsForParent({ parentUserId });

    return res.status(200).json({
      success: true,
      message: "Transport requests retrieved successfully.",
      data: {
        requests,
      },
    });
  } catch (error) {
    console.error("Get parent transport requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transport requests.",
    });
  }
};

const getMyTransportRequest = async (req, res) => {
  try {
    const parentUserId = Number(req.user.sub);
    const requestId = Number(req.params.requestId);
    const detail = await getTransportRequestForParent({ parentUserId, requestId });

    return res.status(200).json({
      success: true,
      message: "Transport request retrieved successfully.",
      data: detail,
    });
  } catch (error) {
    if (error && error.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Transport request not found.",
      });
    }

    console.error("Get parent transport request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transport request.",
    });
  }
};

const createMyTransportRequest = async (req, res) => {
  try {
    const parentUserId = Number(req.user.sub);
    const detail = await createTransportRequestForParent({
      parentUserId,
      payload: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Transport request submitted successfully.",
      data: detail,
    });
  } catch (error) {
    if (error && error.code === "STUDENT_NOT_LINKED") {
      return res.status(400).json({
        success: false,
        message: "Selected child is not linked to your parent account.",
      });
    }

    if (error && error.code === "INVALID_REQUEST_TYPE") {
      return res.status(400).json({
        success: false,
        message: "Invalid request type.",
      });
    }

    console.error("Create parent transport request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit transport request.",
    });
  }
};

module.exports = {
  getMyChildren,
  getMyTransportRequests,
  getMyTransportRequest,
  createMyTransportRequest,
};
