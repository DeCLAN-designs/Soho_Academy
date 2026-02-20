CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    numberPlate VARCHAR(20),
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

CREATE TABLE fuel_maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestDate DATE NOT NULL,
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

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admissionNumber VARCHAR(50) NOT NULL UNIQUE,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    className VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
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
