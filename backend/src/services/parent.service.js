const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");
const { ensureStudentsTables } = require("./student.service.js");

const normalizeDate = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const normalized = new Date(dateValue);

  if (Number.isNaN(normalized.getTime())) {
    return null;
  }

  return normalized.toISOString().slice(0, 10);
};

const mapChildRow = (row) => ({
  id: row.id,
  admissionNumber: row.admissionNumber,
  firstName: row.firstName,
  lastName: row.lastName,
  grade: row.grade,
  stream: row.stream,
  status: row.status,
  admissionDate: normalizeDate(row.admissionDate),
  withdrawalDate: normalizeDate(row.withdrawalDate),
});

const listChildrenForParentUser = async ({ parentUserId }) => {
  if (!parentUserId || !Number.isFinite(parentUserId)) {
    const invalidUserError = new Error("Parent user id is required.");
    invalidUserError.code = "INVALID_PARENT_USER_ID";
    throw invalidUserError;
  }

  // Ensure tables exist (students service also ensures users table), but we
  // still explicitly ensure users so parent lookups remain stable even if
  // students are never used elsewhere.
  await ensureUsersTable();
  await ensureStudentsTables();

  const [userRows] = await pool.query(
    `
      SELECT id, phoneNumber
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [parentUserId]
  );

  if (userRows.length === 0) {
    const notFoundError = new Error("Parent user not found.");
    notFoundError.code = "USER_NOT_FOUND";
    throw notFoundError;
  }

  const phoneNumber = String(userRows[0].phoneNumber || "").trim();

  const [childRows] = await pool.query(
    `
      SELECT
        id,
        admissionNumber,
        firstName,
        lastName,
        grade,
        stream,
        status,
        admissionDate,
        withdrawalDate
      FROM students
      WHERE parentContact = ?
      ORDER BY admissionDate DESC, id DESC
      LIMIT 500
    `,
    [phoneNumber]
  );

  return childRows.map(mapChildRow);
};

module.exports = {
  listChildrenForParentUser,
};

