/**
 * In-Memory Sliding-Window Rate Limiter
 * Guards sensitive endpoints against brute-force and DoS attacks
 * Auto-cleans expired entries to prevent memory leaks
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map();

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so it does not block node event loop exit

  const middleware = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(ip, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSec
      });
    }

    next();
  };

  // Allow resetting rate limits upon verified successful authentication
  middleware.reset = (req) => {
    const ip = req?.ip || req?.socket?.remoteAddress || 'unknown';
    hits.delete(ip);
  };

  return middleware;
}

module.exports = {
  // Login rate limiter: Max 20 failed attempts per 15 minutes per IP
  authLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many login attempts from this IP address. Please wait 15 minutes before trying again.'
  }),

  // General API rate limiter: Max 500 requests per 15 minutes per IP
  apiLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests sent to the server. Please slow down.'
  })
};
