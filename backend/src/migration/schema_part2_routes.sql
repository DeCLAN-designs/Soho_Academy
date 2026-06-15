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
