-- Migration: Add trip snapshot columns, session, departure_date, version, and uniqueness constraint
-- Non-destructive alterations to support immutable historical snapshots and idempotent uniqueness

ALTER TABLE trip_monitoring
  ADD COLUMN trip_uuid CHAR(36) NULL UNIQUE AFTER trip_id,
  ADD COLUMN session ENUM('Morning','Evening') NULL AFTER route_id,
  ADD COLUMN departure_date DATE GENERATED ALWAYS AS (DATE(departure_time)) STORED,
  ADD COLUMN route_snapshot JSON NULL,
  ADD COLUMN students_snapshot JSON NULL,
  ADD COLUMN vehicle_snapshot JSON NULL,
  ADD COLUMN driver_snapshot JSON NULL,
  ADD COLUMN assistant_snapshot JSON NULL,
  ADD COLUMN version INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uk_trip_route_date_session (route_id, departure_date, session);

-- Add scheduler logs table for monitoring cron runs and recovery actions
CREATE TABLE IF NOT EXISTS scheduler_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  run_date DATETIME NOT NULL,
  status ENUM('SUCCESS','FAILED','SKIPPED') NOT NULL DEFAULT 'SUCCESS',
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure audit_logs exists (already present in schema.sql) — this is a safety check
-- No-op here: rely on existing audit_logs table

-- End migration
