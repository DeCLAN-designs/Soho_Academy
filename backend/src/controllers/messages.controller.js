const pool = require("../config/db.js");

const getMessages = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { status } = req.query;
    
    let query = `
      SELECT 
        m.*,
        sender.firstName as sender_first_name,
        sender.lastName as sender_last_name,
        receiver.firstName as receiver_first_name,
        receiver.lastName as receiver_last_name
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
    `;
    const params = [userId, userId];
    
    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY m.sent_at DESC`;
    
    const [messages] = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      message: "Messages retrieved successfully.",
      data: {
        messages,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages.",
    });
  }
};

const createMessage = async (req, res) => {
  try {
    const { receiverId, subject, content } = req.body;
    const senderId = req.user.sub;
    
    if (!receiverId || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Receiver, subject, and content are required.",
      });
    }
    
    const [result] = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, subject, content)
       VALUES (?, ?, ?, ?)`,
      [senderId, receiverId, subject, content]
    );
    
    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    const [result] = await pool.query(
      `UPDATE messages 
       SET read_at = CURRENT_TIMESTAMP, status = 'Read'
       WHERE id = ? AND receiver_id = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not the recipient.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Message marked as read.",
    });
  } catch (error) {
    console.error("Mark message as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark message as read.",
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    const [result] = await pool.query(
      `DELETE FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [id, userId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you don't have permission to delete it.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete message.",
    });
  }
};

module.exports = {
  getMessages,
  createMessage,
  markMessageAsRead,
  deleteMessage,
};
