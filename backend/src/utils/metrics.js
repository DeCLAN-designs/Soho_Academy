let client = null;
try {
  client = require('prom-client');
} catch (err) {
  console.warn('prom-client not installed — metrics disabled. Run `npm install` to enable metrics.');
}

if (client) {
  // Default collection (nodejs) metrics
  client.collectDefaultMetrics({ timeout: 5000 });

  const registry = client.register;

  const schedulerRuns = new client.Counter({
    name: 'scheduler_runs_total',
    help: 'Total number of scheduler executions'
  });

  const schedulerErrors = new client.Counter({
    name: 'scheduler_errors_total',
    help: 'Total number of scheduler errors'
  });

  const tripsCreated = new client.Counter({
    name: 'trips_created_total',
    help: 'Total number of trips created by scheduler'
  });

  const tripsSkipped = new client.Counter({
    name: 'trips_skipped_total',
    help: 'Total number of trips skipped due to existing trip (immutability)'
  });

  const attendanceUpdates = new client.Counter({
    name: 'attendance_updates_total',
    help: 'Total number of attendance update attempts'
  });

  module.exports = {
    registry,
    schedulerRuns,
    schedulerErrors,
    tripsCreated,
    tripsSkipped,
    attendanceUpdates,
  };

} else {
  // No-op fallbacks so the app can run without prom-client installed
  const registry = {
    contentType: 'text/plain; version=0.0.4',
    metrics: async () => ''
  };

  const noop = { inc: () => {} };

  module.exports = {
    registry,
    schedulerRuns: noop,
    schedulerErrors: noop,
    tripsCreated: noop,
    tripsSkipped: noop,
    attendanceUpdates: noop,
  };
}
