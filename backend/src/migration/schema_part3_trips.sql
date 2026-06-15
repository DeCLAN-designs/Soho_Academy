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
