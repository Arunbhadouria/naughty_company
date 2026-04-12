// ============================================
// NAIVE BAYES CLASSIFIER
// ============================================
// This is the machine learning algorithm
// It learns patterns from training data
// ============================================

class NaiveBayesClassifier {
  // Constructor: Initialize empty model
  constructor() {
    this.vocabulary = new Set();      // All unique words we've seen
    this.categories = {};              // Category data (scam, defensive, legit)
    this.categoryTotals = {};          // How many docs in each category
    this.totalDocs = 0;                // Total training documents
  }

  // ============================================
  // TOKENIZE: Convert text to words
  // ============================================
  // "hello world" → ["hello", "world"]
  // "it's" → ["it", "s"]
  // Removes punctuation and converts to lowercase
  
  tokenize(text) {
    // Convert to lowercase
    let tokens = text.toLowerCase()
      // Replace special characters with spaces
      .replace(/[^a-z0-9\s]/g, ' ')
      // Split on spaces
      .split(/\s+/)
      // Remove empty strings
      .filter(token => token.length > 0);
    
    return tokens;
  }

  // ============================================
  // TRAIN: Learn from training data
  // ============================================
  // Input: { scam: [...], defensive: [...], legit: [...] }
  // Process: Extract words, count frequencies, calculate probabilities
  // Output: Trained model stored in this.categories
  
  train(trainingData) {
    console.log("📚 Training started...");

    // Initialize category data
    for (const category in trainingData) {
      this.categories[category] = {
        docs: trainingData[category],           // Original documents
        wordFreq: {},                           // Word → count in this category
        totalWords: 0                           // Total words in this category
      };
      this.categoryTotals[category] = trainingData[category].length;
      this.totalDocs += trainingData[category].length;
    }

    // Process each category
    for (const category in this.categories) {
      const docs = this.categories[category].docs;

      // Process each document in category
      for (const doc of docs) {
        // Tokenize: convert text to words
        const tokens = this.tokenize(doc);

        // Count word frequencies
        for (const token of tokens) {
          // Add word to vocabulary
          this.vocabulary.add(token);

          // Count this word in this category
          if (!this.categories[category].wordFreq[token]) {
            this.categories[category].wordFreq[token] = 0;
          }
          this.categories[category].wordFreq[token]++;
          this.categories[category].totalWords++;
        }
      }

      console.log(`  ✓ ${category}: ${docs.length} docs, ${this.categories[category].totalWords} words`);
    }

    console.log(`✅ Training complete! Vocabulary size: ${this.vocabulary.size} words\n`);
  }

  // ============================================
  // CALCULATE PROBABILITY
  // ============================================
  // P(word | category) = How likely is this word in this category?
  // Example: P("scam" | SCAM) = high
  //          P("scam" | LEGIT) = low
  
  calculateProbability(word, category) {
    const wordFreq = this.categories[category].wordFreq[word] || 0;
    const totalWords = this.categories[category].totalWords;

    // Laplace smoothing: add 1 to avoid zero probability
    // If word not seen before, still give it small probability
    return (wordFreq + 1) / (totalWords + this.vocabulary.size);
  }

  // ============================================
  // CLASSIFY: Predict category of new text
  // ============================================
  // Input: Some text to classify
  // Process: Calculate probability for each category
  // Output: Predicted category with confidence scores
  
  classify(text) {
    const tokens = this.tokenize(text);
    const scores = {};
    const probabilities = {};

    // Calculate score for each category
    for (const category in this.categories) {
      // P(category) = How many docs in this category?
      scores[category] = this.categoryTotals[category] / this.totalDocs;
      
      // Multiply by probability of each word in category
      for (const token of tokens) {
        scores[category] *= this.calculateProbability(token, category);
      }
    }

    // Convert scores to percentages
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    for (const category in scores) {
      probabilities[category] = totalScore > 0 
        ? (scores[category] / totalScore * 100).toFixed(2)
        : 0;
    }

    // Find category with highest score
    const predictedCategory = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    return {
      category: predictedCategory,
      confidence: probabilities[predictedCategory],
      allScores: probabilities
    };
  }

  // ============================================
  // SAVE MODEL: Save to JSON file
  // ============================================
  // Input: filename
  // Process: Convert model to JSON format
  // Output: JSON file saved to disk
  
  save(filename) {
    const fs = require('fs');
    const modelData = {
      vocabulary: Array.from(this.vocabulary),
      categories: {},
      categoryTotals: this.categoryTotals,
      totalDocs: this.totalDocs
    };

    // Save word frequencies (not training docs)
    for (const category in this.categories) {
      modelData.categories[category] = {
        wordFreq: this.categories[category].wordFreq,
        totalWords: this.categories[category].totalWords
      };
    }

    fs.writeFileSync(filename, JSON.stringify(modelData, null, 2));
    console.log(`✅ Model saved to ${filename}`);
  }

  // ============================================
  // LOAD MODEL: Load from JSON file
  // ============================================
  // Input: filename
  // Process: Read JSON and restore model
  // Output: Model loaded into memory
  
  load(filename) {
    const fs = require('fs');
    const modelData = JSON.parse(fs.readFileSync(filename, 'utf8'));

    this.vocabulary = new Set(modelData.vocabulary);
    this.categoryTotals = modelData.categoryTotals;
    this.totalDocs = modelData.totalDocs;

    for (const category in modelData.categories) {
      this.categories[category] = {
        docs: [],  // Don't store original docs when loading
        wordFreq: modelData.categories[category].wordFreq,
        totalWords: modelData.categories[category].totalWords
      };
    }

    console.log(`✅ Model loaded from ${filename}`);
  }
}

// Export so other files can use this
module.exports = NaiveBayesClassifier;