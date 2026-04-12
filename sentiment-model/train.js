// ============================================
// TRAINING SCRIPT
// ============================================
// This file trains the model and saves it
// Run this once: node train.js
// ============================================

const NaiveBayesClassifier = require('./naive_bayes');
const fs = require('fs');
const path = require('path');

// Load training data
console.log("📂 Loading training data...\n");
const trainingData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'training-data', 'training.json'),
    'utf8'
  )
);

// Create classifier
const classifier = new NaiveBayesClassifier();

// Train the model
console.log("🧠 Training Naive Bayes Classifier...\n");
classifier.train(trainingData);

// Save trained model
const modelPath = path.join(__dirname, 'models', 'sentiment_model.json');
classifier.save(modelPath);

console.log("✅ Training complete!");
console.log(`📊 Model saved to: ${modelPath}\n`);

// Quick test
console.log("🧪 Quick test:\n");
const testCases = [
  "this company is a scam",
  "how to avoid scams online",
  "great company trustworthy"
];

for (const testCase of testCases) {
  const result = classifier.classify(testCase);
  console.log(`Text: "${testCase}"`);
  console.log(`Category: ${result.category} (${result.confidence}%)\n`);
}