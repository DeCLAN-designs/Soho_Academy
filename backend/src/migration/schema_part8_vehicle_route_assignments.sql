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
