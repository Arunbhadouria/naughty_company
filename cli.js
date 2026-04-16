require("dotenv").config();
const readline = require("readline");
const analyzerService = require("./src/services/analyzer.service");
const feedbackService = require("./src/services/feedback.service");
const sentimentService = require("./src/services/sentiment.service");

// Re-using display logic
const BADGE_ICONS = {
  FULL_CONTENT: "✅",
  SNIPPET_ONLY: "⚠️",
  UNVERIFIABLE: "❌",
};

/**
 * CLI Entry Point
 */
async function main() {
  const input = process.argv[2];

  if (!input) {
    console.log("Usage: node cli.js <company-name-or-domain> [--no-feedback]");
    process.exit(1);
  }

  try {
    const noFeedback = process.argv.includes('--no-feedback');
    
    // Warm up model
    sentimentService.load();

    const result = await analyzerService.analyze(input);
    formatResult(result);

    if (!noFeedback && result.signals.length > 0) {
      await collectFeedback(result.signals);
    }

    console.log("✅ Analysis complete!");
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
}

/**
 * Display helper (migrated from old scamChecker.js)
 */
function formatResult(result) {
  console.log("\n" + "═".repeat(70));
  console.log("📊 SCAM DETECTION RESULT");
  console.log("═".repeat(70));

  console.log(`\n🎯 Entity: ${result.entity}`);
  console.log(`📈 Risk Score: ${result.risk_score}%`);
  console.log(`🚨 Label: ${result.label}`);
  console.log(`📊 Confidence: ${result.confidence}`);
  console.log(`💡 Reason: ${result.reason}`);

  if (result.fetchStats) {
    console.log(`\n🌐 Content Verification:`);
    console.log(`   ${BADGE_ICONS.FULL_CONTENT} Full content verified: ${result.fetchStats.full}`);
    console.log(`   ${BADGE_ICONS.SNIPPET_ONLY} Snippet only: ${result.fetchStats.snippet}`);
    console.log(`   ${BADGE_ICONS.UNVERIFIABLE} Unverifiable: ${result.fetchStats.unverifiable}`);
  }

  if (result.signals.length > 0) {
    console.log(`\n📋 Evidence (${result.signals.length} signals):`);
    console.log("─".repeat(70));

    result.signals.forEach((sig, i) => {
      console.log(`\n${i + 1}. ${sig.badgeIcon} [${sig.badge}] ${sig.title.slice(0, 55)}...`);
      console.log(`   Source: ${sig.source}`);
      console.log(`   Source Weight: ${sig.sourceWeight} × Badge Weight: ${sig.badgeWeight} = Combined: ${sig.combinedWeight}`);
      console.log(`   Scam signals: ${sig.scam} | Legit signals: ${sig.legit}`);
      console.log(`   Sentiment: ${sig.sentiment} (${sig.sentiment_confidence}% confidence)`);
      console.log(`   Content from: ${sig.contentSource}`);
      console.log(`   Analyzed text: "${sig.analyzedText}"`);
      console.log(`   Link: ${sig.link}`);
    });
  } else {
    console.log("\n⚠️  No relevant signals found");
  }

  console.log("\n" + "═".repeat(70) + "\n");
}

/**
 * Feedback collection (terminal interactive)
 */
async function collectFeedback(signals) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  const ask = (q) => new Promise(res => rl.question(q, res));

  console.log("\n📝 FEEDBACK - Help improve the model!");
  console.log("Enter signal number to correct (1-5), or 'skip' to continue:");
  
  const choice = await ask("Your choice: ");
  if (choice.toLowerCase() === 'skip' || !choice) {
    rl.close();
    return;
  }

  const num = parseInt(choice);
  if (num >= 1 && num <= signals.length) {
    const s = signals[num - 1];
    console.log(`\nCorrecting: "${s.title.slice(0, 50)}..."`);
    console.log("1. scam | 2. defensive | 3. legit | 4. skip");
    
    const catChoice = await ask("Your choice: ");
    const map = { '1': 'scam', '2': 'defensive', '3': 'legit' };
    const category = map[catChoice];

    if (category) {
      const text = s.analyzedText || s.title;
      feedbackService.addFeedback(text, category, s.contentSource);
      console.log(`✅ Feedback saved as ${category}!`);
    }
  }

  rl.close();
}

if (require.main === module) {
  main();
}
