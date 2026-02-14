CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    numberPlate VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager') NOT NULL,
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
