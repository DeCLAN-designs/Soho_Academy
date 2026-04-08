const {
  listChildrenForParentUser,
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

module.exports = {
  getMyChildren,
};

