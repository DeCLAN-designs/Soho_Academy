const { listUsers } = require("../services/users.service.js");

const handleUsersError = (res, error, fallbackMessage) => {
  if (error && error.code === "INVALID_USER_ROLE") {
    return res.status(400).json({ message: "Invalid user role." });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

const getUsers = async (req, res) => {
  try {
    const users = await listUsers({ role: req.query.role });
    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: { users },
    });
  } catch (error) {
    return handleUsersError(res, error, "Failed to fetch users.");
  }
};

module.exports = {
  getUsers,
};
