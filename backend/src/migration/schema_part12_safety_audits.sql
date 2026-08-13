-- Safety audits table for transport safety inspections
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
    CONSTRAINT fk_safety_audit_auditor
        FOREIGN KEY (auditor_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_safety_audit_creator
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_safety_audits_status (status),
    INDEX idx_safety_audits_scheduled_date (scheduled_date),
    INDEX idx_safety_audits_auditor (auditor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
