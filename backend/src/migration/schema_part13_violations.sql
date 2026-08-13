-- Violations table for tracking rule violations and infractions
CREATE TABLE IF NOT EXISTS violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
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
    CONSTRAINT fk_violations_reporter
        FOREIGN KEY (reported_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_violations_action_taker
        FOREIGN KEY (action_taken_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_violations_assigned
        FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_violations_status (status),
    INDEX idx_violations_severity (severity),
    INDEX idx_violations_reported_date (reported_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
