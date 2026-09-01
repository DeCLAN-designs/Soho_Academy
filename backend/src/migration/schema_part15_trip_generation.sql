-- =============================================
-- Trip Generation Architecture Improvements
-- =============================================
-- This migration adds audit logging for trip generation events

-- Add audit log for trip generation events
CREATE TABLE IF NOT EXISTS trip_generation_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  generation_date DATE NOT NULL,
  generation_source ENUM('cron', 'api', 'cli') NOT NULL,
  user_id INT NULL,
  stats JSON NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT NULL,
  execution_time_ms INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_generation_date (generation_date),
  INDEX idx_generation_source (generation_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;