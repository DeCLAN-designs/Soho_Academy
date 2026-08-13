const pool = require("../config/db.js");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { status, type } = req.query;
    
    let query = `
      SELECT 
        n.*,
        recipient.firstName as recipient_first_name,
        recipient.lastName as recipient_last_name
      FROM notifications n
      LEFT JOIN users recipient ON n.recipient_id = recipient.id
      WHERE n.recipient_id = ?
    `;
    const params = [userId];
    
    if (status) {
      query += ` AND n.status = ?`;
      params.push(status);
    }
    
    if (type) {
      query += ` AND n.type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY n.sent_at DESC`;
    
    const [notifications] = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully.",
      data: {
        notifications,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

const createNotification = async (req, res) => {
  try {
    const { recipientId, type, title, message, relatedEntityType, relatedEntityId } = req.body;
    
    if (!recipientId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient, title, and message are required.",
      });
    }
    
    const [result] = await pool.query(
      `INSERT INTO notifications (recipient_id, type, title, message, related_entity_type, related_entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipientId, type || 'General', title, message, relatedEntityType, relatedEntityId]
    );
    
    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notification.",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    const [result] = await pool.query(
      `UPDATE notifications 
       SET read_at = CURRENT_TIMESTAMP, status = 'Read'
       WHERE id = ? AND recipient_id = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or you are not the recipient.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.sub;
    
    const [result] = await pool.query(
      `UPDATE notifications 
       SET read_at = CURRENT_TIMESTAMP, status = 'Read'
       WHERE recipient_id = ? AND status = 'Sent'`,
      [userId]
    );
    
    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} notifications marked as read.`,
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read.",
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    const [result] = await pool.query(
      `DELETE FROM notifications WHERE id = ? AND recipient_id = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or you are not the recipient.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
};
