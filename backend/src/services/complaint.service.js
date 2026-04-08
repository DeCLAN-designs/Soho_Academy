const fs = require("fs");
const path = require("path");
const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");
const { deleteFilesFromR2, uploadFilesToR2 } = require("./r2.service.js");

const TIMING_OPTIONS = Object.freeze(["Morning", "Evening"]);
const TRIP_NUMBERS = Object.freeze([1, 2, 3, 4, 5]);
const COMPLAINT_TYPES = Object.freeze([
  "Learner",
  "Driver",
  "Bus",
  "Community",
  "Bus Assistant",
  "Other",
]);

const SCHEMA_PATH = path.join(__dirname, "../migration/schema.sql");
const rawSchemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

let ensureComplaintTablesPromise;

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

const uploadsTableSql =
  extractCreateTableSql("uploads") ||
  `
    CREATE TABLE IF NOT EXISTS uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_key VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_uploads_file_key UNIQUE (file_key),
      CONSTRAINT fk_uploads_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    )
  `;

const complaintReportsTableSql =
  extractCreateTableSql("complaint_reports") ||
  `
    CREATE TABLE IF NOT EXISTS complaint_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requestedBy VARCHAR(255) NOT NULL,
      contactPhoneNumber VARCHAR(20) NOT NULL,
      numberPlate VARCHAR(20) NOT NULL,
      timing ENUM('Morning', 'Evening') NOT NULL,
      tripNumber TINYINT NOT NULL,
      complaintType ENUM('Learner', 'Driver', 'Bus', 'Community', 'Bus Assistant', 'Other') NOT NULL,
      learnerName VARCHAR(255) NULL,
      details TEXT NOT NULL,
      createdByUserId INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chk_complaint_trip_number CHECK (tripNumber BETWEEN 1 AND 5),
      CONSTRAINT fk_complaint_report_plate
        FOREIGN KEY (numberPlate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      CONSTRAINT fk_complaint_report_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    )
  `;

const complaintReportUploadsTableSql =
  extractCreateTableSql("complaint_report_uploads") ||
  `
    CREATE TABLE IF NOT EXISTS complaint_report_uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      complaint_report_id INT NOT NULL,
      upload_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_complaint_report_upload UNIQUE (complaint_report_id, upload_id),
      CONSTRAINT fk_complaint_report_upload_report
        FOREIGN KEY (complaint_report_id) REFERENCES complaint_reports(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_complaint_report_upload_upload
        FOREIGN KEY (upload_id) REFERENCES uploads(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    )
  `;

const ensureComplaintTables = () => {
  if (!ensureComplaintTablesPromise) {
    ensureComplaintTablesPromise = (async () => {
      await ensureUsersTable();
      await pool.query(uploadsTableSql);
      await pool.query(complaintReportsTableSql);
      await pool.query(complaintReportUploadsTableSql);
    })();
  }

  return ensureComplaintTablesPromise;
};

const normalizeComplaintPayload = (payload) => ({
  numberPlate: String(payload.numberPlate || "").trim().toUpperCase(),
  timing: String(payload.timing || "").trim(),
  tripNumber: Number(payload.tripNumber),
  complaintType: String(payload.complaintType || "").trim(),
  learnerName: String(payload.learnerName || "").trim(),
  details: String(payload.details || "").trim(),
});

const mapUploadRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  fileName: row.file_name,
  fileKey: row.file_key,
  fileUrl: row.file_url,
  createdAt: row.created_at,
});

const mapComplaintRow = (row) => ({
  id: row.id,
  requestedBy: row.requestedBy,
  contactPhoneNumber: row.contactPhoneNumber,
  numberPlate: row.numberPlate,
  timing: row.timing,
  tripNumber: row.tripNumber,
  complaintType: row.complaintType,
  learnerName: row.learnerName,
  details: row.details,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const getComplaintUploads = async ({ complaintIds, connection = pool }) => {
  if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
    return new Map();
  }

  const placeholders = complaintIds.map(() => "?").join(", ");
  const [uploadRows] = await connection.query(
    `
      SELECT
        cru.complaint_report_id,
        u.id,
        u.user_id,
        u.file_name,
        u.file_key,
        u.file_url,
        u.created_at
      FROM complaint_report_uploads cru
      INNER JOIN uploads u ON u.id = cru.upload_id
      WHERE cru.complaint_report_id IN (${placeholders})
      ORDER BY u.created_at ASC, u.id ASC
    `,
    complaintIds
  );

  return uploadRows.reduce((accumulator, row) => {
    const complaintId = Number(row.complaint_report_id);
    accumulator.set(complaintId, mapUploadRow(row));
    return accumulator;
  }, new Map());
};

const getComplaintFormMeta = async ({ createdByUserId }) => {
  await ensureComplaintTables();

  const [userRows] = await pool.query(
    `
      SELECT firstName, lastName, phoneNumber, numberPlate
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [createdByUserId]
  );

  if (userRows.length === 0) {
    const error = new Error("Complaint creator was not found.");
    error.code = "COMPLAINT_CREATOR_NOT_FOUND";
    throw error;
  }

  const user = userRows[0];
  const requestedBy = [user.firstName, user.lastName]
    .filter((part) => Boolean(String(part || "").trim()))
    .join(" ")
    .trim();

  const [numberPlateRows] = await pool.query(
    `
      SELECT plate_number
      FROM number_plates
      WHERE status = 'active'
      ORDER BY plate_number ASC
    `
  );

  return {
    requestedBy,
    contactPhoneNumber: String(user.phoneNumber || "").trim(),
    numberPlates: numberPlateRows.map((row) => row.plate_number),
    assignedNumberPlate: String(user.numberPlate || "").trim().toUpperCase() || null,
    timingOptions: [...TIMING_OPTIONS],
    tripNumbers: [...TRIP_NUMBERS],
    complaintTypes: [...COMPLAINT_TYPES],
  };
};

const createComplaintReport = async ({
  payload,
  attachmentFile,
  createdByUserId,
}) => {
  await ensureComplaintTables();

  const normalized = normalizeComplaintPayload(payload);

  if (!TIMING_OPTIONS.includes(normalized.timing)) {
    const error = new Error("Invalid timing.");
    error.code = "INVALID_TIMING";
    throw error;
  }

  if (!TRIP_NUMBERS.includes(normalized.tripNumber)) {
    const error = new Error("Invalid trip number.");
    error.code = "INVALID_TRIP_NUMBER";
    throw error;
  }

  if (!COMPLAINT_TYPES.includes(normalized.complaintType)) {
    const error = new Error("Invalid complaint type.");
    error.code = "INVALID_COMPLAINT_TYPE";
    throw error;
  }

  if (normalized.complaintType === "Learner" && !normalized.learnerName) {
    const error = new Error("learnerName is required when complaintType is Learner.");
    error.code = "LEARNER_NAME_REQUIRED";
    throw error;
  }

  if (normalized.complaintType !== "Learner") {
    normalized.learnerName = "";
  }

  const [creatorRows] = await pool.query(
    `
      SELECT firstName, lastName, phoneNumber
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [createdByUserId]
  );

  if (creatorRows.length === 0) {
    const error = new Error("Complaint creator was not found.");
    error.code = "COMPLAINT_CREATOR_NOT_FOUND";
    throw error;
  }

  const creator = creatorRows[0];
  const requestedBy = [creator.firstName, creator.lastName]
    .filter((part) => Boolean(String(part || "").trim()))
    .join(" ")
    .trim();
  const contactPhoneNumber = String(creator.phoneNumber || "").trim();

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
    const error = new Error("Selected number plate is not available.");
    error.code = "NUMBER_PLATE_NOT_FOUND";
    throw error;
  }

  const files = attachmentFile ? [attachmentFile] : [];
  const uploadedFiles = await uploadFilesToR2({
    files,
    userId: createdByUserId,
    folder: "complaint-reports",
  });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      `
        INSERT INTO complaint_reports (
          requestedBy,
          contactPhoneNumber,
          numberPlate,
          timing,
          tripNumber,
          complaintType,
          learnerName,
          details,
          createdByUserId
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        requestedBy,
        contactPhoneNumber,
        normalized.numberPlate,
        normalized.timing,
        normalized.tripNumber,
        normalized.complaintType,
        normalized.learnerName || null,
        normalized.details,
        createdByUserId,
      ]
    );

    const complaintId = Number(insertResult.insertId);
    let attachment = null;

    if (uploadedFiles.length > 0) {
      const uploadedFile = uploadedFiles[0];

      const [uploadResult] = await connection.query(
        `
          INSERT INTO uploads (
            user_id,
            file_name,
            file_key,
            file_url
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          createdByUserId,
          uploadedFile.fileName,
          uploadedFile.fileKey,
          uploadedFile.fileUrl,
        ]
      );

      const uploadId = Number(uploadResult.insertId);

      await connection.query(
        `
          INSERT INTO complaint_report_uploads (
            complaint_report_id,
            upload_id
          )
          VALUES (?, ?)
        `,
        [complaintId, uploadId]
      );

      attachment = {
        id: uploadId,
        userId: createdByUserId,
        fileName: uploadedFile.fileName,
        fileKey: uploadedFile.fileKey,
        fileUrl: uploadedFile.fileUrl,
        createdAt: new Date().toISOString(),
      };
    }

    const [rows] = await connection.query(
      `
        SELECT
          id,
          requestedBy,
          contactPhoneNumber,
          numberPlate,
          timing,
          tripNumber,
          complaintType,
          learnerName,
          details,
          createdByUserId,
          createdAt,
          updatedAt
        FROM complaint_reports
        WHERE id = ?
        LIMIT 1
      `,
      [complaintId]
    );

    await connection.commit();

    return {
      ...mapComplaintRow(rows[0]),
      attachment,
    };
  } catch (error) {
    await connection.rollback();

    if (uploadedFiles.length > 0) {
      await deleteFilesFromR2(uploadedFiles.map((uploadedFile) => uploadedFile.fileKey));
    }

    throw error;
  } finally {
    connection.release();
  }
};

const listComplaintReportsByUser = async ({ createdByUserId }) => {
  await ensureComplaintTables();

  const [rows] = await pool.query(
    `
      SELECT
        id,
        requestedBy,
        contactPhoneNumber,
        numberPlate,
        timing,
        tripNumber,
        complaintType,
        learnerName,
        details,
        createdByUserId,
        createdAt,
        updatedAt
      FROM complaint_reports
      WHERE createdByUserId = ?
      ORDER BY createdAt DESC, id DESC
      LIMIT 200
    `,
    [createdByUserId]
  );

  const complaints = rows.map(mapComplaintRow);
  const attachmentByComplaintId = await getComplaintUploads({
    complaintIds: complaints.map((complaint) => complaint.id),
  });

  return complaints.map((complaint) => ({
    ...complaint,
    attachment: attachmentByComplaintId.get(complaint.id) || null,
  }));
};

module.exports = {
  TIMING_OPTIONS,
  TRIP_NUMBERS,
  COMPLAINT_TYPES,
  ensureComplaintTables,
  getComplaintFormMeta,
  createComplaintReport,
  listComplaintReportsByUser,
};
