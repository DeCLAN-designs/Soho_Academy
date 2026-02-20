const fs = require("fs");
const path = require("path");
const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");

const SCHEMA_PATH = path.join(__dirname, "../migration/schema.sql");
const rawSchemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

let ensureStudentsTablesPromise;

const extractCreateTableSql = (tableName) => {
  const createTableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+${tableName}\\s*\\([\\s\\S]*?\\)\\s*;`,
    "i"
  );
  const match = rawSchemaSql.match(createTableRegex);

  if (!match) {
    return null;
  }

  return match[0].replace(
    new RegExp(`^CREATE\\s+TABLE\\s+${tableName}`, "i"),
    `CREATE TABLE IF NOT EXISTS ${tableName}`
  );
};

const studentsTableSql =
  extractCreateTableSql("students") ||
  `
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admissionNumber VARCHAR(50) NOT NULL UNIQUE,
      firstName VARCHAR(255) NOT NULL,
      lastName VARCHAR(255) NOT NULL,
      className VARCHAR(100) NOT NULL,
      grade VARCHAR(50) NOT NULL,
      parentContact VARCHAR(20) NOT NULL,
      admissionDate DATE NOT NULL,
      status ENUM('active', 'withdrawn') NOT NULL DEFAULT 'active',
      withdrawalDate DATE NULL,
      withdrawalReason VARCHAR(255) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

const parentContactChangesTableSql =
  extractCreateTableSql("student_parent_contact_changes") ||
  `
    CREATE TABLE IF NOT EXISTS student_parent_contact_changes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      studentId INT NOT NULL,
      previousContact VARCHAR(20) NOT NULL,
      newContact VARCHAR(20) NOT NULL,
      changedByUserId INT NOT NULL,
      changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_student_contact_student
        FOREIGN KEY (studentId) REFERENCES students(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_student_contact_user
        FOREIGN KEY (changedByUserId) REFERENCES users(id)
        ON DELETE RESTRICT
    )
  `;

const todayAsIsoDate = () => new Date().toISOString().slice(0, 10);

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

const mapStudentRow = (row) => ({
  id: row.id,
  admissionNumber: row.admissionNumber,
  firstName: row.firstName,
  lastName: row.lastName,
  className: row.className,
  grade: row.grade,
  parentContact: row.parentContact,
  admissionDate: normalizeDate(row.admissionDate),
  status: row.status,
  withdrawalDate: normalizeDate(row.withdrawalDate),
  withdrawalReason: row.withdrawalReason,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapContactChangeRow = (row) => ({
  id: row.id,
  studentId: row.studentId,
  studentName: `${row.firstName} ${row.lastName}`.trim(),
  previousContact: row.previousContact,
  newContact: row.newContact,
  changedByUserId: row.changedByUserId,
  changedAt: row.changedAt,
});

const ensureStudentsTables = () => {
  if (!ensureStudentsTablesPromise) {
    ensureStudentsTablesPromise = (async () => {
      await ensureUsersTable();
      await pool.query(studentsTableSql);
      await pool.query(parentContactChangesTableSql);
    })();
  }

  return ensureStudentsTablesPromise;
};

const fetchStudentById = async (studentId, db = pool) => {
  const [rows] = await db.query(
    `
      SELECT
        id,
        admissionNumber,
        firstName,
        lastName,
        className,
        grade,
        parentContact,
        admissionDate,
        status,
        withdrawalDate,
        withdrawalReason,
        createdAt,
        updatedAt
      FROM students
      WHERE id = ?
      LIMIT 1
    `,
    [studentId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapStudentRow(rows[0]);
};

const listStudentsDashboardData = async () => {
  await ensureStudentsTables();

  const [studentRowsPromise, contactRowsPromise] = await Promise.all([
    pool.query(
      `
        SELECT
          id,
          admissionNumber,
          firstName,
          lastName,
          className,
          grade,
          parentContact,
          admissionDate,
          status,
          withdrawalDate,
          withdrawalReason,
          createdAt,
          updatedAt
        FROM students
        ORDER BY admissionDate DESC, id DESC
      `
    ),
    pool.query(
      `
        SELECT
          c.id,
          c.studentId,
          c.previousContact,
          c.newContact,
          c.changedByUserId,
          c.changedAt,
          s.firstName,
          s.lastName
        FROM student_parent_contact_changes c
        INNER JOIN students s ON s.id = c.studentId
        ORDER BY c.changedAt DESC
        LIMIT 100
      `
    ),
  ]);

  const students = studentRowsPromise[0].map(mapStudentRow);
  const parentContactChanges = contactRowsPromise[0].map(mapContactChangeRow);

  const admissions = students.filter((student) => student.status === "active");
  const withdrawals = students.filter((student) => student.status === "withdrawn");

  return {
    students,
    admissions,
    withdrawals,
    parentContactChanges,
    summary: {
      totalStudents: students.length,
      activeStudents: admissions.length,
      withdrawnStudents: withdrawals.length,
    },
  };
};

const createStudentAdmission = async (payload) => {
  await ensureStudentsTables();

  const normalized = {
    admissionNumber: String(payload.admissionNumber || "").trim().toUpperCase(),
    firstName: String(payload.firstName || "").trim(),
    lastName: String(payload.lastName || "").trim(),
    className: String(payload.className || "").trim(),
    grade: String(payload.grade || "").trim(),
    parentContact: String(payload.parentContact || "").trim(),
    admissionDate: String(payload.admissionDate || "").trim() || todayAsIsoDate(),
  };

  const [duplicateAdmission] = await pool.query(
    "SELECT id FROM students WHERE admissionNumber = ? LIMIT 1",
    [normalized.admissionNumber]
  );

  if (duplicateAdmission.length > 0) {
    const duplicateError = new Error("A student with this admission number already exists.");
    duplicateError.code = "ADMISSION_NUMBER_EXISTS";
    throw duplicateError;
  }

  const [insertResult] = await pool.query(
    `
      INSERT INTO students (
        admissionNumber,
        firstName,
        lastName,
        className,
        grade,
        parentContact,
        admissionDate,
        status,
        withdrawalDate,
        withdrawalReason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NULL, NULL)
    `,
    [
      normalized.admissionNumber,
      normalized.firstName,
      normalized.lastName,
      normalized.className,
      normalized.grade,
      normalized.parentContact,
      normalized.admissionDate,
    ]
  );

  return fetchStudentById(insertResult.insertId);
};

const updateStudentParentContact = async ({
  studentId,
  parentContact,
  changedByUserId,
}) => {
  await ensureStudentsTables();

  const normalizedContact = String(parentContact || "").trim();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [studentRows] = await connection.query(
      "SELECT id, parentContact FROM students WHERE id = ? LIMIT 1 FOR UPDATE",
      [studentId]
    );

    if (studentRows.length === 0) {
      const notFoundError = new Error("Student not found.");
      notFoundError.code = "STUDENT_NOT_FOUND";
      throw notFoundError;
    }

    const student = studentRows[0];

    if (student.parentContact === normalizedContact) {
      const noChangeError = new Error(
        "New parent contact must be different from the current one."
      );
      noChangeError.code = "PARENT_CONTACT_UNCHANGED";
      throw noChangeError;
    }

    await connection.query(
      "UPDATE students SET parentContact = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [normalizedContact, studentId]
    );

    await connection.query(
      `
        INSERT INTO student_parent_contact_changes (
          studentId,
          previousContact,
          newContact,
          changedByUserId
        )
        VALUES (?, ?, ?, ?)
      `,
      [studentId, student.parentContact, normalizedContact, changedByUserId]
    );

    const updatedStudent = await fetchStudentById(studentId, connection);

    await connection.commit();

    return updatedStudent;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const withdrawStudent = async ({ studentId, withdrawalDate, withdrawalReason }) => {
  await ensureStudentsTables();

  const normalizedWithdrawalDate =
    String(withdrawalDate || "").trim() || todayAsIsoDate();
  const normalizedReason = String(withdrawalReason || "").trim();

  const [rows] = await pool.query(
    "SELECT id, status FROM students WHERE id = ? LIMIT 1",
    [studentId]
  );

  if (rows.length === 0) {
    const notFoundError = new Error("Student not found.");
    notFoundError.code = "STUDENT_NOT_FOUND";
    throw notFoundError;
  }

  if (rows[0].status === "withdrawn") {
    const alreadyWithdrawnError = new Error("Student is already withdrawn.");
    alreadyWithdrawnError.code = "STUDENT_ALREADY_WITHDRAWN";
    throw alreadyWithdrawnError;
  }

  await pool.query(
    `
      UPDATE students
      SET
        status = 'withdrawn',
        withdrawalDate = ?,
        withdrawalReason = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [normalizedWithdrawalDate, normalizedReason || null, studentId]
  );

  return fetchStudentById(studentId);
};

const MASTER_DATA_FIELD_TO_COLUMN = Object.freeze({
  admissionNumber: "admissionNumber",
  firstName: "firstName",
  lastName: "lastName",
  className: "className",
  grade: "grade",
  admissionDate: "admissionDate",
});

const updateStudentMasterData = async ({ studentId, payload }) => {
  await ensureStudentsTables();

  const [existingStudentRows] = await pool.query(
    "SELECT id FROM students WHERE id = ? LIMIT 1",
    [studentId]
  );

  if (existingStudentRows.length === 0) {
    const notFoundError = new Error("Student not found.");
    notFoundError.code = "STUDENT_NOT_FOUND";
    throw notFoundError;
  }

  const updates = [];
  const values = [];

  for (const [field, column] of Object.entries(MASTER_DATA_FIELD_TO_COLUMN)) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      continue;
    }

    const rawValue = payload[field];

    if (typeof rawValue === "undefined" || rawValue === null) {
      continue;
    }

    const normalized =
      field === "admissionNumber"
        ? String(rawValue).trim().toUpperCase()
        : String(rawValue).trim();

    if (!normalized) {
      continue;
    }

    updates.push(`${column} = ?`);
    values.push(normalized);
  }

  if (updates.length === 0) {
    const noFieldsError = new Error("No master data fields were provided.");
    noFieldsError.code = "NO_MASTER_DATA_FIELDS";
    throw noFieldsError;
  }

  const nextAdmissionNumber =
    Object.prototype.hasOwnProperty.call(payload, "admissionNumber") &&
    payload.admissionNumber
      ? String(payload.admissionNumber).trim().toUpperCase()
      : "";

  if (nextAdmissionNumber) {
    const [duplicateAdmissionRows] = await pool.query(
      "SELECT id FROM students WHERE admissionNumber = ? AND id <> ? LIMIT 1",
      [nextAdmissionNumber, studentId]
    );

    if (duplicateAdmissionRows.length > 0) {
      const duplicateError = new Error(
        "A student with this admission number already exists."
      );
      duplicateError.code = "ADMISSION_NUMBER_EXISTS";
      throw duplicateError;
    }
  }

  await pool.query(
    `
      UPDATE students
      SET ${updates.join(", ")}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [...values, studentId]
  );

  return fetchStudentById(studentId);
};

module.exports = {
  listStudentsDashboardData,
  createStudentAdmission,
  updateStudentParentContact,
  withdrawStudent,
  updateStudentMasterData,
  ensureStudentsTables,
};
