const fs = require("fs");
const path = require("path");
const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");
const {
  deleteIncidentImagesFromR2,
  uploadIncidentImagesToR2,
} = require("./r2.service.js");

const SCHEMA_PATH = path.join(__dirname, "../migration/schema.sql");
const rawSchemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

let ensureIncidentTablesPromise;

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

const incidentReportsTableSql =
  extractCreateTableSql("incident_reports") ||
  `
    CREATE TABLE IF NOT EXISTS incident_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      incidentDate DATE NOT NULL,
      incidentTime TIME NOT NULL,
      pointOfIncident VARCHAR(255) NOT NULL,
      childrenInvolved TEXT NOT NULL,
      description TEXT NOT NULL,
      actionTaken TEXT NOT NULL,
      numberPlate VARCHAR(20) NOT NULL,
      createdByUserId INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_incident_report_plate
        FOREIGN KEY (numberPlate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      CONSTRAINT fk_incident_report_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    )
  `;

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

const incidentReportUploadsTableSql =
  extractCreateTableSql("incident_report_uploads") ||
  `
    CREATE TABLE IF NOT EXISTS incident_report_uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      incident_report_id INT NOT NULL,
      upload_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_incident_report_upload UNIQUE (incident_report_id, upload_id),
      CONSTRAINT fk_incident_report_upload_report
        FOREIGN KEY (incident_report_id) REFERENCES incident_reports(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_incident_report_upload_upload
        FOREIGN KEY (upload_id) REFERENCES uploads(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    )
  `;

const ensureIncidentTables = () => {
  if (!ensureIncidentTablesPromise) {
    ensureIncidentTablesPromise = (async () => {
      await ensureUsersTable();
      await pool.query(incidentReportsTableSql);
      await pool.query(uploadsTableSql);
      await pool.query(incidentReportUploadsTableSql);
    })();
  }

  return ensureIncidentTablesPromise;
};

const normalizeIncidentPayload = (payload) => {
  const rawIncidentTime = String(payload.incidentTime || "").trim();

  return {
    incidentDate: String(payload.incidentDate || "").trim(),
    incidentTime:
      rawIncidentTime.length === 5 ? `${rawIncidentTime}:00` : rawIncidentTime,
    pointOfIncident: String(payload.pointOfIncident || "").trim(),
    childrenInvolved: String(payload.childrenInvolved || "").trim(),
    description: String(payload.description || "").trim(),
    actionTaken: String(payload.actionTaken || "").trim(),
  };
};

const mapUploadRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  fileName: row.file_name,
  fileKey: row.file_key,
  fileUrl: row.file_url,
  createdAt: row.created_at,
});

const mapIncidentReportRow = (row) => ({
  id: row.id,
  incidentDate: row.incidentDate,
  incidentTime: row.incidentTime,
  pointOfIncident: row.pointOfIncident,
  childrenInvolved: row.childrenInvolved,
  description: row.description,
  actionTaken: row.actionTaken,
  numberPlate: row.numberPlate,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const getIncidentReportUploads = async ({ incidentReportIds, connection = pool }) => {
  if (!Array.isArray(incidentReportIds) || incidentReportIds.length === 0) {
    return new Map();
  }

  const placeholders = incidentReportIds.map(() => "?").join(", ");
  const [uploadRows] = await connection.query(
    `
      SELECT
        iru.incident_report_id,
        u.id,
        u.user_id,
        u.file_name,
        u.file_key,
        u.file_url,
        u.created_at
      FROM incident_report_uploads iru
      INNER JOIN uploads u ON u.id = iru.upload_id
      WHERE iru.incident_report_id IN (${placeholders})
      ORDER BY u.created_at ASC, u.id ASC
    `,
    incidentReportIds
  );

  return uploadRows.reduce((accumulator, row) => {
    const incidentReportId = Number(row.incident_report_id);
    const currentUploads = accumulator.get(incidentReportId) || [];
    currentUploads.push(mapUploadRow(row));
    accumulator.set(incidentReportId, currentUploads);
    return accumulator;
  }, new Map());
};

const createIncidentReport = async ({ payload, files, createdByUserId }) => {
  await ensureIncidentTables();

  const normalized = normalizeIncidentPayload(payload);

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
    const missingCreatorError = new Error("Incident report creator was not found.");
    missingCreatorError.code = "INCIDENT_CREATOR_NOT_FOUND";
    throw missingCreatorError;
  }

  const creator = creatorRows[0];
  const creatorNumberPlate = String(creator.numberPlate || "")
    .trim()
    .toUpperCase();

  if (!creatorNumberPlate) {
    const plateNotAssignedError = new Error(
      "No number plate is assigned to this driver."
    );
    plateNotAssignedError.code = "DRIVER_NUMBER_PLATE_NOT_ASSIGNED";
    throw plateNotAssignedError;
  }

  const [numberPlateRows] = await pool.query(
    `
      SELECT plate_number
      FROM number_plates
      WHERE plate_number = ?
        AND status = 'active'
      LIMIT 1
    `,
    [creatorNumberPlate]
  );

  if (numberPlateRows.length === 0) {
    const missingNumberPlateError = new Error("Selected number plate is not available.");
    missingNumberPlateError.code = "NUMBER_PLATE_NOT_FOUND";
    throw missingNumberPlateError;
  }

  const uploadedFiles = await uploadIncidentImagesToR2({
    files,
    userId: createdByUserId,
  });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      `
        INSERT INTO incident_reports (
          incidentDate,
          incidentTime,
          pointOfIncident,
          childrenInvolved,
          description,
          actionTaken,
          numberPlate,
          createdByUserId
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalized.incidentDate,
        normalized.incidentTime,
        normalized.pointOfIncident,
        normalized.childrenInvolved,
        normalized.description,
        normalized.actionTaken,
        creatorNumberPlate,
        createdByUserId,
      ]
    );

    const incidentReportId = Number(insertResult.insertId);
    const storedUploads = [];

    for (const uploadedFile of uploadedFiles) {
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
          INSERT INTO incident_report_uploads (
            incident_report_id,
            upload_id
          )
          VALUES (?, ?)
        `,
        [incidentReportId, uploadId]
      );

      storedUploads.push({
        id: uploadId,
        userId: createdByUserId,
        fileName: uploadedFile.fileName,
        fileKey: uploadedFile.fileKey,
        fileUrl: uploadedFile.fileUrl,
        createdAt: new Date().toISOString(),
      });
    }

    const [rows] = await connection.query(
      `
        SELECT
          id,
          incidentDate,
          incidentTime,
          pointOfIncident,
          childrenInvolved,
          description,
          actionTaken,
          numberPlate,
          createdByUserId,
          createdAt,
          updatedAt
        FROM incident_reports
        WHERE id = ?
        LIMIT 1
      `,
      [incidentReportId]
    );

    await connection.commit();

    return {
      ...mapIncidentReportRow(rows[0]),
      uploads: storedUploads,
    };
  } catch (error) {
    await connection.rollback();

    if (uploadedFiles.length > 0) {
      await deleteIncidentImagesFromR2(
        uploadedFiles.map((uploadedFile) => uploadedFile.fileKey)
      );
    }

    throw error;
  } finally {
    connection.release();
  }
};

const listIncidentReportsByUser = async ({ createdByUserId }) => {
  await ensureIncidentTables();

  const [rows] = await pool.query(
    `
      SELECT
        id,
        incidentDate,
        incidentTime,
        pointOfIncident,
        childrenInvolved,
        description,
        actionTaken,
        numberPlate,
        createdByUserId,
        createdAt,
        updatedAt
      FROM incident_reports
      WHERE createdByUserId = ?
      ORDER BY incidentDate DESC, incidentTime DESC, id DESC
      LIMIT 200
    `,
    [createdByUserId]
  );

  const incidentReports = rows.map(mapIncidentReportRow);
  const uploadsByIncidentReportId = await getIncidentReportUploads({
    incidentReportIds: incidentReports.map((report) => report.id),
  });

  return incidentReports.map((report) => ({
    ...report,
    uploads: uploadsByIncidentReportId.get(report.id) || [],
  }));
};

module.exports = {
  ensureIncidentTables,
  createIncidentReport,
  listIncidentReportsByUser,
};
