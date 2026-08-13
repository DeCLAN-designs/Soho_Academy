-- Settings table for system-wide configuration
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NULL,
    data_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,
    CONSTRAINT fk_settings_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_settings_category (category),
    INDEX idx_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default settings
INSERT INTO settings (setting_key, setting_value, category, description, data_type, is_public) VALUES
('school_name', 'Soho Academy', 'general', 'School name displayed throughout the system', 'string', true),
('school_address', '', 'general', 'School physical address', 'string', true),
('school_phone', '', 'general', 'School contact phone number', 'string', true),
('school_email', 'admin@soho.academy', 'general', 'School main email address', 'string', true),
('academic_year_start', '2026-01-01', 'academic', 'Start date of current academic year', 'string', false),
('academic_year_end', '2026-12-31', 'academic', 'End date of current academic year', 'string', false),
('trip_generation_time', '03:00', 'operations', 'Time for daily trip generation (HH:MM)', 'string', false),
('max_trip_capacity', '50', 'operations', 'Maximum students per trip', 'number', false),
('fuel_price_per_liter', '150', 'financial', 'Current fuel price per liter (KES)', 'number', false),
('maintenance_budget_monthly', '50000', 'financial', 'Monthly maintenance budget (KES)', 'number', false),
('notification_sms_enabled', 'false', 'notifications', 'Enable SMS notifications', 'boolean', false),
('notification_email_enabled', 'true', 'notifications', 'Enable email notifications', 'boolean', false),
('require_maintenance_approval', 'true', 'maintenance', 'Require approval for maintenance requests', 'boolean', false),
('auto_approve_small_maintenance', 'false', 'maintenance', 'Auto-approve maintenance below threshold', 'boolean', false),
('small_maintenance_threshold', '5000', 'maintenance', 'Amount threshold for auto-approval (KES)', 'number', false);
