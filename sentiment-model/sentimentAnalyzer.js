// ============================================
// SENTIMENT ANALYZER API
// ============================================
// Simple interface to use the trained model
// ============================================

const NaiveBayesClassifier = require('./naive_bayes');
const fs = require('fs');
const path = require('path');

class SentimentAnalyzer {
  constructor() {
    this.classifier = null;
    this.loaded = false;
  }

  // Load the trained model once
  load() {
    if (this.loaded) return;

    try {
      this.classifier = new NaiveBayesClassifier();
      const modelPath = path.join(__dirname, 'models', 'sentiment_model.json');
      this.classifier.load(modelPath);
      this.loaded = true;
    } catch (err) {
      console.error("❌ Failed to load sentiment model:", err.message);
      console.error("   Run 'node train.js' first to create the model");
      process.exit(1);
    }
  }

  // Analyze text and return result
  analyze(text) {
    if (!this.loaded) this.load();
    return this.classifier.classify(text);
  }

  // Helper: Is text likely a scam accusation?
  isScamAccusation(text) {
    const result = this.analyze(text);
    return result.category === 'scam' && result.confidence > 70;
  }

  // Helper: Is text defensive/warning content?
  isDefensive(text) {
    const result = this.analyze(text);
    return result.category === 'defensive' && result.confidence > 70;
  }

  // Helper: Is text positive/legitimate?
  isLegitimate(text) {
    const result = this.analyze(text);
    return result.category === 'legit' && result.confidence > 70;
  }
}

// Export singleton (one instance for whole app)
module.exports = new SentimentAnalyzer();