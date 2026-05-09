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
