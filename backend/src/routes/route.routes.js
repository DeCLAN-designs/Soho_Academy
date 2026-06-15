const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// All routes require authentication and Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

// GET /api/transport-manager/routes - Get all routes with stops
router.get("/routes", async (req, res) => {
  try {
    const [routes] = await pool.query(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM route_stops WHERE routeId = r.id) as stopCount
       FROM routes r 
       ORDER BY r.createdAt DESC`
    );

    // Get stops for each route
    const routesWithStops = await Promise.all(
      routes.map(async (route) => {
        const [stops] = await pool.query(
          `SELECT id, stopType, stopOrder, location, timeAllocation 
           FROM route_stops 
           WHERE routeId = ? 
           ORDER BY stopOrder`,
          [route.id]
        );
        return { ...route, stops };
      })
    );

    res.json({ routes: routesWithStops });
  } catch (error) {
    console.error("Error fetching routes:", error);
    res.status(500).json({ message: "Failed to fetch routes" });
  }
});

// POST /api/transport-manager/routes - Create a new route with stops
router.post("/routes", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { routeCode, routeName, routeDate, startTime, endTime, stops } = req.body;

    // Insert route
    const [routeResult] = await connection.query(
      `INSERT INTO routes (routeCode, routeName, routeDate, startTime, endTime, createdByUserId, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [routeCode, routeName, routeDate, startTime, endTime, req.user.sub]
    );

    const routeId = routeResult.insertId;

    // Insert stops
    if (stops && stops.length > 0) {
      for (const stop of stops) {
        await connection.query(
          `INSERT INTO route_stops (routeId, stopType, stopOrder, location, timeAllocation)
           VALUES (?, ?, ?, ?, ?)`,
          [routeId, stop.stopType, stop.stopOrder, stop.location, stop.timeAllocation || null]
        );
      }
    }

    await connection.commit();

    const [newRoute] = await connection.query(
      `SELECT * FROM routes WHERE id = ?`,
      [routeId]
    );

    res.status(201).json({ route: newRoute[0] });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating route:", error);
    res.status(500).json({ message: "Failed to create route" });
  } finally {
    connection.release();
  }
});

// POST /api/transport-manager/routes/:routeId/assign-vehicle-staff
router.post("/routes/:routeId/assign-vehicle-staff", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { numberPlate, driverUserId, assistantUserId } = req.body;

    // Deactivate any existing assignment for this route
    await pool.query(
      `UPDATE route_assignments SET status = 'inactive' WHERE routeId = ? AND status = 'active'`,
      [routeId]
    );

    // Create new assignment
    const [result] = await pool.query(
      `INSERT INTO route_assignments (routeId, numberPlate, driverUserId, assistantUserId, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [routeId, numberPlate, driverUserId, assistantUserId || null]
    );

    res.json({ assigned: true, assignmentId: result.insertId });
  } catch (error) {
    console.error("Error assigning vehicle and staff:", error);
    res.status(500).json({ message: "Failed to assign vehicle and staff" });
  }
});

// POST /api/transport-manager/routes/:routeId/students - Assign students to route
router.post("/routes/:routeId/students", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { studentIds } = req.body;

    // Insert student assignments
    for (const studentId of studentIds) {
      await pool.query(
        `INSERT IGNORE INTO route_student_assignments (routeId, studentId) VALUES (?, ?)`,
        [routeId, studentId]
      );
    }

    res.json({ assigned: true });
  } catch (error) {
    console.error("Error assigning students:", error);
    res.status(500).json({ message: "Failed to assign students" });
  }
});

module.exports = router;
