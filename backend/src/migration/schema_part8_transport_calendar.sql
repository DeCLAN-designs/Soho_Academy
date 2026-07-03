-- Migration: Transport Calendar and Scheduling
-- Creates tables for academic years, terms, operating days, calendar events, holiday overrides, and special transport days

CREATE TABLE IF NOT EXISTS academic_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS academic_terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  academic_year_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  transport_enabled TINYINT(1) DEFAULT 1,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transport_operating_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  academic_year_id INT NULL,
  weekday TINYINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transport_calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  academic_year_id INT NULL,
  academic_term_id INT NULL,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  transport_enabled TINYINT(1) DEFAULT 0,
  description TEXT,
  status VARCHAR(30) DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
  FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE SET NULL,
  CHECK (event_type IN ('half-term', 'mid-term', 'holiday', 'public-holiday', 'closure', 'makeup', 'exam', 'sports', 'custom'))
);

CREATE TABLE IF NOT EXISTS holiday_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  reason TEXT,
  transport_enabled TINYINT(1) DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS special_transport_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  transport_enabled TINYINT(1) DEFAULT 1,
  description TEXT,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trip_generation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active TINYINT(1) DEFAULT 1,
  rule_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Helpful indexes
CREATE INDEX idx_academic_years_range ON academic_years (start_date, end_date);
CREATE INDEX idx_terms_range ON academic_terms (start_date, end_date);
CREATE INDEX idx_calendar_events_dates ON transport_calendar_events (start_date, end_date);
CREATE INDEX idx_holiday_overrides_date ON holiday_overrides (date);
CREATE INDEX idx_special_transport_days_date ON special_transport_days (date);