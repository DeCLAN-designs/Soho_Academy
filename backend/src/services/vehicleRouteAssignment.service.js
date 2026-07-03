const pool = require("../config/db.js");

/**
 * Get active vehicle-route assignments for a specific date
 * Returns assignments that are effective on the given date
 */
const getAssignmentsForDate = async ({ date }) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const [rows] = await pool.query(
    `
      SELECT
        vra.id,
        vra.vehicle_plate,
        vra.route_id,
        r.route_name,
        r.route_id AS route_code,
        vra.time_period,
        vra.driver_user_id,
        d.firstName AS driver_first_name,
        d.lastName AS driver_last_name,
        vra.assistant_user_id,
        a.firstName AS assistant_first_name,
        a.lastName AS assistant_last_name,
        vra.effective_from,
        vra.effective_to,
        vra.status,
        vra.notes
      FROM vehicle_route_assignments vra
      INNER JOIN routes r ON r.id = vra.route_id
      LEFT JOIN users d ON d.id = vra.driver_user_id
      LEFT JOIN users a ON a.id = vra.assistant_user_id
      WHERE vra.status = 'Active'
        AND vra.effective_from <= ?
        AND (vra.effective_to IS NULL OR vra.effective_to >= ?)
      ORDER BY vra.time_period, r.route_name
    `,
    [targetDate, targetDate]
  );

  return rows.map((row) => ({
    id: row.id,
    vehiclePlate: row.vehicle_plate,
    routeId: row.route_id,
    routeName: row.route_name,
    routeCode: row.route_code,
    timePeriod: row.time_period,
    driverUserId: row.driver_user_id,
    driverName: row.driver_first_name && row.driver_last_name 
      ? `${row.driver_first_name} ${row.driver_last_name}` 
      : null,
    assistantUserId: row.assistant_user_id,
    assistantName: row.assistant_first_name && row.assistant_last_name 
      ? `${row.assistant_first_name} ${row.assistant_last_name}` 
      : null,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    status: row.status,
    notes: row.notes,
  }));
};

/**
 * Get assignments for a specific vehicle
 */
const getAssignmentsForVehicle = async ({ vehiclePlate, date }) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const [rows] = await pool.query(
    `
      SELECT
        vra.id,
        vra.vehicle_plate,
        vra.route_id,
        r.route_name,
        r.route_id AS route_code,
        vra.time_period,
        vra.driver_user_id,
        d.firstName AS driver_first_name,
        d.lastName AS driver_last_name,
        vra.assistant_user_id,
        a.firstName AS assistant_first_name,
        a.lastName AS assistant_last_name,
        vra.effective_from,
        vra.effective_to,
        vra.status,
        vra.notes
      FROM vehicle_route_assignments vra
      INNER JOIN routes r ON r.id = vra.route_id
      LEFT JOIN users d ON d.id = vra.driver_user_id
      LEFT JOIN users a ON a.id = vra.assistant_user_id
      WHERE vra.vehicle_plate = ?
        AND vra.status = 'Active'
        AND vra.effective_from <= ?
        AND (vra.effective_to IS NULL OR vra.effective_to >= ?)
      ORDER BY vra.time_period
    `,
    [vehiclePlate, targetDate, targetDate]
  );

  return rows.map((row) => ({
    id: row.id,
    vehiclePlate: row.vehicle_plate,
    routeId: row.route_id,
    routeName: row.route_name,
    routeCode: row.route_code,
    timePeriod: row.time_period,
    driverUserId: row.driver_user_id,
    driverName: row.driver_first_name && row.driver_last_name 
      ? `${row.driver_first_name} ${row.driver_last_name}` 
      : null,
    assistantUserId: row.assistant_user_id,
    assistantName: row.assistant_first_name && row.assistant_last_name 
      ? `${row.assistant_first_name} ${row.assistant_last_name}` 
      : null,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    status: row.status,
    notes: row.notes,
  }));
};

/**
 * Get assignment for a specific route, time period, and date
 */
const getAssignmentForRouteAndPeriod = async ({ routeId, timePeriod, date }) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const [rows] = await pool.query(
    `
      SELECT
        vra.id,
        vra.vehicle_plate,
        vra.route_id,
        r.route_name,
        r.route_id AS route_code,
        vra.time_period,
        vra.driver_user_id,
        d.firstName AS driver_first_name,
        d.lastName AS driver_last_name,
        vra.assistant_user_id,
        a.firstName AS assistant_first_name,
        a.lastName AS assistant_last_name,
        vra.effective_from,
        vra.effective_to,
        vra.status,
        vra.notes
      FROM vehicle_route_assignments vra
      INNER JOIN routes r ON r.id = vra.route_id
      LEFT JOIN users d ON d.id = vra.driver_user_id
      LEFT JOIN users a ON a.id = vra.assistant_user_id
      WHERE vra.route_id = ?
        AND (vra.time_period = ? OR vra.time_period = 'Both')
        AND vra.status = 'Active'
        AND vra.effective_from <= ?
        AND (vra.effective_to IS NULL OR vra.effective_to >= ?)
      LIMIT 1
    `,
    [routeId, timePeriod, targetDate, targetDate]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    vehiclePlate: row.vehicle_plate,
    routeId: row.route_id,
    routeName: row.route_name,
    routeCode: row.route_code,
    timePeriod: row.time_period,
    driverUserId: row.driver_user_id,
    driverName: row.driver_first_name && row.driver_last_name 
      ? `${row.driver_first_name} ${row.driver_last_name}` 
      : null,
    assistantUserId: row.assistant_user_id,
    assistantName: row.assistant_first_name && row.assistant_last_name 
      ? `${row.assistant_first_name} ${row.assistant_last_name}` 
      : null,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    status: row.status,
    notes: row.notes,
  };
};

/**
 * Create a new vehicle-route assignment
 */
const createAssignment = async ({ payload, userId }) => {
  const {
    vehiclePlate,
    routeId,
    timePeriod,
    driverUserId,
    assistantUserId,
    effectiveFrom,
    effectiveTo,
    notes,
  } = payload;

  if (!vehiclePlate) {
    const error = new Error("Vehicle plate is required.");
    error.code = "VEHICLE_PLATE_REQUIRED";
    throw error;
  }

  if (!routeId) {
    const error = new Error("Route ID is required.");
    error.code = "ROUTE_ID_REQUIRED";
    throw error;
  }

  if (!timePeriod || !['Morning', 'Evening', 'Both'].includes(timePeriod)) {
    const error = new Error("Valid time period (Morning, Evening, or Both) is required.");
    error.code = "INVALID_TIME_PERIOD";
    throw error;
  }

  const effectiveFromDate = effectiveFrom || new Date().toISOString().slice(0, 10);

  const [result] = await pool.query(
    `
      INSERT INTO vehicle_route_assignments (
        vehicle_plate,
        route_id,
        time_period,
        driver_user_id,
        assistant_user_id,
        effective_from,
        effective_to,
        status,
        notes,
        created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
    `,
    [
      vehiclePlate,
      routeId,
      timePeriod,
      driverUserId || null,
      assistantUserId || null,
      effectiveFromDate,
      effectiveTo || null,
      notes || null,
      userId,
    ]
  );

  return {
    id: result.insertId,
    vehiclePlate,
    routeId,
    timePeriod,
    driverUserId,
    assistantUserId,
    effectiveFrom: effectiveFromDate,
    effectiveTo,
    status: 'Active',
    notes,
  };
};

/**
 * Update an existing vehicle-route assignment
 */
const updateAssignment = async ({ id, payload, userId }) => {
  const existing = await pool.query(
    "SELECT * FROM vehicle_route_assignments WHERE id = ? LIMIT 1",
    [id]
  );

  if (existing.length === 0) {
    const error = new Error("Assignment not found.");
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const updates = [];
  const values = [];

  if (payload.driverUserId !== undefined) {
    updates.push("driver_user_id = ?");
    values.push(payload.driverUserId);
  }

  if (payload.assistantUserId !== undefined) {
    updates.push("assistant_user_id = ?");
    values.push(payload.assistantUserId);
  }

  if (payload.effectiveFrom !== undefined) {
    updates.push("effective_from = ?");
    values.push(payload.effectiveFrom);
  }

  if (payload.effectiveTo !== undefined) {
    updates.push("effective_to = ?");
    values.push(payload.effectiveTo);
  }

  if (payload.status !== undefined) {
    updates.push("status = ?");
    values.push(payload.status);
  }

  if (payload.notes !== undefined) {
    updates.push("notes = ?");
    values.push(payload.notes);
  }

  if (updates.length === 0) {
    return existing[0];
  }

  values.push(id);

  await pool.query(
    `UPDATE vehicle_route_assignments SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const [updated] = await pool.query(
    "SELECT * FROM vehicle_route_assignments WHERE id = ? LIMIT 1",
    [id]
  );

  return updated[0];
};

/**
 * Delete (deactivate) a vehicle-route assignment
 */
const deleteAssignment = async ({ id }) => {
  const existing = await pool.query(
    "SELECT * FROM vehicle_route_assignments WHERE id = ? LIMIT 1",
    [id]
  );

  if (existing.length === 0) {
    const error = new Error("Assignment not found.");
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  await pool.query(
    "UPDATE vehicle_route_assignments SET status = 'Inactive' WHERE id = ?",
    [id]
  );

  return { message: "Assignment deactivated successfully" };
};

/**
 * Get assignment history for audit
 */
const getAssignmentHistory = async ({ assignmentId, vehiclePlate, limit = 50 }) => {
  let query = `
    SELECT
      vrah.*,
      u.firstName AS changed_by_first_name,
      u.lastName AS changed_by_last_name
    FROM vehicle_route_assignment_history vrah
    LEFT JOIN users u ON u.id = vrah.changed_by_user_id
    WHERE 1=1
  `;
  const params = [];

  if (assignmentId) {
    query += " AND vrah.assignment_id = ?";
    params.push(assignmentId);
  }

  if (vehiclePlate) {
    query += " AND vrah.vehicle_plate = ?";
    params.push(vehiclePlate);
  }

  query += " ORDER BY vrah.changed_at DESC LIMIT ?";
  params.push(limit);

  const [rows] = await pool.query(query, params);

  return rows.map((row) => ({
    id: row.id,
    assignmentId: row.assignment_id,
    vehiclePlate: row.vehicle_plate,
    routeId: row.route_id,
    timePeriod: row.time_period,
    changeType: row.change_type,
    oldDriverId: row.old_driver_id,
    newDriverId: row.new_driver_id,
    oldAssistantId: row.old_assistant_id,
    newAssistantId: row.new_assistant_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changeReason: row.change_reason,
    changedByUserId: row.changed_by_user_id,
    changedByName: row.changed_by_first_name && row.changed_by_last_name 
      ? `${row.changed_by_first_name} ${row.changed_by_last_name}` 
      : null,
    changedAt: row.changed_at,
  }));
};

module.exports = {
  getAssignmentsForDate,
  getAssignmentsForVehicle,
  getAssignmentForRouteAndPeriod,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentHistory,
};
