const pool = require("../config/db.js");

const getAnnouncements = async (req, res) => {
  try {
    const { status, targetAudience } = req.query;
    
    let query = `
      SELECT 
        a.*,
        creator.firstName as creator_first_name,
        creator.lastName as creator_last_name
      FROM announcements a
      LEFT JOIN users creator ON a.created_by_user_id = creator.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    
    if (targetAudience) {
      query += ` AND a.target_audience = ?`;
      params.push(targetAudience);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const [announcements] = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      message: "Announcements retrieved successfully.",
      data: {
        announcements,
      },
    });
  } catch (error) {
    console.error("Get announcements error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements.",
    });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetAudience, status } = req.body;
    const userId = req.user.sub;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }
    
    const publishedAt = status === 'Published' ? new Date() : null;
    
    const [result] = await pool.query(
      `INSERT INTO announcements (title, content, target_audience, created_by_user_id, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, targetAudience || 'All', userId, status || 'Draft', publishedAt]
    );
    
    return res.status(201).json({
      success: true,
      message: "Announcement created successfully.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create announcement.",
    });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, targetAudience, status } = req.body;
    
    const publishedAt = status === 'Published' && !await wasPreviouslyPublished(id) ? new Date() : null;
    
    const [result] = await pool.query(
      `UPDATE announcements 
       SET title = ?, content = ?, target_audience = ?, status = ?, 
           published_at = COALESCE(?, published_at), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, content, targetAudience, status, publishedAt, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully.",
    });
  } catch (error) {
    console.error("Update announcement error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update announcement.",
    });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`DELETE FROM announcements WHERE id = ?`, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully.",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement.",
    });
  }
};

async function wasPreviouslyPublished(id) {
  const [rows] = await pool.query(`SELECT published_at FROM announcements WHERE id = ?`, [id]);
  return rows[0]?.published_at !== null;
}

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
