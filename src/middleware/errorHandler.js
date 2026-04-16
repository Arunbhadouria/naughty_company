/**
 * Global error handler for Express app.
 * Returns structured JSON errors.
 */
function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${err.stack}`);

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      // Only show stack trace in development
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    }
  });
}

module.exports = errorHandler;
