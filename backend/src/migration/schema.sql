CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    -- Used to link a Parent account to student records (replaces phone-based matching)
    parentIdType VARCHAR(10) NULL,
    parentIdNumber VARCHAR(50) NULL,
    numberPlate VARCHAR(20),
    profilePhotoUrl VARCHAR(500) NULL,
    profilePhotoKey VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'School Admin') NOT NULL,
    CONSTRAINT chk_phoneNumber_numeric CHECK (phoneNumber REGEXP '^[0-9]+$'),
    CONSTRAINT uq_parent_identifier UNIQUE (parentIdType, parentIdNumber),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE number_plates (
    id INT AUTO_INCREMENT PRIMARY KEY,

    plate_number VARCHAR(20) NOT NULL,
    
    status ENUM('active', 'inactive') DEFAULT 'active',
    -- Fleet constraints used during route assignment.
    capacity INT NOT NULL DEFAULT 0,
    insuranceExpiryDate DATE NULL,
    inspectionExpiryDate DATE NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_plate_number UNIQUE (plate_number)
);

-- ============================================================
-- Transport Manager: Route domain (MVP)
-- ============================================================

CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeCode VARCHAR(50) NOT NULL UNIQUE,
    routeName VARCHAR(255) NOT NULL,
    routeDate DATE NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    status ENUM('active', 'inactive', 'completed') NOT NULL DEFAULT 'active',
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_routes_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE route_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    stopType ENUM('pickup', 'dropoff') NOT NULL,
    stopOrder INT NOT NULL,
    location VARCHAR(255) NOT NULL,
    timeAllocation TIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_stop_order UNIQUE (routeId, stopOrder),
    CONSTRAINT fk_route_stops_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE route_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    numberPlate VARCHAR(20) NOT NULL,
    driverUserId INT NOT NULL,
    assistantUserId INT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_assignment UNIQUE (routeId, status),
    CONSTRAINT fk_route_assign_numberplate
        FOREIGN KEY (numberPlate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_assistant
        FOREIGN KEY (assistantUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE route_student_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    studentId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_student UNIQUE (routeId, studentId),
    CONSTRAINT fk_route_student_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_route_student_student
        FOREIGN KEY (studentId) REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    routeAssignmentId INT NOT NULL,
    numberPlate VARCHAR(20) NOT NULL,
    driverUserId INT NOT NULL,
    assistantUserId INT NULL,
    tripDate DATE NOT NULL,
    scheduledStartTime TIME NOT NULL,
    status ENUM('scheduled', 'started', 'in_progress', 'completed') NOT NULL DEFAULT 'scheduled',
    startedAt TIMESTAMP NULL,
    inProgressAt TIMESTAMP NULL,
    completedAt TIMESTAMP NULL,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_trips_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_route_assignment
        FOREIGN KEY (routeAssignmentId) REFERENCES route_assignments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_numberplate
        FOREIGN KEY (numberPlate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_assistant
        FOREIGN KEY (assistantUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE trip_student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL,
    studentId INT NOT NULL,
    boardingStatus ENUM('not_boarded', 'boarded', 'dropped_off') NOT NULL DEFAULT 'not_boarded',
    boardedAt TIMESTAMP NULL,
    droppedOffAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_trip_student_attendance UNIQUE (tripId, studentId),
    CONSTRAINT fk_trip_attendance_trip
        FOREIGN KEY (tripId) REFERENCES trips(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_trip_attendance_student
        FOREIGN KEY (studentId) REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE trip_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL,
    eventType ENUM('scheduled', 'started', 'in_progress', 'completed', 'attendance_updated') NOT NULL,
    description VARCHAR(500) NOT NULL,
    actorUserId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_events_trip
        FOREIGN KEY (tripId) REFERENCES trips(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_trip_events_actor
        FOREIGN KEY (actorUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE fuel_maintenance_requests (
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
);

CREATE TABLE incident_reports (
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
);

CREATE TABLE uploads (
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
);

CREATE TABLE incident_report_uploads (
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
);

CREATE TABLE complaint_reports (
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
);

CREATE TABLE complaint_report_uploads (
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
);

CREATE TABLE compliance_documents (
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
);

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admissionNumber VARCHAR(50) NOT NULL UNIQUE,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    parentContact VARCHAR(20) NOT NULL,
    -- Used to link student records to a Parent account (replaces phone-based matching)
    parentIdType VARCHAR(10) NULL,
    parentIdNumber VARCHAR(50) NULL,
    admissionDate DATE NOT NULL,
    status ENUM('active', 'withdrawn') NOT NULL DEFAULT 'active',
    withdrawalDate DATE NULL,
    withdrawalReason VARCHAR(255) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE student_parent_contact_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studentId INT NOT NULL,
    previousContact VARCHAR(20) NOT NULL,
    newContact VARCHAR(20) NOT NULL,
    changedByUserId INT NOT NULL,
    changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_contact_student
        FOREIGN KEY (studentId) REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_student_contact_user
        FOREIGN KEY (changedByUserId) REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE TABLE parent_transport_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parentUserId INT NOT NULL,
    studentId INT NOT NULL,
    currentRouteId INT NULL,
    requestType ENUM('route_change', 'complaint', 'general_support') NOT NULL,
    requestTitle VARCHAR(255) NOT NULL,
    requestDetails TEXT NOT NULL,
    requestedPickupLocation VARCHAR(255) NULL,
    requestedDropoffLocation VARCHAR(255) NULL,
    preferredEffectiveDate DATE NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    managerReviewNotes TEXT NULL,
    reviewedByUserId INT NULL,
    reviewedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_parent_transport_request_parent
        FOREIGN KEY (parentUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_parent_transport_request_student
        FOREIGN KEY (studentId) REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_parent_transport_request_route
        FOREIGN KEY (currentRouteId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_transport_request_reviewed_by
        FOREIGN KEY (reviewedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actorUserId INT NULL,
    domain VARCHAR(100) NOT NULL,
    entityType VARCHAR(100) NOT NULL,
    entityId INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    previousStateJson LONGTEXT NULL,
    newStateJson LONGTEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_actor
        FOREIGN KEY (actorUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);
