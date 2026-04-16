const express = require("express");
const router = express.Router();
const sentimentService = require("../services/sentiment.service");

/**
 * GET /api/health
 * Checks server status and if the ML model is loaded.
 */
router.get("/", (req, res) => {
  try {
    sentimentService.load();
    res.json({
      success: true,
      data: {
        status: "UP",
        timestamp: new Date().toISOString(),
        model_loaded: true
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      data: {
        status: "DEGRADED",
        timestamp: new Date().toISOString(),
        model_loaded: false,
        error: err.message
      }
    });
  }
});

module.exports = router;
