-- ============================================================================
-- MIGRATION: Add Dynamic Confirmation Support to Fuel & Maintenance Requests
-- ============================================================================

-- Step 1: Check if columns already exist and add them if not
-- Add confirmedByUserId column
ALTER TABLE fuel_maintenance_requests
ADD COLUMN IF NOT EXISTS confirmedByUserId INT NULL AFTER confirmedBy;

-- Add confirmationStatus column if not exists
ALTER TABLE fuel_maintenance_requests
ADD COLUMN IF NOT EXISTS confirmationStatus ENUM('PENDING', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'PENDING' AFTER confirmedByUserId;

-- Add confirmedAt column if not exists
ALTER TABLE fuel_maintenance_requests
ADD COLUMN IF NOT EXISTS confirmedAt TIMESTAMP NULL AFTER confirmationStatus;

-- Step 2: Add foreign key constraint if it doesn't exist
-- Note: This may fail if constraint already exists, which is fine
SET FOREIGN_KEY_CHECKS=0;
ALTER TABLE fuel_maintenance_requests
ADD CONSTRAINT fk_fuel_maintenance_confirmed_by
    FOREIGN KEY (confirmedByUserId) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
SET FOREIGN_KEY_CHECKS=1;

-- Step 3: Add indexes for performance
ALTER TABLE fuel_maintenance_requests
ADD INDEX IF NOT EXISTS idx_confirmation_status (confirmationStatus),
ADD INDEX IF NOT EXISTS idx_confirmed_by_user (confirmedByUserId),
ADD INDEX IF NOT EXISTS idx_confirmed_at (confirmedAt);

-- Step 4 (Optional): Populate existing records with default confirmation status
-- This sets all existing records to PENDING if they don't have a status yet
UPDATE fuel_maintenance_requests 
SET confirmationStatus = 'PENDING' 
WHERE confirmationStatus IS NULL;
