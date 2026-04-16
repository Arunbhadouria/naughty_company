const feedbackCollector = require("../../sentiment-model/feedback");

class FeedbackService {
  /**
   * Adds new feedback with optional content source tracking
   */
  addFeedback(text, actualCategory, contentSource = 'unknown') {
    return feedbackCollector.addFeedback(text, actualCategory, contentSource);
  }

  /**
   * Returns summary statistics
   */
  getStats() {
    return feedbackCollector.getStats();
  }

  /**
   * Returns all feedback entries
   */
  getAllFeedback() {
    return feedbackCollector.getAllFeedback();
  }
}

module.exports = new FeedbackService();
