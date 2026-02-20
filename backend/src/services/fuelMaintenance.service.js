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

const CONFIRMED_BY_OPTIONS = Object.freeze(["Erick", "Douglas", "James"]);

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

const ensureFuelMaintenanceTables = () => {
  if (!ensureFuelMaintenanceTablesPromise) {
    ensureFuelMaintenanceTablesPromise = (async () => {
      await ensureUsersTable();
      await pool.query(fuelMaintenanceTableSql);
    })();
  }

  return ensureFuelMaintenanceTablesPromise;
};

const mapFuelMaintenanceRow = (row) => ({
  id: row.id,
  requestDate: row.requestDate,
  numberPlate: row.numberPlate,
  currentMileage: row.currentMileage,
  requestType: row.requestType,
  requestedBy: row.requestedBy,
  category: row.category,
  description: row.description,
  amount: row.amount,
  confirmedBy: row.confirmedBy,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const createFuelMaintenanceRequest = async ({ payload, createdByUserId }) => {
  await ensureFuelMaintenanceTables();

  const normalized = {
    requestDate: String(payload.requestDate || "").trim(),
    numberPlate: String(payload.numberPlate || "").trim().toUpperCase(),
    currentMileage: Number(payload.currentMileage),
    requestType: String(payload.requestType || "").trim(),
    requestedBy: String(payload.requestedBy || "").trim(),
    category: String(payload.category || "").trim(),
    description: String(payload.description || "").trim(),
    amount:
      typeof payload.amount === "undefined" ||
      payload.amount === null ||
      String(payload.amount).trim() === ""
        ? null
        : Number(payload.amount),
    confirmedBy: String(payload.confirmedBy || "").trim(),
  };

  if (!REQUEST_TYPES.includes(normalized.requestType)) {
    const invalidTypeError = new Error("Invalid request type.");
    invalidTypeError.code = "INVALID_REQUEST_TYPE";
    throw invalidTypeError;
  }

  if (!REQUEST_CATEGORIES.includes(normalized.category)) {
    const invalidCategoryError = new Error("Invalid request category.");
    invalidCategoryError.code = "INVALID_REQUEST_CATEGORY";
    throw invalidCategoryError;
  }

  if (!CONFIRMED_BY_OPTIONS.includes(normalized.confirmedBy)) {
    const invalidConfirmedByError = new Error("Invalid confirmedBy value.");
    invalidConfirmedByError.code = "INVALID_CONFIRMED_BY";
    throw invalidConfirmedByError;
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

  const [creatorRows] = await pool.query(
    `
      SELECT id, role, numberPlate
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

  const creator = creatorRows[0];
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

    if (normalized.numberPlate !== creatorNumberPlate) {
      const mismatchError = new Error(
        "Drivers can only submit requests for their assigned number plate."
      );
      mismatchError.code = "DRIVER_NUMBER_PLATE_MISMATCH";
      throw mismatchError;
    }
  }

  const [numberPlateRows] = await pool.query(
    `
      SELECT plate_number
      FROM number_plates
      WHERE plate_number = ?
        AND status = 'active'
      LIMIT 1
    `,
    [normalized.numberPlate]
  );

  if (numberPlateRows.length === 0) {
    const missingNumberPlateError = new Error("Selected number plate is not available.");
    missingNumberPlateError.code = "NUMBER_PLATE_NOT_FOUND";
    throw missingNumberPlateError;
  }

  const [insertResult] = await pool.query(
    `
      INSERT INTO fuel_maintenance_requests (
        requestDate,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalized.requestDate,
      normalized.numberPlate,
      normalized.currentMileage,
      normalized.requestType,
      normalized.requestedBy,
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
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
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
        numberPlate,
        currentMileage,
        requestType,
        requestedBy,
        category,
        description,
        amount,
        confirmedBy,
        createdByUserId,
        createdAt,
        updatedAt
      FROM fuel_maintenance_requests
      WHERE createdByUserId = ?
      ORDER BY requestDate DESC, id DESC
      LIMIT 200
    `,
    [createdByUserId]
  );

  return rows.map(mapFuelMaintenanceRow);
};

module.exports = {
  REQUEST_TYPES,
  REQUEST_CATEGORIES,
  CONFIRMED_BY_OPTIONS,
  ensureFuelMaintenanceTables,
  createFuelMaintenanceRequest,
  listFuelMaintenanceRequestsByUser,
};
