-- ============================================================================
-- PART 5: PARENT REQUESTS, NOTIFICATIONS & EVENT-DRIVEN ARCHITECTURE
-- ============================================================================

-- Parent Transport Requests
CREATE TABLE IF NOT EXISTS parent_transport_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestNumber VARCHAR(50) NOT NULL UNIQUE,
    parentUserId INT NOT NULL,
    studentId INT NOT NULL,
    currentRouteId INT NULL,
    requestType ENUM('route_change', 'stop_change', 'schedule_change', 'complaint', 'general_support', 'withdrawal') NOT NULL,
    requestTitle VARCHAR(255) NOT NULL,
    requestDetails TEXT NOT NULL,
    requestedPickupLocation VARCHAR(255) NULL,
    requestedDropoffLocation VARCHAR(255) NULL,
    requestedPickupStopId INT NULL,
    requestedDropoffStopId INT NULL,
    preferredRouteId INT NULL,
    preferredEffectiveDate DATE NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    status ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    managerReviewNotes TEXT NULL,
    reviewedByUserId INT NULL,
    reviewedAt TIMESTAMP NULL,
    parentNotifiedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_parent_request_parent
        FOREIGN KEY (parentUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_parent_request_current_route
        FOREIGN KEY (currentRouteId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_pickup_stop
        FOREIGN KEY (requestedPickupStopId) REFERENCES route_stops(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_preferred_route
        FOREIGN KEY (preferredRouteId) REFERENCES routes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_parent_request_reviewed_by
        FOREIGN KEY (reviewedByUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_parent_request_status (status),
    INDEX idx_parent_request_parent (parentUserId),
    INDEX idx_parent_request_priority (priority)
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    templateCode VARCHAR(50) NOT NULL UNIQUE,
    templateName VARCHAR(255) NOT NULL,
    eventType ENUM(
        'route_change_approved', 'route_change_rejected', 'trip_started', 'trip_completed',
        'vehicle_breakdown', 'complaint_submitted', 'complaint_resolved', 'incident_reported',
        'document_expiring', 'document_expired', 'attendance_marked', 'student_boarded',
        'student_dropped_off', 'request_received', 'maintenance_due'
    ) NOT NULL,
    channel ENUM('push', 'sms', 'email', 'in_app', 'all') NOT NULL DEFAULT 'in_app',
    subjectTemplate VARCHAR(500) NOT NULL,
    bodyTemplate TEXT NOT NULL,
    actionUrlTemplate VARCHAR(500) NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_template_event (eventType, channel)
);

-- Notifications Queue
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    templateId INT NULL,
    recipientUserId INT NULL,
    recipientRole ENUM('Parent', 'Driver', 'Bus Assistant', 'Transport Manager', 'School Admin') NULL,
    recipientPhone VARCHAR(20) NULL,
    recipientEmail VARCHAR(255) NULL,
    eventType VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    dataJson JSON NULL,
    actionUrl VARCHAR(500) NULL,
    channel ENUM('push', 'sms', 'email', 'in_app') NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    status ENUM('pending', 'sent', 'delivered', 'failed', 'read') NOT NULL DEFAULT 'pending',
    sentAt TIMESTAMP NULL,
    deliveredAt TIMESTAMP NULL,
    readAt TIMESTAMP NULL,
    failureReason VARCHAR(500) NULL,
    retryCount INT NOT NULL DEFAULT 0,
    maxRetries INT NOT NULL DEFAULT 3,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipientUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_notification_recipient (recipientUserId, status),
    INDEX idx_notification_status (status, retryCount),
    INDEX idx_notification_event (eventType)
);

-- Event Store for Event-Driven Architecture
CREATE TABLE IF NOT EXISTS event_store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    eventId VARCHAR(36) NOT NULL UNIQUE,
    eventType VARCHAR(100) NOT NULL,
    aggregateType VARCHAR(100) NOT NULL,
    aggregateId VARCHAR(50) NOT NULL,
    version INT NOT NULL,
    payload JSON NOT NULL,
    metadata JSON NULL,
    occurredAt TIMESTAMP NOT NULL,
    processedAt TIMESTAMP NULL,
    processedBy VARCHAR(100) NULL,
    isPublished BOOLEAN NOT NULL DEFAULT FALSE,
    publishedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_aggregate_version UNIQUE (aggregateType, aggregateId, version),
    INDEX idx_event_type (eventType, occurredAt),
    INDEX idx_event_aggregate (aggregateType, aggregateId),
    INDEX idx_event_unpublished (isPublished, createdAt)
);
