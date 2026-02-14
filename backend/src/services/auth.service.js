const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db.js");
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} = require("../utils/token.js");

const SALT_ROUNDS = 10;
const ROLES_REQUIRING_NUMBER_PLATE = new Set(["Driver", "Bus Assistant"]);
const SCHEMA_PATH = path.join(__dirname, "../migration/schema.sql");
const rawSchemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

let ensureUsersTablePromise;

const escapeIdentifier = (identifier) =>
  `\`${String(identifier).replace(/`/g, "``")}\``;

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

const usersTableSql =
  extractCreateTableSql("users") ||
  `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(255) NOT NULL,
      lastName VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phoneNumber VARCHAR(20) NOT NULL UNIQUE,
      numberPlate VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager') NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

const numberPlatesTableSql =
  extractCreateTableSql("number_plates") ||
  `
    CREATE TABLE IF NOT EXISTS number_plates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plate_number VARCHAR(20) NOT NULL,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_plate_number UNIQUE (plate_number)
    )
  `;

const ensureEmailColumn = async () => {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'email'
      LIMIT 1
    `
  );

  if (rows.length === 0) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER lastName"
    );
  }
};

const ensureNumberPlateColumn = async () => {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'numberPlate'
      LIMIT 1
    `
  );

  if (rows.length === 0) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN numberPlate VARCHAR(20) NULL AFTER phoneNumber"
    );

    return;
  }

  if (rows[0].IS_NULLABLE !== "YES") {
    await pool.query(
      "ALTER TABLE users MODIFY COLUMN numberPlate VARCHAR(20) NULL"
    );
  }
};

const dropUniqueIndexOnNumberPlate = async () => {
  const [indexes] = await pool.query(
    `
      SHOW INDEX FROM users
      WHERE Column_name = 'numberPlate'
        AND Non_unique = 0
        AND Key_name <> 'PRIMARY'
    `
  );

  for (const index of indexes) {
    await pool.query(
      `ALTER TABLE users DROP INDEX ${escapeIdentifier(index.Key_name)}`
    );
  }
};

const ensureUsersTable = () => {
  if (!ensureUsersTablePromise) {
    ensureUsersTablePromise = (async () => {
      await pool.query(usersTableSql);
      await pool.query(numberPlatesTableSql);
      await ensureEmailColumn();
      await ensureNumberPlateColumn();
      await dropUniqueIndexOnNumberPlate();
    })();
  }

  return ensureUsersTablePromise;
};

const normalizeRegisterPayload = (payload) => ({
  email: String(payload.email || "")
    .trim()
    .toLowerCase(),
  firstName: String(payload.firstName || "").trim(),
  lastName: String(payload.lastName || "").trim(),
  phoneNumber: String(payload.phoneNumber || "").trim(),
  numberPlate: String(payload.numberPlate || "").trim().toUpperCase(),
  role: String(payload.role || "").trim(),
  password: String(payload.password || ""),
});

const registerUser = async (payload) => {
  await ensureUsersTable();

  const normalized = normalizeRegisterPayload(payload);
  const [existingUsers] = await pool.query(
    "SELECT id FROM users WHERE email = ? OR phoneNumber = ? LIMIT 1",
    [normalized.email, normalized.phoneNumber]
  );

  if (existingUsers.length > 0) {
    const duplicateError = new Error("User already exists.");
    duplicateError.code = "DUPLICATE_USER";
    throw duplicateError;
  }

  const needsNumberPlate = ROLES_REQUIRING_NUMBER_PLATE.has(normalized.role);

  if (needsNumberPlate && !normalized.numberPlate) {
    const numberPlateRequiredError = new Error("Number plate is required.");
    numberPlateRequiredError.code = "NUMBER_PLATE_REQUIRED";
    throw numberPlateRequiredError;
  }

  if (needsNumberPlate) {
    const [registeredPlates] = await pool.query(
      `
        SELECT plate_number
        FROM number_plates
        WHERE plate_number = ?
          AND status = 'active'
        LIMIT 1
      `,
      [normalized.numberPlate]
    );

    if (registeredPlates.length === 0) {
      const notFoundError = new Error("Selected number plate is not available.");
      notFoundError.code = "NUMBER_PLATE_NOT_FOUND";
      throw notFoundError;
    }
  }

  const passwordHash = await bcrypt.hash(normalized.password, SALT_ROUNDS);

  await pool.query(
    `
      INSERT INTO users (
        email,
        firstName,
        lastName,
        phoneNumber,
        numberPlate,
        role,
        password
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalized.email,
      normalized.firstName,
      normalized.lastName,
      normalized.phoneNumber,
      needsNumberPlate ? normalized.numberPlate : null,
      normalized.role,
      passwordHash,
    ]
  );

  return {
    email: normalized.email,
    role: normalized.role,
  };
};

const listNumberPlates = async () => {
  await ensureUsersTable();

  const [rows] = await pool.query(
    `
      SELECT plate_number
      FROM number_plates
      WHERE status = 'active'
      ORDER BY plate_number ASC
    `
  );

  return rows.map((row) => row.plate_number);
};

const loginUser = async ({ email, password }) => {
  await ensureUsersTable();

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  const [users] = await pool.query(
    `
      SELECT id, email, role, password
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  const isValidPassword = await bcrypt.compare(
    normalizedPassword,
    user.password
  );

  if (!isValidPassword) {
    return null;
  }

  const tokenPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
  };

  return {
    email: user.email,
    role: user.role,
    accessToken: createAccessToken(tokenPayload),
    refreshToken: createRefreshToken(tokenPayload),
  };
};

const refreshSession = async (refreshToken) => {
  await ensureUsersTable();

  const payload = verifyRefreshToken(refreshToken);
  const emailFromToken =
    payload && payload.email ? String(payload.email).trim().toLowerCase() : "";

  if (!emailFromToken) {
    return null;
  }

  const [users] = await pool.query(
    `
      SELECT id, email, role
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [emailFromToken]
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  const newPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
  };

  return {
    email: user.email,
    role: user.role,
    accessToken: createAccessToken(newPayload),
    refreshToken: createRefreshToken(newPayload),
  };
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  listNumberPlates,
};
