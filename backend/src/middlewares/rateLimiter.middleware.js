/**
 * Lightweight in-memory rate limiter.
 *
 * No external dependencies — keeps a Map of request counts keyed by IP.
 * Entries are pruned on a configurable interval so memory stays bounded.
 *
 * Usage:
 *   const { createRateLimiter } = require("./rateLimiter.middleware.js");
 *   router.use("/login", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15 }));
 */

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later.",
} = {}) => {
  const hits = new Map();

  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) {
        hits.delete(key);
      }
    }
  }, windowMs);

  // Allow the Node process to exit even if the interval is still active.
  if (pruneInterval.unref) {
    pruneInterval.unref();
  }

  return (req, res, next) => {
    const key =
      req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.start >= windowMs) {
      entry = { count: 1, start: now };
      hits.set(key, entry);
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((windowMs - (now - entry.start)) / 1000));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
};

module.exports = { createRateLimiter };
