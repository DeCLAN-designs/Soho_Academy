const { listUsers, updateUser, deleteUser } = require("../services/users.service.js");

const handleUsersError = (res, error, fallbackMessage) => {
  if (error && error.code === "INVALID_USER_ROLE") {
    return res.status(400).json({ message: "Invalid user role." });
  }
  if (error && error.code === "USER_NOT_FOUND") {
    return res.status(404).json({ message: "User not found." });
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

const updateUserController = async (req, res) => {
  try {
    const userId = req.params.id;
    const payload = req.body;
    const updatedUser = await updateUser(userId, payload);
    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    return handleUsersError(res, error, "Failed to update user.");
  }
};

const deleteUserController = async (req, res) => {
  try {
    const userId = req.params.id;
    await deleteUser(userId);
    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return handleUsersError(res, error, "Failed to delete user.");
  }
};

module.exports = {
  getUsers,
  updateUserController,
  deleteUserController,
};
