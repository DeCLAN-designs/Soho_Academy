const pool = require("../config/db.js");

const normalizeDate = (value) => {
  if (!value) return null;
  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) return null;
  return normalized.toISOString().slice(0, 10);
};

const ensureStudentAssignmentRecord = async ({ studentId, routeId, stopId }) => {
  const [studentRows] = await pool.query("SELECT id FROM students WHERE id = ? LIMIT 1", [studentId]);
  if (!studentRows.length) {
    const error = new Error("Student not found.");
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const [routeRows] = await pool.query("SELECT id FROM routes WHERE id = ? LIMIT 1", [routeId]);
  if (!routeRows.length) {
    const error = new Error("Route not found.");
    error.code = "ROUTE_NOT_FOUND";
    throw error;
  }

  const [stopRows] = await pool.query("SELECT id, route_id FROM stops WHERE id = ? AND deleted_at IS NULL LIMIT 1", [stopId]);
  if (!stopRows.length) {
    const error = new Error("Stop not found.");
    error.code = "STOP_NOT_FOUND";
    throw error;
  }

  if (Number(stopRows[0].route_id) !== Number(routeId)) {
    const error = new Error("Selected stop does not belong to the selected route.");
    error.code = "STOP_ROUTE_MISMATCH";
    throw error;
  }
};

const listStudentAssignments = async () => {
  const [rows] = await pool.query(`
    SELECT
      sra.id,
      sra.student_id,
      CONCAT(s.firstName, ' ', s.lastName) AS student_name,
      s.admissionNumber AS admission_number,
      s.grade,
      s.stream,
      sra.route_id,
      r.route_name,
      sra.stop_id,
      st.stop_name,
      sra.trip_type,
      sra.status,
      sra.effective_from,
      sra.effective_to,
      sra.assigned_at,
      sra.assigned_by_user_id
    FROM student_route_assignment sra
    INNER JOIN students s ON s.id = sra.student_id
    INNER JOIN routes r ON r.id = sra.route_id
    INNER JOIN stops st ON st.id = sra.stop_id
    ORDER BY sra.assigned_at DESC, sra.id DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    admissionNumber: row.admission_number,
    grade: row.grade,
    stream: row.stream,
    routeId: row.route_id,
    routeName: row.route_name,
    stopId: row.stop_id,
    stopName: row.stop_name,
    tripType: row.trip_type,
    status: row.status,
    effectiveFrom: normalizeDate(row.effective_from),
    effectiveTo: normalizeDate(row.effective_to),
    assignedAt: row.assigned_at,
    assignedByUserId: row.assigned_by_user_id,
  }));
};

const createStudentAssignment = async ({ payload }) => {
  const studentId = Number(payload.studentId ?? payload.student_id);
  const routeId = Number(payload.routeId ?? payload.route_id);
  const stopId = Number(payload.stopId ?? payload.stop_id);

  if (!studentId) {
    const error = new Error("Student is required.");
    error.code = "STUDENT_REQUIRED";
    throw error;
  }

  if (!routeId) {
    const error = new Error("Route is required.");
    error.code = "ROUTE_REQUIRED";
    throw error;
  }

  if (!stopId) {
    const error = new Error("Stop is required.");
    error.code = "STOP_REQUIRED";
    throw error;
  }

  await ensureStudentAssignmentRecord({ studentId, routeId, stopId });

  const tripType = String(payload.tripType ?? payload.trip_type ?? "Both").trim();
  const status = String(payload.status ?? "Active").trim();
  const effectiveFrom = normalizeDate(payload.effectiveFrom ?? payload.effective_from) || new Date().toISOString().slice(0, 10);
  const effectiveTo = normalizeDate(payload.effectiveTo ?? payload.effective_to) || null;

  const [result] = await pool.query(`
    INSERT INTO student_route_assignment (
      student_id,
      route_id,
      stop_id,
      trip_type,
      assigned_by_user_id,
      status,
      effective_from,
      effective_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [studentId, routeId, stopId, tripType, payload.assignedByUserId ?? payload.assigned_by_user_id ?? null, status, effectiveFrom, effectiveTo]);

  const [rows] = await pool.query("SELECT id FROM student_route_assignment WHERE id = ? LIMIT 1", [result.insertId]);
  return rows.length ? listStudentAssignments().then((items) => items.find((item) => item.id === rows[0].id)) : null;
};

const updateStudentAssignment = async ({ id, payload }) => {
  const current = (await listStudentAssignments()).find((item) => item.id === Number(id));
  if (!current) {
    const error = new Error("Assignment not found.");
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const updates = [];
  const values = [];

  if (payload.studentId !== undefined || payload.student_id !== undefined) {
    updates.push("student_id = ?");
    values.push(Number(payload.studentId ?? payload.student_id));
  }

  if (payload.routeId !== undefined || payload.route_id !== undefined) {
    updates.push("route_id = ?");
    values.push(Number(payload.routeId ?? payload.route_id));
  }

  if (payload.stopId !== undefined || payload.stop_id !== undefined) {
    updates.push("stop_id = ?");
    values.push(Number(payload.stopId ?? payload.stop_id));
  }

  if (payload.tripType !== undefined || payload.trip_type !== undefined) {
    updates.push("trip_type = ?");
    values.push(String(payload.tripType ?? payload.trip_type));
  }

  if (payload.status !== undefined) {
    updates.push("status = ?");
    values.push(String(payload.status));
  }

  if (payload.effectiveFrom !== undefined || payload.effective_from !== undefined) {
    updates.push("effective_from = ?");
    values.push(normalizeDate(payload.effectiveFrom ?? payload.effective_from) || null);
  }

  if (payload.effectiveTo !== undefined || payload.effective_to !== undefined) {
    updates.push("effective_to = ?");
    values.push(normalizeDate(payload.effectiveTo ?? payload.effective_to) || null);
  }

  if (updates.length === 0) {
    const error = new Error("No assignment fields were provided for update.");
    error.code = "NO_ASSIGNMENT_FIELDS";
    throw error;
  }

  values.push(Number(id));
  await pool.query(`UPDATE student_route_assignment SET ${updates.join(", ")} WHERE id = ?`, values);

  return (await listStudentAssignments()).find((item) => item.id === Number(id)) || null;
};

const deleteStudentAssignment = async ({ id }) => {
  const current = (await listStudentAssignments()).find((item) => item.id === Number(id));
  if (!current) {
    const error = new Error("Assignment not found.");
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  await pool.query("DELETE FROM student_route_assignment WHERE id = ?", [Number(id)]);
  return { deleted: true, id: Number(id) };
};

module.exports = {
  createStudentAssignment,
  deleteStudentAssignment,
  listStudentAssignments,
  updateStudentAssignment,
};
