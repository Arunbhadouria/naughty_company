// ============================================
// FEEDBACK COLLECTOR
// ============================================
// Collects user feedback on misclassifications
// Saves to sentiment-model/training-data/feedback.json
// ============================================

const fs = require('fs');
const path = require('path');

class FeedbackCollector {
  constructor() {
    this.feedbackFile = path.join(__dirname, 'training-data', 'feedback.json');
    this.feedback = this.loadFeedback();
  }

  // ============================================
  // LOAD FEEDBACK
  // ============================================
  // Reads feedback.json from disk
  // Returns empty structure if file doesn't exist
  
  loadFeedback() {
    try {
      if (fs.existsSync(this.feedbackFile)) {
        const data = fs.readFileSync(this.feedbackFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn("⚠️  Could not load feedback.json, starting fresh");
    }

    // Default structure
    return {
      scam: [],
      defensive: [],
      legit: []
    };
  }

  // ============================================
  // ADD FEEDBACK
  // ============================================
  // User says: "This text should be SCAM, not DEFENSIVE"
  // addFeedback(text, 'scam')
  // Saves to feedback.json
  
  addFeedback(text, actualCategory) {
    // Validate category
    if (!this.feedback[actualCategory]) {
      console.error(`❌ Invalid category: ${actualCategory}`);
      return false;
    }

    // Don't add duplicates
    if (this.feedback[actualCategory].includes(text)) {
      console.log("⚠️  This example already exists");
      return false;
    }

    // Add new feedback
    this.feedback[actualCategory].push(text);
    this.saveFeedback();

    return true;
  }

  // ============================================
  // SAVE FEEDBACK
  // ============================================
  // Writes feedback to disk as JSON
  
  saveFeedback() {
    try {
      fs.writeFileSync(
        this.feedbackFile,
        JSON.stringify(this.feedback, null, 2)
      );
    } catch (err) {
      console.error("❌ Failed to save feedback:", err.message);
    }
  }

  // ============================================
  // GET ALL FEEDBACK
  // ============================================
  // Returns all collected feedback
  // Used for merging with training data
  
  getAllFeedback() {
    return this.feedback;
  }

  // ============================================
  // GET STATS
  // ============================================
  // Returns count of feedback in each category
  // Useful for monitoring feedback collection
  
  getStats() {
    return {
      scam: this.feedback.scam.length,
      defensive: this.feedback.defensive.length,
      legit: this.feedback.legit.length,
      total: 
        this.feedback.scam.length + 
        this.feedback.defensive.length + 
        this.feedback.legit.length
    };
  }

  // ============================================
  // CLEAR FEEDBACK
  // ============================================
  // Deletes all feedback (use after merging to training data)
  // Call after: node merge_feedback.js
  
  clearFeedback() {
    this.feedback = {
      scam: [],
      defensive: [],
      legit: []
    };
    this.saveFeedback();
  }

  // ============================================
  // VIEW FEEDBACK BY CATEGORY
  // ============================================
  // Returns all feedback for specific category
  // Usage: getFeedbackByCategory('scam')
  
  getFeedbackByCategory(category) {
    if (!this.feedback[category]) {
      return [];
    }
    return this.feedback[category];
  }
}

// Export singleton (one instance for whole app)
module.exports = new FeedbackCollector();