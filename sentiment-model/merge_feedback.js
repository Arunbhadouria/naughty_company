// ============================================
// MERGE FEEDBACK INTO TRAINING DATA
// ============================================
// This script:
// 1. Reads feedback.json (collected from user corrections)
// 2. Merges into training.json (adds to training examples)
// 3. Clears feedback.json (resets for new feedback)
// 4. Shows statistics
//
// Run this when you have ~20+ feedback examples
// Usage: node sentiment-model/merge_feedback.js
// Then run: node sentiment-model/train.js
// ============================================

const fs = require('fs');
const path = require('path');
const feedback = require('./feedback');

console.log("\n" + "═".repeat(70));
console.log("🔄 MERGING FEEDBACK INTO TRAINING DATA");
console.log("═".repeat(70) + "\n");

// Load files
const trainingFile = path.join(__dirname, 'training-data', 'training.json');
const training = JSON.parse(fs.readFileSync(trainingFile, 'utf8'));

// Get feedback stats
const stats = feedback.getStats();

console.log("📊 Current Feedback Statistics:");
console.log(`   Scam feedback: ${stats.scam} examples`);
console.log(`   Defensive feedback: ${stats.defensive} examples`);
console.log(`   Legit feedback: ${stats.legit} examples`);
console.log(`   Total feedback: ${stats.total} examples\n`);

// Check if we have enough feedback
if (stats.total === 0) {
  console.log("⚠️  No feedback to merge!");
  console.log("   Provide feedback by analyzing companies with scamChecker_v7.js\n");
  process.exit(0);
}

console.log("📚 Training Data Before Merge:");
console.log(`   Scam: ${training.scam.length} examples`);
console.log(`   Defensive: ${training.defensive.length} examples`);
console.log(`   Legit: ${training.legit.length} examples`);
console.log(`   Total: ${training.scam.length + training.defensive.length + training.legit.length} examples\n`);

// Merge feedback into training data
const allFeedback = feedback.getAllFeedback();

// Add scam feedback
for (const entry of allFeedback.scam) {
  const text = typeof entry === 'string' ? entry : entry.text;
  if (text && !training.scam.includes(text)) {
    training.scam.push(text);
  }
}

// Add defensive feedback
for (const entry of allFeedback.defensive) {
  const text = typeof entry === 'string' ? entry : entry.text;
  if (text && !training.defensive.includes(text)) {
    training.defensive.push(text);
  }
}

// Add legit feedback
for (const entry of allFeedback.legit) {
  const text = typeof entry === 'string' ? entry : entry.text;
  if (text && !training.legit.includes(text)) {
    training.legit.push(text);
  }
}

console.log("✅ Training Data After Merge:");
console.log(`   Scam: ${training.scam.length} examples (added ${stats.scam})`);
console.log(`   Defensive: ${training.defensive.length} examples (added ${stats.defensive})`);
console.log(`   Legit: ${training.legit.length} examples (added ${stats.legit})`);
console.log(`   Total: ${training.scam.length + training.defensive.length + training.legit.length} examples\n`);

// Save updated training data
fs.writeFileSync(trainingFile, JSON.stringify(training, null, 2));
console.log("✅ Updated training.json\n");

// Clear feedback for next round
feedback.clearFeedback();
console.log("🗑️  Cleared feedback.json\n");

console.log("─".repeat(70));
console.log("🎯 NEXT STEPS:");
console.log("─".repeat(70));
console.log("\n1. Retrain the model with new examples:");
console.log("   cd sentiment-model");
console.log("   node train.js\n");

console.log("2. Test the improved model:");
console.log("   node test.js\n");

console.log("3. See updated model stats:");
console.log("   Improved training data = better sentiment analysis\n");

console.log("═".repeat(70) + "\n");