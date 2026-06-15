const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");
const { ensureStudentsTables } = require("./student.service.js");
const { AuditLogger } = require("../utils/auditLogger.js");

const auditLogger = new AuditLogger();

const REQUEST_TYPES = Object.freeze([
  "route_change",
  "complaint",
  "general_support",
]);

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

const parseJsonField = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

const mapTransportRequestRow = (row) => ({
  id: row.id,
  parentUserId: row.parentUserId,
  parentName: row.parentName || null,
  parentEmail: row.parentEmail || null,
  studentId: row.studentId,
  studentName: row.studentName,
  admissionNumber: row.admissionNumber,
  grade: row.grade,
  stream: row.stream,
  currentRouteId: row.currentRouteId,
  currentRouteCode: row.currentRouteCode || null,
  currentRouteName: row.currentRouteName || null,
  requestType: row.requestType,
  requestTitle: row.requestTitle,
  requestDetails: row.requestDetails,
  requestedPickupLocation: row.requestedPickupLocation || null,
  requestedDropoffLocation: row.requestedDropoffLocation || null,
  preferredEffectiveDate: normalizeDate(row.preferredEffectiveDate),
  status: row.status,
  managerReviewNotes: row.managerReviewNotes || null,
  reviewedByUserId: row.reviewedByUserId,
  reviewedByName: row.reviewedByName || null,
  reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString(),
});

const mapAuditLogRow = (row) => ({
  id: row.id,
  actorUserId: row.actorUserId,
  actorName:
    row.actorFirstName || row.actorLastName
      ? [row.actorFirstName, row.actorLastName].filter(Boolean).join(" ").trim()
      : null,
  actorRole: row.actorRole || null,
  domain: row.domain,
  entityType: row.entityType,
  entityId: row.entityId,
  action: row.action,
  previousState: parseJsonField(row.previousStateJson),
  newState: parseJsonField(row.newStateJson),
  createdAt: new Date(row.createdAt).toISOString(),
});

const transportRequestSelectSql = `
  SELECT
    ptr.id,
    ptr.parentUserId,
    CONCAT(pu.firstName, ' ', pu.lastName) AS parentName,
    pu.email AS parentEmail,
    ptr.studentId,
    CONCAT(s.firstName, ' ', s.lastName) AS studentName,
    s.admissionNumber,
    s.grade,
    s.stream,
    ptr.currentRouteId,
    r.route_id AS currentRouteCode,
    r.route_name AS currentRouteName,
    ptr.requestType,
    ptr.requestTitle,
    ptr.requestDetails,
    ptr.requestedPickupLocation,
    ptr.requestedDropoffLocation,
    ptr.preferredEffectiveDate,
    ptr.status,
    ptr.managerReviewNotes,
    ptr.reviewedByUserId,
    CONCAT(ru.firstName, ' ', ru.lastName) AS reviewedByName,
    ptr.reviewedAt,
    ptr.createdAt,
    ptr.updatedAt
  FROM parent_transport_requests ptr
  INNER JOIN students s ON s.id = ptr.studentId
  INNER JOIN users pu ON pu.id = ptr.parentUserId
  LEFT JOIN routes r ON r.id = ptr.currentRouteId
  LEFT JOIN users ru ON ru.id = ptr.reviewedByUserId
`;

const getParentPhoneNumber = async (parentUserId) => {
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

  return String(userRows[0].phoneNumber || "").trim();
};

const assertStudentBelongsToParent = async ({ parentUserId, studentId }) => {
  const phoneNumber = await getParentPhoneNumber(parentUserId);

  const [studentRows] = await pool.query(
    `
      SELECT id
      FROM students
      WHERE id = ? AND parentContact = ?
      LIMIT 1
    `,
    [studentId, phoneNumber]
  );

  if (studentRows.length === 0) {
    const error = new Error("Student not linked to this parent account.");
    error.code = "STUDENT_NOT_LINKED";
    throw error;
  }
};

const listTransportRequestsForParent = async ({ parentUserId }) => {
  if (!parentUserId || !Number.isFinite(parentUserId)) {
    const invalidUserError = new Error("Parent user id is required.");
    invalidUserError.code = "INVALID_PARENT_USER_ID";
    throw invalidUserError;
  }

  await ensureUsersTable();
  await ensureStudentsTables();

  const [rows] = await pool.query(
    `
      ${transportRequestSelectSql}
      WHERE ptr.parentUserId = ?
      ORDER BY ptr.createdAt DESC, ptr.id DESC
      LIMIT 500
    `,
    [parentUserId]
  );

  return rows.map(mapTransportRequestRow);
};

const getTransportRequestForParent = async ({ parentUserId, requestId }) => {
  if (!parentUserId || !Number.isFinite(parentUserId)) {
    const invalidUserError = new Error("Parent user id is required.");
    invalidUserError.code = "INVALID_PARENT_USER_ID";
    throw invalidUserError;
  }

  if (!requestId || !Number.isFinite(requestId)) {
    const invalidRequestError = new Error("Request id is required.");
    invalidRequestError.code = "INVALID_REQUEST_ID";
    throw invalidRequestError;
  }

  await ensureUsersTable();
  await ensureStudentsTables();

  const [rows] = await pool.query(
    `
      ${transportRequestSelectSql}
      WHERE ptr.id = ? AND ptr.parentUserId = ?
      LIMIT 1
    `,
    [requestId, parentUserId]
  );

  if (rows.length === 0) {
    const notFoundError = new Error("Transport request not found.");
    notFoundError.code = "REQUEST_NOT_FOUND";
    throw notFoundError;
  }

  const request = mapTransportRequestRow(rows[0]);
  const auditRows = await auditLogger.getEntityAuditTrail(
    "parent_transport_request",
    requestId
  );

  return {
    request,
    auditLogs: auditRows.map(mapAuditLogRow),
  };
};

const createTransportRequestForParent = async ({ parentUserId, payload }) => {
  if (!parentUserId || !Number.isFinite(parentUserId)) {
    const invalidUserError = new Error("Parent user id is required.");
    invalidUserError.code = "INVALID_PARENT_USER_ID";
    throw invalidUserError;
  }

  const studentId = Number(payload.studentId);
  const requestType = String(payload.requestType || "").trim();

  if (!REQUEST_TYPES.includes(requestType)) {
    const error = new Error("Invalid request type.");
    error.code = "INVALID_REQUEST_TYPE";
    throw error;
  }

  await ensureUsersTable();
  await ensureStudentsTables();
  await assertStudentBelongsToParent({ parentUserId, studentId });

  const [result] = await pool.query(
    `
      INSERT INTO parent_transport_requests (
        parentUserId,
        studentId,
        currentRouteId,
        requestType,
        requestTitle,
        requestDetails,
        requestedPickupLocation,
        requestedDropoffLocation,
        preferredEffectiveDate,
        status
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'PENDING')
    `,
    [
      parentUserId,
      studentId,
      requestType,
      String(payload.requestTitle || "").trim(),
      String(payload.requestDetails || "").trim(),
      payload.requestedPickupLocation
        ? String(payload.requestedPickupLocation).trim()
        : null,
      payload.requestedDropoffLocation
        ? String(payload.requestedDropoffLocation).trim()
        : null,
      payload.preferredEffectiveDate || null,
    ]
  );

  const requestId = result.insertId;

  await auditLogger.log({
    actorUserId: parentUserId,
    domain: "parent_transport",
    entityType: "parent_transport_request",
    entityId: requestId,
    action: "created",
    newStateJson: {
      studentId,
      requestType,
      requestTitle: String(payload.requestTitle || "").trim(),
      status: "PENDING",
    },
    complianceRelevant: true,
  });

  return getTransportRequestForParent({ parentUserId, requestId });
};

module.exports = {
  listChildrenForParentUser,
  listTransportRequestsForParent,
  getTransportRequestForParent,
  createTransportRequestForParent,
};

