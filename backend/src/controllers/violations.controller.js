const pool = require("../config/db.js");

const getViolations = async (req, res) => {
  try {
    const { status, severity, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        v.*,
        reporter.firstName as reporter_first_name,
        reporter.lastName as reporter_last_name,
        actionTaker.firstName as action_taker_first_name,
        actionTaker.lastName as action_taker_last_name,
        assigned.firstName as assigned_first_name,
        assigned.lastName as assigned_last_name
      FROM violations v
      LEFT JOIN users reporter ON v.reported_by_user_id = reporter.id
      LEFT JOIN users actionTaker ON v.action_taken_by_user_id = actionTaker.id
      LEFT JOIN users assigned ON v.assigned_to_user_id = assigned.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ` AND v.status = ?`;
      params.push(status);
    }
    
    if (severity) {
      query += ` AND v.severity = ?`;
      params.push(severity);
    }
    
    if (startDate) {
      query += ` AND v.reported_date >= ?`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND v.reported_date <= ?`;
      params.push(endDate);
    }
    
    query += ` ORDER BY v.reported_date DESC`;
    
    const [violations] = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      message: "Violations retrieved successfully.",
      data: {
        violations,
      },
    });
  } catch (error) {
    console.error("Get violations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch violations.",
    });
  }
};

const createViolation = async (req, res) => {
  try {
    const { type, description, reportedDate, severity, assignedToUserId } = req.body;
    const userId = req.user.sub;
    
    if (!type || !description || !reportedDate) {
      return res.status(400).json({
        success: false,
        message: "Type, description, and reported date are required.",
      });
    }
    
    const [result] = await pool.query(
      `INSERT INTO violations (type, description, reported_by_user_id, reported_date, severity, assigned_to_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, description, userId, reportedDate, severity, assignedToUserId]
    );
    
    return res.status(201).json({
      success: true,
      message: "Violation created successfully.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create violation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create violation.",
    });
  }
};

const updateViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken, actionDate, assignedToUserId } = req.body;
    const userId = req.user.sub;
    
    const updates = [];
    const params = [];
    
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (actionTaken) {
      updates.push('action_taken = ?');
      params.push(actionTaken);
    }
    
    if (actionDate) {
      updates.push('action_date = ?');
      params.push(actionDate);
    }
    
    if (assignedToUserId !== undefined) {
      updates.push('assigned_to_user_id = ?');
      params.push(assignedToUserId);
    }
    
    if (actionTaken) {
      updates.push('action_taken_by_user_id = ?');
      params.push(userId);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    const [result] = await pool.query(
      `UPDATE violations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Violation not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Violation updated successfully.",
    });
  } catch (error) {
    console.error("Update violation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update violation.",
    });
  }
};

const deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`DELETE FROM violations WHERE id = ?`, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Violation not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Violation deleted successfully.",
    });
  } catch (error) {
    console.error("Delete violation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete violation.",
    });
  }
};

module.exports = {
  getViolations,
  createViolation,
  updateViolation,
  deleteViolation,
};
