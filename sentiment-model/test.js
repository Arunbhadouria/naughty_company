// ============================================
// TESTING SCRIPT
// ============================================
// Test model accuracy and performance
// Run: node test.js
// ============================================

const NaiveBayesClassifier = require('./naive_bayes');
const fs = require('fs');
const path = require('path');

// Load trained model
console.log("📂 Loading trained model...\n");
const classifier = new NaiveBayesClassifier();
const modelPath = path.join(__dirname, 'models', 'sentiment_model.json');
classifier.load(modelPath);

// Test cases with expected results
const testCases = [
  // SCAM examples (should predict SCAM)
  { text: "codesoft is a complete scam", expected: "scam" },
  { text: "fraudsters stealing money", expected: "scam" },
  { text: "fake company avoid", expected: "scam" },
  { text: "this is definitely fraud", expected: "scam" },
  
  // DEFENSIVE examples (should predict DEFENSIVE)
  { text: "how to avoid scams", expected: "defensive" },
  { text: "tips to protect yourself", expected: "defensive" },
  { text: "warning signs of fraud", expected: "defensive" },
  { text: "verify company before joining", expected: "defensive" },
  
  // LEGIT examples (should predict LEGIT)
  { text: "amazon is great and trustworthy", expected: "legit" },
  { text: "excellent service highly recommend", expected: "legit" },
  { text: "professional reliable company", expected: "legit" },
  { text: "genuine and authentic", expected: "legit" }
];

// Run tests
console.log("🧪 Testing Model Accuracy\n");
console.log("=" .repeat(70) + "\n");

let correct = 0;
let incorrect = 0;

for (const testCase of testCases) {
  const result = classifier.classify(testCase.text);
  const isCorrect = result.category === testCase.expected;
  
  if (isCorrect) correct++;
  else incorrect++;

  const icon = isCorrect ? "✅" : "❌";
  console.log(`${icon} Text: "${testCase.text}"`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result.category}`);
  console.log(`   Confidence: ${result.confidence}%`);
  console.log(`   All scores: ${JSON.stringify(result.allScores)}\n`);
}

// Show accuracy
const accuracy = (correct / testCases.length * 100).toFixed(2);
console.log("=" .repeat(70));
console.log(`\n📊 RESULTS:`);
console.log(`   Correct: ${correct}/${testCases.length}`);
console.log(`   Incorrect: ${incorrect}/${testCases.length}`);
console.log(`   Accuracy: ${accuracy}%\n`);

if (accuracy >= 90) {
  console.log("🎉 Excellent! Model is ready to use!\n");
} else if (accuracy >= 70) {
  console.log("👍 Good! Model is working well.\n");
} else {
  console.log("⚠️  Model needs more training data.\n");
}