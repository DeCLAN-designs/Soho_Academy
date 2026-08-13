-- ============================================================================
-- PART 10: FUEL MANAGER ROLE ADDITION
-- ============================================================================

-- Add Fuel Manager role to the users table role ENUM
-- This requires modifying the role ENUM to include 'Fuel Manager'

-- Since MySQL doesn't support direct ENUM modification without constraints,
-- we need to recreate the column with the new ENUM definition

-- Step 1: Backup current data (in case of rollback)
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Modify the role column to include Fuel Manager
ALTER TABLE users 
MODIFY COLUMN role ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'Fuel Manager', 'School Admin') NOT NULL;

-- Step 3: Update any authorization checks to include Fuel Manager
-- This will be done in the application code (middleware, services, etc.)

-- Step 4: Grant Fuel Manager permissions for fuel-related operations
-- This will be handled in the RBAC system

-- Verification query (optional):
-- SELECT DISTINCT role FROM users;
