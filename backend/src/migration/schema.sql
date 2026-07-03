-- ============================================================================
-- MIGRATION: Add Dynamic Confirmation Support to Fuel & Maintenance Requests
-- ============================================================================

-- Step 1: Check if columns already exist and add them if not
-- Add confirmedByUserId column
ALTER TABLE fuel_maintenance_requests
ADD COLUMN IF NOT EXISTS confirmedByUserId INT NULL AFTER confirmedBy;

-- Add confirmationStatus column if not exists
ALTER TABLE fuel_maintenance_requests
ADD COLUMN IF NOT EXISTS confirmationStatus ENUM('PENDING', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'PENDING' AFTER confirmedByUserId;

-- Add confirmedAt column if not exists
ALTER TABLE fuel_maintenance_requests
ADD COLUMN IF NOT EXISTS confirmedAt TIMESTAMP NULL AFTER confirmationStatus;

-- Step 2: Add foreign key constraint if it doesn't exist
-- Note: This may fail if constraint already exists, which is fine
SET FOREIGN_KEY_CHECKS=0;
ALTER TABLE fuel_maintenance_requests
ADD CONSTRAINT fk_fuel_maintenance_confirmed_by
    FOREIGN KEY (confirmedByUserId) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
SET FOREIGN_KEY_CHECKS=1;

-- Step 3: Add indexes for performance
ALTER TABLE fuel_maintenance_requests
ADD INDEX IF NOT EXISTS idx_confirmation_status (confirmationStatus),
ADD INDEX IF NOT EXISTS idx_confirmed_by_user (confirmedByUserId),
ADD INDEX IF NOT EXISTS idx_confirmed_at (confirmedAt);

-- Step 4 (Optional): Populate existing records with default confirmation status
-- This sets all existing records to PENDING if they don't have a status yet
UPDATE fuel_maintenance_requests 
SET confirmationStatus = 'PENDING' 
WHERE confirmationStatus IS NULL;


-- ============================================================================
-- PART 1: CORE IDENTITY & ACCESS MANAGEMENT + FLEET DOMAIN
-- ============================================================================

-- Core Users Table with Security Enhancements
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    parentIdType VARCHAR(10) NULL,
    parentIdNumber VARCHAR(50) NULL,
    numberPlate VARCHAR(20) NULL,
    profilePhotoUrl VARCHAR(500) NULL,
    profilePhotoKey VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'School Admin') NOT NULL,
    status ENUM('active', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
    failedLoginAttempts INT NOT NULL DEFAULT 0,
    lockedUntil TIMESTAMP NULL,
    lastLoginAt TIMESTAMP NULL,
    passwordChangedAt TIMESTAMP NULL,
    mustChangePassword BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_phoneNumber_numeric CHECK (phoneNumber REGEXP '^[0-9]+$'),
    CONSTRAINT uq_parent_identifier UNIQUE (parentIdType, parentIdNumber),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status),
    INDEX idx_users_email (email)
);

-- Staff Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE,
    employeeId VARCHAR(50) NOT NULL UNIQUE,
    dateOfBirth DATE NULL,
    hireDate DATE NOT NULL,
    terminationDate DATE NULL,
    emergencyContactName VARCHAR(255) NULL,
    emergencyContactPhone VARCHAR(20) NULL,
    address TEXT NULL,
    department VARCHAR(100) NULL,
    performanceRating DECIMAL(3,2) NULL CHECK (performanceRating BETWEEN 0 AND 5),
    totalComplaints INT NOT NULL DEFAULT 0,
    totalIncidents INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_profile_user
        FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_staff_employee_id (employeeId)
);

-- Driver License Tracking
CREATE TABLE IF NOT EXISTS driver_licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    licenseNumber VARCHAR(100) NOT NULL,
    licenseType ENUM('A', 'B', 'C', 'D', 'E', 'F') NOT NULL,
    issuingAuthority VARCHAR(255) NOT NULL,
    issueDate DATE NOT NULL,
    expiryDate DATE NOT NULL,
    psvBadgeNumber VARCHAR(50) NULL,
    psvBadgeExpiry DATE NULL,
    status ENUM('valid', 'expired', 'suspended', 'revoked') NOT NULL DEFAULT 'valid',
    isPrimary BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_license_user
        FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_driver_license_expiry (expiryDate),
    INDEX idx_driver_license_user (userId, status),
    CONSTRAINT uq_driver_license_number UNIQUE (licenseNumber)
);

-- Enhanced Fleet/Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    status ENUM('active', 'in_route', 'maintenance', 'breakdown', 'retired', 'inactive') NOT NULL DEFAULT 'active',
    capacity INT NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    vehicleType ENUM('Bus', 'Mini Bus', 'Van', 'SUV', 'Sedan') NOT NULL DEFAULT 'Bus',
    make VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    year INT NULL,
    vin VARCHAR(50) NULL,
    engineNumber VARCHAR(50) NULL,
    chassisNumber VARCHAR(50) NULL,
    fuelType ENUM('diesel', 'petrol', 'electric', 'hybrid') NOT NULL DEFAULT 'diesel',
    insuranceProvider VARCHAR(255) NULL,
    insurancePolicyNumber VARCHAR(100) NULL,
    insuranceExpiryDate DATE NULL,
    inspectionExpiryDate DATE NULL,
    lastServiceDate DATE NULL,
    nextServiceDate DATE NULL,
    nextServiceMileage INT NULL,
    currentMileage INT NOT NULL DEFAULT 0,
    fuelCapacity DECIMAL(8,2) NULL,
    isCompliant BOOLEAN GENERATED ALWAYS AS (
        (status NOT IN ('maintenance', 'breakdown', 'retired')) AND
        (insuranceExpiryDate IS NULL OR insuranceExpiryDate > CURDATE()) AND
        (inspectionExpiryDate IS NULL OR inspectionExpiryDate > CURDATE())
    ) STORED,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vehicle_plate UNIQUE (plate_number),
    INDEX idx_vehicle_status (status),
    INDEX idx_vehicle_compliance (isCompliant),
    INDEX idx_vehicle_insurance_expiry (insuranceExpiryDate),
    INDEX idx_vehicle_inspection_expiry (inspectionExpiryDate)
);

-- Vehicle Assignment History
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    driverUserId INT NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NULL,
    reason VARCHAR(255) NULL,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_assign_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_vehicle_assign_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_vehicle_assign_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_vehicle_assign_dates (startDate, endDate)
);

-- Fuel Logs
CREATE TABLE IF NOT EXISTS fuel_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    driverUserId INT NOT NULL,
    fuelDate DATE NOT NULL,
    fuelTime TIME NOT NULL,
    mileage INT NOT NULL,
    fuelType ENUM('diesel', 'petrol', 'electric', 'hybrid') NOT NULL,
    litersFilled DECIMAL(8,2) NOT NULL,
    costPerLiter DECIMAL(8,2) NOT NULL,
    totalCost DECIMAL(12,2) NOT NULL,
    stationName VARCHAR(255) NULL,
    stationLocation VARCHAR(255) NULL,
    receiptNumber VARCHAR(100) NULL,
    isVerified BOOLEAN NOT NULL DEFAULT FALSE,
    verifiedByUserId INT NULL,
    verifiedAt TIMESTAMP NULL,
    notes TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fuel_log_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_log_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_log_verified_by
        FOREIGN KEY (verifiedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_fuel_log_plate_date (plate_number, fuelDate),
    INDEX idx_fuel_log_driver (driverUserId),
    INDEX idx_fuel_log_date (fuelDate)
);

-- Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    maintenanceType ENUM('scheduled', 'preventive', 'corrective', 'emergency', 'inspection') NOT NULL,
    category ENUM(
        'Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical',
        'Body Work', 'Tires', 'Oil Change', 'General Service', 'Insurance Claim', 'Other'
    ) NOT NULL,
    serviceDate DATE NOT NULL,
    completionDate DATE NULL,
    mileage INT NOT NULL,
    description TEXT NOT NULL,
    workPerformed TEXT NULL,
    partsUsed TEXT NULL,
    laborCost DECIMAL(12,2) NULL,
    partsCost DECIMAL(12,2) NULL,
    totalCost DECIMAL(12,2) NULL,
    serviceProvider VARCHAR(255) NULL,
    technicianName VARCHAR(255) NULL,
    nextServiceMileage INT NULL,
    nextServiceDate DATE NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    createdByUserId INT NOT NULL,
    completedByUserId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_maintenance_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_completed_by
        FOREIGN KEY (completedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_maintenance_plate (plate_number),
    INDEX idx_maintenance_status (status),
    INDEX idx_maintenance_date (serviceDate)
);
-- ============================================================================
-- PART 2: ROUTE MANAGEMENT DOMAIN
-- ============================================================================

-- Routes
CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeCode VARCHAR(50) NOT NULL UNIQUE,
    routeName VARCHAR(255) NOT NULL,
    description TEXT NULL,
    routeType ENUM('pickup', 'dropoff', 'combined') NOT NULL DEFAULT 'combined',
    routeDate DATE NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    estimatedDurationMinutes INT NULL,
    totalDistanceKm DECIMAL(8,2) NULL,
    status ENUM('active', 'inactive', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    maxCapacity INT NOT NULL DEFAULT 0,
    currentStudentCount INT NOT NULL DEFAULT 0,
    isFull BOOLEAN GENERATED ALWAYS AS (currentStudentCount >= maxCapacity) STORED,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_routes_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_route_status (status),
    INDEX idx_route_date (routeDate),
    INDEX idx_route_full (isFull)
);

-- Route Stops with GPS Support
CREATE TABLE IF NOT EXISTS route_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    stopType ENUM('pickup', 'dropoff') NOT NULL,
    stopOrder INT NOT NULL,
    locationName VARCHAR(255) NOT NULL,
    address TEXT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    geofenceRadiusMeters INT NULL DEFAULT 100,
    scheduledTime TIME NULL,
    timeWindowMinutes INT NULL DEFAULT 5,
    estimatedArrival TIME NULL,
    isMandatory BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_stop_order UNIQUE (routeId, stopOrder),
    CONSTRAINT fk_route_stops_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_route_stop_route (routeId),
    INDEX idx_route_stop_location (latitude, longitude)
);

-- Route Assignments with Staff
CREATE TABLE IF NOT EXISTS route_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    plate_number VARCHAR(20) NOT NULL,
    driverUserId INT NOT NULL,
    assistantUserId INT NULL,
    status ENUM('active', 'inactive', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP NULL,
    assignmentNotes TEXT NULL,
    createdByUserId INT NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_assignment_active UNIQUE (routeId, status, assignedAt),
    CONSTRAINT fk_route_assign_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_assistant
        FOREIGN KEY (assistantUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_route_assign_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_route_assign_route (routeId, status),
    INDEX idx_route_assign_driver (driverUserId, status),
    INDEX idx_route_assign_plate (plate_number, status)
);

-- Student Route Assignments
CREATE TABLE IF NOT EXISTS route_student_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    studentId INT NOT NULL,
    pickupStopId INT NULL,
    dropoffStopId INT NULL,
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignedByUserId INT NOT NULL,
    status ENUM('active', 'inactive', 'removed') NOT NULL DEFAULT 'active',
    removalReason VARCHAR(255) NULL,
    removedAt TIMESTAMP NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_student_active UNIQUE (routeId, studentId, status),
    CONSTRAINT fk_route_student_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_route_student_pickup_stop
        FOREIGN KEY (pickupStopId) REFERENCES route_stops(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_route_student_dropoff_stop
        FOREIGN KEY (dropoffStopId) REFERENCES route_stops(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_route_student_assigned_by
        FOREIGN KEY (assignedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_route_student_route (routeId, status),
    INDEX idx_route_student_student (studentId, status)
);

-- ============================================================================
-- PART 3: TRIP & ATTENDANCE DOMAIN + GPS TRACKING
-- ============================================================================

-- Trips
CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    routeAssignmentId INT NOT NULL,
    plate_number VARCHAR(20) NOT NULL,
    driverUserId INT NOT NULL,
    assistantUserId INT NULL,
    tripDate DATE NOT NULL,
    scheduledStartTime TIME NOT NULL,
    actualStartTime TIME NULL,
    estimatedEndTime TIME NULL,
    actualEndTime TIME NULL,
    status ENUM('scheduled', 'started', 'in_progress', 'completed', 'cancelled', 'aborted') NOT NULL DEFAULT 'scheduled',
    startedAt TIMESTAMP NULL,
    inProgressAt TIMESTAMP NULL,
    completedAt TIMESTAMP NULL,
    cancelledAt TIMESTAMP NULL,
    cancellationReason VARCHAR(255) NULL,
    totalStudents INT NOT NULL DEFAULT 0,
    boardedCount INT NOT NULL DEFAULT 0,
    droppedOffCount INT NOT NULL DEFAULT 0,
    noShowCount INT NOT NULL DEFAULT 0,
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
    CONSTRAINT fk_trips_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_assistant
        FOREIGN KEY (assistantUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_trips_created_by
        FOREIGN KEY (createdByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_trip_route (routeId),
    INDEX idx_trip_date (tripDate),
    INDEX idx_trip_status (status),
    INDEX idx_trip_assignment (routeAssignmentId)
);

-- GPS Location Tracking
CREATE TABLE IF NOT EXISTS trip_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracyMeters DECIMAL(6,2) NULL,
    altitude DECIMAL(8,2) NULL,
    speedKmh DECIMAL(5,2) NULL,
    heading DECIMAL(5,2) NULL,
    recordedAt TIMESTAMP NOT NULL,
    recordedByUserId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_locations_trip
        FOREIGN KEY (tripId) REFERENCES trips(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_trip_locations_trip_time (tripId, recordedAt),
    INDEX idx_trip_locations_coords (latitude, longitude)
);

-- Trip Student Attendance
CREATE TABLE IF NOT EXISTS trip_student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL,
    studentId INT NOT NULL,
    routeStopId INT NULL,
    boardingStatus ENUM('not_boarded', 'boarded', 'dropped_off', 'absent', 'excused') NOT NULL DEFAULT 'not_boarded',
    boardedAt TIMESTAMP NULL,
    droppedOffAt TIMESTAMP NULL,
    boardingLatitude DECIMAL(10,8) NULL,
    boardingLongitude DECIMAL(11,8) NULL,
    dropoffLatitude DECIMAL(10,8) NULL,
    dropoffLongitude DECIMAL(11,8) NULL,
    verifiedByDriverId INT NULL,
    notes VARCHAR(500) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_trip_student_attendance UNIQUE (tripId, studentId),
    CONSTRAINT fk_trip_attendance_trip
        FOREIGN KEY (tripId) REFERENCES trips(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_trip_attendance_stop
        FOREIGN KEY (routeStopId) REFERENCES route_stops(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_trip_attendance_driver
        FOREIGN KEY (verifiedByDriverId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_trip_attendance_trip (tripId),
    INDEX idx_trip_attendance_status (boardingStatus)
);

-- Trip Lifecycle Events
CREATE TABLE IF NOT EXISTS trip_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL,
    eventType ENUM(
        'scheduled', 'started', 'in_progress', 'completed', 'cancelled',
        'attendance_updated', 'stop_arrival', 'stop_departure', 'deviation_detected', 'emergency'
    ) NOT NULL,
    description VARCHAR(500) NOT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    actorUserId INT NULL,
    actorName VARCHAR(255) NULL,
    actorRole VARCHAR(50) NULL,
    metadataJson JSON NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_events_trip
        FOREIGN KEY (tripId) REFERENCES trips(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_trip_events_actor
        FOREIGN KEY (actorUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_trip_events_trip (tripId, createdAt),
    INDEX idx_trip_events_type (eventType)
);

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

-- ============================================================================
-- PART 5: PARENT REQUESTS, NOTIFICATIONS & EVENT-DRIVEN ARCHITECTURE
-- ============================================================================

-- Parent Transport Requests
CREATE TABLE IF NOT EXISTS parent_transport_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestNumber VARCHAR(50) NOT NULL UNIQUE,
    parentUserId INT NOT NULL,
    studentId INT NOT NULL,
    currentRouteId INT NULL,
    requestType ENUM('route_change', 'stop_change', 'schedule_change', 'complaint', 'general_support', 'withdrawal') NOT NULL,
    requestTitle VARCHAR(255) NOT NULL,
    requestDetails TEXT NOT NULL,
    requestedPickupLocation VARCHAR(255) NULL,
    requestedDropoffLocation VARCHAR(255) NULL,
    requestedPickupStopId INT NULL,
    requestedDropoffStopId INT NULL,
    preferredRouteId INT NULL,
    preferredEffectiveDate DATE NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    status ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    managerReviewNotes TEXT NULL,
    reviewedByUserId INT NULL,
    reviewedAt TIMESTAMP NULL,
    parentNotifiedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_parent_request_parent
        FOREIGN KEY (parentUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_parent_request_current_route
        FOREIGN KEY (currentRouteId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_pickup_stop
        FOREIGN KEY (requestedPickupStopId) REFERENCES route_stops(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_preferred_route
        FOREIGN KEY (preferredRouteId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_reviewed_by
        FOREIGN KEY (reviewedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_parent_request_status (status),
    INDEX idx_parent_request_parent (parentUserId),
    INDEX idx_parent_request_priority (priority)
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    templateCode VARCHAR(50) NOT NULL UNIQUE,
    templateName VARCHAR(255) NOT NULL,
    eventType ENUM(
        'route_change_approved', 'route_change_rejected', 'trip_started', 'trip_completed',
        'vehicle_breakdown', 'complaint_submitted', 'complaint_resolved', 'incident_reported',
        'document_expiring', 'document_expired', 'attendance_marked', 'student_boarded',
        'student_dropped_off', 'request_received', 'maintenance_due'
    ) NOT NULL,
    channel ENUM('push', 'sms', 'email', 'in_app', 'all') NOT NULL DEFAULT 'in_app',
    subjectTemplate VARCHAR(500) NOT NULL,
    bodyTemplate TEXT NOT NULL,
    actionUrlTemplate VARCHAR(500) NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_template_event (eventType, channel)
);

-- Notifications Queue
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    templateId INT NULL,
    recipientUserId INT NULL,
    recipientRole ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'School Admin') NULL,
    recipientPhone VARCHAR(20) NULL,
    recipientEmail VARCHAR(255) NULL,
    eventType VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    dataJson JSON NULL,
    actionUrl VARCHAR(500) NULL,
    channel ENUM('push', 'sms', 'email', 'in_app') NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    status ENUM('pending', 'sent', 'delivered', 'failed', 'read') NOT NULL DEFAULT 'pending',
    sentAt TIMESTAMP NULL,
    deliveredAt TIMESTAMP NULL,
    readAt TIMESTAMP NULL,
    failureReason VARCHAR(500) NULL,
    retryCount INT NOT NULL DEFAULT 0,
    maxRetries INT NOT NULL DEFAULT 3,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipientUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_notification_recipient (recipientUserId, status),
    INDEX idx_notification_status (status, retryCount),
    INDEX idx_notification_event (eventType)
);

-- Event Store for Event-Driven Architecture
CREATE TABLE IF NOT EXISTS event_store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    eventId VARCHAR(36) NOT NULL UNIQUE,
    eventType VARCHAR(100) NOT NULL,
    aggregateType VARCHAR(100) NOT NULL,
    aggregateId VARCHAR(50) NOT NULL,
    version INT NOT NULL,
    payload JSON NOT NULL,
    metadata JSON NULL,
    occurredAt TIMESTAMP NOT NULL,
    processedAt TIMESTAMP NULL,
    processedBy VARCHAR(100) NULL,
    isPublished BOOLEAN NOT NULL DEFAULT FALSE,
    publishedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_aggregate_version UNIQUE (aggregateType, aggregateId, version),
    INDEX idx_event_type (eventType, occurredAt),
    INDEX idx_event_aggregate (aggregateType, aggregateId),
    INDEX idx_event_unpublished (isPublished, createdAt)
);

-- ============================================================================
-- PART 6: AUDIT LOGGING & SECURITY
-- ============================================================================

-- Comprehensive Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actorUserId INT NULL,
    actorType ENUM('user', 'system', 'api', 'external') NOT NULL DEFAULT 'user',
    actorIpAddress VARCHAR(45) NULL,
    actorUserAgent VARCHAR(500) NULL,
    sessionId VARCHAR(100) NULL,
    domain VARCHAR(100) NOT NULL,
    entityType VARCHAR(100) NOT NULL,
    entityId VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    actionDetails VARCHAR(500) NULL,
    previousStateJson LONGTEXT NULL,
    newStateJson LONGTEXT NULL,
    changesSummary JSON NULL,
    severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
    complianceRelevant BOOLEAN NOT NULL DEFAULT FALSE,
    retentionYears INT NOT NULL DEFAULT 7,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_actor
        FOREIGN KEY (actorUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_audit_actor (actorUserId, createdAt),
    INDEX idx_audit_entity (entityType, entityId),
    INDEX idx_audit_domain (domain, createdAt),
    INDEX idx_audit_action (action, createdAt),
    INDEX idx_audit_compliance (complianceRelevant, createdAt),
    INDEX idx_audit_created (createdAt)
);

-- Security Audit Logs
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    eventType ENUM(
        'login_success', 'login_failure', 'logout', 'password_change',
        'password_reset_request', 'password_reset_complete', 'account_locked',
        'account_unlocked', 'role_changed', 'permission_denied', 'suspicious_activity'
    ) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent VARCHAR(500) NULL,
    deviceInfo VARCHAR(255) NULL,
    locationInfo VARCHAR(255) NULL,
    success BOOLEAN NOT NULL,
    failureReason VARCHAR(500) NULL,
    metadata JSON NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_security_audit_user
        FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_security_audit_user (userId, createdAt),
    INDEX idx_security_audit_event (eventType, createdAt),
    INDEX idx_security_audit_ip (ipAddress, createdAt)
);

-- Failed Login Attempts Tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usernameOrEmail VARCHAR(255) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent VARCHAR(500) NULL,
    attemptAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failureReason VARCHAR(255) NULL,
    INDEX idx_failed_login_username (usernameOrEmail, attemptAt),
    INDEX idx_failed_login_ip (ipAddress, attemptAt)
);

-- ============================================================================
-- PART 7: REPORTING & ANALYTICS
-- ============================================================================

-- Daily Analytics Summary
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    summaryDate DATE NOT NULL,
    totalRoutes INT NOT NULL DEFAULT 0,
    totalTrips INT NOT NULL DEFAULT 0,
    completedTrips INT NOT NULL DEFAULT 0,
    cancelledTrips INT NOT NULL DEFAULT 0,
    totalStudentsTransported INT NOT NULL DEFAULT 0,
    totalDistanceKm DECIMAL(10,2) NOT NULL DEFAULT 0,
    totalFuelLiters DECIMAL(10,2) NOT NULL DEFAULT 0,
    totalFuelCost DECIMAL(12,2) NOT NULL DEFAULT 0,
    totalMaintenanceCost DECIMAL(12,2) NOT NULL DEFAULT 0,
    incidentCount INT NOT NULL DEFAULT 0,
    complaintCount INT NOT NULL DEFAULT 0,
    averageTripDurationMinutes INT NULL,
    driverAttendanceRate DECIMAL(5,2) NULL,
    vehicleUtilizationRate DECIMAL(5,2) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_analytics_date UNIQUE (summaryDate),
    INDEX idx_analytics_date (summaryDate)
);

-- Driver Performance Metrics
CREATE TABLE IF NOT EXISTS driver_performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driverUserId INT NOT NULL,
    metricMonth DATE NOT NULL,
    tripsCompleted INT NOT NULL DEFAULT 0,
    totalDistanceKm DECIMAL(10,2) NOT NULL DEFAULT 0,
    fuelEfficiency DECIMAL(6,2) NULL,
    onTimePercentage DECIMAL(5,2) NULL,
    safetyScore DECIMAL(5,2) NULL,
    incidentCount INT NOT NULL DEFAULT 0,
    complaintCount INT NOT NULL DEFAULT 0,
    attendanceRate DECIMAL(5,2) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_performance_driver
        FOREIGN KEY (driverUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT uq_performance_driver_month UNIQUE (driverUserId, metricMonth),
    INDEX idx_performance_month (metricMonth),
    INDEX idx_performance_driver (driverUserId)
);

-- Vehicle Utilization Metrics
CREATE TABLE IF NOT EXISTS vehicle_utilization_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    metricMonth DATE NOT NULL,
    daysInService INT NOT NULL DEFAULT 0,
    daysInMaintenance INT NOT NULL DEFAULT 0,
    totalTrips INT NOT NULL DEFAULT 0,
    totalDistanceKm DECIMAL(10,2) NOT NULL DEFAULT 0,
    fuelConsumed DECIMAL(10,2) NOT NULL DEFAULT 0,
    fuelCost DECIMAL(12,2) NOT NULL DEFAULT 0,
    maintenanceCost DECIMAL(12,2) NOT NULL DEFAULT 0,
    utilizationRate DECIMAL(5,2) NULL,
    costPerKm DECIMAL(8,2) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_utilization_plate
        FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT uq_utilization_plate_month UNIQUE (plate_number, metricMonth),
    INDEX idx_utilization_month (metricMonth),
    INDEX idx_utilization_plate (plate_number)
);

-- Route Efficiency Metrics
CREATE TABLE IF NOT EXISTS route_efficiency_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL,
    metricMonth DATE NOT NULL,
    tripsCompleted INT NOT NULL DEFAULT 0,
    totalStudentsTransported INT NOT NULL DEFAULT 0,
    averageStudentsPerTrip DECIMAL(5,2) NULL,
    averageTripDurationMinutes INT NULL,
    onTimePercentage DECIMAL(5,2) NULL,
    fuelConsumed DECIMAL(10,2) NOT NULL DEFAULT 0,
    costPerStudent DECIMAL(8,2) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_efficiency_route
        FOREIGN KEY (routeId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT uq_efficiency_route_month UNIQUE (routeId, metricMonth),
    INDEX idx_efficiency_month (metricMonth),
    INDEX idx_efficiency_route (routeId)
);

-- ============================================================================
-- PART 8: VEHICLE-ROUTE ASSIGNMENTS (Flexible morning/evening assignments)
-- ============================================================================

-- This table allows vehicles to be assigned to different routes for morning vs evening
-- A vehicle can serve the same route in both periods, or different routes
CREATE TABLE IF NOT EXISTS vehicle_route_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_plate VARCHAR(20) NOT NULL,
    route_id INT NOT NULL,
    time_period ENUM('Morning', 'Evening', 'Both') NOT NULL DEFAULT 'Both',
    
    -- Staff assignments for this vehicle-route-period combination
    driver_user_id INT NULL,
    assistant_user_id INT NULL,
    
    -- Effective dates for this assignment
    effective_from DATE NOT NULL DEFAULT (CURDATE()),
    effective_to DATE NULL,
    
    -- Status
    status ENUM('Active', 'Inactive', 'Temporary') NOT NULL DEFAULT 'Active',
    
    -- Notes (e.g., reason for assignment, special instructions)
    notes TEXT NULL,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    
    -- Indexes
    INDEX idx_vra_vehicle (vehicle_plate),
    INDEX idx_vra_route (route_id),
    INDEX idx_vra_period (time_period),
    INDEX idx_vra_status (status),
    INDEX idx_vra_effective (effective_from, effective_to),
    UNIQUE KEY uk_vehicle_route_period (vehicle_plate, route_id, time_period, effective_from),
    
    -- Foreign keys
    CONSTRAINT fk_vra_vehicle 
        FOREIGN KEY (vehicle_plate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_vra_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_vra_driver 
        FOREIGN KEY (driver_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_vra_assistant 
        FOREIGN KEY (assistant_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_vra_created_by 
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Assignment history for audit trail
CREATE TABLE IF NOT EXISTS vehicle_route_assignment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    route_id INT NOT NULL,
    time_period ENUM('Morning', 'Evening', 'Both') NOT NULL,
    
    -- What changed
    change_type ENUM('created', 'updated', 'deleted', 'reactivated') NOT NULL,
    
    -- Old and new values for tracking changes
    old_driver_id INT NULL,
    new_driver_id INT NULL,
    old_assistant_id INT NULL,
    new_assistant_id INT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NULL,
    old_effective_from DATE NULL,
    new_effective_from DATE NULL,
    old_effective_to DATE NULL,
    new_effective_to DATE NULL,
    
    -- Reason for change
    change_reason TEXT NULL,
    
    -- Audit
    changed_by_user_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_vrah_assignment (assignment_id),
    INDEX idx_vrah_vehicle (vehicle_plate),
    INDEX idx_vrah_date (changed_at),
    INDEX idx_vrah_type (change_type),
    
    -- Foreign keys
    CONSTRAINT fk_vrah_assignment 
        FOREIGN KEY (assignment_id) REFERENCES vehicle_route_assignments(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_vrah_changed_by 
        FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Trigger to log assignment changes
DELIMITER $$

CREATE TRIGGER after_vehicle_route_assignment_insert
AFTER INSERT ON vehicle_route_assignments
FOR EACH ROW
BEGIN
    INSERT INTO vehicle_route_assignment_history (
        assignment_id,
        vehicle_plate,
        route_id,
        time_period,
        change_type,
        new_driver_id,
        new_assistant_id,
        new_status,
        new_effective_from,
        new_effective_to,
        changed_by_user_id
    ) VALUES (
        NEW.id,
        NEW.vehicle_plate,
        NEW.route_id,
        NEW.time_period,
        'created',
        NEW.driver_user_id,
        NEW.assistant_user_id,
        NEW.status,
        NEW.effective_from,
        NEW.effective_to,
        NEW.created_by_user_id
    );
END$$

CREATE TRIGGER after_vehicle_route_assignment_update
AFTER UPDATE ON vehicle_route_assignments
FOR EACH ROW
BEGIN
    DECLARE has_change BOOLEAN DEFAULT FALSE;
    
    -- Check if any relevant field changed
    IF NEW.driver_user_id <=> OLD.driver_user_id AND 
       NEW.assistant_user_id <=> OLD.assistant_user_id AND
       NEW.status <=> OLD.status AND
       NEW.effective_from <=> OLD.effective_from AND
       NEW.effective_to <=> OLD.effective_to THEN
        SET has_change = FALSE;
    ELSE
        SET has_change = TRUE;
    END IF;
    
    IF has_change THEN
        INSERT INTO vehicle_route_assignment_history (
            assignment_id,
            vehicle_plate,
            route_id,
            time_period,
            change_type,
            old_driver_id,
            new_driver_id,
            old_assistant_id,
            new_assistant_id,
            old_status,
            new_status,
            old_effective_from,
            new_effective_from,
            old_effective_to,
            new_effective_to,
            changed_by_user_id
        ) VALUES (
            NEW.id,
            NEW.vehicle_plate,
            NEW.route_id,
            NEW.time_period,
            'updated',
            OLD.driver_user_id,
            NEW.driver_user_id,
            OLD.assistant_user_id,
            NEW.assistant_user_id,
            OLD.status,
            NEW.status,
            OLD.effective_from,
            NEW.effective_from,
            OLD.effective_to,
            NEW.effective_to,
            NEW.created_by_user_id
        );
    END IF;
END$$

DELIMITER ;

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

CREATE TABLE vehicle_details (
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

CREATE TABLE routes (
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
    CONSTRAINT uq_routes_route_id UNIQUE (route_id)
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
    confirmedBy VARCHAR(255) NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
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
    confirmedBy VARCHAR(255) NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
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

-- =====================================================
-- ROUTE MANAGEMENT TABLES
-- Integrating with existing schema
-- =====================================================

-- 1. ROUTES TABLE
-- =====================================================
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id VARCHAR(20) NOT NULL UNIQUE, -- Auto-generated: RT-001, RT-002, etc.
    route_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL, -- Mandatory field
    status ENUM('Active', 'Inactive', 'Draft') NOT NULL DEFAULT 'Draft',
    total_stops INT NOT NULL DEFAULT 0,
    
    -- Vehicle assignment
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_model VARCHAR(100),
    
    -- Staff assignments (store names for quick display)
    assigned_driver VARCHAR(100) NOT NULL,
    assigned_assistant VARCHAR(100) NOT NULL,
    
    -- Foreign keys to existing tables
    driver_id INT,
    assistant_id INT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id INT,
    
    -- Soft delete
    deleted_at TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_routes_status (status),
    INDEX idx_routes_route_id (route_id),
    INDEX idx_routes_vehicle_plate (vehicle_plate),
    INDEX idx_routes_assigned_driver (assigned_driver),
    INDEX idx_routes_deleted (deleted_at),
    
    -- Foreign keys
    CONSTRAINT fk_routes_vehicle_plate 
        FOREIGN KEY (vehicle_plate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_routes_driver 
        FOREIGN KEY (driver_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_routes_assistant 
        FOREIGN KEY (assistant_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_routes_created_by 
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- 2. STOPS TABLE
-- =====================================================
CREATE TABLE stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stop_id VARCHAR(20) NOT NULL UNIQUE, -- ST-001, ST-002, etc.
    stop_name VARCHAR(200) NOT NULL,
    stop_type ENUM('Pickup', 'Dropoff', 'Both') NOT NULL,
    address TEXT NOT NULL,
    landmark VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    sequence_order INT NOT NULL,
    students_assigned INT DEFAULT 0,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    
    -- Foreign key to route
    route_id INT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id INT,
    
    -- Soft delete
    deleted_at TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_stops_route_id (route_id),
    INDEX idx_stops_sequence (route_id, sequence_order),
    INDEX idx_stops_type (stop_type),
    INDEX idx_stops_status (status),
    INDEX idx_stops_deleted (deleted_at),
    
    -- Unique constraint for sequence order per route
    CONSTRAINT uk_stops_route_sequence UNIQUE (route_id, sequence_order),
    
    -- Foreign keys
    CONSTRAINT fk_stops_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_stops_created_by 
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- 3. TRIP_MONITORING TABLE (Daily trip tracking)
-- =====================================================
CREATE TABLE trip_monitoring (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id VARCHAR(30) NOT NULL UNIQUE, -- Format: TR-YYYYMMDD-001
    route_id INT NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    assistant_name VARCHAR(100),
    
    -- Times
    departure_time DATETIME NOT NULL,
    expected_return_time DATETIME NOT NULL,
    actual_return_time DATETIME,
    
    -- Status tracking
    status ENUM('On Time', 'Delayed', 'Completed', 'Not Started', 'Overdue') NOT NULL DEFAULT 'Not Started',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Progress tracking
    stops_completed INT DEFAULT 0,
    total_stops INT NOT NULL,
    
    -- Delay information
    delay_reason TEXT,
    delay_minutes INT,
    
    -- Additional info
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_trip_date (departure_time),
    INDEX idx_trip_status (status),
    INDEX idx_trip_route (route_id),
    INDEX idx_trip_vehicle (vehicle_plate),
    INDEX idx_trip_trip_id (trip_id),
    
    -- Foreign keys
    CONSTRAINT fk_trip_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_trip_vehicle_plate 
        FOREIGN KEY (vehicle_plate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 4. TRIP_STOPS TABLE (Checkpoint tracking for each trip)
-- =====================================================
CREATE TABLE trip_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    stop_id INT NOT NULL,
    stop_name VARCHAR(200) NOT NULL,
    scheduled_time TIME NOT NULL,
    actual_time DATETIME,
    status ENUM('Pending', 'Completed', 'Missed', 'Skipped') NOT NULL DEFAULT 'Pending',
    sequence_order INT NOT NULL,
    
    -- Geo-tracking for each stop
    arrival_latitude DECIMAL(10, 8),
    arrival_longitude DECIMAL(11, 8),
    
    -- Student counts at this stop
    students_picked INT DEFAULT 0,
    students_dropped INT DEFAULT 0,
    
    -- Timestamps
    completed_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_trip_stops_trip (trip_id),
    INDEX idx_trip_stops_status (status),
    INDEX idx_trip_stops_sequence (trip_id, sequence_order),
    
    -- Foreign keys
    CONSTRAINT fk_trip_stops_trip 
        FOREIGN KEY (trip_id) REFERENCES trip_monitoring(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_trip_stops_stop 
        FOREIGN KEY (stop_id) REFERENCES stops(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 5. DAILY_SCHEDULE (Pre-planned trips)
-- =====================================================
CREATE TABLE daily_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_date DATE NOT NULL,
    route_id INT NOT NULL,
    trip_id VARCHAR(30) UNIQUE,
    departure_time TIME NOT NULL,
    expected_return_time TIME NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    assistant_name VARCHAR(100),
    status ENUM('Scheduled', 'Completed', 'Cancelled', 'Delayed') NOT NULL DEFAULT 'Scheduled',
    
    -- Actual trip reference (when completed)
    actual_trip_id INT,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id INT,
    
    -- Indexes
    INDEX idx_schedule_date (schedule_date),
    INDEX idx_schedule_route (route_id),
    INDEX idx_schedule_status (status),
    UNIQUE KEY uk_schedule_date_route (schedule_date, route_id),
    
    -- Foreign keys
    CONSTRAINT fk_schedule_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_schedule_vehicle_plate 
        FOREIGN KEY (vehicle_plate) REFERENCES number_plates(plate_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_schedule_actual_trip 
        FOREIGN KEY (actual_trip_id) REFERENCES trip_monitoring(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_schedule_created_by 
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- 6. ROUTE_ASSIGNMENT_HISTORY (Audit log)
-- =====================================================
CREATE TABLE route_assignment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    changed_by_user_id INT NOT NULL,
    change_type ENUM('vehicle_change', 'driver_change', 'assistant_change', 'status_change') NOT NULL,
    
    old_value VARCHAR(200),
    new_value VARCHAR(200),
    
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_history_route (route_id),
    INDEX idx_history_date (changed_at),
    INDEX idx_history_type (change_type),
    
    -- Foreign keys
    CONSTRAINT fk_history_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_history_changed_by 
        FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 7. STUDENT_ROUTE_ASSIGNMENT (Link students to routes and stops)
-- =====================================================
CREATE TABLE student_route_assignment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    route_id INT NOT NULL,
    stop_id INT NOT NULL,
    trip_type ENUM('Morning', 'Evening', 'Both') NOT NULL DEFAULT 'Both',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by_user_id INT NOT NULL,
    
    status ENUM('Active', 'Inactive', 'Temporary') DEFAULT 'Active',
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_student_route_student (student_id),
    INDEX idx_student_route_route (route_id),
    INDEX idx_student_route_stop (stop_id),
    INDEX idx_student_route_status (status),
    UNIQUE KEY uk_student_route_type (student_id, route_id, trip_type),
    
    -- Foreign keys
    CONSTRAINT fk_student_route_student 
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_student_route_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_student_route_stop 
        FOREIGN KEY (stop_id) REFERENCES stops(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_student_route_assigned_by 
        FOREIGN KEY (assigned_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 8. ROUTE_OPTIMIZATION_LOGS (Future feature - store optimization results)
-- =====================================================
CREATE TABLE route_optimization_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    optimization_date DATE NOT NULL,
    
    -- Metrics
    original_distance_km DECIMAL(10, 2),
    optimized_distance_km DECIMAL(10, 2),
    distance_saved_km DECIMAL(10, 2),
    
    original_fuel_cost DECIMAL(12, 2),
    optimized_fuel_cost DECIMAL(12, 2),
    fuel_savings DECIMAL(12, 2),
    
    original_duration_min INT,
    optimized_duration_min INT,
    time_saved_min INT,
    
    -- Traffic data
    peak_hours_avoided BOOLEAN DEFAULT FALSE,
    alternate_routes_suggested TEXT,
    
    -- Status
    status ENUM('Pending', 'Applied', 'Rejected') DEFAULT 'Pending',
    
    optimization_data JSON, -- Store full optimization result as JSON
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT,
    applied_at TIMESTAMP,
    applied_by_user_id INT,
    
    -- Indexes
    INDEX idx_opt_route (route_id),
    INDEX idx_opt_date (optimization_date),
    
    -- Foreign keys
    CONSTRAINT fk_opt_route 
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_opt_created_by 
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_opt_applied_by 
        FOREIGN KEY (applied_by_user_id) REFERENCES users(id)
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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-generate route_id (RT-001, RT-002, etc.)
DELIMITER $$
CREATE TRIGGER before_insert_routes
BEFORE INSERT ON routes
FOR EACH ROW
BEGIN
    DECLARE next_id DECIMAL(30,0);
    IF NEW.route_id IS NULL OR NEW.route_id = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(route_id, 4) AS DECIMAL(30,0))), 0) + 1
        INTO next_id
        FROM routes
        WHERE route_id REGEXP '^RT-[0-9]+$';
        SET NEW.route_id = CONCAT('RT-', LPAD(next_id, 3, '0'));
    END IF;
END$$

-- Auto-generate stop_id (ST-001, ST-002, etc.)
CREATE TRIGGER before_insert_stops
BEFORE INSERT ON stops
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    IF NEW.stop_id IS NULL OR NEW.stop_id = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(stop_id, 4) AS UNSIGNED)), 0) + 1 INTO next_id FROM stops;
        SET NEW.stop_id = CONCAT('ST-', LPAD(next_id, 3, '0'));
    END IF;
END$$

-- Auto-generate trip_id (TR-YYYYMMDD-001)
CREATE TRIGGER before_insert_trip_monitoring
BEFORE INSERT ON trip_monitoring
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    DECLARE date_prefix VARCHAR(10);
    IF NEW.trip_id IS NULL OR NEW.trip_id = '' THEN
        SET date_prefix = DATE_FORMAT(NEW.departure_time, '%Y%m%d');
        SELECT COALESCE(MAX(CAST(SUBSTRING(trip_id, -3) AS UNSIGNED)), 0) + 1 
        INTO next_id 
        FROM trip_monitoring 
        WHERE trip_id LIKE CONCAT('TR-', date_prefix, '-%');
        SET NEW.trip_id = CONCAT('TR-', date_prefix, '-', LPAD(next_id, 3, '0'));
    END IF;
END$$

-- Update total_stops count on routes when stops change
CREATE TRIGGER after_insert_stops_update_route_count
AFTER INSERT ON stops
FOR EACH ROW
BEGIN
    UPDATE routes 
    SET total_stops = (SELECT COUNT(*) FROM stops WHERE route_id = NEW.route_id AND deleted_at IS NULL)
    WHERE id = NEW.route_id;
END$$

CREATE TRIGGER after_delete_stops_update_route_count
AFTER DELETE ON stops
FOR EACH ROW
BEGIN
    UPDATE routes 
    SET total_stops = (SELECT COUNT(*) FROM stops WHERE route_id = OLD.route_id AND deleted_at IS NULL)
    WHERE id = OLD.route_id;
END$$

DELIMITER ;

CREATE TABLE student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Trip reference
    trip_id INT NOT NULL,

    -- Student reference
    student_id INT NOT NULL,

    -- Stop where student should board/alight
    stop_id INT NOT NULL,

    -- Trip direction
    trip_type ENUM('Morning', 'Evening') NOT NULL,

    -- Attendance status
    boarding_status ENUM('Boarded', 'Absent', 'Missed Pickup', 'Parent Pickup') NOT NULL DEFAULT 'Absent',
    dropoff_status ENUM('Dropped Off', 'Not Dropped', 'Parent Pickup', 'Pending') NOT NULL DEFAULT 'Pending',

    -- Timestamps of actual events
    boarded_at DATETIME NULL,
    dropped_off_at DATETIME NULL,

    -- Who confirmed (bus assistant)
    confirmed_by_user_id INT NULL,

    -- Notes (e.g. reason for absence, emergency pickup details)
    notes TEXT NULL,

    -- Date of attendance (for easy daily querying without joining trip_monitoring)
    attendance_date DATE NOT NULL,

    -- Audit
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Prevent duplicate attendance record per student per trip per direction
    CONSTRAINT uq_student_trip_type UNIQUE (student_id, trip_id, trip_type),

    -- Indexes
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_attendance_student (student_id),
    INDEX idx_attendance_trip (trip_id),
    INDEX idx_attendance_stop (stop_id),
    INDEX idx_attendance_boarding_status (boarding_status),
    INDEX idx_attendance_dropoff_status (dropoff_status),

    -- Foreign keys
    CONSTRAINT fk_attendance_trip
        FOREIGN KEY (trip_id) REFERENCES trip_monitoring(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_stop
        FOREIGN KEY (stop_id) REFERENCES stops(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_confirmed_by
        FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);


DELIMITER $$

CREATE TRIGGER after_insert_trip_create_attendance
AFTER INSERT ON trip_monitoring
FOR EACH ROW
BEGIN
    -- Auto-create attendance records for all active students on this route
    INSERT INTO student_attendance (
        trip_id,
        student_id,
        stop_id,
        trip_type,
        boarding_status,
        dropoff_status,
        attendance_date
    )
    SELECT
        NEW.id,
        sra.student_id,
        sra.stop_id,
        -- Derive trip_type from departure time (Morning before 12:00, Evening after)
        CASE
            WHEN TIME(NEW.departure_time) < '12:00:00' THEN 'Morning'
            ELSE 'Evening'
        END,
        'Absent',   -- Default: not yet confirmed
        'Pending',  -- Default: not yet dropped off
        DATE(NEW.departure_time)
    FROM student_route_assignment sra
    WHERE sra.route_id = NEW.route_id
      AND sra.status = 'Active'
      AND (sra.effective_to IS NULL OR sra.effective_to >= DATE(NEW.departure_time))
      AND sra.effective_from <= DATE(NEW.departure_time)
      AND (
          -- Match trip_type to assignment
          sra.trip_type = 'Both'
          OR (sra.trip_type = 'Morning' AND TIME(NEW.departure_time) < '12:00:00')
          OR (sra.trip_type = 'Evening' AND TIME(NEW.departure_time) >= '12:00:00')
      );
END$$

DELIMITER ;
*/


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




