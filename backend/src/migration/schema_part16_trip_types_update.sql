-- ============================================================================
-- PART 16: TRIP TYPES (Morning/Evening Distinction) - Additional Updates
-- ============================================================================

-- Update trip_monitoring table to use session instead of time-based filtering
ALTER TABLE trip_monitoring 
ADD COLUMN session ENUM('Morning', 'Evening') NOT NULL DEFAULT 'Morning' AFTER route_id,
ADD INDEX idx_trip_session (session);

-- Update existing trip_monitoring records based on departure time
-- Morning: 4:30 AM - 9:00 AM (before 12:00 PM)
-- Evening: 2:00 PM - 7:30 PM (after 12:00 PM)
UPDATE trip_monitoring 
SET session = CASE 
    WHEN TIME(departure_time) < '12:00:00' THEN 'Morning'
    ELSE 'Evening'
END
WHERE session IS NULL OR session = 'Morning';

-- Add constraint to prevent duplicate sessions for same route on same day
ALTER TABLE trip_monitoring 
ADD CONSTRAINT uq_trip_route_date_session UNIQUE (route_id, DATE(departure_time), session);