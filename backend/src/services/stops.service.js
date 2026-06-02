const pool = require("../config/db.js");

const STOP_TYPES = new Set(["Pickup", "Dropoff", "Both"]);
const STOP_STATUSES = new Set(["Active", "Inactive"]);

let ensureStopsTablePromise;

const ensureStopsTable = () => {
  if (!ensureStopsTablePromise) {
    ensureStopsTablePromise = pool.query(`
      CREATE TABLE IF NOT EXISTS stops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stop_id VARCHAR(20) NOT NULL UNIQUE,
        stop_name VARCHAR(200) NOT NULL,
        stop_type ENUM('Pickup', 'Dropoff', 'Both') NOT NULL,
        address TEXT NOT NULL,
        landmark VARCHAR(200) NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        sequence_order INT NOT NULL,
        students_assigned INT DEFAULT 0,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        route_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by_user_id INT NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_stops_route FOREIGN KEY (route_id) REFERENCES routes(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )
    `);
  }

  return ensureStopsTablePromise;
};

const normalizeRouteId = (value) => String(value || "").trim();

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) return value;
  return String(value).trim();
};

const mapStopRow = (row) => ({
  id: row.id,
  stopId: row.stop_id,
  stopName: row.stop_name,
  stopType: row.stop_type,
  routeId: row.route_ref ?? row.route_id ?? null,
  routeName: row.route_name ?? null,
  address: row.address,
  landmark: row.landmark ?? null,
  latitude: row.latitude ?? null,
  longitude: row.longitude ?? null,
  sequenceOrder: row.sequence_order,
  studentsAssigned: row.students_assigned ?? 0,
  status: row.status ?? "Active",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getStopById = async (id) => {
  await ensureStopsTable();

  const [rows] = await pool.query(
    `
      SELECT
        s.id,
        s.stop_id,
        s.stop_name,
        s.stop_type,
        s.address,
        s.landmark,
        s.latitude,
        s.longitude,
        s.sequence_order,
        s.students_assigned,
        s.status,
        s.created_at,
        s.updated_at,
        r.route_id AS route_ref,
        r.route_name
      FROM stops s
      LEFT JOIN routes r ON r.id = s.route_id
      WHERE s.id = ? AND s.deleted_at IS NULL
      LIMIT 1
    `,
    [id]
  );

  return rows.length > 0 ? mapStopRow(rows[0]) : null;
};

const getNextSequenceOrder = async (routeId) => {
  const [rows] = await pool.query(
    `
      SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next_order
      FROM stops
      WHERE route_id = ? AND deleted_at IS NULL
    `,
    [routeId]
  );

  return Number(rows[0]?.next_order || 1);
};

const resolveRouteId = async (routeIdValue) => {
  const routeCode = normalizeRouteId(routeIdValue);
  if (!routeCode) {
    const error = new Error("Route ID is required.");
    error.code = "ROUTE_ID_REQUIRED";
    throw error;
  }

  const [rows] = await pool.query(
    `
      SELECT id, route_id
      FROM routes
      WHERE route_id = ?
      LIMIT 1
    `,
    [routeCode]
  );

  if (!rows.length) {
    const error = new Error("Route not found.");
    error.code = "ROUTE_NOT_FOUND";
    throw error;
  }

  return rows[0];
};

const listStops = async () => {
  await ensureStopsTable();

  const [rows] = await pool.query(
    `
      SELECT
        s.id,
        s.stop_id,
        s.stop_name,
        s.stop_type,
        s.address,
        s.landmark,
        s.latitude,
        s.longitude,
        s.sequence_order,
        s.students_assigned,
        s.status,
        s.created_at,
        s.updated_at,
        r.route_id AS route_ref,
        r.route_name
      FROM stops s
      LEFT JOIN routes r ON r.id = s.route_id
      WHERE s.deleted_at IS NULL
      ORDER BY s.sequence_order ASC, s.id ASC
    `
  );

  return rows.map(mapStopRow);
};

const createStop = async ({ payload }) => {
  await ensureStopsTable();

  const stopName = normalizeOptionalText(payload.stopName ?? payload.stop_name);
  if (!stopName) {
    const error = new Error("Stop name is required.");
    error.code = "STOP_NAME_REQUIRED";
    throw error;
  }

  const stopType = normalizeOptionalText(payload.stopType ?? payload.stop_type);
  if (!STOP_TYPES.has(stopType)) {
    const error = new Error("Stop type must be Pickup, Dropoff, or Both.");
    error.code = "INVALID_STOP_TYPE";
    throw error;
  }

  const address = normalizeOptionalText(payload.address);
  if (!address) {
    const error = new Error("Address is required.");
    error.code = "ADDRESS_REQUIRED";
    throw error;
  }

  const routeRow = await resolveRouteId(payload.routeId ?? payload.route_id);
  const sequenceOrder = Number.isInteger(Number(payload.sequenceOrder ?? payload.sequence_order))
    ? Number(payload.sequenceOrder ?? payload.sequence_order)
    : await getNextSequenceOrder(routeRow.id);

  const normalizedPayload = {
    stop_name: stopName,
    stop_type: stopType,
    address,
    landmark: normalizeOptionalText(payload.landmark) || null,
    latitude: payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null,
    longitude: payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null,
    sequence_order: sequenceOrder,
    students_assigned: Number(payload.studentsAssigned ?? payload.students_assigned ?? 0),
    status: STOP_STATUSES.has(payload.status) ? payload.status : "Active",
    route_id: routeRow.id,
    created_by_user_id: payload.createdByUserId ?? payload.created_by_user_id ?? null,
  };

  const [result] = await pool.query(
    `
      INSERT INTO stops (
        stop_name,
        stop_type,
        address,
        landmark,
        latitude,
        longitude,
        sequence_order,
        students_assigned,
        status,
        route_id,
        created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalizedPayload.stop_name,
      normalizedPayload.stop_type,
      normalizedPayload.address,
      normalizedPayload.landmark,
      normalizedPayload.latitude,
      normalizedPayload.longitude,
      normalizedPayload.sequence_order,
      normalizedPayload.students_assigned,
      normalizedPayload.status,
      normalizedPayload.route_id,
      normalizedPayload.created_by_user_id,
    ]
  );

  return getStopById(result.insertId);
};

const updateStop = async ({ id, payload }) => {
  await ensureStopsTable();

  const currentStop = await getStopById(id);
  if (!currentStop) {
    const error = new Error("Stop not found.");
    error.code = "STOP_NOT_FOUND";
    throw error;
  }

  const fields = [];
  const values = [];

  if (payload.stopName !== undefined || payload.stop_name !== undefined) {
    const stopName = normalizeOptionalText(payload.stopName ?? payload.stop_name);
    if (!stopName) {
      const error = new Error("Stop name is required.");
      error.code = "STOP_NAME_REQUIRED";
      throw error;
    }
    fields.push("stop_name = ?");
    values.push(stopName);
  }

  if (payload.stopType !== undefined || payload.stop_type !== undefined) {
    const stopType = normalizeOptionalText(payload.stopType ?? payload.stop_type);
    if (!STOP_TYPES.has(stopType)) {
      const error = new Error("Stop type must be Pickup, Dropoff, or Both.");
      error.code = "INVALID_STOP_TYPE";
      throw error;
    }
    fields.push("stop_type = ?");
    values.push(stopType);
  }

  if (payload.address !== undefined) {
    const address = normalizeOptionalText(payload.address);
    if (!address) {
      const error = new Error("Address is required.");
      error.code = "ADDRESS_REQUIRED";
      throw error;
    }
    fields.push("address = ?");
    values.push(address);
  }

  if (payload.landmark !== undefined) {
    fields.push("landmark = ?");
    values.push(normalizeOptionalText(payload.landmark) || null);
  }

  if (payload.latitude !== undefined) {
    fields.push("latitude = ?");
    values.push(payload.latitude === null || payload.latitude === "" ? null : Number(payload.latitude));
  }

  if (payload.longitude !== undefined) {
    fields.push("longitude = ?");
    values.push(payload.longitude === null || payload.longitude === "" ? null : Number(payload.longitude));
  }

  if (payload.sequenceOrder !== undefined || payload.sequence_order !== undefined) {
    fields.push("sequence_order = ?");
    values.push(Number(payload.sequenceOrder ?? payload.sequence_order));
  }

  if (payload.studentsAssigned !== undefined || payload.students_assigned !== undefined) {
    fields.push("students_assigned = ?");
    values.push(Number(payload.studentsAssigned ?? payload.students_assigned ?? 0));
  }

  if (payload.status !== undefined) {
    if (!STOP_STATUSES.has(payload.status)) {
      const error = new Error("Status must be Active or Inactive.");
      error.code = "INVALID_STOP_STATUS";
      throw error;
    }
    fields.push("status = ?");
    values.push(payload.status);
  }

  if (payload.routeId !== undefined || payload.route_id !== undefined) {
    const routeRow = await resolveRouteId(payload.routeId ?? payload.route_id);
    fields.push("route_id = ?");
    values.push(routeRow.id);
  }

  if (fields.length === 0) {
    return currentStop;
  }

  values.push(id);

  await pool.query(`UPDATE stops SET ${fields.join(", ")} WHERE id = ?`, values);

  return getStopById(id);
};

const updateStopSequence = async ({ id, sequenceOrder }) => {
  await ensureStopsTable();

  const sequence = Number(sequenceOrder);
  if (!Number.isInteger(sequence) || sequence < 1) {
    const error = new Error("Sequence order must be a positive integer.");
    error.code = "INVALID_SEQUENCE_ORDER";
    throw error;
  }

  const [result] = await pool.query(
    `
      UPDATE stops
      SET sequence_order = ?
      WHERE id = ? AND deleted_at IS NULL
    `,
    [sequence, id]
  );

  if (result.affectedRows === 0) {
    const error = new Error("Stop not found.");
    error.code = "STOP_NOT_FOUND";
    throw error;
  }

  return getStopById(id);
};

const deleteStop = async ({ id }) => {
  await ensureStopsTable();

  const [result] = await pool.query(
    `
      UPDATE stops
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );

  if (result.affectedRows === 0) {
    const error = new Error("Stop not found.");
    error.code = "STOP_NOT_FOUND";
    throw error;
  }
};

module.exports = {
  createStop,
  deleteStop,
  getStopById,
  listStops,
  updateStop,
  updateStopSequence,
};
