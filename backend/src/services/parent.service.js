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

const getTransportRequestDetail = async ({ requestId, parentUserId = null }) => {
  if (!requestId || !Number.isFinite(requestId)) {
    const invalidRequestError = new Error("Request id is required.");
    invalidRequestError.code = "INVALID_REQUEST_ID";
    throw invalidRequestError;
  }

  await ensureUsersTable();
  await ensureStudentsTables();

  const filters = ["ptr.id = ?"];
  const params = [requestId];

  if (parentUserId) {
    filters.push("ptr.parentUserId = ?");
    params.push(parentUserId);
  }

  const [rows] = await pool.query(
    `
      ${transportRequestSelectSql}
      WHERE ${filters.join(" AND ")}
      LIMIT 1
    `,
    params
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

const getTransportRequestForParent = async ({ parentUserId, requestId }) => {
  if (!parentUserId || !Number.isFinite(parentUserId)) {
    const invalidUserError = new Error("Parent user id is required.");
    invalidUserError.code = "INVALID_PARENT_USER_ID";
    throw invalidUserError;
  }

  return getTransportRequestDetail({ requestId, parentUserId });
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

const listTransportRequestsForManager = async () => {
  await ensureUsersTable();
  await ensureStudentsTables();

  const [rows] = await pool.query(
    `
      ${transportRequestSelectSql}
      ORDER BY
        CASE ptr.status WHEN 'PENDING' THEN 0 ELSE 1 END,
        ptr.createdAt DESC,
        ptr.id DESC
      LIMIT 500
    `
  );

  return rows.map(mapTransportRequestRow);
};

const getTransportRequestForManager = async ({ requestId }) =>
  getTransportRequestDetail({ requestId });

const reviewTransportRequest = async ({
  requestId,
  reviewerUserId,
  status,
  managerReviewNotes = null,
}) => {
  if (!requestId || !Number.isFinite(requestId)) {
    const invalidRequestError = new Error("Request id is required.");
    invalidRequestError.code = "INVALID_REQUEST_ID";
    throw invalidRequestError;
  }

  if (!reviewerUserId || !Number.isFinite(reviewerUserId)) {
    const invalidReviewerError = new Error("Reviewer user id is required.");
    invalidReviewerError.code = "INVALID_REVIEWER_USER_ID";
    throw invalidReviewerError;
  }

  const nextStatus = String(status || "").trim();
  if (!["APPROVED", "REJECTED"].includes(nextStatus)) {
    const error = new Error("Invalid review status.");
    error.code = "INVALID_REVIEW_STATUS";
    throw error;
  }

  await ensureUsersTable();
  await ensureStudentsTables();

  const [existingRows] = await pool.query(
    `
      SELECT id, status, parentUserId, studentId, requestType, requestTitle
      FROM parent_transport_requests
      WHERE id = ?
      LIMIT 1
    `,
    [requestId]
  );

  if (existingRows.length === 0) {
    const notFoundError = new Error("Transport request not found.");
    notFoundError.code = "REQUEST_NOT_FOUND";
    throw notFoundError;
  }

  const existing = existingRows[0];

  if (existing.status !== "PENDING") {
    const error = new Error("Only pending requests can be reviewed.");
    error.code = "REQUEST_ALREADY_REVIEWED";
    throw error;
  }

  const normalizedNotes = managerReviewNotes
    ? String(managerReviewNotes).trim()
    : null;

  await pool.query(
    `
      UPDATE parent_transport_requests
      SET
        status = ?,
        managerReviewNotes = ?,
        reviewedByUserId = ?,
        reviewedAt = CURRENT_TIMESTAMP,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [nextStatus, normalizedNotes, reviewerUserId, requestId]
  );

  await auditLogger.log({
    actorUserId: reviewerUserId,
    domain: "parent_transport",
    entityType: "parent_transport_request",
    entityId: requestId,
    action: nextStatus === "APPROVED" ? "approved" : "rejected",
    previousStateJson: {
      status: existing.status,
      requestType: existing.requestType,
      requestTitle: existing.requestTitle,
    },
    newStateJson: {
      status: nextStatus,
      managerReviewNotes: normalizedNotes,
    },
    complianceRelevant: true,
  });

  return getTransportRequestForManager({ requestId });
};

const mapTransportStop = (row) => {
  if (!row) {
    return null;
  }

  return {
    stopId: row.stopId,
    stopName: row.stopName,
    stopType: row.stopType,
    address: row.address || null,
    landmark: row.landmark || null,
  };
};

const mapAttendanceRow = (row) => ({
  id: row.id,
  tripType: row.trip_type,
  attendanceDate: normalizeDate(row.attendance_date),
  routeCode: row.route_code,
  routeName: row.route_name,
  stopName: row.stop_name,
  stopAddress: row.stop_address || null,
  boardingStatus: row.boarding_status,
  dropoffStatus: row.dropoff_status,
  boardedAt: row.boarded_at ? new Date(row.boarded_at).toISOString() : null,
  droppedOffAt: row.dropped_off_at ? new Date(row.dropped_off_at).toISOString() : null,
  notes: row.notes || null,
  departureTime: row.departure_time || null,
});

const listChildrenTransportForParent = async ({ parentUserId }) => {
  if (!parentUserId || !Number.isFinite(parentUserId)) {
    const invalidUserError = new Error("Parent user id is required.");
    invalidUserError.code = "INVALID_PARENT_USER_ID";
    throw invalidUserError;
  }

  await ensureUsersTable();
  await ensureStudentsTables();

  const phoneNumber = await getParentPhoneNumber(parentUserId);

  const [studentRows] = await pool.query(
    `
      SELECT
        id,
        admissionNumber,
        firstName,
        lastName,
        grade,
        stream,
        status
      FROM students
      WHERE parentContact = ?
      ORDER BY admissionDate DESC, id DESC
      LIMIT 500
    `,
    [phoneNumber]
  );

  if (studentRows.length === 0) {
    return [];
  }

  const studentIds = studentRows.map((row) => row.id);
  const placeholders = studentIds.map(() => "?").join(", ");
  const today = new Date().toISOString().slice(0, 10);

  const [assignmentRows] = await pool.query(
    `
      SELECT
        sra.student_id,
        sra.trip_type,
        r.id AS routeId,
        r.route_id AS routeCode,
        r.route_name AS routeName,
        r.vehicle_plate AS vehiclePlate,
        r.assigned_driver AS assignedDriver,
        r.assigned_assistant AS assignedAssistant,
        st.id AS stopId,
        st.stop_name AS stopName,
        st.stop_type AS stopType,
        st.address,
        st.landmark
      FROM student_route_assignment sra
      INNER JOIN routes r ON r.id = sra.route_id
      INNER JOIN stops st ON st.id = sra.stop_id
      WHERE sra.student_id IN (${placeholders})
        AND sra.status = 'Active'
        AND sra.effective_from <= CURDATE()
        AND (sra.effective_to IS NULL OR sra.effective_to >= CURDATE())
      ORDER BY sra.student_id ASC, sra.trip_type ASC
    `,
    studentIds
  );

  const [attendanceRows] = await pool.query(
    `
      SELECT
        sa.id,
        sa.student_id,
        sa.trip_type,
        sa.attendance_date,
        sa.boarding_status,
        sa.dropoff_status,
        sa.boarded_at,
        sa.dropped_off_at,
        sa.notes,
        st.stop_name,
        st.address AS stop_address,
        r.route_name,
        r.route_id AS route_code,
        tm.departure_time
      FROM student_attendance sa
      INNER JOIN stops st ON st.id = sa.stop_id
      INNER JOIN trip_monitoring tm ON tm.id = sa.trip_id
      INNER JOIN routes r ON r.id = tm.route_id
      WHERE sa.student_id IN (${placeholders})
        AND sa.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      ORDER BY sa.attendance_date DESC, sa.trip_type DESC, sa.id DESC
    `,
    studentIds
  );

  const assignmentsByStudent = new Map();
  for (const row of assignmentRows) {
    const existing = assignmentsByStudent.get(row.student_id) || [];
    existing.push(row);
    assignmentsByStudent.set(row.student_id, existing);
  }

  const attendanceByStudent = new Map();
  for (const row of attendanceRows) {
    const existing = attendanceByStudent.get(row.student_id) || [];
    existing.push(mapAttendanceRow(row));
    attendanceByStudent.set(row.student_id, existing);
  }

  return studentRows.map((student) => {
    const assignments = assignmentsByStudent.get(student.id) || [];
    let route = null;
    let pickupStop = null;
    let dropoffStop = null;

    for (const assignment of assignments) {
      if (!route) {
        route = {
          routeId: assignment.routeId,
          routeCode: assignment.routeCode,
          routeName: assignment.routeName,
          vehiclePlate: assignment.vehiclePlate || null,
          assignedDriver: assignment.assignedDriver || null,
          assignedAssistant: assignment.assignedAssistant || null,
        };
      }

      const stop = mapTransportStop(assignment);

      if (assignment.trip_type === "Morning" || assignment.trip_type === "Both") {
        pickupStop = stop;
      }

      if (assignment.trip_type === "Evening" || assignment.trip_type === "Both") {
        dropoffStop = stop;
      }
    }

    const recentAttendance = attendanceByStudent.get(student.id) || [];
    const todayAttendance = recentAttendance.filter(
      (record) => record.attendanceDate === today
    );

    return {
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      stream: student.stream,
      status: student.status,
      route,
      pickupStop,
      dropoffStop,
      todayAttendance,
      recentAttendance,
    };
  });
};

module.exports = {
  listChildrenForParentUser,
  listChildrenTransportForParent,
  listTransportRequestsForParent,
  getTransportRequestForParent,
  createTransportRequestForParent,
  listTransportRequestsForManager,
  getTransportRequestForManager,
  reviewTransportRequest,
};

