/**
 * Event Publisher - Event-Driven Architecture Core
 * Publishes domain events to event store and triggers notifications
 */

const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db.js");

class EventPublisher {
  constructor() {
    this.notificationHandlers = new Map();
    this.initializeHandlers();
  }

  initializeHandlers() {
    // Register notification handlers for different event types
    this.notificationHandlers.set("route_change_approved", this.handleRouteChangeApproved.bind(this));
    this.notificationHandlers.set("route_change_rejected", this.handleRouteChangeRejected.bind(this));
    this.notificationHandlers.set("vehicle_breakdown", this.handleVehicleBreakdown.bind(this));
    this.notificationHandlers.set("trip_started", this.handleTripStarted.bind(this));
    this.notificationHandlers.set("trip_completed", this.handleTripCompleted.bind(this));
    this.notificationHandlers.set("complaint_submitted", this.handleComplaintSubmitted.bind(this));
    this.notificationHandlers.set("incident_reported", this.handleIncidentReported.bind(this));
    this.notificationHandlers.set("maintenance_due", this.handleMaintenanceDue.bind(this));
    this.notificationHandlers.set("document_expiring", this.handleDocumentExpiring.bind(this));
    this.notificationHandlers.set("attendance_marked", this.handleAttendanceMarked.bind(this));
  }

  /**
   * Publish an event to the event store
   */
  async publish(eventType, payload, metadata = {}) {
    const eventId = uuidv4();
    const aggregateType = this.getAggregateType(eventType);
    const aggregateId = this.getAggregateId(eventType, payload);

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get next version for this aggregate
      const [versions] = await connection.query(
        `SELECT COALESCE(MAX(version), 0) + 1 as nextVersion
        FROM event_store 
        WHERE aggregateType = ? AND aggregateId = ?`,
        [aggregateType, aggregateId]
      );

      const version = versions[0].nextVersion;

      // Store event
      await connection.query(
        `INSERT INTO event_store (
          eventId, eventType, aggregateType, aggregateId, version, payload, metadata, occurredAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          eventId,
          eventType,
          aggregateType,
          aggregateId,
          version,
          JSON.stringify(payload),
          JSON.stringify(metadata)
        ]
      );

      await connection.commit();

      // Trigger notification handler if exists
      const handler = this.notificationHandlers.get(eventType);
      if (handler) {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`Notification handler failed for ${eventType}:`, error);
        }
      }

      return { eventId, version };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get aggregate type from event type
   */
  getAggregateType(eventType) {
    const typeMap = {
      "vehicle.created": "vehicle",
      "vehicle.status_changed": "vehicle",
      "vehicle.driver_assigned": "vehicle",
      "route.created": "route",
      "route.assigned": "route",
      "route.students_assigned": "route",
      "trip.created": "trip",
      "trip.status_changed": "trip",
      "trip.attendance_updated": "trip",
      "maintenance.created": "maintenance",
      "staff.created": "staff",
      "route_change_approved": "parent_request",
      "route_change_rejected": "parent_request",
      "vehicle_breakdown": "vehicle",
      "trip_started": "trip",
      "trip_completed": "trip",
      "complaint_submitted": "complaint",
      "incident_reported": "incident",
      "maintenance_due": "maintenance",
      "document_expiring": "compliance",
      "attendance_marked": "attendance"
    };

    return typeMap[eventType] || "unknown";
  }

  /**
   * Get aggregate ID from payload
   */
  getAggregateId(eventType, payload) {
    return String(
      payload.routeId || 
      payload.tripId || 
      payload.vehicleId || 
      payload.userId || 
      payload.maintenanceId ||
      payload.requestId ||
      payload.incidentId ||
      payload.complaintId ||
      payload.documentId ||
      Date.now()
    );
  }

  /**
   * Handle route change approved notification
   */
  async handleRouteChangeApproved(payload) {
    await this.createNotification({
      eventType: "route_change_approved",
      title: "Route Change Request Approved",
      message: `Your route change request has been approved and will take effect on ${payload.effectiveDate}.`,
      recipientUserId: payload.parentUserId,
      priority: "normal",
      channels: ["push", "email"],
      data: { requestId: payload.requestId, routeId: payload.routeId }
    });

    // Notify driver
    if (payload.driverUserId) {
      await this.createNotification({
        eventType: "route_change_approved",
        title: "Route Assignment Updated",
        message: `A new student has been assigned to your route.`,
        recipientUserId: payload.driverUserId,
        priority: "normal",
        channels: ["push"]
      });
    }
  }

  /**
   * Handle route change rejected notification
   */
  async handleRouteChangeRejected(payload) {
    await this.createNotification({
      eventType: "route_change_rejected",
      title: "Route Change Request Rejected",
      message: `Your route change request was rejected. Reason: ${payload.reason}`,
      recipientUserId: payload.parentUserId,
      priority: "normal",
      channels: ["push", "email"],
      data: { requestId: payload.requestId }
    });
  }

  /**
   * Handle vehicle breakdown notification
   */
  async handleVehicleBreakdown(payload) {
    // Notify transport manager
    await this.createNotification({
      eventType: "vehicle_breakdown",
      title: "Vehicle Breakdown Alert",
      message: `Vehicle ${payload.plateNumber} has reported a breakdown. Immediate attention required.`,
      recipientRole: "Transport Manager",
      priority: "urgent",
      channels: ["push", "sms", "email"],
      data: { plateNumber: payload.plateNumber, location: payload.location }
    });

    // Notify affected drivers
    if (payload.affectedDriverIds) {
      for (const driverId of payload.affectedDriverIds) {
        await this.createNotification({
          eventType: "vehicle_breakdown",
          title: "Route Cancellation Notice",
          message: `Your assigned vehicle has broken down. Your route for today has been cancelled.`,
          recipientUserId: driverId,
          priority: "high",
          channels: ["push", "sms"]
        });
      }
    }
  }

  /**
   * Handle trip started notification
   */
  async handleTripStarted(payload) {
    // Get students on trip and notify parents
    const [students] = await pool.query(
      `SELECT tsa.studentId, s.parentIdType, s.parentIdNumber
      FROM trip_student_attendance tsa
      JOIN students s ON tsa.studentId = s.id
      WHERE tsa.tripId = ?`,
      [payload.tripId]
    );

    for (const student of students) {
      // Find parent user
      const [parents] = await pool.query(
        `SELECT id FROM users WHERE parentIdType = ? AND parentIdNumber = ?`,
        [student.parentIdType, student.parentIdNumber]
      );

      if (parents.length > 0) {
        await this.createNotification({
          eventType: "trip_started",
          title: "School Bus Trip Started",
          message: `The school bus has started its route. Your child will be picked up soon.`,
          recipientUserId: parents[0].id,
          priority: "normal",
          channels: ["push"],
          data: { tripId: payload.tripId, studentId: student.studentId }
        });
      }
    }
  }

  /**
   * Handle trip completed notification
   */
  async handleTripCompleted(payload) {
    // Get students and notify parents
    const [attendance] = await pool.query(
      `SELECT tsa.studentId, tsa.boardingStatus, s.parentIdType, s.parentIdNumber
      FROM trip_student_attendance tsa
      JOIN students s ON tsa.studentId = s.id
      WHERE tsa.tripId = ?`,
      [payload.tripId]
    );

    for (const record of attendance) {
      const [parents] = await pool.query(
        `SELECT id FROM users WHERE parentIdType = ? AND parentIdNumber = ?`,
        [record.parentIdType, record.parentIdNumber]
      );

      if (parents.length > 0) {
        let message = "The school bus has completed its route.";
        if (record.boardingStatus === 'boarded') {
          message = "Your child has been picked up by the school bus.";
        } else if (record.boardingStatus === 'dropped_off') {
          message = "Your child has been dropped off at their destination.";
        } else if (record.boardingStatus === 'absent') {
          message = "Your child was marked absent for today's trip.";
        }

        await this.createNotification({
          eventType: "trip_completed",
          title: "School Bus Trip Update",
          message,
          recipientUserId: parents[0].id,
          priority: "normal",
          channels: ["push"],
          data: { tripId: payload.tripId, studentId: record.studentId, status: record.boardingStatus }
        });
      }
    }
  }

  /**
   * Handle complaint submitted notification
   */
  async handleComplaintSubmitted(payload) {
    await this.createNotification({
      eventType: "complaint_submitted",
      title: "New Complaint Submitted",
      message: `A new complaint has been submitted and requires review.`,
      recipientRole: "Transport Manager",
      priority: payload.severity === 'critical' ? 'urgent' : 'high',
      channels: ["push", "email"],
      data: { complaintId: payload.complaintId, severity: payload.severity }
    });
  }

  /**
   * Handle incident reported notification
   */
  async handleIncidentReported(payload) {
    await this.createNotification({
      eventType: "incident_reported",
      title: `Incident Reported - ${payload.severityLevel.toUpperCase()}`,
      message: `An incident has been reported involving ${payload.vehiclePlate}. Immediate review required.`,
      recipientRole: "Transport Manager",
      priority: payload.severityLevel === 'critical' ? 'urgent' : 'high',
      channels: ["push", "sms", "email"],
      data: { incidentId: payload.incidentId, severity: payload.severityLevel }
    });

    // If critical, also notify school admin
    if (payload.severityLevel === 'critical') {
      await this.createNotification({
        eventType: "incident_reported",
        title: "CRITICAL Incident Reported",
        message: `A critical incident requires immediate executive attention.`,
        recipientRole: "School Admin",
        priority: "urgent",
        channels: ["push", "sms", "email"]
      });
    }
  }

  /**
   * Handle maintenance due notification
   */
  async handleMaintenanceDue(payload) {
    await this.createNotification({
      eventType: "maintenance_due",
      title: "Vehicle Maintenance Due",
      message: `Vehicle ${payload.plateNumber} is due for maintenance. Service type: ${payload.maintenanceType}`,
      recipientRole: "Transport Manager",
      priority: "normal",
      channels: ["push", "email"],
      data: { plateNumber: payload.plateNumber, dueDate: payload.dueDate }
    });
  }

  /**
   * Handle document expiring notification
   */
  async handleDocumentExpiring(payload) {
    const urgency = payload.daysRemaining <= 7 ? 'high' : 'normal';
    
    await this.createNotification({
      eventType: "document_expiring",
      title: `Document Expiring Soon - ${payload.documentType}`,
      message: `${payload.relatedTo} document expires in ${payload.daysRemaining} days. Please renew promptly.`,
      recipientRole: "Transport Manager",
      priority: urgency,
      channels: ["push", "email"],
      data: { documentId: payload.documentId, expiryDate: payload.expiryDate }
    });
  }

  /**
   * Handle attendance marked notification (parent notifications)
   */
  async handleAttendanceMarked(payload) {
    // Get parent info
    const [parents] = await pool.query(
      `SELECT u.id FROM users u
      JOIN students s ON u.parentIdType = s.parentIdType AND u.parentIdNumber = s.parentIdNumber
      WHERE s.id = ?`,
      [payload.studentId]
    );

    if (parents.length > 0) {
      let message = "";
      let title = "";

      switch (payload.boardingStatus) {
        case "boarded":
          title = "Child Boarded Bus";
          message = "Your child has safely boarded the school bus.";
          break;
        case "dropped_off":
          title = "Child Dropped Off";
          message = "Your child has been safely dropped off at their destination.";
          break;
        case "absent":
          title = "Child Marked Absent";
          message = "Your child was marked absent for today's trip.";
          break;
      }

      if (title) {
        await this.createNotification({
          eventType: "attendance_marked",
          title,
          message,
          recipientUserId: parents[0].id,
          priority: "normal",
          channels: ["push"],
          data: { tripId: payload.tripId, studentId: payload.studentId, status: payload.boardingStatus }
        });
      }
    }
  }

  /**
   * Create a notification in the queue
   */
  async createNotification({
    eventType,
    title,
    message,
    recipientUserId = null,
    recipientRole = null,
    priority = "normal",
    channels = ["in_app"],
    data = {},
    actionUrl = null
  }) {
    // Get template if exists
    const [templates] = await pool.query(
      `SELECT * FROM notification_templates 
      WHERE eventType = ? AND isActive = TRUE 
      LIMIT 1`,
      [eventType]
    );

    for (const channel of channels) {
      await pool.query(
        `INSERT INTO notifications (
          eventType, title, message, recipientUserId, recipientRole,
          channel, priority, dataJson, actionUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventType,
          title,
          message,
          recipientUserId,
          recipientRole,
          channel,
          priority,
          JSON.stringify(data),
          actionUrl
        ]
      );
    }
  }
}

module.exports = { EventPublisher };
