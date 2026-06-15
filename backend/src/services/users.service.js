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

module.exports = {
  listUsers,
};
