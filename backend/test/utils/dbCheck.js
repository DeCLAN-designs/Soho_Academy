const pool = require('../../src/config/db');

const hasDb = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.warn('DB not available for integration tests:', err.message);
    return false;
  }
};

module.exports = { hasDb };
