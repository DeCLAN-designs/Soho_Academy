const redis = require('redis');

// SSE stream for attendance_marked events. Requires `authenticate` middleware upstream.
const sseAttendanceStream = async (req, res) => {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
  });

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const client = redis.createClient({ url: redisUrl });
  await client.connect();

  const onMessage = (message) => {
    let payload = message;
    try {
      payload = JSON.parse(message);
    } catch (err) {}
    const data = `event: attendance_marked\ndata: ${JSON.stringify(payload)}\n\n`;
    res.write(data);
  };

  // Subscribe using separate subscriber
  const sub = client.duplicate();
  await sub.connect();
  await sub.subscribe('attendance_marked', onMessage);

  // Keep-alive comment
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', async () => {
    clearInterval(keepAlive);
    try {
      await sub.unsubscribe('attendance_marked');
      await sub.quit();
      await client.quit();
    } catch (err) {
      // ignore
    }
  });
};

module.exports = { sseAttendanceStream };
