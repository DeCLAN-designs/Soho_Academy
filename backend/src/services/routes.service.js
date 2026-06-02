const pool = require("../config/db.js");

const ROUTE_STATUSES = new Set(["Active", "Inactive", "Draft"]);

let ensureRoutesTablesPromise;

const ensureRoutesTable = () => {
  if (!ensureRoutesTablesPromise) {
    ensureRoutesTablesPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_id VARCHAR(50) NOT NULL,
        route_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        vehicle_plate VARCHAR(20) NULL,
        vehicle_model VARCHAR(255) NULL,
        assigned_driver VARCHAR(255) NULL,
        assigned_assistant VARCHAR(255) NULL,
        total_stops INT DEFAULT 0,
        status ENUM('Active', 'Inactive', 'Draft') NOT NULL DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT uq_route_id UNIQUE (route_id)
      )
    `);
  }

  return ensureRoutesTablesPromise;
};

const mapRouteRow = (row) => ({
  id: row.id,
  routeId: row.route_id,
  routeName: row.route_name,
  description: row.description,
  vehiclePlate: row.vehicle_plate,
  vehicleModel: row.vehicle_model,
  assignedDriver: row.assigned_driver,
  assignedAssistant: row.assigned_assistant,
  totalStops: row.total_stops,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeRouteId = (routeId) => String(routeId || "").trim();

const listRoutes = async () => {
  await ensureRoutesTable();

  const [rows] = await pool.query(`
    SELECT
      id,
      route_id,
      route_name,
      description,
      vehicle_plate,
      vehicle_model,
      assigned_driver,
      assigned_assistant,
      total_stops,
      status,
      created_at,
      updated_at
    FROM routes
    ORDER BY id ASC
  `);

  return rows.map(mapRouteRow);
};

const createRoute = async ({ payload }) => {
  await ensureRoutesTable();

  const routeName = String(payload.routeName || "").trim();
  if (!routeName) {
    const error = new Error("Route name is required.");
    error.code = "ROUTE_NAME_REQUIRED";
    throw error;
  }

  const routeId = normalizeRouteId(payload.routeId) || `RT-${Date.now()}`;
  const normalizedPayload = {
    route_name: routeName,
    description: payload.description || null,
    vehicle_plate: payload.vehiclePlate || null,
    vehicle_model: payload.vehicleModel || null,
    assigned_driver: payload.assignedDriver || null,
    assigned_assistant: payload.assignedAssistant || null,
    total_stops: Number(payload.totalStops ?? 0),
    status: ROUTE_STATUSES.has(payload.status) ? payload.status : "Draft",
  };

  try {
    const [result] = await pool.query(
      `
        INSERT INTO routes (
          route_id,
          route_name,
          description,
          vehicle_plate,
          vehicle_model,
          assigned_driver,
          assigned_assistant,
          total_stops,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        routeId,
        normalizedPayload.route_name,
        normalizedPayload.description,
        normalizedPayload.vehicle_plate,
        normalizedPayload.vehicle_model,
        normalizedPayload.assigned_driver,
        normalizedPayload.assigned_assistant,
        normalizedPayload.total_stops,
        normalizedPayload.status,
      ]
    );

    const [rows] = await pool.query(
      `
        SELECT *
        FROM routes
        WHERE id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    return mapRouteRow(rows[0]);
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      const duplicateError = new Error("Route ID already exists.");
      duplicateError.code = "ROUTE_ID_EXISTS";
      throw duplicateError;
    }

    throw error;
  }
};

const getRouteById = async ({ id }) => {
  await ensureRoutesTable();

  const [rows] = await pool.query(
    `
      SELECT *
      FROM routes
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows.length > 0 ? mapRouteRow(rows[0]) : null;
};

const updateRoute = async ({ id, payload }) => {
  await ensureRoutesTable();

  const currentRoute = await getRouteById({ id });
  if (!currentRoute) {
    const error = new Error("Route not found.");
    error.code = "ROUTE_NOT_FOUND";
    throw error;
  }

  const fields = [];
  const values = [];

  if (payload.routeName !== undefined) {
    fields.push("route_name = ?");
    values.push(String(payload.routeName || "").trim());
  }

  if (payload.description !== undefined) {
    fields.push("description = ?");
    values.push(payload.description || null);
  }

  if (payload.vehiclePlate !== undefined) {
    fields.push("vehicle_plate = ?");
    values.push(payload.vehiclePlate || null);
  }

  if (payload.vehicleModel !== undefined) {
    fields.push("vehicle_model = ?");
    values.push(payload.vehicleModel || null);
  }

  if (payload.assignedDriver !== undefined) {
    fields.push("assigned_driver = ?");
    values.push(payload.assignedDriver || null);
  }

  if (payload.assignedAssistant !== undefined) {
    fields.push("assigned_assistant = ?");
    values.push(payload.assignedAssistant || null);
  }

  if (payload.totalStops !== undefined) {
    fields.push("total_stops = ?");
    values.push(Number(payload.totalStops ?? 0));
  }

  if (payload.status !== undefined) {
    if (!ROUTE_STATUSES.has(payload.status)) {
      const error = new Error("Invalid route status.");
      error.code = "INVALID_ROUTE_STATUS";
      throw error;
    }

    fields.push("status = ?");
    values.push(payload.status);
  }

  if (fields.length === 0) {
    return currentRoute;
  }

  values.push(id);

  await pool.query(
    `
      UPDATE routes
      SET ${fields.join(", ")}
      WHERE id = ?
    `,
    values
  );

  return getRouteById({ id });
};

const updateRouteStatus = async ({ id, status }) => {
  await ensureRoutesTable();

  if (!ROUTE_STATUSES.has(status)) {
    const error = new Error("Invalid route status.");
    error.code = "INVALID_ROUTE_STATUS";
    throw error;
  }

  const [result] = await pool.query(
    `
      UPDATE routes
      SET status = ?
      WHERE id = ?
    `,
    [status, id]
  );

  if (result.affectedRows === 0) {
    const error = new Error("Route not found.");
    error.code = "ROUTE_NOT_FOUND";
    throw error;
  }

  return getRouteById({ id });
};

const deleteRoute = async ({ id }) => {
  await ensureRoutesTable();

  const [result] = await pool.query(`DELETE FROM routes WHERE id = ?`, [id]);

  if (result.affectedRows === 0) {
    const error = new Error("Route not found.");
    error.code = "ROUTE_NOT_FOUND";
    throw error;
  }
};

module.exports = {
  createRoute,
  deleteRoute,
  getRouteById,
  listRoutes,
  updateRoute,
  updateRouteStatus,
};
