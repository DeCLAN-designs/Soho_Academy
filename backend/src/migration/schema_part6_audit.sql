-- ============================================================================
-- PART 6: AUDIT LOGGING & SECURITY
-- ============================================================================

-- Comprehensive Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actorUserId INT NULL,
    actorType ENUM('user', 'system', 'api', 'external') NOT NULL DEFAULT 'user',
    actorIpAddress VARCHAR(45) NULL,
    actorUserAgent VARCHAR(500) NULL,
    sessionId VARCHAR(100) NULL,
    domain VARCHAR(100) NOT NULL,
    entityType VARCHAR(100) NOT NULL,
    entityId VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    actionDetails VARCHAR(500) NULL,
    previousStateJson LONGTEXT NULL,
    newStateJson LONGTEXT NULL,
    changesSummary JSON NULL,
    severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
    complianceRelevant BOOLEAN NOT NULL DEFAULT FALSE,
    retentionYears INT NOT NULL DEFAULT 7,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_actor
        FOREIGN KEY (actorUserId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_audit_actor (actorUserId, createdAt),
    INDEX idx_audit_entity (entityType, entityId),
    INDEX idx_audit_domain (domain, createdAt),
    INDEX idx_audit_action (action, createdAt),
    INDEX idx_audit_compliance (complianceRelevant, createdAt),
    INDEX idx_audit_created (createdAt)
);

-- Security Audit Logs
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    eventType ENUM(
        'login_success', 'login_failure', 'logout', 'password_change',
        'password_reset_request', 'password_reset_complete', 'account_locked',
        'account_unlocked', 'role_changed', 'permission_denied', 'suspicious_activity'
    ) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent VARCHAR(500) NULL,
    deviceInfo VARCHAR(255) NULL,
    locationInfo VARCHAR(255) NULL,
    success BOOLEAN NOT NULL,
    failureReason VARCHAR(500) NULL,
    metadata JSON NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_security_audit_user
        FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_security_audit_user (userId, createdAt),
    INDEX idx_security_audit_event (eventType, createdAt),
    INDEX idx_security_audit_ip (ipAddress, createdAt)
);

-- Failed Login Attempts Tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usernameOrEmail VARCHAR(255) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent VARCHAR(500) NULL,
    attemptAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failureReason VARCHAR(255) NULL,
    INDEX idx_failed_login_username (usernameOrEmail, attemptAt),
    INDEX idx_failed_login_ip (ipAddress, attemptAt)
);
