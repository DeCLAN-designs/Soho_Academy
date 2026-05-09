-- ============================================================================
-- PART 4: INCIDENTS, COMPLAINTS, AND COMPLIANCE DOMAIN
-- ============================================================================

-- Incident Reports with Severity Escalation
CREATE TABLE IF NOT EXISTS incident_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incidentNumber VARCHAR(50) NOT NULL UNIQUE,
    incidentDate DATE NOT NULL,
    incidentTime TIME NOT NULL,
    reportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pointOfIncident VARCHAR(255) NOT NULL,
    incidentLatitude DECIMAL(10,8) NULL,
    incidentLongitude DECIMAL(11,8) NULL,
    severityLevel ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    escalationTier ENUM('none', 'supervisor', 'manager', 'executive', 'external') NOT NULL DEFAULT 'none',
    incidentType ENUM(
        'Accident', 'Breakdown', 'Student Injury', 'Medical Emergency',
        'Security Threat', 'Driver Misconduct', 'Vehicle Damage', 'Route Deviation', 'Other'
    ) NOT NULL,
    childrenInvolved TEXT NOT NULL,
    description TEXT NOT NULL,
    immediateActionTaken TEXT NOT NULL,
    followUpRequired BOOLEAN NOT NULL DEFAULT FALSE,
    followUpCompletedAt TIMESTAMP NULL,
    followUpCompletedByUserId INT NULL,
    resolutionStatus ENUM('open', 'investigating', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    resolutionNotes TEXT NULL,
    plate_number VARCHAR(20) NOT NULL,
    driverUserId INT NULL,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_report_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_incident_report_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_incident_report_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_incident_severity (severityLevel),
    INDEX idx_incident_status (resolutionStatus),
    INDEX idx_incident_escalation (escalationTier),
    INDEX idx_incident_date (incidentDate)
);

-- Complaint Reports
CREATE TABLE IF NOT EXISTS complaint_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaintNumber VARCHAR(50) NOT NULL UNIQUE,
    reportedBy VARCHAR(255) NOT NULL,
    reporterType ENUM('Parent', 'Driver', 'Assistant', 'Student', 'Staff', 'Community', 'Anonymous') NOT NULL,
    contactPhoneNumber VARCHAR(20) NULL,
    contactEmail VARCHAR(255) NULL,
    plate_number VARCHAR(20) NULL,
    tripId INT NULL,
    timing ENUM('Morning', 'Evening', 'Both') NULL,
    tripNumber TINYINT NULL CHECK (tripNumber BETWEEN 1 AND 5),
    complaintType ENUM(
        'Learner Behavior', 'Driver Conduct', 'Bus Condition', 'Route Issue',
        'Timing Issue', 'Safety Concern', 'Bus Assistant Conduct', 'Other'
    ) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    learnerName VARCHAR(255) NULL,
    learnerAdmissionNumber VARCHAR(50) NULL,
    details TEXT NOT NULL,
    expectedResolution TEXT NULL,
    status ENUM('submitted', 'under_review', 'escalated', 'resolved', 'closed', 'rejected') NOT NULL DEFAULT 'submitted',
    assignedToUserId INT NULL,
    resolution TEXT NULL,
    resolvedAt TIMESTAMP NULL,
    createdByUserId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaint_report_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_complaint_report_trip
        FOREIGN KEY (tripId) REFERENCES trips(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_complaint_report_assigned_to
        FOREIGN KEY (assignedToUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_complaint_status (status),
    INDEX idx_complaint_severity (severity),
    INDEX idx_complaint_assigned (assignedToUserId)
);

-- Compliance Documents
CREATE TABLE IF NOT EXISTS compliance_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documentNumber VARCHAR(100) NULL,
    relatedTo ENUM('Vehicle', 'Driver', 'Assistant', 'Route', 'School') NOT NULL,
    relatedEntityId INT NULL,
    entityIdentifier VARCHAR(50) NULL,
    documentType ENUM(
        'Vehicle Insurance', 'Vehicle Registration', 'NTSA Inspection', 'Speed Governor Certificate',
        'RSL', 'Driving License', 'PSV License', 'Police Clearance', 'Medical Certificate',
        'First Aid Certificate', 'Fire Safety Certificate', 'Warranty Certificate', 'Route Permit', 'Other'
    ) NOT NULL,
    documentCategory ENUM('mandatory', 'recommended', 'optional') NOT NULL DEFAULT 'mandatory',
    validFromDate DATE NOT NULL,
    validToDate DATE NOT NULL,
    issuingAuthority VARCHAR(255) NULL,
    documentReference VARCHAR(255) NULL,
    uploadedBy VARCHAR(255) NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    fileKey VARCHAR(255) NOT NULL,
    fileUrl VARCHAR(500) NOT NULL,
    fileSizeBytes INT NULL,
    mimeType VARCHAR(100) NULL,
    version INT NOT NULL DEFAULT 1,
    previousVersionId INT NULL,
    isLatestVersion BOOLEAN NOT NULL DEFAULT TRUE,
    status ENUM('valid', 'expiring_soon', 'expired', 'revoked', 'pending') NOT NULL DEFAULT 'valid',
    alertThresholdDays INT NOT NULL DEFAULT 30,
    verifiedByUserId INT NULL,
    verifiedAt TIMESTAMP NULL,
    notes TEXT NULL,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_compliance_document_previous
        FOREIGN KEY (previousVersionId) REFERENCES compliance_documents(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_compliance_document_verified_by
        FOREIGN KEY (verifiedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_compliance_document_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_compliance_entity (relatedTo, entityIdentifier),
    INDEX idx_compliance_type (documentType),
    INDEX idx_compliance_expiry (validToDate),
    INDEX idx_compliance_status (status),
    INDEX idx_compliance_latest (isLatestVersion)
);

-- Compliance Alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documentId INT NOT NULL,
    alertType ENUM('expiring_soon', 'expired', 'revoked') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    alertMessage TEXT NOT NULL,
    isAcknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledgedByUserId INT NULL,
    acknowledgedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_document
        FOREIGN KEY (documentId) REFERENCES compliance_documents(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_alert_acknowledged_by
        FOREIGN KEY (acknowledgedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_alert_status (isAcknowledged),
    INDEX idx_alert_severity (severity)
);
