-- =============================================================================
--                    SCHOOL TRANSPORT MANAGEMENT SYSTEM
--                   Consolidated Database Schema v2.0
-- =============================================================================
-- This schema merges all previous versions, eliminates duplicates, and adds
-- comprehensive comments. All tables are defined once with the richest
-- column set. Foreign keys are updated to reference the consolidated tables.
-- =============================================================================

-- =============================================================================
-- 1.  CORE IDENTITY & ACCESS MANAGEMENT
-- =============================================================================

-- Users: system actors (parents, drivers, staff, admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique user ID',
    firstName VARCHAR(255) NOT NULL COMMENT 'Given name',
    lastName VARCHAR(255) NOT NULL COMMENT 'Family name',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Login email (unique)',
    phoneNumber VARCHAR(20) NOT NULL UNIQUE COMMENT 'Primary contact number',
    parentIdType VARCHAR(10) NULL COMMENT 'National ID type (e.g., ID, Passport)',
    parentIdNumber VARCHAR(50) NULL COMMENT 'Parent identifier for linking to students',
    numberPlate VARCHAR(20) NULL COMMENT 'Vehicle plate if user is a driver',
    profilePhotoUrl VARCHAR(500) NULL COMMENT 'S3/Cloudinary URL of profile picture',
    profilePhotoKey VARCHAR(255) NULL COMMENT 'Storage key for the photo',
    password VARCHAR(255) NOT NULL COMMENT 'Bcrypt‑hashed password',
    role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'Fuel Manager', 'School Admin') NOT NULL COMMENT 'User role',
    status ENUM('active', 'suspended', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Account status',
    failedLoginAttempts INT NOT NULL DEFAULT 0 COMMENT 'Consecutive failed logins',
    lockedUntil TIMESTAMP NULL COMMENT 'Account locked until this time',
    lastLoginAt TIMESTAMP NULL COMMENT 'Last successful login timestamp',
    passwordChangedAt TIMESTAMP NULL COMMENT 'Last password change',
    mustChangePassword BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Force password reset on next login',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_phoneNumber_numeric CHECK (phoneNumber REGEXP '^[0-9]+$'),
    CONSTRAINT uq_parent_identifier UNIQUE (parentIdType, parentIdNumber),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status),
    INDEX idx_users_email (email)
) COMMENT='System users with roles and security tracking';

-- Staff Profiles: additional HR data for employees
CREATE TABLE IF NOT EXISTS staff_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE COMMENT 'FK to users.id',
    employeeId VARCHAR(50) NOT NULL UNIQUE COMMENT 'Staff ID',
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
    CONSTRAINT fk_staff_profile_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_staff_employee_id (employeeId)
) COMMENT='Extended profile for employees (drivers, assistants, managers)';

-- Driver Licenses: track driver qualifications and expiry
CREATE TABLE IF NOT EXISTS driver_licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL COMMENT 'FK to users.id',
    licenseNumber VARCHAR(100) NOT NULL COMMENT 'License number',
    licenseType ENUM('A', 'B', 'C', 'D', 'E', 'F') NOT NULL COMMENT 'License class',
    issuingAuthority VARCHAR(255) NOT NULL,
    issueDate DATE NOT NULL,
    expiryDate DATE NOT NULL,
    psvBadgeNumber VARCHAR(50) NULL COMMENT 'PSV badge if applicable',
    psvBadgeExpiry DATE NULL,
    status ENUM('valid', 'expired', 'suspended', 'revoked') NOT NULL DEFAULT 'valid',
    isPrimary BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Primary license for the driver',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_license_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_driver_license_number UNIQUE (licenseNumber),
    INDEX idx_driver_license_expiry (expiryDate),
    INDEX idx_driver_license_user (userId, status)
) COMMENT='Driver license and PSV badge details';

-- =============================================================================
-- 2.  FLEET MANAGEMENT (Vehicles, Fuel, Maintenance)
-- =============================================================================

-- Vehicles: replaces number_plates and vehicle_details
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE COMMENT 'Vehicle registration number',
    status ENUM('active', 'in_route', 'maintenance', 'breakdown', 'retired', 'inactive') NOT NULL DEFAULT 'active',
    capacity INT NOT NULL DEFAULT 0 CHECK (capacity >= 0) COMMENT 'Seating capacity',
    vehicleType ENUM('Bus', 'Mini Bus', 'Van', 'SUV', 'Sedan') NOT NULL DEFAULT 'Bus',
    make VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    year INT NULL,
    vin VARCHAR(50) NULL COMMENT 'Chassis/VIN',
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
    currentMileage INT NOT NULL DEFAULT 0 COMMENT 'Odometer reading',
    fuelCapacity DECIMAL(8,2) NULL COMMENT 'Tank capacity in liters',
    isCompliant BOOLEAN GENERATED ALWAYS AS (
        (status NOT IN ('maintenance', 'breakdown', 'retired')) AND
        (insuranceExpiryDate IS NULL OR insuranceExpiryDate > CURDATE()) AND
        (inspectionExpiryDate IS NULL OR inspectionExpiryDate > CURDATE())
    ) STORED COMMENT 'Computed: vehicle is fully compliant',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vehicle_status (status),
    INDEX idx_vehicle_compliance (isCompliant),
    INDEX idx_vehicle_insurance_expiry (insuranceExpiryDate),
    INDEX idx_vehicle_inspection_expiry (inspectionExpiryDate)
) COMMENT='Fleet vehicles with compliance tracking';

-- Fuel Logs: individual fuel fill‑ups
CREATE TABLE IF NOT EXISTS fuel_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL COMMENT 'FK to vehicles.plate_number',
    driverUserId INT NOT NULL COMMENT 'Driver who refueled',
    fuelDate DATE NOT NULL,
    fuelTime TIME NOT NULL,
    mileage INT NOT NULL COMMENT 'Odometer at refuel',
    fuelType ENUM('diesel', 'petrol', 'electric', 'hybrid') NOT NULL,
    litersFilled DECIMAL(8,2) NOT NULL,
    costPerLiter DECIMAL(8,2) NOT NULL,
    totalCost DECIMAL(12,2) NOT NULL,
    stationName VARCHAR(255) NULL,
    stationLocation VARCHAR(255) NULL,
    receiptNumber VARCHAR(100) NULL,
    isVerified BOOLEAN NOT NULL DEFAULT FALSE,
    verifiedByUserId INT NULL COMMENT 'Manager who verified',
    verifiedAt TIMESTAMP NULL,
    notes TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fuel_log_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_log_driver FOREIGN KEY (driverUserId) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_log_verified_by FOREIGN KEY (verifiedByUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_fuel_log_plate_date (plate_number, fuelDate),
    INDEX idx_fuel_log_driver (driverUserId),
    INDEX idx_fuel_log_date (fuelDate)
) COMMENT='Fuel purchase logs for each vehicle';

-- Maintenance Records: work performed on vehicles
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL COMMENT 'FK to vehicles.plate_number',
    maintenanceType ENUM('scheduled', 'preventive', 'corrective', 'emergency', 'inspection') NOT NULL,
    category ENUM(
        'Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical',
        'Body Work', 'Tires', 'Oil Change', 'General Service', 'Insurance Claim', 'Other'
    ) NOT NULL,
    serviceDate DATE NOT NULL,
    completionDate DATE NULL,
    mileage INT NOT NULL COMMENT 'Odometer at service start',
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
    CONSTRAINT fk_maintenance_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_created_by FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_completed_by FOREIGN KEY (completedByUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_maintenance_plate (plate_number),
    INDEX idx_maintenance_status (status),
    INDEX idx_maintenance_date (serviceDate)
) COMMENT='Vehicle maintenance and repair jobs';

-- =============================================================================
-- 3.  ROUTE MANAGEMENT
-- =============================================================================

-- Routes: templates for pick‑up/drop‑off routes (no date, reusable)
CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeCode VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique identifier (e.g., RT-001)',
    routeName VARCHAR(255) NOT NULL,
    description TEXT NULL,
    routeType ENUM('pickup', 'dropoff', 'combined') NOT NULL DEFAULT 'combined',
    estimatedDurationMinutes INT NULL,
    totalDistanceKm DECIMAL(8,2) NULL,
    status ENUM('active', 'inactive', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    maxCapacity INT NOT NULL DEFAULT 0 COMMENT 'Maximum students on this route',
    currentStudentCount INT NOT NULL DEFAULT 0 COMMENT 'Currently assigned students',
    isFull BOOLEAN GENERATED ALWAYS AS (currentStudentCount >= maxCapacity) STORED,
    createdByUserId INT NOT NULL COMMENT 'Who created the route',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_routes_created_by FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_route_status (status),
    INDEX idx_route_full (isFull)
) COMMENT='Route templates (recurring, without specific dates)';

-- Stops: locations on a route (pick‑up/drop‑off points)
CREATE TABLE IF NOT EXISTS stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL COMMENT 'FK to routes.id',
    stopOrder INT NOT NULL COMMENT 'Sequence along the route',
    stopType ENUM('pickup', 'dropoff') NOT NULL,
    locationName VARCHAR(255) NOT NULL,
    address TEXT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    geofenceRadiusMeters INT NULL DEFAULT 100 COMMENT 'GPS geofence radius',
    scheduledTime TIME NULL COMMENT 'Target arrival time',
    timeWindowMinutes INT NULL DEFAULT 5 COMMENT 'Allowed lateness (minutes)',
    isMandatory BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Must stop even if no students?',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_stop_order UNIQUE (routeId, stopOrder),
    CONSTRAINT fk_stops_route FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE CASCADE,
    INDEX idx_stops_route (routeId),
    INDEX idx_stops_location (latitude, longitude)
) COMMENT='Route stops with GPS and timing data';

-- Route Assignments: assign a vehicle, driver, assistant to a route for a period
CREATE TABLE IF NOT EXISTS route_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL COMMENT 'FK to routes.id',
    plate_number VARCHAR(20) NOT NULL COMMENT 'FK to vehicles.plate_number',
    driverUserId INT NOT NULL COMMENT 'FK to users.id (role Driver)',
    assistantUserId INT NULL COMMENT 'FK to users.id (role Bus Assistant)',
    status ENUM('active', 'inactive', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP NULL,
    assignmentNotes TEXT NULL,
    createdByUserId INT NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_assignment_active UNIQUE (routeId, status, assignedAt),
    CONSTRAINT fk_route_assign_route FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_driver FOREIGN KEY (driverUserId) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_route_assign_assistant FOREIGN KEY (assistantUserId) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_route_assign_created_by FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_route_assign_route (routeId, status),
    INDEX idx_route_assign_driver (driverUserId, status),
    INDEX idx_route_assign_plate (plate_number, status)
) COMMENT='Assignment of vehicles/staff to routes (historical and current)';

-- Student Route Assignments: link students to a route and specific stops
CREATE TABLE IF NOT EXISTS route_student_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL COMMENT 'FK to routes.id',
    studentId INT NOT NULL COMMENT 'FK to students.id',
    pickupStopId INT NULL COMMENT 'FK to stops.id (where student boards)',
    dropoffStopId INT NULL COMMENT 'FK to stops.id (where student alights)',
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignedByUserId INT NOT NULL,
    status ENUM('active', 'inactive', 'removed') NOT NULL DEFAULT 'active',
    removalReason VARCHAR(255) NULL,
    removedAt TIMESTAMP NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_student_active UNIQUE (routeId, studentId, status),
    CONSTRAINT fk_route_student_route FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_route_student_pickup_stop FOREIGN KEY (pickupStopId) REFERENCES stops(id) ON DELETE SET NULL,
    CONSTRAINT fk_route_student_dropoff_stop FOREIGN KEY (dropoffStopId) REFERENCES stops(id) ON DELETE SET NULL,
    CONSTRAINT fk_route_student_assigned_by FOREIGN KEY (assignedByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_route_student_route (routeId, status),
    INDEX idx_route_student_student (studentId, status)
) COMMENT='Which students are assigned to which route and their boarding/alighting stops';

-- =============================================================================
-- 4.  TRIP & ATTENDANCE DOMAIN (Daily execution)
-- =============================================================================

-- Trips: actual instances of a route on a specific date/time
CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeId INT NOT NULL COMMENT 'FK to routes.id',
    routeAssignmentId INT NOT NULL COMMENT 'FK to route_assignments.id',
    plate_number VARCHAR(20) NOT NULL COMMENT 'FK to vehicles.plate_number',
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
    totalStudents INT NOT NULL DEFAULT 0 COMMENT 'Number of students expected',
    boardedCount INT NOT NULL DEFAULT 0,
    droppedOffCount INT NOT NULL DEFAULT 0,
    noShowCount INT NOT NULL DEFAULT 0,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_trips_route FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trips_route_assignment FOREIGN KEY (routeAssignmentId) REFERENCES route_assignments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trips_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE RESTRICT,
    CONSTRAINT fk_trips_driver FOREIGN KEY (driverUserId) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trips_assistant FOREIGN KEY (assistantUserId) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_trips_created_by FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_trip_route (routeId),
    INDEX idx_trip_date (tripDate),
    INDEX idx_trip_status (status),
    INDEX idx_trip_assignment (routeAssignmentId)
) COMMENT='Daily trips (instances of routes) with status and student counts';

-- GPS Location Tracking: continuous positions during a trip
CREATE TABLE IF NOT EXISTS trip_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL COMMENT 'FK to trips.id',
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracyMeters DECIMAL(6,2) NULL,
    altitude DECIMAL(8,2) NULL,
    speedKmh DECIMAL(5,2) NULL,
    heading DECIMAL(5,2) NULL,
    recordedAt TIMESTAMP NOT NULL COMMENT 'When the location was captured',
    recordedByUserId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_locations_trip FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE,
    INDEX idx_trip_locations_trip_time (tripId, recordedAt),
    INDEX idx_trip_locations_coords (latitude, longitude)
) COMMENT='Real‑time GPS breadcrumbs for each trip';

-- Trip Student Attendance: per‑student boarding and drop‑off status
CREATE TABLE IF NOT EXISTS trip_student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL COMMENT 'FK to trips.id',
    studentId INT NOT NULL COMMENT 'FK to students.id',
    routeStopId INT NULL COMMENT 'FK to stops.id (the stop where this event occurred)',
    boardingStatus ENUM('not_boarded', 'boarded', 'dropped_off', 'absent', 'excused') NOT NULL DEFAULT 'not_boarded',
    boardedAt TIMESTAMP NULL,
    droppedOffAt TIMESTAMP NULL,
    boardingLatitude DECIMAL(10,8) NULL,
    boardingLongitude DECIMAL(11,8) NULL,
    dropoffLatitude DECIMAL(10,8) NULL,
    dropoffLongitude DECIMAL(11,8) NULL,
    verifiedByDriverId INT NULL COMMENT 'Driver who marked attendance',
    notes VARCHAR(500) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_trip_student_attendance UNIQUE (tripId, studentId),
    CONSTRAINT fk_trip_attendance_trip FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_attendance_stop FOREIGN KEY (routeStopId) REFERENCES stops(id) ON DELETE SET NULL,
    CONSTRAINT fk_trip_attendance_driver FOREIGN KEY (verifiedByDriverId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_trip_attendance_trip (tripId),
    INDEX idx_trip_attendance_status (boardingStatus)
) COMMENT='Individual student attendance for each trip';

-- Trip Lifecycle Events: log of all actions and status changes
CREATE TABLE IF NOT EXISTS trip_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tripId INT NOT NULL COMMENT 'FK to trips.id',
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
    metadataJson JSON NULL COMMENT 'Additional structured data',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_events_trip FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_events_actor FOREIGN KEY (actorUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_trip_events_trip (tripId, createdAt),
    INDEX idx_trip_events_type (eventType)
) COMMENT='Audit trail of trip events and actions';

-- =============================================================================
-- 5.  INCIDENTS, COMPLAINTS, AND COMPLIANCE
-- =============================================================================

-- Incident Reports: accidents, breakdowns, misconduct, etc.
CREATE TABLE IF NOT EXISTS incident_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incidentNumber VARCHAR(50) NOT NULL UNIQUE COMMENT 'Auto‑generated identifier',
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
    childrenInvolved TEXT NOT NULL COMMENT 'List of student IDs or names',
    description TEXT NOT NULL,
    immediateActionTaken TEXT NOT NULL,
    followUpRequired BOOLEAN NOT NULL DEFAULT FALSE,
    followUpCompletedAt TIMESTAMP NULL,
    followUpCompletedByUserId INT NULL,
    resolutionStatus ENUM('open', 'investigating', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    resolutionNotes TEXT NULL,
    plate_number VARCHAR(20) NOT NULL COMMENT 'Vehicle involved',
    driverUserId INT NULL COMMENT 'Driver involved (if any)',
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_report_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE RESTRICT,
    CONSTRAINT fk_incident_report_driver FOREIGN KEY (driverUserId) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_incident_report_created_by FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_incident_severity (severityLevel),
    INDEX idx_incident_status (resolutionStatus),
    INDEX idx_incident_escalation (escalationTier),
    INDEX idx_incident_date (incidentDate)
) COMMENT='Reports of accidents, breakdowns, and other incidents';

-- Complaint Reports: grievances from parents, staff, or community
CREATE TABLE IF NOT EXISTS complaint_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaintNumber VARCHAR(50) NOT NULL UNIQUE,
    reportedBy VARCHAR(255) NOT NULL COMMENT 'Name of complainant',
    reporterType ENUM('Parent', 'Driver', 'Assistant', 'Student', 'Staff', 'Community', 'Anonymous') NOT NULL,
    contactPhoneNumber VARCHAR(20) NULL,
    contactEmail VARCHAR(255) NULL,
    plate_number VARCHAR(20) NULL COMMENT 'Vehicle involved (if any)',
    tripId INT NULL COMMENT 'Trip involved (if any)',
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
    CONSTRAINT fk_complaint_report_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE SET NULL,
    CONSTRAINT fk_complaint_report_trip FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    CONSTRAINT fk_complaint_report_assigned_to FOREIGN KEY (assignedToUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_complaint_status (status),
    INDEX idx_complaint_severity (severity),
    INDEX idx_complaint_assigned (assignedToUserId)
) COMMENT='Complaints from parents/community about transport services';

-- Compliance Documents: mandatory certificates, insurance, licenses
CREATE TABLE IF NOT EXISTS compliance_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documentNumber VARCHAR(100) NULL,
    relatedTo ENUM('Vehicle', 'Driver', 'Assistant', 'Route', 'School') NOT NULL,
    relatedEntityId INT NULL COMMENT 'ID of the related entity (if any)',
    entityIdentifier VARCHAR(50) NULL COMMENT 'Plate number or staff ID',
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
    fileKey VARCHAR(255) NOT NULL COMMENT 'S3 key',
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
    CONSTRAINT fk_compliance_document_previous FOREIGN KEY (previousVersionId) REFERENCES compliance_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_compliance_document_verified_by FOREIGN KEY (verifiedByUserId) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_compliance_document_created_by FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_compliance_entity (relatedTo, entityIdentifier),
    INDEX idx_compliance_type (documentType),
    INDEX idx_compliance_expiry (validToDate),
    INDEX idx_compliance_status (status),
    INDEX idx_compliance_latest (isLatestVersion)
) COMMENT='All compliance documents with versioning and expiry alerts';

-- Compliance Alerts: automated warnings for expiring/expired documents
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documentId INT NOT NULL COMMENT 'FK to compliance_documents.id',
    alertType ENUM('expiring_soon', 'expired', 'revoked') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    alertMessage TEXT NOT NULL,
    isAcknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledgedByUserId INT NULL,
    acknowledgedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_document FOREIGN KEY (documentId) REFERENCES compliance_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_acknowledged_by FOREIGN KEY (acknowledgedByUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_alert_status (isAcknowledged),
    INDEX idx_alert_severity (severity)
) COMMENT='Alerts generated by compliance document expiry';

-- =============================================================================
-- 6.  PARENT REQUESTS, NOTIFICATIONS & EVENT STORE
-- =============================================================================

-- Parent Transport Requests: route changes, complaints, support tickets
CREATE TABLE IF NOT EXISTS parent_transport_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestNumber VARCHAR(50) NOT NULL UNIQUE,
    parentUserId INT NOT NULL COMMENT 'FK to users.id',
    studentId INT NOT NULL COMMENT 'FK to students.id',
    currentRouteId INT NULL COMMENT 'Current route (if any)',
    requestType ENUM('route_change', 'stop_change', 'schedule_change', 'complaint', 'general_support', 'withdrawal') NOT NULL,
    requestTitle VARCHAR(255) NOT NULL,
    requestDetails TEXT NOT NULL,
    requestedPickupLocation VARCHAR(255) NULL,
    requestedDropoffLocation VARCHAR(255) NULL,
    requestedPickupStopId INT NULL COMMENT 'Proposed new pickup stop',
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
    CONSTRAINT fk_parent_request_parent FOREIGN KEY (parentUserId) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_parent_request_current_route FOREIGN KEY (currentRouteId) REFERENCES routes(id) ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_pickup_stop FOREIGN KEY (requestedPickupStopId) REFERENCES stops(id) ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_preferred_route FOREIGN KEY (preferredRouteId) REFERENCES routes(id) ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_reviewed_by FOREIGN KEY (reviewedByUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_parent_request_status (status),
    INDEX idx_parent_request_parent (parentUserId),
    INDEX idx_parent_request_priority (priority)
) COMMENT='Parent‑initiated requests for route changes or support';

-- Notification Templates: reusable templates for different events
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
) COMMENT='Templates for generating notifications';

-- Notifications: outbound messages to users
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
    CONSTRAINT fk_notification_recipient FOREIGN KEY (recipientUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_notification_recipient (recipientUserId, status),
    INDEX idx_notification_status (status, retryCount),
    INDEX idx_notification_event (eventType)
) COMMENT='Queued and sent notifications';

-- Event Store: event‑sourcing log for domain events
CREATE TABLE IF NOT EXISTS event_store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    eventId VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID',
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
) COMMENT='Event‑sourcing log for all domain events';

-- =============================================================================
-- 7.  AUDIT LOGGING & SECURITY
-- =============================================================================

-- Comprehensive Audit Logs: track all data changes
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
    CONSTRAINT fk_audit_log_actor FOREIGN KEY (actorUserId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_actor (actorUserId, createdAt),
    INDEX idx_audit_entity (entityType, entityId),
    INDEX idx_audit_domain (domain, createdAt),
    INDEX idx_audit_action (action, createdAt),
    INDEX idx_audit_compliance (complianceRelevant, createdAt),
    INDEX idx_audit_created (createdAt)
) COMMENT='Audit trail of all data modifications';

-- Security Audit Logs: login, logout, password changes, etc.
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
    CONSTRAINT fk_security_audit_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_security_audit_user (userId, createdAt),
    INDEX idx_security_audit_event (eventType, createdAt),
    INDEX idx_security_audit_ip (ipAddress, createdAt)
) COMMENT='Security‑related events (logins, password changes, etc.)';

-- Failed Login Attempts: used for brute‑force detection
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usernameOrEmail VARCHAR(255) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent VARCHAR(500) NULL,
    attemptAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failureReason VARCHAR(255) NULL,
    INDEX idx_failed_login_username (usernameOrEmail, attemptAt),
    INDEX idx_failed_login_ip (ipAddress, attemptAt)
) COMMENT='Track failed login attempts for security monitoring';

-- =============================================================================
-- 8.  REPORTING & ANALYTICS
-- =============================================================================

-- Daily Summary: aggregated metrics per day
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
) COMMENT='Daily aggregated metrics for dashboards';

-- Driver Performance Metrics: monthly evaluation
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
    CONSTRAINT fk_performance_driver FOREIGN KEY (driverUserId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_performance_driver_month UNIQUE (driverUserId, metricMonth),
    INDEX idx_performance_month (metricMonth),
    INDEX idx_performance_driver (driverUserId)
) COMMENT='Monthly performance KPIs for drivers';

-- Vehicle Utilization Metrics: monthly usage stats
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
    CONSTRAINT fk_utilization_plate FOREIGN KEY (plate_number) REFERENCES vehicles(plate_number) ON DELETE CASCADE,
    CONSTRAINT uq_utilization_plate_month UNIQUE (plate_number, metricMonth),
    INDEX idx_utilization_month (metricMonth),
    INDEX idx_utilization_plate (plate_number)
) COMMENT='Monthly utilization and cost metrics per vehicle';

-- Route Efficiency Metrics: monthly route performance
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
    CONSTRAINT fk_efficiency_route FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE CASCADE,
    CONSTRAINT uq_efficiency_route_month UNIQUE (routeId, metricMonth),
    INDEX idx_efficiency_month (metricMonth),
    INDEX idx_efficiency_route (routeId)
) COMMENT='Monthly efficiency metrics per route';

-- =============================================================================
-- 9.  TRANSPORT CALENDAR & SCHEDULING
-- =============================================================================

-- Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_academic_years_range (start_date, end_date)
) COMMENT='Academic years for transport scheduling';

-- Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    transport_enabled TINYINT(1) DEFAULT 1 COMMENT 'Transport operates during this term?',
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    INDEX idx_terms_range (start_date, end_date)
) COMMENT='Terms within academic years';

-- Transport Operating Days: which days of the week are active
CREATE TABLE IF NOT EXISTS transport_operating_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year_id INT NULL,
    weekday TINYINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6) COMMENT '0=Sunday, 6=Saturday',
    enabled TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
) COMMENT='Weekday‑by‑weekday operating status for a year';

-- Transport Calendar Events: holidays, closures, special days
CREATE TABLE IF NOT EXISTS transport_calendar_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year_id INT NULL,
    academic_term_id INT NULL,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('half-term', 'mid-term', 'holiday', 'public-holiday', 'closure', 'makeup', 'exam', 'sports', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    transport_enabled TINYINT(1) DEFAULT 0 COMMENT 'Transport runs on these days?',
    description TEXT,
    status VARCHAR(30) DEFAULT 'active',
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE SET NULL,
    INDEX idx_calendar_events_dates (start_date, end_date)
) COMMENT='Calendar events affecting transport availability';

-- Holiday Overrides: specific dates when transport is turned off/on
CREATE TABLE IF NOT EXISTS holiday_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    reason TEXT,
    transport_enabled TINYINT(1) DEFAULT 0,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_holiday_overrides_date (date)
) COMMENT='Date‑specific overrides for holidays or special closures';

-- Special Transport Days: extra transport on otherwise off days
CREATE TABLE IF NOT EXISTS special_transport_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    transport_enabled TINYINT(1) DEFAULT 1,
    description TEXT,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_special_transport_days_date (date)
) COMMENT='Days when transport is provided outside normal schedule';

-- Trip Generation Rules: configuration for auto‑generating trips
CREATE TABLE IF NOT EXISTS trip_generation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active TINYINT(1) DEFAULT 1,
    rule_json JSON COMMENT 'Rule parameters (e.g., lead time, cancellation policy)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Rules for automatically generating daily trips from routes';

-- =============================================================================
-- 10. FLEXIBLE VEHICLE-ROUTE ASSIGNMENTS (Morning/Evening)
-- =============================================================================

-- Vehicle‑Route Assignments: different vehicle/staff per period for the same route
CREATE TABLE IF NOT EXISTS vehicle_route_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_plate VARCHAR(20) NOT NULL COMMENT 'FK to vehicles.plate_number',
    route_id INT NOT NULL COMMENT 'FK to routes.id',
    time_period ENUM('Morning', 'Evening', 'Both') NOT NULL DEFAULT 'Both',
    driver_user_id INT NULL COMMENT 'Driver for this period',
    assistant_user_id INT NULL,
    effective_from DATE NOT NULL DEFAULT (CURDATE()),
    effective_to DATE NULL,
    status ENUM('Active', 'Inactive', 'Temporary') NOT NULL DEFAULT 'Active',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    INDEX idx_vra_vehicle (vehicle_plate),
    INDEX idx_vra_route (route_id),
    INDEX idx_vra_period (time_period),
    INDEX idx_vra_status (status),
    INDEX idx_vra_effective (effective_from, effective_to),
    UNIQUE KEY uk_vehicle_route_period (vehicle_plate, route_id, time_period, effective_from),
    CONSTRAINT fk_vra_vehicle FOREIGN KEY (vehicle_plate) REFERENCES vehicles(plate_number) ON DELETE RESTRICT,
    CONSTRAINT fk_vra_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vra_driver FOREIGN KEY (driver_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_vra_assistant FOREIGN KEY (assistant_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_vra_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) COMMENT='Flexible assignment of vehicle/staff to a route for morning/evening periods';

-- Assignment History: audit trail for changes
CREATE TABLE IF NOT EXISTS vehicle_route_assignment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL COMMENT 'FK to vehicle_route_assignments.id',
    vehicle_plate VARCHAR(20) NOT NULL,
    route_id INT NOT NULL,
    time_period ENUM('Morning', 'Evening', 'Both') NOT NULL,
    change_type ENUM('created', 'updated', 'deleted', 'reactivated') NOT NULL,
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
    change_reason TEXT NULL,
    changed_by_user_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vrah_assignment (assignment_id),
    INDEX idx_vrah_vehicle (vehicle_plate),
    INDEX idx_vrah_date (changed_at),
    INDEX idx_vrah_type (change_type),
    CONSTRAINT fk_vrah_assignment FOREIGN KEY (assignment_id) REFERENCES vehicle_route_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_vrah_changed_by FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) COMMENT='Audit log for vehicle‑route assignment changes';

-- Triggers to automatically populate history (optional)
DELIMITER $$
CREATE TRIGGER after_vra_insert
AFTER INSERT ON vehicle_route_assignments
FOR EACH ROW
BEGIN
    INSERT INTO vehicle_route_assignment_history (
        assignment_id, vehicle_plate, route_id, time_period,
        change_type, new_driver_id, new_assistant_id,
        new_status, new_effective_from, new_effective_to,
        changed_by_user_id
    ) VALUES (
        NEW.id, NEW.vehicle_plate, NEW.route_id, NEW.time_period,
        'created', NEW.driver_user_id, NEW.assistant_user_id,
        NEW.status, NEW.effective_from, NEW.effective_to,
        NEW.created_by_user_id
    );
END$$

CREATE TRIGGER after_vra_update
AFTER UPDATE ON vehicle_route_assignments
FOR EACH ROW
BEGIN
    IF NEW.driver_user_id <=> OLD.driver_user_id OR
       NEW.assistant_user_id <=> OLD.assistant_user_id OR
       NEW.status <=> OLD.status OR
       NEW.effective_from <=> OLD.effective_from OR
       NEW.effective_to <=> OLD.effective_to THEN
        INSERT INTO vehicle_route_assignment_history (
            assignment_id, vehicle_plate, route_id, time_period,
            change_type,
            old_driver_id, new_driver_id,
            old_assistant_id, new_assistant_id,
            old_status, new_status,
            old_effective_from, new_effective_from,
            old_effective_to, new_effective_to,
            changed_by_user_id
        ) VALUES (
            NEW.id, NEW.vehicle_plate, NEW.route_id, NEW.time_period,
            'updated',
            OLD.driver_user_id, NEW.driver_user_id,
            OLD.assistant_user_id, NEW.assistant_user_id,
            OLD.status, NEW.status,
            OLD.effective_from, NEW.effective_from,
            OLD.effective_to, NEW.effective_to,
            NEW.created_by_user_id
        );
    END IF;
END$$
DELIMITER ;

-- =============================================================================
-- 11. ADDITIONAL UTILITY TABLES
-- =============================================================================

-- Settings: system‑wide configuration (key‑value)
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NULL,
    data_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,
    CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_settings_category (category),
    INDEX idx_settings_key (setting_key)
) COMMENT='System settings and configuration';

-- Safety Audits: safety inspections and audits
CREATE TABLE IF NOT EXISTS safety_audits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    scheduled_date DATE NOT NULL,
    conducted_date DATE NULL,
    auditor_id INT NULL,
    status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    findings TEXT NULL,
    recommendations TEXT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    CONSTRAINT fk_safety_audit_auditor FOREIGN KEY (auditor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_safety_audit_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_safety_audits_status (status),
    INDEX idx_safety_audits_scheduled_date (scheduled_date),
    INDEX idx_safety_audits_auditor (auditor_id)
) COMMENT='Record of safety inspections and audits';

-- Violations: reported violations and infractions
CREATE TABLE IF NOT EXISTS violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL COMMENT 'Type of violation (e.g., Speeding, No License)',
    description TEXT NOT NULL,
    reported_by_user_id INT NULL,
    reported_date DATE NOT NULL,
    status ENUM('Pending', 'Under Review', 'Resolved', 'Dismissed') NOT NULL DEFAULT 'Pending',
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    action_taken TEXT NULL,
    action_date DATE NULL,
    action_taken_by_user_id INT NULL,
    assigned_to_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_violations_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_violations_action_taker FOREIGN KEY (action_taken_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_violations_assigned FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_violations_status (status),
    INDEX idx_violations_severity (severity),
    INDEX idx_violations_reported_date (reported_date)
) COMMENT='Track violations and disciplinary actions';

-- Announcements: public communications
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_audience ENUM('All', 'Staff', 'Parents', 'Drivers', 'Bus Assistants') NOT NULL DEFAULT 'All',
    created_by_user_id INT NOT NULL,
    published_at TIMESTAMP NULL,
    status ENUM('Draft', 'Published', 'Archived') NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcements_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_announcements_status (status),
    INDEX idx_announcements_target (target_audience)
) COMMENT='System announcements';

-- Internal Messages: direct user‑to‑user messaging
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    status ENUM('Sent', 'Read', 'Archived') NOT NULL DEFAULT 'Sent',
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_receiver (receiver_id),
    INDEX idx_messages_status (status)
) COMMENT='Internal messaging between system users';

-- Students: for completeness, linking to routes and trips
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admissionNumber VARCHAR(50) NOT NULL UNIQUE,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    parentContact VARCHAR(20) NOT NULL,
    parentIdType VARCHAR(10) NULL,
    parentIdNumber VARCHAR(50) NULL,
    admissionDate DATE NOT NULL,
    status ENUM('active', 'withdrawn') NOT NULL DEFAULT 'active',
    withdrawalDate DATE NULL,
    withdrawalReason VARCHAR(255) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Student records (core info)';

-- =============================================================================
-- END OF CONSOLIDATED SCHEMA
-- =============================================================================