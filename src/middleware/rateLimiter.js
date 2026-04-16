const rateLimit = require("express-rate-limit");

/**
 * Limits API requests per IP to prevent abuse and protect SerpAPI quota.
 * 10 requests per minute.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,           // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      message: "Too many requests, please try again after a minute.",
      status: 429
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

module.exports = apiLimiter;
