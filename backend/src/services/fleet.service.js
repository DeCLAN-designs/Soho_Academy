const pool = require("../config/db.js");

const NUMBER_PLATE_STATUSES = new Set(["active", "inactive"]);
const USER_ROLES = new Set([
  "Parent",
  "Driver",
  "Bus Assistant",
  "Transport Manager",
  "School Admin",
]);

let ensureFleetTablesPromise;

const ensureFleetTables = () => {
  if (!ensureFleetTablesPromise) {
    ensureFleetTablesPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS number_plates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plate_number VARCHAR(20) NOT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT uq_plate_number UNIQUE (plate_number)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS vehicle_details (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plate_number VARCHAR(20) NOT NULL,
          model VARCHAR(255) NULL,
          type ENUM('School Bus', 'Mini Van', 'Coaster') NULL,
          year INT NULL,
          capacity INT NULL,
          color VARCHAR(100) NULL,
          fuelType ENUM('Diesel', 'Petrol', 'Electric') NULL,
          status ENUM('Active', 'Maintenance', 'Inactive') NULL,
          assignedDriver VARCHAR(255) NULL,
          assignedAssistant VARCHAR(255) NULL,
          assignedRoute VARCHAR(255) NULL,
          lastService VARCHAR(50) NULL,
          mileage INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT uq_vehicle_details_plate UNIQUE (plate_number),
          CONSTRAINT fk_vehicle_details_plate
            FOREIGN KEY (plate_number) REFERENCES number_plates(plate_number)
            ON UPDATE CASCADE
            ON DELETE CASCADE
        )
      `);

      const [vehicleDetailsColumns] = await pool.query(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'vehicle_details'
          AND COLUMN_NAME IN ('status', 'assignedDriver', 'assignedAssistant', 'assignedRoute')
      `);
      const existingColumns = new Set(
        vehicleDetailsColumns.map((column) => column.COLUMN_NAME)
      );

      if (!existingColumns.has("status")) {
        await pool.query(`
          ALTER TABLE vehicle_details
          ADD COLUMN status ENUM('Active', 'Maintenance', 'Inactive') NULL AFTER fuelType
        `);
      }

      if (!existingColumns.has("assignedDriver")) {
        await pool.query(`
          ALTER TABLE vehicle_details
          ADD COLUMN assignedDriver VARCHAR(255) NULL AFTER status
        `);
      }

      if (!existingColumns.has("assignedAssistant")) {
        await pool.query(`
          ALTER TABLE vehicle_details
          ADD COLUMN assignedAssistant VARCHAR(255) NULL AFTER assignedDriver
        `);
      }

      if (!existingColumns.has("assignedRoute")) {
        await pool.query(`
          ALTER TABLE vehicle_details
          ADD COLUMN assignedRoute VARCHAR(255) NULL AFTER assignedAssistant
        `);
      }
    })();
  }

  return ensureFleetTablesPromise;
};

const mapNumberPlateRow = (row) => ({
  id: row.id,
  plate_number: row.plate_number,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const normalizePlateNumber = (plateNumber) =>
  String(plateNumber || "").trim().toUpperCase();

const listNumberPlates = async ({ activeOnly = false } = {}) => {
  await ensureFleetTables();

  const [rows] = await pool.query(
    `
      SELECT id, plate_number, status, created_at, updated_at
      FROM number_plates
      ${activeOnly ? "WHERE status = 'active'" : ""}
      ORDER BY plate_number ASC
    `
  );

  return rows.map(mapNumberPlateRow);
};

const createNumberPlate = async ({ plateNumber }) => {
  await ensureFleetTables();

  const normalizedPlateNumber = normalizePlateNumber(plateNumber);

  if (!normalizedPlateNumber) {
    const error = new Error("Plate number is required.");
    error.code = "PLATE_NUMBER_REQUIRED";
    throw error;
  }

  try {
    const [result] = await pool.query(
      `
        INSERT INTO number_plates (plate_number, status)
        VALUES (?, 'active')
      `,
      [normalizedPlateNumber]
    );

    const [rows] = await pool.query(
      `
        SELECT id, plate_number, status, created_at, updated_at
        FROM number_plates
        WHERE id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    return mapNumberPlateRow(rows[0]);
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      const duplicateError = new Error("Plate number already exists.");
      duplicateError.code = "PLATE_NUMBER_EXISTS";
      throw duplicateError;
    }

    throw error;
  }
};

const updateNumberPlateStatus = async ({ id, status }) => {
  await ensureFleetTables();

  if (!NUMBER_PLATE_STATUSES.has(status)) {
    const error = new Error("Invalid number plate status.");
    error.code = "INVALID_PLATE_STATUS";
    throw error;
  }

  const [result] = await pool.query(
    `
      UPDATE number_plates
      SET status = ?
      WHERE id = ?
    `,
    [status, id]
  );

  if (result.affectedRows === 0) {
    const error = new Error("Number plate not found.");
    error.code = "NUMBER_PLATE_NOT_FOUND";
    throw error;
  }

  const [rows] = await pool.query(
    `
      SELECT id, plate_number, status, created_at, updated_at
      FROM number_plates
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return mapNumberPlateRow(rows[0]);
};

const deleteNumberPlate = async ({ id }) => {
  await ensureFleetTables();

  const [result] = await pool.query("DELETE FROM number_plates WHERE id = ?", [
    id,
  ]);

  if (result.affectedRows === 0) {
    const error = new Error("Number plate not found.");
    error.code = "NUMBER_PLATE_NOT_FOUND";
    throw error;
  }
};

const listUsersByRole = async ({ role }) => {
  await ensureFleetTables();

  const normalizedRole = String(role || "").trim();

  if (!USER_ROLES.has(normalizedRole)) {
    const error = new Error("Invalid user role.");
    error.code = "INVALID_USER_ROLE";
    throw error;
  }

  const [rows] = await pool.query(
    `
      SELECT
        id,
        firstName,
        lastName,
        email,
        phoneNumber,
        numberPlate,
        role
      FROM users
      WHERE role = ?
      ORDER BY firstName ASC, lastName ASC
    `,
    [normalizedRole]
  );

  return rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    numberPlate: row.numberPlate || null,
    role: row.role,
  }));
};

const listVehicleDetails = async () => {
  await ensureFleetTables();

  const [rows] = await pool.query(
    `
      SELECT
        plate_number AS plateNumber,
        model,
        type,
        year,
        capacity,
        color,
        fuelType,
        status,
        assignedDriver,
        assignedAssistant,
        assignedRoute,
        lastService,
        mileage
      FROM vehicle_details
      ORDER BY plate_number ASC
    `
  );

  return rows;
};

const getVehicleDetails = async ({ plateNumber }) => {
  await ensureFleetTables();

  const normalizedPlateNumber = normalizePlateNumber(plateNumber);
  const [rows] = await pool.query(
    `
      SELECT
        plate_number AS plateNumber,
        model,
        type,
        year,
        capacity,
        color,
        fuelType,
        status,
        assignedDriver,
        assignedAssistant,
        assignedRoute,
        lastService,
        mileage
      FROM vehicle_details
      WHERE plate_number = ?
      LIMIT 1
    `,
    [normalizedPlateNumber]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
};

const updateVehicleDetails = async ({ plateNumber, payload }) => {
  await ensureFleetTables();

  const normalizedPlateNumber = normalizePlateNumber(plateNumber);

  const [plates] = await pool.query(
    `
      SELECT plate_number
      FROM number_plates
      WHERE plate_number = ?
      LIMIT 1
    `,
    [normalizedPlateNumber]
  );

  if (plates.length === 0) {
    const error = new Error("Number plate not found.");
    error.code = "NUMBER_PLATE_NOT_FOUND";
    throw error;
  }

  const normalizedPayload = {
    model: payload.model ?? null,
    type: payload.type ?? null,
    year: payload.year ?? null,
    capacity: payload.capacity ?? null,
    color: payload.color ?? null,
    fuelType: payload.fuelType ?? null,
    status: payload.status ?? null,
    assignedDriver: payload.assignedDriver ?? null,
    assignedAssistant: payload.assignedAssistant ?? null,
    assignedRoute: payload.assignedRoute ?? null,
    lastService: payload.lastService ?? null,
    mileage: payload.mileage ?? null,
  };

  await pool.query(
    `
      INSERT INTO vehicle_details (
        plate_number,
        model,
        type,
        year,
        capacity,
        color,
        fuelType,
        status,
        assignedDriver,
        assignedAssistant,
        assignedRoute,
        lastService,
        mileage
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        model = VALUES(model),
        type = VALUES(type),
        year = VALUES(year),
        capacity = VALUES(capacity),
        color = VALUES(color),
        fuelType = VALUES(fuelType),
        status = VALUES(status),
        assignedDriver = VALUES(assignedDriver),
        assignedAssistant = VALUES(assignedAssistant),
        assignedRoute = VALUES(assignedRoute),
        lastService = VALUES(lastService),
        mileage = VALUES(mileage)
    `,
    [
      normalizedPlateNumber,
      normalizedPayload.model,
      normalizedPayload.type,
      normalizedPayload.year,
      normalizedPayload.capacity,
      normalizedPayload.color,
      normalizedPayload.fuelType,
      normalizedPayload.status,
      normalizedPayload.assignedDriver,
      normalizedPayload.assignedAssistant,
      normalizedPayload.assignedRoute,
      normalizedPayload.lastService,
      normalizedPayload.mileage,
    ]
  );

  return getVehicleDetails({ plateNumber: normalizedPlateNumber });
};

module.exports = {
  createNumberPlate,
  deleteNumberPlate,
  getVehicleDetails,
  listNumberPlates,
  listUsersByRole,
  listVehicleDetails,
  updateNumberPlateStatus,
  updateVehicleDetails,
};
