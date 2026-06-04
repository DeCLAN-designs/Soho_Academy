CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    numberPlate VARCHAR(20),
    profilePhotoUrl VARCHAR(500) NULL,
    profilePhotoKey VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'School Admin') NOT NULL,
    CONSTRAINT chk_phoneNumber_numeric CHECK (phoneNumber REGEXP '^[0-9]+$'),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE number_plates (
    id INT AUTO_INCREMENT PRIMARY KEY,

    plate_number VARCHAR(20) NOT NULL,
    
    status ENUM('active', 'inactive') DEFAULT 'active',

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

