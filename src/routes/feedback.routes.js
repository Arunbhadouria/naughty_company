const express = require("express");
const router = express.Router();
const feedbackService = require("../services/feedback.service");

/**
 * POST /api/v1/feedback
 * Submit a correction for a classification.
 */
router.post("/", (req, res) => {
  const { text, category, contentSource } = req.body;

  if (!text || !category) {
    return res.status(400).json({
      success: false,
      error: { message: "Text and category are required." }
    });
  }

  const success = feedbackService.addFeedback(text, category, contentSource);

  if (success) {
    res.json({
      success: true,
      message: "Feedback recorded successfully."
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Could not add feedback (likely duplicate)."
    });
  }
});

/**
 * GET /api/v1/feedback/stats
 * Get feedback statistics.
 */
router.get("/stats", (req, res) => {
  const stats = feedbackService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

module.exports = router;
