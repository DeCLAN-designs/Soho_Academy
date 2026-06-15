/**
 * Audit Logger - Comprehensive Audit Trail Management
 * Ensures compliance, security monitoring, and change tracking
 */

const pool = require("../config/db.js");

class AuditLogger {
  /**
   * Log an audit event
   */
  async log({
    actorUserId = null,
    actorType = 'user',
    actorIpAddress = null,
    actorUserAgent = null,
    sessionId = null,
    domain,
    entityType,
    entityId,
    action,
    actionDetails = null,
    previousStateJson = null,
    newStateJson = null,
    severity = 'info',
    complianceRelevant = false
  }) {
    try {
      // Compute changes summary
      const changesSummary = this.computeChanges(previousStateJson, newStateJson);

      await pool.query(
        `INSERT INTO audit_logs (
          actorUserId, actorType, actorIpAddress, actorUserAgent, sessionId,
          domain, entityType, entityId, action, actionDetails,
          previousStateJson, newStateJson, changesSummary, severity, complianceRelevant
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actorUserId,
          actorType,
          actorIpAddress,
          actorUserAgent,
          sessionId,
          domain,
          entityType,
          entityId,
          action,
          actionDetails,
          previousStateJson ? JSON.stringify(previousStateJson) : null,
          newStateJson ? JSON.stringify(newStateJson) : null,
          changesSummary ? JSON.stringify(changesSummary) : null,
          severity,
          complianceRelevant
        ]
      );
    } catch (error) {
      // Fail silently but log to console - don't break business logic
      console.error("Audit logging failed:", error);
    }
  }

  /**
   * Log security events
   */
  async logSecurity({
    userId = null,
    eventType,
    ipAddress,
    userAgent = null,
    deviceInfo = null,
    locationInfo = null,
    success,
    failureReason = null,
    metadata = {}
  }) {
    try {
      await pool.query(
        `INSERT INTO security_audit_logs (
          userId, eventType, ipAddress, userAgent, deviceInfo, locationInfo, success, failureReason, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          eventType,
          ipAddress,
          userAgent,
          deviceInfo,
          locationInfo,
          success,
          failureReason,
          JSON.stringify(metadata)
        ]
      );
    } catch (error) {
      console.error("Security audit logging failed:", error);
    }
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(usernameOrEmail, ipAddress, userAgent, failureReason) {
    try {
      await pool.query(
        `INSERT INTO failed_login_attempts (
          usernameOrEmail, ipAddress, userAgent, failureReason
        ) VALUES (?, ?, ?, ?)`,
        [usernameOrEmail, ipAddress, userAgent, failureReason]
      );
    } catch (error) {
      console.error("Failed login logging failed:", error);
    }
  }

  /**
   * Get audit trail for an entity
   */
  async getEntityAuditTrail(entityType, entityId, options = {}) {
    const { limit = 50, offset = 0, fromDate, toDate } = options;

    let query = `
      SELECT 
        al.*,
        u.firstName as actorFirstName, u.lastName as actorLastName, u.role as actorRole
      FROM audit_logs al
      LEFT JOIN users u ON al.actorUserId = u.id
      WHERE al.entityType = ? AND al.entityId = ?
    `;
    const params = [entityType, entityId];

    if (fromDate) {
      query += " AND al.createdAt >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      query += " AND al.createdAt <= ?";
      params.push(toDate);
    }

    query += " ORDER BY al.createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);
    return logs;
  }

  /**
   * Get audit trail for a user
   */
  async getUserAuditTrail(actorUserId, options = {}) {
    const { limit = 50, offset = 0, domain } = options;

    let query = `
      SELECT 
        al.*,
        u.firstName as actorFirstName, u.lastName as actorLastName
      FROM audit_logs al
      LEFT JOIN users u ON al.actorUserId = u.id
      WHERE al.actorUserId = ?
    `;
    const params = [actorUserId];

    if (domain) {
      query += " AND al.domain = ?";
      params.push(domain);
    }

    query += " ORDER BY al.createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);
    return logs;
  }

  /**
   * Get security audit trail
   */
  async getSecurityAuditTrail(options = {}) {
    const { 
      limit = 50, 
      offset = 0, 
      userId, 
      eventType, 
      ipAddress, 
      success,
      fromDate,
      toDate 
    } = options;

    let query = `
      SELECT sal.*, u.firstName, u.lastName, u.email
      FROM security_audit_logs sal
      LEFT JOIN users u ON sal.userId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += " AND sal.userId = ?";
      params.push(userId);
    }

    if (eventType) {
      query += " AND sal.eventType = ?";
      params.push(eventType);
    }

    if (ipAddress) {
      query += " AND sal.ipAddress = ?";
      params.push(ipAddress);
    }

    if (success !== undefined) {
      query += " AND sal.success = ?";
      params.push(success);
    }

    if (fromDate) {
      query += " AND sal.createdAt >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      query += " AND sal.createdAt <= ?";
      params.push(toDate);
    }

    query += " ORDER BY sal.createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);
    return logs;
  }

  /**
   * Get compliance-relevant audit logs
   */
  async getComplianceAudit(options = {}) {
    const { limit = 100, offset = 0, domain, fromDate, toDate } = options;

    let query = `
      SELECT 
        al.*,
        u.firstName as actorFirstName, u.lastName as actorLastName
      FROM audit_logs al
      LEFT JOIN users u ON al.actorUserId = u.id
      WHERE al.complianceRelevant = TRUE
    `;
    const params = [];

    if (domain) {
      query += " AND al.domain = ?";
      params.push(domain);
    }

    if (fromDate) {
      query += " AND al.createdAt >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      query += " AND al.createdAt <= ?";
      params.push(toDate);
    }

    query += " ORDER BY al.createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);
    return logs;
  }

  /**
   * Compute changes between two states
   */
  computeChanges(previousState, newState) {
    if (!previousState || !newState) return null;

    const changes = {};
    const allKeys = new Set([
      ...Object.keys(previousState),
      ...Object.keys(newState)
    ]);

    for (const key of allKeys) {
      const oldValue = previousState[key];
      const newValue = newState[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(fromDate, toDate) {
    const [domainStats] = await pool.query(
      `SELECT 
        domain,
        COUNT(*) as totalActions,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as criticalActions,
        SUM(CASE WHEN complianceRelevant = TRUE THEN 1 ELSE 0 END) as complianceActions
      FROM audit_logs
      WHERE createdAt BETWEEN ? AND ?
      GROUP BY domain`,
      [fromDate, toDate]
    );

    const [actionStats] = await pool.query(
      `SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE createdAt BETWEEN ? AND ?
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10`,
      [fromDate, toDate]
    );

    return {
      domainStats,
      actionStats,
      period: { fromDate, toDate }
    };
  }
}

module.exports = { AuditLogger };
