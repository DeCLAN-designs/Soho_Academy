const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// All routes require authentication and Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

// GET /api/transport-manager/trips - Get all trips
router.get("/trips", async (req, res) => {
  try {
    const [trips] = await pool.query(
      `SELECT 
        t.id,
        t.routeId,
        t.routeAssignmentId,
        r.routeCode,
        r.routeName,
        r.routeDate,
        r.startTime,
        r.endTime,
        t.tripDate,
        t.scheduledStartTime,
        t.numberPlate,
        t.driverUserId,
        t.assistantUserId,
        d.firstName as driverName,
        ba.firstName as assistantName,
        t.status,
        (SELECT COUNT(*) FROM trip_student_attendance WHERE tripId = t.id) as totalStudents,
        (SELECT COUNT(*) FROM trip_student_attendance WHERE tripId = t.id AND boardingStatus = 'boarded') as boardedStudents,
        (SELECT COUNT(*) FROM trip_student_attendance WHERE tripId = t.id AND boardingStatus = 'dropped_off') as droppedOffStudents,
        t.startedAt,
        t.inProgressAt,
        t.completedAt,
        t.createdAt
       FROM trips t
       JOIN routes r ON t.routeId = r.id
       LEFT JOIN users d ON t.driverUserId = d.id
       LEFT JOIN users ba ON t.assistantUserId = ba.id
       ORDER BY t.createdAt DESC`
    );

    res.json({ trips });
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ message: "Failed to fetch trips" });
  }
});

// GET /api/transport-manager/trips/:tripId - Get trip details with attendance
router.get("/trips/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;

    // Get trip info
    const [trips] = await pool.query(
      `SELECT 
        t.id,
        t.routeId,
        t.routeAssignmentId,
        r.routeCode,
        r.routeName,
        r.routeDate,
        r.startTime,
        r.endTime,
        t.tripDate,
        t.scheduledStartTime,
        t.numberPlate,
        t.driverUserId,
        t.assistantUserId,
        d.firstName as driverName,
        ba.firstName as assistantName,
        t.status,
        t.startedAt,
        t.inProgressAt,
        t.completedAt,
        t.createdAt
       FROM trips t
       JOIN routes r ON t.routeId = r.id
       LEFT JOIN users d ON t.driverUserId = d.id
       LEFT JOIN users ba ON t.assistantUserId = ba.id
       WHERE t.id = ?`,
      [tripId]
    );

    if (trips.length === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const trip = trips[0];

    // Get attendance
    const [attendance] = await pool.query(
      `SELECT 
        tsa.studentId,
        s.admissionNumber,
        s.firstName,
        s.lastName,
        s.grade,
        s.stream,
        tsa.boardingStatus,
        tsa.boardedAt,
        tsa.droppedOffAt
       FROM trip_student_attendance tsa
       JOIN students s ON tsa.studentId = s.id
       WHERE tsa.tripId = ?`,
      [tripId]
    );

    // Get events
    const [events] = await pool.query(
      `SELECT 
        id,
        eventType,
        description,
        actorUserId,
        actorName,
        actorRole,
        createdAt
       FROM trip_events
       WHERE tripId = ?
       ORDER BY createdAt DESC`,
      [tripId]
    );

    res.json({ trip, attendance, events });
  } catch (error) {
    console.error("Error fetching trip details:", error);
    res.status(500).json({ message: "Failed to fetch trip details" });
  }
});

// POST /api/transport-manager/routes/:routeId/trips - Create a new trip
router.post("/routes/:routeId/trips", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { routeId } = req.params;

    // Get active route assignment
    const [assignments] = await connection.query(
      `SELECT * FROM route_assignments WHERE routeId = ? AND status = 'active' LIMIT 1`,
      [routeId]
    );

    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "No active assignment found for this route" });
    }

    const assignment = assignments[0];

    // Get route info
    const [routes] = await connection.query(
      `SELECT * FROM routes WHERE id = ?`,
      [routeId]
    );
    const route = routes[0];

    // Create trip
    const [tripResult] = await connection.query(
      `INSERT INTO trips (routeId, routeAssignmentId, numberPlate, driverUserId, assistantUserId, 
        tripDate, scheduledStartTime, status, createdByUserId)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [routeId, assignment.id, assignment.numberPlate, assignment.driverUserId, 
       assignment.assistantUserId, route.routeDate, route.startTime, req.user.sub]
    );

    const tripId = tripResult.insertId;

    // Add students from route assignments to trip attendance
    const [studentAssignments] = await connection.query(
      `SELECT studentId FROM route_student_assignments WHERE routeId = ?`,
      [routeId]
    );

    for (const { studentId } of studentAssignments) {
      await connection.query(
        `INSERT INTO trip_student_attendance (tripId, studentId, boardingStatus)
         VALUES (?, ?, 'not_boarded')`,
        [tripId, studentId]
      );
    }

    // Log event
    await connection.query(
      `INSERT INTO trip_events (tripId, eventType, description, actorUserId, actorName, actorRole)
       VALUES (?, 'scheduled', 'Trip scheduled', ?, ?, ?)`,
      [tripId, req.user.sub, req.user.firstName + ' ' + req.user.lastName, req.user.role]
    );

    await connection.commit();

    // Return trip details
    const [trips] = await connection.query(
      `SELECT 
        t.*, r.routeCode, r.routeName, r.routeDate, r.startTime, r.endTime,
        d.firstName as driverName, ba.firstName as assistantName
       FROM trips t
       JOIN routes r ON t.routeId = r.id
       LEFT JOIN users d ON t.driverUserId = d.id
       LEFT JOIN users ba ON t.assistantUserId = ba.id
       WHERE t.id = ?`,
      [tripId]
    );

    const [attendance] = await connection.query(
      `SELECT 
        tsa.studentId, s.admissionNumber, s.firstName, s.lastName, s.grade, s.stream,
        tsa.boardingStatus, tsa.boardedAt, tsa.droppedOffAt
       FROM trip_student_attendance tsa
       JOIN students s ON tsa.studentId = s.id
       WHERE tsa.tripId = ?`,
      [tripId]
    );

    const [events] = await connection.query(
      `SELECT * FROM trip_events WHERE tripId = ? ORDER BY createdAt DESC`,
      [tripId]
    );

    res.status(201).json({ trip: trips[0], attendance, events });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating trip:", error);
    res.status(500).json({ message: "Failed to create trip" });
  } finally {
    connection.release();
  }
});

// PATCH /api/transport-manager/trips/:tripId/status - Update trip status
router.patch("/trips/:tripId/status", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { tripId } = req.params;
    const { status } = req.body;

    let updateFields = { status };
    let eventDescription = "";

    if (status === "started") {
      updateFields.startedAt = new Date();
      eventDescription = "Trip started";
    } else if (status === "in_progress") {
      updateFields.inProgressAt = new Date();
      eventDescription = "Trip in progress";
    } else if (status === "completed") {
      updateFields.completedAt = new Date();
      eventDescription = "Trip completed";
    }

    // Update trip
    await connection.query(
      `UPDATE trips SET status = ?, startedAt = ?, inProgressAt = ?, completedAt = ? WHERE id = ?`,
      [updateFields.status, updateFields.startedAt || null, updateFields.inProgressAt || null, 
       updateFields.completedAt || null, tripId]
    );

    // Log event
    await connection.query(
      `INSERT INTO trip_events (tripId, eventType, description, actorUserId, actorName, actorRole)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tripId, status, eventDescription, req.user.sub, 
       req.user.firstName + ' ' + req.user.lastName, req.user.role]
    );

    await connection.commit();

    // Return updated trip
    const [trips] = await connection.query(
      `SELECT 
        t.*, r.routeCode, r.routeName, r.routeDate, r.startTime, r.endTime,
        d.firstName as driverName, ba.firstName as assistantName
       FROM trips t
       JOIN routes r ON t.routeId = r.id
       LEFT JOIN users d ON t.driverUserId = d.id
       LEFT JOIN users ba ON t.assistantUserId = ba.id
       WHERE t.id = ?`,
      [tripId]
    );

    const [attendance] = await connection.query(
      `SELECT 
        tsa.studentId, s.admissionNumber, s.firstName, s.lastName, s.grade, s.stream,
        tsa.boardingStatus, tsa.boardedAt, tsa.droppedOffAt
       FROM trip_student_attendance tsa
       JOIN students s ON tsa.studentId = s.id
       WHERE tsa.tripId = ?`,
      [tripId]
    );

    const [events] = await connection.query(
      `SELECT * FROM trip_events WHERE tripId = ? ORDER BY createdAt DESC`,
      [tripId]
    );

    res.json({ trip: trips[0], attendance, events });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating trip status:", error);
    res.status(500).json({ message: "Failed to update trip status" });
  } finally {
    connection.release();
  }
});

// PATCH /api/transport-manager/trips/:tripId/students/:studentId/attendance
router.patch("/trips/:tripId/students/:studentId/attendance", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { tripId, studentId } = req.params;
    const { boardingStatus } = req.body;

    let boardedAt = null;
    let droppedOffAt = null;

    if (boardingStatus === "boarded") {
      boardedAt = new Date();
    } else if (boardingStatus === "dropped_off") {
      droppedOffAt = new Date();
    }

    await connection.query(
      `UPDATE trip_student_attendance 
       SET boardingStatus = ?, boardedAt = ?, droppedOffAt = ?
       WHERE tripId = ? AND studentId = ?`,
      [boardingStatus, boardedAt, droppedOffAt, tripId, studentId]
    );

    // Log event
    const eventDescription = boardingStatus === "boarded" 
      ? `Student ${studentId} boarded` 
      : `Student ${studentId} dropped off`;

    await connection.query(
      `INSERT INTO trip_events (tripId, eventType, description, actorUserId, actorName, actorRole)
       VALUES (?, 'attendance_updated', ?, ?, ?, ?)`,
      [tripId, eventDescription, req.user.sub, 
       req.user.firstName + ' ' + req.user.lastName, req.user.role]
    );

    await connection.commit();

    // Return updated trip details
    const [trips] = await connection.query(
      `SELECT 
        t.*, r.routeCode, r.routeName, r.routeDate, r.startTime, r.endTime,
        d.firstName as driverName, ba.firstName as assistantName
       FROM trips t
       JOIN routes r ON t.routeId = r.id
       LEFT JOIN users d ON t.driverUserId = d.id
       LEFT JOIN users ba ON t.assistantUserId = ba.id
       WHERE t.id = ?`,
      [tripId]
    );

    const [attendance] = await connection.query(
      `SELECT 
        tsa.studentId, s.admissionNumber, s.firstName, s.lastName, s.grade, s.stream,
        tsa.boardingStatus, tsa.boardedAt, tsa.droppedOffAt
       FROM trip_student_attendance tsa
       JOIN students s ON tsa.studentId = s.id
       WHERE tsa.tripId = ?`,
      [tripId]
    );

    const [events] = await connection.query(
      `SELECT * FROM trip_events WHERE tripId = ? ORDER BY createdAt DESC`,
      [tripId]
    );

    res.json({ trip: trips[0], attendance, events });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Failed to update attendance" });
  } finally {
    connection.release();
  }
});

module.exports = router;
