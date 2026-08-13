const pool = require("../config/db.js");

const getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `SELECT * FROM settings`;
    const params = [];
    
    if (category) {
      query += ` WHERE category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY category, setting_key`;
    
    const [settings] = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      message: "Settings retrieved successfully.",
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings.",
    });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { settingKey, settingValue } = req.body;
    const userId = req.user.sub;
    
    if (!settingKey || settingValue === undefined) {
      return res.status(400).json({
        success: false,
        message: "Setting key and value are required.",
      });
    }
    
    const [result] = await pool.query(
      `UPDATE settings 
       SET setting_value = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = ?`,
      [settingValue, userId, settingKey]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Setting not found.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Setting updated successfully.",
    });
  } catch (error) {
    console.error("Update setting error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update setting.",
    });
  }
};

const updateMultipleSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.user.sub;
    
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Settings array is required.",
      });
    }
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const setting of settings) {
        const { settingKey, settingValue } = setting;
        
        await connection.query(
          `UPDATE settings 
           SET setting_value = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE setting_key = ?`,
          [settingValue, userId, settingKey]
        );
      }
      
      await connection.commit();
      
      return res.status(200).json({
        success: true,
        message: "Settings updated successfully.",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update multiple settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update settings.",
    });
  }
};

module.exports = {
  getSettings,
  updateSetting,
  updateMultipleSettings,
};
