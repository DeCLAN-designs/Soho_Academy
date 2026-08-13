const pool = require("../config/db.js");

const getSafetyAudits = async (req, res) => {
  try {
    const { status, auditorId, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        sa.*,
        auditor.firstName as auditor_first_name,
        auditor.lastName as auditor_last_name,
        creator.firstName as creator_first_name,
        creator.lastName as creator_last_name
      FROM safety_audits sa
      LEFT JOIN users auditor ON sa.auditor_id = auditor.id
      LEFT JOIN users creator ON sa.created_by_user_id = creator.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ` AND sa.status = ?`;
      params.push(status);
    }
    
    if (auditorId) {
      query += ` AND sa.auditor_id = ?`;
      params.push(auditorId);
    }
    
    if (startDate) {
      query += ` AND sa.scheduled_date >= ?`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND sa.scheduled_date <= ?`;
      params.push(endDate);
    }
    
    query += ` ORDER BY sa.scheduled_date DESC`;
    
    const [audits] = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      message: "Safety audits retrieved successfully.",
      data: {
        audits,
      },
    });
  } catch (error) {
    console.error("Get safety audits error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch safety audits.",
    });
  }
};

const createSafetyAudit = async (req, res) => {
  try {
    const { title, description, scheduledDate, auditorId, priority } = req.body;
    const userId = req.user.sub;
    
    if (!title || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: "Title and scheduled date are required.",
      });
    }
    
    const [result] = await pool.query(
      `INSERT INTO safety_audits (title, description, scheduled_date, auditor_id, priority, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, scheduledDate, auditorId, priority, userId]
    );
    
    return res.status(201).json({
      success: true,
      message: "Safety audit created successfully.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create safety audit error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create safety audit.",
    });
  }
};

const updateSafetyAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, scheduledDate, conductedDate, auditorId, status, findings, recommendations, priority } = req.body;
    const userId = req.user.sub;
    
    const [result] = await pool.query(
      `UPDATE safety_audits 
       SET title = ?, description = ?, scheduled_date = ?, conducted_date = ?, 
           auditor_id = ?, status = ?, findings = ?, recommendations = ?, priority = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, scheduledDate, conductedDate, auditorId, status, findings, recommendations, priority, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Safety audit not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Safety audit updated successfully.",
    });
  } catch (error) {
    console.error("Update safety audit error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update safety audit.",
    });
  }
};

const deleteSafetyAudit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`DELETE FROM safety_audits WHERE id = ?`, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Safety audit not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Safety audit deleted successfully.",
    });
  } catch (error) {
    console.error("Delete safety audit error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete safety audit.",
    });
  }
};

module.exports = {
  getSafetyAudits,
  createSafetyAudit,
  updateSafetyAudit,
  deleteSafetyAudit,
};
