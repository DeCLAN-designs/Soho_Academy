const pool = require('../config/db.js');

const getSchedulerHealth = async (req, res) => {
  try {
    // Return last 10 scheduler_logs
    const [rows] = await pool.query(`SELECT * FROM scheduler_logs ORDER BY created_at DESC LIMIT 10`);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Failed to fetch scheduler health', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch scheduler health' });
  }
};

module.exports = { getSchedulerHealth };
