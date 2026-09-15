-- ============================================================================
-- PART 16: TRIP TYPES (Morning/Evening Distinction)
-- ============================================================================

-- Add trip_type column to trips table
ALTER TABLE trips 
ADD COLUMN trip_type ENUM('Morning', 'Evening') NOT NULL DEFAULT 'Morning' 
AFTER scheduledStartTime,
ADD INDEX idx_trip_type (trip_type);

-- Update existing trips to have appropriate trip_type based on scheduledStartTime
-- Morning: 4:30 AM - 9:00 AM (before 12:00 PM)
-- Evening: 2:00 PM - 7:30 PM (after 12:00 PM)
UPDATE trips 
SET trip_type = CASE 
    WHEN scheduledStartTime < '12:00:00' THEN 'Morning'
    ELSE 'Evening'
END
WHERE trip_type IS NULL OR trip_type = 'Morning';

-- Add constraint to ensure trip_date + trip_type + route_assignment_id uniqueness
-- This prevents duplicate morning or evening trips for the same assignment on the same day
ALTER TABLE trips 
ADD CONSTRAINT uq_trip_date_type_assignment UNIQUE (tripDate, trip_type, routeAssignmentId);