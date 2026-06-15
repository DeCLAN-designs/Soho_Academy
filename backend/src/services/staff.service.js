/**
 * Staff Management Service
 * Domain: Staff Management
 * Responsibilities: Driver/assistant management, license tracking, performance metrics
 */

const pool = require("../config/db.js");
const { EventPublisher } = require("../utils/eventPublisher.js");
const { AuditLogger } = require("../utils/auditLogger.js");

class StaffService {
  constructor() {
    this.eventPublisher = new EventPublisher();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get all staff members with filtering
   */
  async getAllStaff(filters = {}) {
    const { role, status, search, licenseStatus } = filters;
    
    let query = `
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phoneNumber, u.role, u.status,
        u.numberPlate, u.createdAt, u.lastLoginAt,
        sp.employeeId, sp.hireDate, sp.performanceRating, sp.totalComplaints, sp.totalIncidents,
        dl.licenseNumber, dl.licenseType, dl.expiryDate as licenseExpiry, dl.status as licenseStatus,
        dl.psvBadgeNumber, dl.psvBadgeExpiry
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.userId
      LEFT JOIN driver_licenses dl ON u.id = dl.userId AND dl.isPrimary = TRUE
      WHERE u.role IN ('Driver', 'Bus Assistant', 'Transport Manager')
    `;
    const params = [];

    if (role) {
      query += " AND u.role = ?";
      params.push(role);
    }

    if (status) {
      query += " AND u.status = ?";
      params.push(status);
    }

    if (licenseStatus) {
      query += " AND dl.status = ?";
      params.push(licenseStatus);
    }

    if (search) {
      query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR sp.employeeId LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY u.createdAt DESC";

    const [staff] = await pool.query(query, params);
    return staff;
  }

  /**
   * Get staff member by ID with full details
   */
  async getStaffById(userId) {
    const [staff] = await pool.query(
      `SELECT 
        u.*,
        sp.employeeId, sp.dateOfBirth, sp.hireDate, sp.terminationDate,
        sp.emergencyContactName, sp.emergencyContactPhone, sp.address,
        sp.department, sp.performanceRating, sp.totalComplaints, sp.totalIncidents
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.userId
      WHERE u.id = ? AND u.role IN ('Driver', 'Bus Assistant', 'Transport Manager', 'School Admin')`,
      [userId]
    );

    if (staff.length === 0) {
      throw new Error("Staff member not found");
    }

    // Get all licenses
    const [licenses] = await pool.query(
      `SELECT * FROM driver_licenses WHERE userId = ? ORDER BY isPrimary DESC, createdAt DESC`,
      [userId]
    );

    // Get assignment history
    const [assignments] = await pool.query(
      `SELECT va.*, v.plate_number, v.vehicleType, v.capacity
      FROM vehicle_assignments va
      JOIN vehicles v ON va.plate_number = v.plate_number
      WHERE va.driverUserId = ?
      ORDER BY va.startDate DESC`,
      [userId]
    );

    // Get route assignments
    const [routeAssignments] = await pool.query(
      `SELECT ra.*, r.routeCode, r.routeName, r.routeDate, r.status as routeStatus
      FROM route_assignments ra
      JOIN routes r ON ra.routeId = r.id
      WHERE ra.driverUserId = ? OR ra.assistantUserId = ?
      ORDER BY ra.assignedAt DESC`,
      [userId, userId]
    );

    // Get recent trips
    const [trips] = await pool.query(
      `SELECT t.*, r.routeCode, r.routeName
      FROM trips t
      JOIN routes r ON t.routeId = r.id
      WHERE t.driverUserId = ?
      ORDER BY t.tripDate DESC, t.scheduledStartTime DESC
      LIMIT 20`,
      [userId]
    );

    // Get incident reports
    const [incidents] = await pool.query(
      `SELECT * FROM incident_reports
      WHERE driverUserId = ? OR createdByUserId = ?
      ORDER BY incidentDate DESC
      LIMIT 20`,
      [userId, userId]
    );

    // Get performance metrics
    const [metrics] = await pool.query(
      `SELECT * FROM driver_performance_metrics
      WHERE driverUserId = ?
      ORDER BY metricMonth DESC
      LIMIT 12`,
      [userId]
    );

    return {
      ...staff[0],
      licenses,
      assignments,
      routeAssignments,
      trips,
      incidents,
      performanceMetrics: metrics
    };
  }

  /**
   * Create new staff member
   */
  async createStaff(staffData, createdByUserId) {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      role,
      employeeId,
      hireDate,
      department,
      address,
      emergencyContactName,
      emergencyContactPhone,
      password,
      licenseData
    } = staffData;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if email exists
      const [existingEmail] = await connection.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existingEmail.length > 0) {
        throw new Error("Email already exists");
      }

      // Check if employee ID exists
      if (employeeId) {
        const [existingEmployee] = await connection.query(
          "SELECT id FROM staff_profiles WHERE employeeId = ?",
          [employeeId]
        );

        if (existingEmployee.length > 0) {
          throw new Error("Employee ID already exists");
        }
      }

      // Hash password
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [userResult] = await connection.query(
        `INSERT INTO users (firstName, lastName, email, phoneNumber, password, role, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [firstName, lastName, email, phoneNumber, hashedPassword, role]
      );

      const userId = userResult.insertId;

      // Create staff profile
      if (employeeId || hireDate || department) {
        await connection.query(
          `INSERT INTO staff_profiles (
            userId, employeeId, hireDate, department, address,
            emergencyContactName, emergencyContactPhone
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, employeeId, hireDate || new Date(), department, address,
            emergencyContactName, emergencyContactPhone
          ]
        );
      }

      // Add license if provided
      if (licenseData && role === 'Driver') {
        await connection.query(
          `INSERT INTO driver_licenses (
            userId, licenseNumber, licenseType, issuingAuthority, issueDate, expiryDate,
            psvBadgeNumber, psvBadgeExpiry, isPrimary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            userId,
            licenseData.licenseNumber,
            licenseData.licenseType,
            licenseData.issuingAuthority,
            licenseData.issueDate,
            licenseData.expiryDate,
            licenseData.psvBadgeNumber,
            licenseData.psvBadgeExpiry
          ]
        );
      }

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("staff.created", {
        userId,
        employeeId,
        role,
        createdBy: createdByUserId
      });

      // Audit log
      await this.auditLogger.log({
        actorUserId: createdByUserId,
        domain: "staff",
        entityType: "staff_member",
        entityId: String(userId),
        action: "CREATE",
        newStateJson: { firstName, lastName, email, role, employeeId }
      });

      return { userId, employeeId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Add driver license
   */
  async addDriverLicense(userId, licenseData, createdByUserId) {
    const {
      licenseNumber,
      licenseType,
      issuingAuthority,
      issueDate,
      expiryDate,
      psvBadgeNumber,
      psvBadgeExpiry,
      isPrimary = false
    } = licenseData;

    // If setting as primary, unset other primary licenses
    if (isPrimary) {
      await pool.query(
        "UPDATE driver_licenses SET isPrimary = FALSE WHERE userId = ?",
        [userId]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO driver_licenses (
        userId, licenseNumber, licenseType, issuingAuthority, issueDate, expiryDate,
        psvBadgeNumber, psvBadgeExpiry, isPrimary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, licenseNumber, licenseType, issuingAuthority, issueDate, expiryDate,
        psvBadgeNumber, psvBadgeExpiry, isPrimary
      ]
    );

    // Audit log
    await this.auditLogger.log({
      actorUserId: createdByUserId,
      domain: "staff",
      entityType: "driver_license",
      entityId: String(result.insertId),
      action: "CREATE",
      newStateJson: { userId, licenseNumber, licenseType, expiryDate }
    });

    return { licenseId: result.insertId };
  }

  /**
   * Check if driver can be assigned to route
   * Validates license status and conflicts
   */
  async validateDriverAssignment(driverUserId, tripDate, excludeTripId = null) {
    const errors = [];

    // Check driver exists and is active
    const [driver] = await pool.query(
      `SELECT u.*, dl.status as licenseStatus, dl.expiryDate
      FROM users u
      LEFT JOIN driver_licenses dl ON u.id = dl.userId AND dl.isPrimary = TRUE
      WHERE u.id = ? AND u.role = 'Driver'`,
      [driverUserId]
    );

    if (driver.length === 0) {
      errors.push("Driver not found");
      return { valid: false, errors };
    }

    if (driver[0].status !== 'active') {
      errors.push(`Driver account is ${driver[0].status}`);
    }

    // Check license validity
    if (!driver[0].licenseStatus || driver[0].licenseStatus !== 'valid') {
      errors.push("Driver license is not valid");
    }

    if (driver[0].expiryDate && new Date(driver[0].expiryDate) < new Date()) {
      errors.push("Driver license has expired");
    }

    // Check for scheduling conflicts
    let conflictQuery = `
      SELECT t.*, r.routeCode, r.routeName
      FROM trips t
      JOIN routes r ON t.routeId = r.id
      WHERE t.driverUserId = ?
        AND t.tripDate = ?
        AND t.status NOT IN ('cancelled', 'completed')
    `;
    
    const conflictParams = [driverUserId, tripDate];
    
    if (excludeTripId) {
      conflictQuery += " AND t.id != ?";
      conflictParams.push(excludeTripId);
    }

    const [conflicts] = await pool.query(conflictQuery, conflictParams);

    if (conflicts.length > 0) {
      errors.push(`Driver has conflicting trips on ${tripDate}: ${conflicts.map(c => c.routeCode).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      driver: driver[0]
    };
  }

  /**
   * Get expired or expiring licenses
   */
  async getLicenseAlerts(daysThreshold = 30) {
    const [expiring] = await pool.query(
      `SELECT 
        dl.*,
        u.firstName, u.lastName, u.phoneNumber,
        DATEDIFF(dl.expiryDate, CURDATE()) as daysRemaining,
        CASE 
          WHEN DATEDIFF(dl.expiryDate, CURDATE()) <= 0 THEN 'expired'
          WHEN DATEDIFF(dl.expiryDate, CURDATE()) <= 7 THEN 'critical'
          WHEN DATEDIFF(dl.expiryDate, CURDATE()) <= 30 THEN 'warning'
          ELSE 'good'
        END as urgencyLevel
      FROM driver_licenses dl
      JOIN users u ON dl.userId = u.id
      WHERE dl.status = 'valid'
        AND dl.expiryDate <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY dl.expiryDate ASC`,
      [daysThreshold]
    );

    const [expired] = await pool.query(
      `SELECT dl.*, u.firstName, u.lastName, u.phoneNumber
      FROM driver_licenses dl
      JOIN users u ON dl.userId = u.id
      WHERE dl.expiryDate < CURDATE()
        AND dl.status IN ('valid', 'expired')
      ORDER BY dl.expiryDate DESC`,
    );

    return { expiring, expired };
  }

  /**
   * Update staff member
   */
  async updateStaff(userId, updateData, updatedByUserId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current state
      const [current] = await connection.query(
        `SELECT u.*, sp.employeeId, sp.hireDate
        FROM users u
        LEFT JOIN staff_profiles sp ON u.id = sp.userId
        WHERE u.id = ?`,
        [userId]
      );

      if (current.length === 0) {
        throw new Error("Staff member not found");
      }

      const userFields = ['firstName', 'lastName', 'phoneNumber', 'status', 'numberPlate'];
      const profileFields = ['employeeId', 'department', 'address', 'emergencyContactName', 'emergencyContactPhone'];

      // Update user fields
      const userUpdates = [];
      const userValues = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (userFields.includes(key) && value !== undefined) {
          userUpdates.push(`${key} = ?`);
          userValues.push(value);
        }
      }

      if (userUpdates.length > 0) {
        userValues.push(userId);
        await connection.query(
          `UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`,
          userValues
        );
      }

      // Update or create profile
      const profileUpdates = [];
      const profileValues = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (profileFields.includes(key) && value !== undefined) {
          profileUpdates.push(`${key} = ?`);
          profileValues.push(value);
        }
      }

      if (profileUpdates.length > 0) {
        // Check if profile exists
        const [profile] = await connection.query(
          "SELECT id FROM staff_profiles WHERE userId = ?",
          [userId]
        );

        if (profile.length > 0) {
          profileValues.push(userId);
          await connection.query(
            `UPDATE staff_profiles SET ${profileUpdates.join(", ")} WHERE userId = ?`,
            profileValues
          );
        } else {
          await connection.query(
            `INSERT INTO staff_profiles (userId, ${profileFields.filter(f => updateData[f] !== undefined).join(', ')})
            VALUES (?, ${profileFields.filter(f => updateData[f] !== undefined).map(() => '?').join(', ')})`,
            [userId, ...profileFields.filter(f => updateData[f] !== undefined).map(f => updateData[f])]
          );
        }
      }

      await connection.commit();

      // Audit log
      await this.auditLogger.log({
        actorUserId: updatedByUserId,
        domain: "staff",
        entityType: "staff_member",
        entityId: String(userId),
        action: "UPDATE",
        previousStateJson: current[0],
        newStateJson: updateData
      });

      return { userId, updated: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get staff performance summary
   */
  async getPerformanceSummary(month = null) {
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01';

    const [summary] = await pool.query(
      `SELECT 
        COUNT(*) as totalStaff,
        SUM(CASE WHEN role = 'Driver' THEN 1 ELSE 0 END) as totalDrivers,
        SUM(CASE WHEN role = 'Bus Assistant' THEN 1 ELSE 0 END) as totalAssistants,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeStaff,
        AVG(performanceRating) as avgPerformanceRating
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.userId
      WHERE u.role IN ('Driver', 'Bus Assistant', 'Transport Manager')`,
    );

    const [licenseStats] = await pool.query(
      `SELECT 
        SUM(CASE WHEN expiryDate > CURDATE() THEN 1 ELSE 0 END) as validLicenses,
        SUM(CASE WHEN expiryDate <= CURDATE() THEN 1 ELSE 0 END) as expiredLicenses,
        SUM(CASE WHEN expiryDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiryDate > CURDATE() THEN 1 ELSE 0 END) as expiringSoon
      FROM driver_licenses
      WHERE isPrimary = TRUE`
    );

    return {
      staffSummary: summary[0],
      licenseStats: licenseStats[0]
    };
  }
}

module.exports = { StaffService };
