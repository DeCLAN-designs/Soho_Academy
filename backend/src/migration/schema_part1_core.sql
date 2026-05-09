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
