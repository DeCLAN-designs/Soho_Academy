const app = require("./src/app.js");
const pool = require("./src/config/db.js");
const { combinedLogPath, errorLogPath } = require("./src/utils/logger.js");
const { initCronJobs } = require("./src/jobs/dailyTrips.job.js");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Connected to MySQL");

    // Start background jobs
    initCronJobs();

    // Create HTTP server and attach realtime WebSocket
    const http = require('http');
    const server = http.createServer(app);

    const tryListen = (port, attemptsLeft = 3) => {
      server.listen(port, async () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
        console.log(`📝 Express logs: terminal + ${combinedLogPath}`);
        console.log(`📝 Express error logs: ${errorLogPath}`);

        // Initialize realtime subsystem (WebSocket + Redis pub/sub) after server is listening
        try {
          const { initRealtime } = require('./src/utils/realtime');
          await initRealtime(server);
        } catch (err) {
          console.warn('Realtime subsystem failed to initialize:', err);
        }
      });

      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.warn(`Port ${port} in use, trying port ${Number(port) + 1} (${attemptsLeft - 1} attempts left)`);
          setTimeout(() => tryListen(Number(port) + 1, attemptsLeft - 1), 200);
          return;
        }
        if (err && err.code === 'EADDRINUSE') {
          console.error(`Port ${port} already in use. Try stopping the other process or change PORT env.`);
          process.exit(1);
        }
        console.error('Server error', err);
        process.exit(1);
      });
    };

    tryListen(PORT, 5);
  } catch (error) {
    console.error("❌ Failed to connect to MySQL", error);
    process.exit(1);
  }
};

startServer();
