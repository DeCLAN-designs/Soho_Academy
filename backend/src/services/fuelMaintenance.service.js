const fs = require("fs");
const path = require("path");
const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");

const REQUEST_TYPES = Object.freeze([
  "Fuel",
  "Service",
  "Repair and Maintenance",
  "Compliance",
]);

const REQUEST_CATEGORIES = Object.freeze([
  "Fuels & Oils",
  "Body Works and Body Parts",
  "Mechanical",
  "Wiring",
  "Puncture & Tires",
  "Insurance",
  "RSL",
  "Inspection / Speed Governors",
]);

const REQUEST_STATUSES = Object.freeze([
  "Pending",
  "Approved",
  "Rejected",
  "Completed",
]);

const SCHEMA_PATH = path.join(__dirname, "../migration/schema.sql");
const rawSchemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

let ensureFuelMaintenanceTablesPromise;

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

const fuelMaintenanceTableSql =
  extractCreateTableSql("fuel_maintenance_requests") ||
  `
    CREATE TABLE IF NOT EXISTS fuel_maintenance_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requestDate DATE NOT NULL,
      requestTime TIME NOT NULL,
      numberPlate VARCHAR(20) NOT NULL,
      currentMileage INT NOT NULL,
      requestType ENUM('Fuel', 'Service', 'Repair and Maintenance', 'Compliance') NOT NULL,
      requestedBy VARCHAR(255) NOT NULL,
      category ENUM(
        'Fuels & Oils',
        'Body Works and Body Parts',
        'Mechanical',
        'Wiring',
        'Puncture & Tires',
        'Insurance',
        'RSL',
        'Inspection / Speed Governors'
      ) NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(12, 2) NULL,
      confirmedBy VARCHAR(255) NOT NULL,
      status ENUM('Pending', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending',
      createdByUserId INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_fuel_maintenance_plate
        FOREIGN KEY (numberPlate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      CONSTRAINT fk_fuel_maintenance_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    )
  `;

const ensureRequestTimeColumn = async () => {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fuel_maintenance_requests'
        AND COLUMN_NAME = 'requestTime'
      LIMIT 1
    `
  );

  if (rows.length === 0) {
    await pool.query(
      "ALTER TABLE fuel_maintenance_requests ADD COLUMN requestTime TIME NULL AFTER requestDate"
    );
    await pool.query(
      "UPDATE fuel_maintenance_requests SET requestTime = '00:00:00' WHERE requestTime IS NULL"
    );
    await pool.query(
      "ALTER TABLE fuel_maintenance_requests MODIFY COLUMN requestTime TIME NOT NULL AFTER requestDate"
    );

    return;
  }

  if (rows[0].IS_NULLABLE === "YES") {
    await pool.query(
      "UPDATE fuel_maintenance_requests SET requestTime = '00:00:00' WHERE requestTime IS NULL"
    );
    await pool.query(
      "ALTER TABLE fuel_maintenance_requests MODIFY COLUMN requestTime TIME NOT NULL AFTER requestDate"
    );
  }
};

const ensureStatusColumn = async () => {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fuel_maintenance_requests'
        AND COLUMN_NAME = 'status'
      LIMIT 1
    `
  );

  if (rows.length === 0) {
    await pool.query(
      "ALTER TABLE fuel_maintenance_requests ADD COLUMN status ENUM('Pending', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending' AFTER confirmedBy"
    );
  }
};

const ensureFuelMaintenanceTables = () => {
  if (!ensureFuelMaintenanceTablesPromise) {
    ensureFuelMaintenanceTablesPromise = (async () => {
      await ensureUsersTable();
      await pool.query(fuelMaintenanceTableSql);
      await ensureRequestTimeColumn();
      await ensureStatusColumn();
    })();
  }

  return ensureFuelMaintenanceTablesPromise;
};

const mapFuelMaintenanceRow = (row) => ({
  id: row.id,
  requestDate: row.requestDate,
  requestTime: row.requestTime,
  numberPlate: row.numberPlate,
  currentMileage: row.currentMileage,
  requestType: row.requestType,
  requestedBy: row.requestedBy,
  category: row.category,
  description: row.description,
  amount: row.amount,
  confirmedBy: row.confirmedBy,
  status: row.status,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const isManagerRole = (role) =>
  ["Transport Manager", "School Admin"].includes(String(role || ""));

const assertValidRequestPayload = (normalized) => {
  if (!REQUEST_TYPES.includes(normalized.requestType)) {
    const invalidTypeError = new Error("Invalid request type.");
    invalidTypeError.code = "INVALID_REQUEST_TYPE";
    throw invalidTypeError;
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(normalized.requestTime)) {
    const invalidRequestTimeError = new Error("Invalid request time.");
    invalidRequestTimeError.code = "INVALID_REQUEST_TIME";
    throw invalidRequestTimeError;
  }

  if (!REQUEST_CATEGORIES.includes(normalized.category)) {
    const invalidCategoryError = new Error("Invalid request category.");
    invalidCategoryError.code = "INVALID_REQUEST_CATEGORY";
    throw invalidCategoryError;
  }

  if (normalized.requestType === "Fuel") {
    if (normalized.amount === null) {
      const amountRequiredError = new Error(
        "amount is required when requestType is Fuel."
      );
      amountRequiredError.code = "AMOUNT_REQUIRED_FOR_FUEL";
      throw amountRequiredError;
    }

    if (!Number.isFinite(normalized.amount) || normalized.amount <= 0) {
      const invalidFuelAmountError = new Error("amount must be greater than zero.");
      invalidFuelAmountError.code = "INVALID_AMOUNT_FOR_FUEL";
      throw invalidFuelAmountError;
    }
  } else {
    normalized.amount = null;
  }
};

const getRequestCreator = async ({ createdByUserId }) => {
  const [creatorRows] = await pool.query(
    `
      SELECT id, firstName, lastName, role, numberPlate
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [createdByUserId]
  );

  if (creatorRows.length === 0) {
    const missingCreatorError = new Error("Request creator was not found.");
    missingCreatorError.code = "REQUEST_CREATOR_NOT_FOUND";
    throw missingCreatorError;
  }

  return creatorRows[0];
};

const assertNumberPlateIsAvailable = async ({ numberPlate }) => {
  const [numberPlateRows] = await pool.query(
    `
      SELECT plate_number
      FROM number_plates
      WHERE plate_number = ?
        AND status = 'active'
      LIMIT 1
    `,
    [numberPlate]
  );

  if (numberPlateRows.length === 0) {
    const missingNumberPlateError = new Error("Selected number plate is not available.");
    missingNumberPlateError.code = "NUMBER_PLATE_NOT_FOUND";
    throw missingNumberPlateError;
  }
};

const assertDriverCanUseNumberPlate = ({ creator, numberPlate }) => {
  const creatorNumberPlate = String(creator.numberPlate || "")
    .trim()
    .toUpperCase();

  if (creator.role === "Driver") {
    if (!creatorNumberPlate) {
      const plateNotAssignedError = new Error(
        "No number plate is assigned to this driver."
      );
      plateNotAssignedError.code = "DRIVER_NUMBER_PLATE_NOT_ASSIGNED";
      throw plateNotAssignedError;
    }

    if (numberPlate !== creatorNumberPlate) {
      const mismatchError = new Error(
        "Drivers can only submit requests for their assigned number plate."
      );
      mismatchError.code = "DRIVER_NUMBER_PLATE_MISMATCH";
      throw mismatchError;
    }
  }
};

const buildRequestedBy = (creator) =>
  [creator.firstName, creator.lastName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

const normalizeRequestPayload = (payload) => ({
  requestDate: String(payload.requestDate || "").trim(),
  requestTime: String(payload.requestTime || "").trim(),
  numberPlate: String(payload.numberPlate || "").trim().toUpperCase(),
  currentMileage: Number(payload.currentMileage),
  requestType: String(payload.requestType || "").trim(),
  category: String(payload.category || "").trim(),
  description: String(payload.description || "").trim(),
  amount:
    typeof payload.amount === "undefined" ||
    payload.amount === null ||
    String(payload.amount).trim() === ""
      ? null
      : Number(payload.amount),
  confirmedBy: String(payload.confirmedBy || "").trim(),
});

const selectRequestById = async ({ requestId }) => {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        requestDate,
        requestTime,
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        status,
        createdByUserId,
        createdAt,
        updatedAt
      FROM fuel_maintenance_requests
      WHERE id = ?
      LIMIT 1
    `,
    [requestId]
  );

  if (rows.length === 0) {
    const notFoundError = new Error("Fuel and maintenance request was not found.");
    notFoundError.code = "REQUEST_NOT_FOUND";
    throw notFoundError;
  }

  return rows[0];
};

const assertCanAccessRequest = ({ request, userId, role }) => {
  if (isManagerRole(role) || Number(request.createdByUserId) === Number(userId)) {
    return;
  }

  const forbiddenError = new Error("You do not have permission for this request.");
  forbiddenError.code = "REQUEST_FORBIDDEN";
  throw forbiddenError;
};

const createFuelMaintenanceRequest = async ({ payload, createdByUserId }) => {
  await ensureFuelMaintenanceTables();

  const normalized = normalizeRequestPayload(payload);
  assertValidRequestPayload(normalized);

  const creator = await getRequestCreator({ createdByUserId });
  const requestedBy = buildRequestedBy(creator);

  assertDriverCanUseNumberPlate({
    creator,
    numberPlate: normalized.numberPlate,
  });
  await assertNumberPlateIsAvailable({ numberPlate: normalized.numberPlate });

  const [insertResult] = await pool.query(
    `
      INSERT INTO fuel_maintenance_requests (
        requestDate,
        requestTime,
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        createdByUserId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalized.requestDate,
      normalized.requestTime,
      normalized.numberPlate,
      normalized.currentMileage,
      normalized.requestType,
      requestedBy,
      normalized.category,
      normalized.description,
      normalized.amount,
      normalized.confirmedBy,
      createdByUserId,
    ]
  );

  const [rows] = await pool.query(
    `
      SELECT
        id,
        requestDate,
        requestTime,
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        status,
        createdByUserId,
        createdAt,
        updatedAt
      FROM fuel_maintenance_requests
      WHERE id = ?
      LIMIT 1
    `,
    [insertResult.insertId]
  );

  return mapFuelMaintenanceRow(rows[0]);
};

const listFuelMaintenanceRequestsByUser = async ({ createdByUserId }) => {
  await ensureFuelMaintenanceTables();

  const [rows] = await pool.query(
    `
      SELECT
        id,
        requestDate,
        requestTime,
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        status,
        createdByUserId,
        createdAt,
        updatedAt
      FROM fuel_maintenance_requests
      WHERE createdByUserId = ?
      ORDER BY requestDate DESC, requestTime DESC, id DESC
      LIMIT 200
    `,
    [createdByUserId]
  );

  return rows.map(mapFuelMaintenanceRow);
};

const listFuelMaintenanceRequests = async ({ userId, role }) => {
  await ensureFuelMaintenanceTables();

  if (!isManagerRole(role)) {
    return listFuelMaintenanceRequestsByUser({ createdByUserId: userId });
  }

  const [rows] = await pool.query(
    `
      SELECT
        id,
        requestDate,
        requestTime,
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        status,
        createdByUserId,
        createdAt,
        updatedAt
      FROM fuel_maintenance_requests
      ORDER BY requestDate DESC, requestTime DESC, id DESC
      LIMIT 500
    `
  );

  return rows.map(mapFuelMaintenanceRow);
};

const listFuelMaintenanceRequestsByStatus = async ({ status }) => {
  await ensureFuelMaintenanceTables();

  const normalizedStatus = String(status || "").trim();

  if (!REQUEST_STATUSES.includes(normalizedStatus)) {
    const invalidStatusError = new Error("Invalid request status.");
    invalidStatusError.code = "INVALID_REQUEST_STATUS";
    throw invalidStatusError;
  }

  const [rows] = await pool.query(
    `
      SELECT
        id,
        requestDate,
        requestTime,
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        status,
        createdByUserId,
        createdAt,
        updatedAt
      FROM fuel_maintenance_requests
      WHERE status = ?
      ORDER BY requestDate DESC, requestTime DESC, id DESC
      LIMIT 500
    `,
    [normalizedStatus]
  );

  return rows.map(mapFuelMaintenanceRow);
};

const getFuelMaintenanceRequestById = async ({ requestId, userId, role }) => {
  await ensureFuelMaintenanceTables();

  const request = await selectRequestById({ requestId });
  assertCanAccessRequest({ request, userId, role });

  return mapFuelMaintenanceRow(request);
};

const updateFuelMaintenanceRequest = async ({
  requestId,
  payload,
  userId,
  role,
}) => {
  await ensureFuelMaintenanceTables();

  const existingRequest = await selectRequestById({ requestId });
  assertCanAccessRequest({ request: existingRequest, userId, role });

  if (!isManagerRole(role) && existingRequest.status !== "Pending") {
    const lockedError = new Error("Only pending requests can be edited.");
    lockedError.code = "REQUEST_LOCKED";
    throw lockedError;
  }

  const normalized = normalizeRequestPayload(payload);
  assertValidRequestPayload(normalized);

  const creator = await getRequestCreator({
    createdByUserId: Number(existingRequest.createdByUserId),
  });
  assertDriverCanUseNumberPlate({
    creator,
    numberPlate: normalized.numberPlate,
  });
  await assertNumberPlateIsAvailable({ numberPlate: normalized.numberPlate });

  await pool.query(
    `
      UPDATE fuel_maintenance_requests
      SET
        requestDate = ?,
        requestTime = ?,
        numberPlate = ?,
        currentMileage = ?,
        requestType = ?,
        category = ?,
        description = ?,
        amount = ?,
        confirmedBy = ?
      WHERE id = ?
      LIMIT 1
    `,
    [
      normalized.requestDate,
      normalized.requestTime,
      normalized.numberPlate,
      normalized.currentMileage,
      normalized.requestType,
      normalized.category,
      normalized.description,
      normalized.amount,
      normalized.confirmedBy,
      requestId,
    ]
  );

  const updatedRequest = await selectRequestById({ requestId });
  return mapFuelMaintenanceRow(updatedRequest);
};

const updateFuelMaintenanceRequestStatus = async ({
  requestId,
  status,
  userId,
  role,
}) => {
  await ensureFuelMaintenanceTables();

  if (!isManagerRole(role)) {
    const forbiddenError = new Error("Only managers can update request status.");
    forbiddenError.code = "REQUEST_FORBIDDEN";
    throw forbiddenError;
  }

  const normalizedStatus = String(status || "").trim();

  if (!REQUEST_STATUSES.includes(normalizedStatus)) {
    const invalidStatusError = new Error("Invalid request status.");
    invalidStatusError.code = "INVALID_REQUEST_STATUS";
    throw invalidStatusError;
  }

  const existingRequest = await selectRequestById({ requestId });
  assertCanAccessRequest({ request: existingRequest, userId, role });

  await pool.query(
    `
      UPDATE fuel_maintenance_requests
      SET status = ?
      WHERE id = ?
      LIMIT 1
    `,
    [normalizedStatus, requestId]
  );

  const updatedRequest = await selectRequestById({ requestId });
  return mapFuelMaintenanceRow(updatedRequest);
};

const deleteFuelMaintenanceRequest = async ({ requestId, userId, role }) => {
  await ensureFuelMaintenanceTables();

  const existingRequest = await selectRequestById({ requestId });
  assertCanAccessRequest({ request: existingRequest, userId, role });

  if (!isManagerRole(role) && existingRequest.status !== "Pending") {
    const lockedError = new Error("Only pending requests can be deleted.");
    lockedError.code = "REQUEST_LOCKED";
    throw lockedError;
  }

  await pool.query(
    `
      DELETE FROM fuel_maintenance_requests
      WHERE id = ?
      LIMIT 1
    `,
    [requestId]
  );

  return mapFuelMaintenanceRow(existingRequest);
};

module.exports = {
  REQUEST_TYPES,
  REQUEST_CATEGORIES,
  REQUEST_STATUSES,
  ensureFuelMaintenanceTables,
  createFuelMaintenanceRequest,
  deleteFuelMaintenanceRequest,
  getFuelMaintenanceRequestById,
  listFuelMaintenanceRequests,
  listFuelMaintenanceRequestsByStatus,
  listFuelMaintenanceRequestsByUser,
  updateFuelMaintenanceRequest,
  updateFuelMaintenanceRequestStatus,
};
