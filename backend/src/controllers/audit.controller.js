const pool = require("../config/db.js");

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, pageSize = 50, userId, domain, entityType, action, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let query = `
      SELECT 
        al.id,
        al.actorUserId,
        u.firstName,
        u.lastName,
        u.email,
        al.domain,
        al.entityType,
        al.entityId,
        al.action,
        al.actionDetails,
        al.previousStateJson,
        al.newStateJson,
        al.changesSummary,
        al.severity,
        al.complianceRelevant,
        al.createdAt
      FROM audit_logs al
      LEFT JOIN users u ON al.actorUserId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ` AND al.actorUserId = ?`;
      params.push(userId);
    }

    if (domain) {
      query += ` AND al.domain = ?`;
      params.push(domain);
    }

    if (entityType) {
      query += ` AND al.entityType = ?`;
      params.push(entityType);
    }

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (startDate) {
      query += ` AND al.createdAt >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND al.createdAt <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY al.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
    const countParams = [];

    if (userId) {
      countQuery += ` AND actorUserId = ?`;
      countParams.push(userId);
    }

    if (domain) {
      countQuery += ` AND domain = ?`;
      countParams.push(domain);
    }

    if (entityType) {
      countQuery += ` AND entityType = ?`;
      countParams.push(entityType);
    }

    if (action) {
      countQuery += ` AND action = ?`;
      countParams.push(action);
    }

    if (startDate) {
      countQuery += ` AND createdAt >= ?`;
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ` AND createdAt <= ?`;
      countParams.push(endDate);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully.",
      data: {
        logs,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize)),
        },
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs.",
    });
  }
};

module.exports = {
  getAuditLogs,
};
