const fs = require("fs");
const path = require("path");
const pool = require("../config/db.js");
const { ensureUsersTable } = require("./auth.service.js");
const { deleteFilesFromR2, uploadFilesToR2 } = require("./r2.service.js");

const DOCUMENT_RELATED_TO = "Driver";
const DOCUMENT_TYPES = Object.freeze([
  "Insurance",
  "NTSA Inspection",
  "Speed Governor",
  "RSL",
  "Driving License",
  "PSV",
  "Police Clearance",
  "Warranty Certificate",
  "Other",
]);

const SCHEMA_PATH = path.join(__dirname, "../migration/schema.sql");
const rawSchemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

let ensureComplianceDocumentTablesPromise;

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

const complianceDocumentsTableSql =
  extractCreateTableSql("compliance_documents") ||
  `
    CREATE TABLE IF NOT EXISTS compliance_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      relatedTo ENUM('Driver') NOT NULL DEFAULT 'Driver',
      documentType ENUM(
        'Insurance',
        'NTSA Inspection',
        'Speed Governor',
        'RSL',
        'Driving License',
        'PSV',
        'Police Clearance',
        'Warranty Certificate',
        'Other'
      ) NOT NULL,
      validFromDate DATE NOT NULL,
      validToDate DATE NOT NULL,
      uploadedBy VARCHAR(255) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      fileKey VARCHAR(255) NOT NULL,
      fileUrl VARCHAR(500) NOT NULL,
      createdByUserId INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_compliance_document_file_key UNIQUE (fileKey),
      CONSTRAINT fk_compliance_document_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    )
  `;

const ensureValidityRangeColumns = async () => {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'compliance_documents'
        AND COLUMN_NAME IN ('validityDate', 'validFromDate', 'validToDate')
    `
  );

  const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));
  const hasLegacyValidityDate = existingColumns.has("validityDate");

  if (!existingColumns.has("validFromDate")) {
    await pool.query(
      "ALTER TABLE compliance_documents ADD COLUMN validFromDate DATE NULL AFTER documentType"
    );

    if (hasLegacyValidityDate) {
      await pool.query(
        "UPDATE compliance_documents SET validFromDate = COALESCE(validityDate, CURRENT_DATE()) WHERE validFromDate IS NULL"
      );
    } else {
      await pool.query(
        "UPDATE compliance_documents SET validFromDate = CURRENT_DATE() WHERE validFromDate IS NULL"
      );
    }

    await pool.query(
      "ALTER TABLE compliance_documents MODIFY COLUMN validFromDate DATE NOT NULL AFTER documentType"
    );
  }

  if (!existingColumns.has("validToDate")) {
    await pool.query(
      "ALTER TABLE compliance_documents ADD COLUMN validToDate DATE NULL AFTER validFromDate"
    );

    if (hasLegacyValidityDate) {
      await pool.query(
        "UPDATE compliance_documents SET validToDate = COALESCE(validityDate, validFromDate, CURRENT_DATE()) WHERE validToDate IS NULL"
      );
    } else {
      await pool.query(
        "UPDATE compliance_documents SET validToDate = COALESCE(validFromDate, CURRENT_DATE()) WHERE validToDate IS NULL"
      );
    }

    await pool.query(
      "ALTER TABLE compliance_documents MODIFY COLUMN validToDate DATE NOT NULL AFTER validFromDate"
    );
  }
};

const ensureComplianceDocumentTables = () => {
  if (!ensureComplianceDocumentTablesPromise) {
    ensureComplianceDocumentTablesPromise = (async () => {
      await ensureUsersTable();
      await pool.query(complianceDocumentsTableSql);
      await ensureValidityRangeColumns();
    })();
  }

  return ensureComplianceDocumentTablesPromise;
};

const normalizeComplianceDocumentPayload = (payload) => ({
  relatedTo: String(payload.relatedTo || DOCUMENT_RELATED_TO).trim() || DOCUMENT_RELATED_TO,
  documentType: String(payload.documentType || "").trim(),
  validFromDate: String(payload.validFromDate || "").trim(),
  validToDate: String(payload.validToDate || "").trim(),
});

const mapComplianceDocumentRow = (row) => ({
  id: row.id,
  relatedTo: row.relatedTo,
  documentType: row.documentType,
  validFromDate: row.validFromDate,
  validToDate: row.validToDate,
  uploadedBy: row.uploadedBy,
  fileName: row.fileName,
  fileKey: row.fileKey,
  fileUrl: row.fileUrl,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const createComplianceDocument = async ({
  payload,
  documentFile,
  createdByUserId,
}) => {
  await ensureComplianceDocumentTables();

  const normalized = normalizeComplianceDocumentPayload(payload || {});

  if (normalized.relatedTo !== DOCUMENT_RELATED_TO) {
    const invalidRelatedToError = new Error("Invalid document relatedTo value.");
    invalidRelatedToError.code = "INVALID_DOCUMENT_RELATED_TO";
    throw invalidRelatedToError;
  }

  if (!DOCUMENT_TYPES.includes(normalized.documentType)) {
    const invalidDocumentTypeError = new Error("Invalid document type.");
    invalidDocumentTypeError.code = "INVALID_DOCUMENT_TYPE";
    throw invalidDocumentTypeError;
  }

  if (
    new Date(`${normalized.validToDate}T00:00:00`).getTime() <
    new Date(`${normalized.validFromDate}T00:00:00`).getTime()
  ) {
    const invalidValidityRangeError = new Error(
      "The document validToDate must be the same as or later than validFromDate."
    );
    invalidValidityRangeError.code = "INVALID_VALIDITY_RANGE";
    throw invalidValidityRangeError;
  }

  const [creatorRows] = await pool.query(
    `
      SELECT id, firstName, lastName
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [createdByUserId]
  );

  if (creatorRows.length === 0) {
    const missingCreatorError = new Error("Document uploader was not found.");
    missingCreatorError.code = "DOCUMENT_UPLOADER_NOT_FOUND";
    throw missingCreatorError;
  }

  const creator = creatorRows[0];
  const uploadedBy = [creator.firstName, creator.lastName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  const uploadedFiles = await uploadFilesToR2({
    files: [documentFile],
    userId: createdByUserId,
    folder: "compliance-documents",
  });

  const uploadedDocument = uploadedFiles[0] || null;

  if (!uploadedDocument) {
    const missingUploadedDocumentError = new Error("Document upload failed.");
    missingUploadedDocumentError.code = "COMPLIANCE_DOCUMENT_UPLOAD_MISSING";
    throw missingUploadedDocumentError;
  }

  try {
    const [insertResult] = await pool.query(
      `
        INSERT INTO compliance_documents (
          relatedTo,
          documentType,
          validFromDate,
          validToDate,
          uploadedBy,
          fileName,
          fileKey,
          fileUrl,
          createdByUserId
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalized.relatedTo,
        normalized.documentType,
        normalized.validFromDate,
        normalized.validToDate,
        uploadedBy || DOCUMENT_RELATED_TO,
        uploadedDocument.fileName,
        uploadedDocument.fileKey,
        uploadedDocument.fileUrl,
        createdByUserId,
      ]
    );

    const [rows] = await pool.query(
      `
        SELECT
          id,
          relatedTo,
          documentType,
          validFromDate,
          validToDate,
          uploadedBy,
          fileName,
          fileKey,
          fileUrl,
          createdByUserId,
          createdAt,
          updatedAt
        FROM compliance_documents
        WHERE id = ?
        LIMIT 1
      `,
      [insertResult.insertId]
    );

    return mapComplianceDocumentRow(rows[0]);
  } catch (error) {
    await deleteFilesFromR2([uploadedDocument.fileKey]);
    throw error;
  }
};

const listComplianceDocumentsByUser = async ({ createdByUserId }) => {
  await ensureComplianceDocumentTables();

  const [rows] = await pool.query(
    `
      SELECT
        id,
        relatedTo,
        documentType,
        validFromDate,
        validToDate,
        uploadedBy,
        fileName,
        fileKey,
        fileUrl,
        createdByUserId,
        createdAt,
        updatedAt
      FROM compliance_documents
      WHERE createdByUserId = ?
      ORDER BY createdAt DESC, id DESC
    `,
    [createdByUserId]
  );

  return rows.map(mapComplianceDocumentRow);
};

module.exports = {
  DOCUMENT_RELATED_TO,
  DOCUMENT_TYPES,
  createComplianceDocument,
  listComplianceDocumentsByUser,
  ensureComplianceDocumentTables,
};
