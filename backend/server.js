const app = require("./src/app.js");
const pool = require("./src/config/db.js");
const { combinedLogPath, errorLogPath } = require("./src/utils/logger.js");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Connected to MySQL");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Express logs: terminal + ${combinedLogPath}`);
      console.log(`📝 Express error logs: ${errorLogPath}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to MySQL", error);
    process.exit(1);
  }
};

startServer();
