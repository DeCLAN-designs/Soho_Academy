/**
 * Fleet Management Service
 * Domain: Fleet Management
 * Responsibilities: Vehicle lifecycle, compliance, maintenance tracking
 */

const pool = require("../config/db.js");
const { EventPublisher } = require("../utils/eventPublisher.js");
const { AuditLogger } = require("../utils/auditLogger.js");

class FleetService {
  constructor() {
    this.eventPublisher = new EventPublisher();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get all vehicles with compliance status
   */
  async getAllVehicles(filters = {}) {
    const { status, isCompliant, search } = filters;
    
    let query = `
      SELECT 
        v.*,
        DATEDIFF(v.insuranceExpiryDate, CURDATE()) as insuranceDaysRemaining,
        DATEDIFF(v.inspectionExpiryDate, CURDATE()) as inspectionDaysRemaining,
        u.firstName as assignedDriverFirstName,
        u.lastName as assignedDriverLastName
      FROM vehicles v
      LEFT JOIN vehicle_assignments va ON v.plate_number = va.plate_number 
        AND va.endDate IS NULL
      LEFT JOIN users u ON va.driverUserId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND v.status = ?";
      params.push(status);
    }
    
    if (isCompliant !== undefined) {
      query += " AND v.isCompliant = ?";
      params.push(isCompliant);
    }
    
    if (search) {
      query += ` AND (v.plate_number LIKE ? OR v.make LIKE ? OR v.model LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY v.createdAt DESC";

    const [vehicles] = await pool.query(query, params);
    return vehicles;
  }

  /**
   * Get vehicle by plate number with full details
   */
  async getVehicleByPlate(plateNumber) {
    const [vehicles] = await pool.query(
      `SELECT 
        v.*,
        DATEDIFF(v.insuranceExpiryDate, CURDATE()) as insuranceDaysRemaining,
        DATEDIFF(v.inspectionExpiryDate, CURDATE()) as inspectionDaysRemaining
      FROM vehicles v
      WHERE v.plate_number = ?`,
      [plateNumber]
    );

    if (vehicles.length === 0) {
      throw new Error("Vehicle not found");
    }

    // Get assignment history
    const [assignments] = await pool.query(
      `SELECT va.*, 
        d.firstName as driverFirstName, d.lastName as driverLastName,
        c.firstName as createdByFirstName, c.lastName as createdByLastName
      FROM vehicle_assignments va
      JOIN users d ON va.driverUserId = d.id
      JOIN users c ON va.createdByUserId = c.id
      WHERE va.plate_number = ?
      ORDER BY va.startDate DESC`,
      [plateNumber]
    );

    // Get maintenance history
    const [maintenance] = await pool.query(
      `SELECT mr.*,
        c.firstName as createdByFirstName, c.lastName as createdByLastName
      FROM maintenance_records mr
      JOIN users c ON mr.createdByUserId = c.id
      WHERE mr.plate_number = ?
      ORDER BY mr.serviceDate DESC
      LIMIT 20`,
      [plateNumber]
    );

    // Get fuel logs
    const [fuelLogs] = await pool.query(
      `SELECT fl.*,
        d.firstName as driverFirstName, d.lastName as driverLastName,
        v.firstName as verifiedByFirstName, v.lastName as verifiedByLastName
      FROM fuel_logs fl
      JOIN users d ON fl.driverUserId = d.id
      LEFT JOIN users v ON fl.verifiedByUserId = v.id
      WHERE fl.plate_number = ?
      ORDER BY fl.fuelDate DESC
      LIMIT 50`,
      [plateNumber]
    );

    // Get compliance documents
    const [documents] = await pool.query(
      `SELECT * FROM compliance_documents
      WHERE entityIdentifier = ? AND isLatestVersion = TRUE
      ORDER BY validToDate ASC`,
      [plateNumber]
    );

    return {
      ...vehicles[0],
      assignments,
      maintenance,
      fuelLogs,
      documents
    };
  }

  /**
   * Create new vehicle
   */
  async createVehicle(vehicleData, createdByUserId) {
    const {
      plate_number,
      capacity,
      vehicleType = 'Bus',
      make,
      model,
      year,
      vin,
      fuelType = 'diesel',
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
      inspectionExpiryDate
    } = vehicleData;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if plate number already exists
      const [existing] = await connection.query(
        "SELECT id FROM vehicles WHERE plate_number = ?",
        [plate_number]
      );

      if (existing.length > 0) {
        throw new Error("Vehicle with this plate number already exists");
      }

      const [result] = await connection.query(
        `INSERT INTO vehicles (
          plate_number, capacity, vehicleType, make, model, year, vin,
          fuelType, insuranceProvider, insurancePolicyNumber,
          insuranceExpiryDate, inspectionExpiryDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plate_number, capacity, vehicleType, make, model, year, vin,
          fuelType, insuranceProvider, insurancePolicyNumber,
          insuranceExpiryDate, inspectionExpiryDate
        ]
      );

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("vehicle.created", {
        vehicleId: result.insertId,
        plateNumber: plate_number,
        createdBy: createdByUserId
      });

      // Audit log
      await this.auditLogger.log({
        actorUserId: createdByUserId,
        domain: "fleet",
        entityType: "vehicle",
        entityId: plate_number,
        action: "CREATE",
        newStateJson: vehicleData
      });

      return { id: result.insertId, plate_number };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update vehicle
   */
  async updateVehicle(plateNumber, updateData, updatedByUserId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current state for audit
      const [current] = await connection.query(
        "SELECT * FROM vehicles WHERE plate_number = ?",
        [plateNumber]
      );

      if (current.length === 0) {
        throw new Error("Vehicle not found");
      }

      const allowedFields = [
        'capacity', 'vehicleType', 'make', 'model', 'year', 'vin',
        'fuelType', 'insuranceProvider', 'insurancePolicyNumber',
        'insuranceExpiryDate', 'inspectionExpiryDate', 'status',
        'currentMileage', 'lastServiceDate', 'nextServiceDate'
      ];

      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error("No valid fields to update");
      }

      values.push(plateNumber);

      await connection.query(
        `UPDATE vehicles SET ${updates.join(", ")} WHERE plate_number = ?`,
        values
      );

      await connection.commit();

      // Publish event if status changed
      if (updateData.status && updateData.status !== current[0].status) {
        await this.eventPublisher.publish("vehicle.status_changed", {
          plateNumber,
          oldStatus: current[0].status,
          newStatus: updateData.status,
          updatedBy: updatedByUserId
        });
      }

      // Audit log
      await this.auditLogger.log({
        actorUserId: updatedByUserId,
        domain: "fleet",
        entityType: "vehicle",
        entityId: plateNumber,
        action: "UPDATE",
        previousStateJson: current[0],
        newStateJson: updateData,
        changesSummary: this.computeChanges(current[0], updateData)
      });

      return { plateNumber, updated: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Assign driver to vehicle
   */
  async assignDriver(plateNumber, driverUserId, assignmentData, createdByUserId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verify vehicle exists
      const [vehicle] = await connection.query(
        "SELECT * FROM vehicles WHERE plate_number = ?",
        [plateNumber]
      );

      if (vehicle.length === 0) {
        throw new Error("Vehicle not found");
      }

      // Verify driver exists and is active
      const [driver] = await connection.query(
        `SELECT u.*, dl.status as licenseStatus, dl.expiryDate as licenseExpiry
        FROM users u
        LEFT JOIN driver_licenses dl ON u.id = dl.userId AND dl.isPrimary = TRUE
        WHERE u.id = ? AND u.role = 'Driver' AND u.status = 'active'`,
        [driverUserId]
      );

      if (driver.length === 0) {
        throw new Error("Driver not found or not active");
      }

      // Check license validity
      if (driver[0].licenseStatus !== 'valid' || 
          (driver[0].licenseExpiry && new Date(driver[0].licenseExpiry) < new Date())) {
        throw new Error("Driver license is not valid or has expired");
      }

      // End any existing active assignment
      await connection.query(
        `UPDATE vehicle_assignments 
        SET endDate = CURDATE(), updatedAt = NOW()
        WHERE plate_number = ? AND endDate IS NULL`,
        [plateNumber]
      );

      // Create new assignment
      const [result] = await connection.query(
        `INSERT INTO vehicle_assignments (
          plate_number, driverUserId, startDate, reason, createdByUserId
        ) VALUES (?, ?, CURDATE(), ?, ?)`,
        [plateNumber, driverUserId, assignmentData.reason || null, createdByUserId]
      );

      // Update vehicle status
      await connection.query(
        "UPDATE vehicles SET status = 'active' WHERE plate_number = ?",
        [plateNumber]
      );

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("vehicle.driver_assigned", {
        plateNumber,
        driverUserId,
        assignmentId: result.insertId,
        createdBy: createdByUserId
      });

      return { assignmentId: result.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Record fuel log entry
   */
  async recordFuelLog(fuelData, createdByUserId) {
    const {
      plate_number,
      fuelDate,
      fuelTime,
      mileage,
      fuelType,
      litersFilled,
      costPerLiter,
      stationName,
      stationLocation,
      receiptNumber,
      notes
    } = fuelData;

    const totalCost = litersFilled * costPerLiter;

    const [result] = await pool.query(
      `INSERT INTO fuel_logs (
        plate_number, driverUserId, fuelDate, fuelTime, mileage, fuelType,
        litersFilled, costPerLiter, totalCost, stationName, stationLocation,
        receiptNumber, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plate_number, createdByUserId, fuelDate, fuelTime, mileage, fuelType,
        litersFilled, costPerLiter, totalCost, stationName, stationLocation,
        receiptNumber, notes
      ]
    );

    // Update vehicle mileage
    await pool.query(
      "UPDATE vehicles SET currentMileage = GREATEST(currentMileage, ?) WHERE plate_number = ?",
      [mileage, plate_number]
    );

    return { id: result.insertId, totalCost };
  }

  /**
   * Create maintenance record
   */
  async createMaintenanceRecord(maintenanceData, createdByUserId) {
    const {
      plate_number,
      maintenanceType,
      category,
      serviceDate,
      mileage,
      description,
      workPerformed,
      partsUsed,
      laborCost,
      partsCost,
      serviceProvider,
      technicianName,
      nextServiceMileage,
      nextServiceDate
    } = maintenanceData;

    const totalCost = (laborCost || 0) + (partsCost || 0);

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO maintenance_records (
          plate_number, maintenanceType, category, serviceDate, mileage,
          description, workPerformed, partsUsed, laborCost, partsCost, totalCost,
          serviceProvider, technicianName, nextServiceMileage, nextServiceDate,
          createdByUserId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plate_number, maintenanceType, category, serviceDate, mileage,
          description, workPerformed, partsUsed, laborCost, partsCost, totalCost,
          serviceProvider, technicianName, nextServiceMileage, nextServiceDate,
          createdByUserId
        ]
      );

      // Update vehicle maintenance dates
      await connection.query(
        `UPDATE vehicles 
        SET lastServiceDate = ?, nextServiceDate = ?, nextServiceMileage = ?
        WHERE plate_number = ?`,
        [serviceDate, nextServiceDate, nextServiceMileage, plate_number]
      );

      // If emergency maintenance, update vehicle status
      if (maintenanceType === 'emergency') {
        await connection.query(
          "UPDATE vehicles SET status = 'maintenance' WHERE plate_number = ?",
          [plate_number]
        );
      }

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("maintenance.created", {
        maintenanceId: result.insertId,
        plateNumber: plate_number,
        type: maintenanceType,
        totalCost,
        createdBy: createdByUserId
      });

      return { id: result.insertId, totalCost };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get compliance summary (expiring/ expired documents)
   */
  async getComplianceSummary() {
    const [expiring] = await pool.query(
      `SELECT 
        cd.*,
        DATEDIFF(cd.validToDate, CURDATE()) as daysRemaining,
        CASE 
          WHEN DATEDIFF(cd.validToDate, CURDATE()) <= 0 THEN 'expired'
          WHEN DATEDIFF(cd.validToDate, CURDATE()) <= 7 THEN 'critical'
          WHEN DATEDIFF(cd.validToDate, CURDATE()) <= 30 THEN 'warning'
          ELSE 'good'
        END as urgencyLevel
      FROM compliance_documents cd
      WHERE cd.isLatestVersion = TRUE
        AND cd.validToDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND cd.status IN ('valid', 'expiring_soon')
      ORDER BY cd.validToDate ASC`
    );

    const [expired] = await pool.query(
      `SELECT cd.*
      FROM compliance_documents cd
      WHERE cd.isLatestVersion = TRUE
        AND cd.validToDate < CURDATE()
        AND cd.status = 'expired'
      ORDER BY cd.validToDate DESC
      LIMIT 50`
    );

    return { expiring, expired };
  }

  /**
   * Compute changes between two objects for audit
   */
  computeChanges(oldObj, newObj) {
    const changes = {};
    for (const key of Object.keys(newObj)) {
      if (oldObj[key] !== newObj[key]) {
        changes[key] = { from: oldObj[key], to: newObj[key] };
      }
    }
    return changes;
  }
}

module.exports = { FleetService };
