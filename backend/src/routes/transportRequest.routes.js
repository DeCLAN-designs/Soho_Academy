const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// All routes require authentication and Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

// GET /api/transport-manager/parent-requests - Get all parent transport requests
router.get("/parent-requests", async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT 
        ptr.id,
        ptr.parentUserId,
        u.firstName as parentName,
        u.phoneNumber as parentContact,
        ptr.studentId,
        s.admissionNumber,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        ptr.requestType,
        ptr.requestTitle,
        ptr.requestDetails as requestDescription,
        ptr.currentRouteId as preferredRouteId,
        r.routeCode as preferredRouteCode,
        ptr.preferredEffectiveDate,
        ptr.status,
        ptr.managerReviewNotes,
        ptr.reviewedByUserId,
        ptr.createdAt,
        ptr.updatedAt
       FROM parent_transport_requests ptr
       JOIN users u ON ptr.parentUserId = u.id
       JOIN students s ON ptr.studentId = s.id
       LEFT JOIN routes r ON ptr.currentRouteId = r.id
       ORDER BY ptr.createdAt DESC`
    );

    res.json({ requests });
  } catch (error) {
    console.error("Error fetching parent requests:", error);
    res.status(500).json({ message: "Failed to fetch parent requests" });
  }
});

// GET /api/transport-manager/parent-requests/:requestId - Get request details with audit logs
router.get("/parent-requests/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get request
    const [requests] = await pool.query(
      `SELECT 
        ptr.id,
        ptr.parentUserId,
        u.firstName as parentName,
        u.phoneNumber as parentContact,
        ptr.studentId,
        s.admissionNumber,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        ptr.requestType,
        ptr.requestTitle,
        ptr.requestDetails as requestDescription,
        ptr.currentRouteId as preferredRouteId,
        r.routeCode as preferredRouteCode,
        ptr.preferredEffectiveDate,
        ptr.status,
        ptr.managerReviewNotes,
        ptr.reviewedByUserId,
        reviewer.firstName as reviewedByName,
        ptr.createdAt,
        ptr.updatedAt
       FROM parent_transport_requests ptr
       JOIN users u ON ptr.parentUserId = u.id
       JOIN students s ON ptr.studentId = s.id
       LEFT JOIN routes r ON ptr.currentRouteId = r.id
       LEFT JOIN users reviewer ON ptr.reviewedByUserId = reviewer.id
       WHERE ptr.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = requests[0];

    // Get audit logs
    const [auditLogs] = await pool.query(
      `SELECT 
        al.id,
        al.actorUserId,
        u.firstName as actorName,
        u.role as actorRole,
        al.action,
        al.targetType,
        al.targetId,
        al.details,
        al.createdAt
       FROM audit_logs al
       LEFT JOIN users u ON al.actorUserId = u.id
       WHERE al.targetType = 'parent_transport_request' AND al.targetId = ?
       ORDER BY al.createdAt DESC`,
      [requestId]
    );

    res.json({ request, auditLogs });
  } catch (error) {
    console.error("Error fetching parent request:", error);
    res.status(500).json({ message: "Failed to fetch parent request" });
  }
});

// PATCH /api/transport-manager/parent-requests/:requestId/review
router.patch("/parent-requests/:requestId/review", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { requestId } = req.params;
    const { status, managerReviewNotes } = req.body;

    // Update request
    await connection.query(
      `UPDATE parent_transport_requests 
       SET status = ?, managerReviewNotes = ?, reviewedByUserId = ?, updatedAt = NOW()
       WHERE id = ?`,
      [status, managerReviewNotes || null, req.user.sub, requestId]
    );

    // Log audit
    await connection.query(
      `INSERT INTO audit_logs (actorUserId, action, targetType, targetId, details)
       VALUES (?, ?, 'parent_transport_request', ?, ?)`,
      [req.user.sub, `REQUEST_${status}`, requestId, managerReviewNotes || null]
    );

    await connection.commit();

    // Return updated request
    const [requests] = await connection.query(
      `SELECT 
        ptr.id,
        ptr.parentUserId,
        u.firstName as parentName,
        u.phoneNumber as parentContact,
        ptr.studentId,
        s.admissionNumber,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        ptr.requestType,
        ptr.requestTitle,
        ptr.requestDetails as requestDescription,
        ptr.currentRouteId as preferredRouteId,
        r.routeCode as preferredRouteCode,
        ptr.preferredEffectiveDate,
        ptr.status,
        ptr.managerReviewNotes,
        ptr.reviewedByUserId,
        reviewer.firstName as reviewedByName,
        ptr.createdAt,
        ptr.updatedAt
       FROM parent_transport_requests ptr
       JOIN users u ON ptr.parentUserId = u.id
       JOIN students s ON ptr.studentId = s.id
       LEFT JOIN routes r ON ptr.currentRouteId = r.id
       LEFT JOIN users reviewer ON ptr.reviewedByUserId = reviewer.id
       WHERE ptr.id = ?`,
      [requestId]
    );

    const request = requests[0];

    // Get audit logs
    const [auditLogs] = await connection.query(
      `SELECT 
        al.id,
        al.actorUserId,
        u.firstName as actorName,
        u.role as actorRole,
        al.action,
        al.targetType,
        al.targetId,
        al.details,
        al.createdAt
       FROM audit_logs al
       LEFT JOIN users u ON al.actorUserId = u.id
       WHERE al.targetType = 'parent_transport_request' AND al.targetId = ?
       ORDER BY al.createdAt DESC`,
      [requestId]
    );

    res.json({ request, auditLogs });
  } catch (error) {
    await connection.rollback();
    console.error("Error reviewing request:", error);
    res.status(500).json({ message: "Failed to review request" });
  } finally {
    connection.release();
  }
});

module.exports = router;
