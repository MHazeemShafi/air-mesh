// Lightweight in-memory sliding-window rate limiter for serverless route protection
const rateLimits = new Map();

/**
 * Checks if an identifier (e.g. IP address or email) has exceeded rate limits.
 * @param {string} key - Unique key to limit on (e.g. `subscribe:${ip}`)
 * @param {number} limit - Maximum allowed requests in the time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if allowed, false if rate limited
 */
export function checkRateLimit(key, limit = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  const record = rateLimits.get(key) || [];
  
  // Filter out timestamps outside the active window
  const activeTimestamps = record.filter(timestamp => now - timestamp < windowMs);

  if (activeTimestamps.length >= limit) {
    rateLimits.set(key, activeTimestamps);
    return false;
  }

  activeTimestamps.push(now);
  rateLimits.set(key, activeTimestamps);

  // Periodic cleanup if map grows large
  if (rateLimits.size > 1000) {
    for (const [k, timestamps] of rateLimits.entries()) {
      const remaining = timestamps.filter(t => now - t < windowMs);
      if (remaining.length === 0) {
        rateLimits.delete(k);
      } else {
        rateLimits.set(k, remaining);
      }
    }
  }

  return true;
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}
