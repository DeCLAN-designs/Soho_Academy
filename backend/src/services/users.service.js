const pool = require("../config/db.js");

const USER_ROLES = new Set([
  "Parent",
  "Driver",
  "Bus Assistant",
  "Transport Manager",
  "School Admin",
]);

const listUsers = async ({ role } = {}) => {
  const normalizedRole = String(role || "").trim();

  if (normalizedRole && !USER_ROLES.has(normalizedRole)) {
    const error = new Error("Invalid user role.");
    error.code = "INVALID_USER_ROLE";
    throw error;
  }

  const query = `
    SELECT
      id,
      firstName,
      lastName,
      email,
      phoneNumber,
      numberPlate,
      role
    FROM users
    ${normalizedRole ? "WHERE role = ?" : ""}
    ORDER BY firstName ASC, lastName ASC
  `;

  const [rows] = normalizedRole
    ? await pool.query(query, [normalizedRole])
    : await pool.query(query);

  return rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    numberPlate: row.numberPlate || null,
    role: row.role,
  }));
};

const updateUser = async (id, payload) => {
  const { firstName, lastName, email, phoneNumber, numberPlate, role } = payload;
  const query = `
    UPDATE users
    SET 
      firstName = COALESCE(?, firstName),
      lastName = COALESCE(?, lastName),
      email = COALESCE(?, email),
      phoneNumber = COALESCE(?, phoneNumber),
      numberPlate = ?,
      role = COALESCE(?, role)
    WHERE id = ?
  `;
  const [result] = await pool.query(query, [
    firstName, 
    lastName, 
    email, 
    phoneNumber, 
    numberPlate || null, 
    role, 
    id
  ]);

  if (result.affectedRows === 0) {
    const error = new Error("User not found.");
    error.code = "USER_NOT_FOUND";
    throw error;
  }
  return { id, ...payload };
};

const deleteUser = async (id) => {
  const query = "DELETE FROM users WHERE id = ?";
  const [result] = await pool.query(query, [id]);

  if (result.affectedRows === 0) {
    const error = new Error("User not found.");
    error.code = "USER_NOT_FOUND";
    throw error;
  }
  return { id };
};

module.exports = {
  listUsers,
  updateUser,
  deleteUser,
};
