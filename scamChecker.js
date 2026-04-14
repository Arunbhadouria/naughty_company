// ============================================
// SCAM CHECKER V8 - HYBRID CONTENT FETCHING
// ============================================
// Complete integrated version with:
// - Hybrid content fetching (validates URLs, fetches pages)
// - Content quality verification with status badges
// - Weighted risk scoring based on content source
// - Sentiment analysis (filters defensive content)
// - Feedback collection (tracks content source quality)
// ============================================

require("dotenv").config();
const axios = require("axios");
const readline = require("readline");
const path = require("path");

// Import sentiment analyzer and feedback collector
const sentimentAnalyzer = require("./sentiment-model/sentimentAnalyzer");
const feedback = require("./sentiment-model/feedback");

// Import hybrid content fetcher
const { fetchAllContent, BADGES, BADGE_ICONS, BADGE_WEIGHTS } = require("./contentFetcher");

// ─── CONFIG ─────────────────────────────────────────────

const SERP_API = "https://serpapi.com/search.json";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_DELAY = 1000; // 1 second between API calls

const SCAM_WORDS = ["scam", "fake", "fraud", "beware", "complaint", "warning", "alert"];
const LEGIT_WORDS = ["legit", "trusted", "genuine", "good", "safe", "verified", "authentic"];

// ─── CACHE & RATE LIMITING ──────────────────────────────

const cache = new Map();
let lastApiCall = 0;

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

async function rateLimit() {
  const elapsed = Date.now() - lastApiCall;
  if (elapsed < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - elapsed));
  }
  lastApiCall = Date.now();
}

// ─── UTILS ─────────────────────────────────────────────

function normalizeEntity(e) {
  return e.toLowerCase().trim().replace(/[^a-z0-9.]/g, "");
}

function containsWord(text, word) {
  const regex = new RegExp(`\\b${word}\\b`, "i");
  const negation = new RegExp(`not\\s+${word}|${word}\\s+not`, "i");
  return regex.test(text) && !negation.test(text);
}

function countSignals(text) {
  let scam = 0;
  let legit = 0;

  SCAM_WORDS.forEach(w => {
    if (containsWord(text, w)) scam++;
  });

  LEGIT_WORDS.forEach(w => {
    if (containsWord(text, w)) legit++;
  });

  return { scam, legit };
}

// ─── ENTITY EXTRACTION ─────────────────────────────────

function extractEntity(input) {
  // Try to extract domain
  const domainMatch = input.match(/\b([a-z0-9-]+\.(com|in|io|ai|co|org|net))\b/i);
  if (domainMatch) return normalizeEntity(domainMatch[1]);

  // Try to extract word (domain-like)
  const dnsMatch = input.match(/\b([a-z0-9-]+)\.(com|in|io|ai|co|org|net)\b/i);
  if (dnsMatch) return normalizeEntity(dnsMatch[1]);

  // Fallback: find longest word
  const words = input.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const longest = words.reduce((a, b) => a.length > b.length ? a : b);
    return normalizeEntity(longest);
  }

  return normalizeEntity(input);
}

// ─── GOOGLE SEARCH (SERPAPI) ───────────────────────────

async function searchGoogle(query) {
  const cacheKey = `search:${query}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`  ✓ Cache hit for: "${query}"`);
    return cached;
  }

  try {
    await rateLimit();
    console.log(`  🔗 Searching: "${query}"`);

    const res = await axios.get(SERP_API, {
      params: {
        q: query,
        api_key: process.env.SERPAPI_KEY,
        num: 10,
      },
      timeout: 10000,
    });

    const results = (res.data.organic_results || []).map(r => ({
      title: r.title || "",
      snippet: r.snippet || "",
      link: r.link || "",
    }));

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`  ❌ Search failed for "${query}":`, err.message);
    return [];
  }
}

// ─── SOURCE WEIGHTING ───────────────────────────────────

function getSourceWeight(link) {
  // Community-driven sources (highest trust)
  if (link.includes("reddit.com")) return 4;
  if (link.includes("quora.com")) return 3.5;
  if (link.includes("linkedin.com")) return 4;
  if (link.includes("glassdoor")) return 4;

  // News & blogs
  if (link.includes("medium.com")) return 2.5;
  if (link.includes("dev.to")) return 2;
  if (link.includes("twitter.com") || link.includes("x.com")) return 2;

  // Default weight
  return 1;
}

// ─── DUPLICATE DETECTION ────────────────────────────────

function deduplicateSignals(signals) {
  const seen = new Set();
  const deduped = [];

  for (const sig of signals) {
    const sig_key = sig.title.toLowerCase().slice(0, 50);
    if (!seen.has(sig_key)) {
      seen.add(sig_key);
      deduped.push(sig);
    }
  }

  return deduped;
}

// ─── SENTIMENT FILTERING ────────────────────────────────
// Now uses fetchedText (full content) instead of just title+snippet

function filterWithSentiment(results, entity) {
  const filtered = [];
  const skipped = [];

  for (const r of results) {
    // Use the fetched text (which may be full page content, snippet, or title)
    const text = r.fetchedText || `${r.title} ${r.snippet}`;

    // Analyze sentiment
    const sentiment = sentimentAnalyzer.analyze(text);

    // Skip defensive content (confidence > 70%)
    if (sentiment.category === 'defensive' && parseFloat(sentiment.confidence) > 70) {
      skipped.push({
        title: r.title,
        reason: `DEFENSIVE content (${sentiment.confidence}% confidence)`,
        sentiment: sentiment.category
      });
      continue;
    }

    // Keep this result with sentiment info
    filtered.push({
      ...r,
      sentiment: sentiment.category,
      sentiment_confidence: sentiment.confidence
    });
  }

  return { filtered, skipped };
}

// ─── ANALYSIS (UPDATED WITH BADGE WEIGHTING) ───────────
// The score now factors in the badge weight.
// FULL_CONTENT results count at full weight (1.0x)
// SNIPPET_ONLY results count at reduced weight (0.6x)
// UNVERIFIABLE results count at minimal weight (0.3x)

function analyzeResults(results, entity) {
  const entityBase = entity.split(".")[0];
  const entityRegex = new RegExp(`\\b${entityBase}\\b`, "i");

  let scamScore = 0;
  let legitScore = 0;
  let signals = [];

  for (const r of results) {
    // Use fetched text (full content) for analysis
    const text = r.fetchedText || `${r.title} ${r.snippet}`;

    // Strict entity filter: must mention the entity
    if (!entityRegex.test(text)) continue;

    // Skip unreliable sources
    if (r.link.includes("youtube.com")) continue;
    if (r.link.includes("facebook.com")) continue;

    const { scam, legit } = countSignals(text);

    // Skip results with no signals
    if (scam === 0 && legit === 0) continue;

    // Get source weight
    const sourceWeight = getSourceWeight(r.link);

    // Get badge weight (how much we trust this content)
    const badgeWeight = r.badgeWeight || BADGE_WEIGHTS.SNIPPET_ONLY;

    // Combined weight: source credibility × content verification level
    const combinedWeight = sourceWeight * badgeWeight;

    // Normalize scoring (ratio of scam signals)
    const ratio = scam / (scam + legit);

    scamScore += ratio * combinedWeight;
    legitScore += (1 - ratio) * combinedWeight;

    signals.push({
      title: r.title,
      link: r.link,
      scam,
      legit,
      sourceWeight,
      badgeWeight,
      combinedWeight: parseFloat(combinedWeight.toFixed(2)),
      source: new URL(r.link).hostname,
      sentiment: r.sentiment,
      sentiment_confidence: r.sentiment_confidence,
      // New badge fields
      badge: r.badge || BADGES.UNVERIFIABLE,
      badgeIcon: r.badgeIcon || BADGE_ICONS.UNVERIFIABLE,
      contentSource: r.contentSource || "unknown",
      analyzedText: (text || "").slice(0, 150) + "...",
      qualityNote: r.qualityNote || "",
    });
  }

  // Deduplicate signals
  signals = deduplicateSignals(signals);

  return { scamScore, legitScore, signals };
}

// ─── VERDICT COMPUTATION ────────────────────────────────

function computeVerdict(scamScore, legitScore, signalCount) {
  const total = scamScore + legitScore;

  // No signals found
  if (total === 0) {
    return {
      label: "NOT SURE",
      score: null,
      confidence: "LOW",
      reason: "Insufficient data",
    };
  }

  const percent = Math.round((scamScore / total) * 100);

  // Determine risk label
  let label = "LOW RISK";
  if (percent > 70) label = "HIGH RISK";
  else if (percent > 40) label = "MEDIUM RISK";

  // Determine confidence based on signal count and consensus
  let confidence = "LOW";
  let reason = "";

  if (signalCount >= 5) {
    confidence = "HIGH";
    reason = "Multiple credible sources";
  } else if (signalCount >= 3) {
    confidence = "MEDIUM";
    reason = "Several sources agree";
  } else if (signalCount >= 1) {
    confidence = "LOW";
    reason = "Limited information";
  }

  // Boost confidence if ALL signals point same direction
  if (legitScore === 0 && scamScore > 0 && signalCount >= 2) {
    confidence = "HIGH";
    reason = "All sources indicate scam";
  }

  if (scamScore === 0 && legitScore > 0 && signalCount >= 2) {
    confidence = "HIGH";
    reason = "All sources indicate legitimate";
  }

  return { label, score: percent, confidence, reason };
}

// ─── FORMATTING (UPDATED WITH BADGES) ──────────────────

function formatResult(result) {
  console.log("\n" + "═".repeat(70));
  console.log("📊 SCAM DETECTION RESULT");
  console.log("═".repeat(70));

  console.log(`\n🎯 Entity: ${result.entity}`);
  console.log(`📈 Risk Score: ${result.risk_score}%`);
  console.log(`🚨 Label: ${result.label}`);
  console.log(`📊 Confidence: ${result.confidence}`);
  console.log(`💡 Reason: ${result.reason}`);

  // Show content fetch stats
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
      // Badge + title
      console.log(`\n${i + 1}. ${sig.badgeIcon} [${sig.badge}] ${sig.title.slice(0, 55)}...`);
      console.log(`   Source: ${sig.source}`);
      console.log(`   Source Weight: ${sig.sourceWeight} × Badge Weight: ${sig.badgeWeight} = Combined: ${sig.combinedWeight}`);
      console.log(`   Scam signals: ${sig.scam} | Legit signals: ${sig.legit}`);
      console.log(`   Sentiment: ${sig.sentiment} (${sig.sentiment_confidence}% confidence)`);
      console.log(`   Content from: ${sig.contentSource}`);
      console.log(`   Analyzed text: "${sig.analyzedText}"`);
      if (sig.qualityNote) {
        console.log(`   Note: ${sig.qualityNote}`);
      }
      console.log(`   Link: ${sig.link}`);

      // Show unverifiable warning
      if (sig.badge === BADGES.UNVERIFIABLE) {
        console.log(`   ⚠️  WARNING: This source could not be verified — treat with caution`);
      }
    });
  } else {
    console.log("\n⚠️  No relevant signals found");
  }

  console.log("\n" + "═".repeat(70) + "\n");
}

// ─── FEEDBACK PROMPT (UPDATED WITH CONTENT SOURCE) ──────

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function askUserFeedback(signals) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();

    console.log("\n" + "─".repeat(70));
    console.log("📝 FEEDBACK - Help improve the model!");
    console.log("─".repeat(70));
    console.log("\nDo you want to provide feedback on any signals?");
    console.log("This helps the sentiment analysis model learn better.\n");

    const options = signals.map((sig, i) => ({
      num: i + 1,
      title: sig.title.slice(0, 50),
      sentiment: sig.sentiment,
      badge: sig.badge
    }));

    options.forEach(opt => {
      console.log(`${opt.num}. [${opt.badge}] "${opt.title}..."`);
      console.log(`   Current: ${opt.sentiment}`);
    });

    console.log(`\nEnter signal number to correct (1-${signals.length}), or 'skip' to continue:\n`);

    rl.question("Your choice: ", (answer) => {
      if (answer.toLowerCase() === 'skip' || answer.trim() === '') {
        rl.close();
        resolve(null);
        return;
      }

      const num = parseInt(answer);
      if (num >= 1 && num <= signals.length) {
        const signal = signals[num - 1];
        rl.close();
        resolve({ signalIndex: num - 1, signal });
      } else {
        console.log("❌ Invalid choice");
        rl.close();
        resolve(null);
      }
    });
  });
}

async function askCorrectionCategory(signal) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();

    console.log(`\n📝 Correcting: "${signal.title.slice(0, 50)}..."`);
    console.log(`Current classification: ${signal.sentiment}`);
    console.log(`Content source: ${signal.contentSource} [${signal.badge}]`);
    console.log("\nWhat should this be classified as?");
    console.log("1. scam");
    console.log("2. defensive");
    console.log("3. legit");
    console.log("4. skip\n");

    rl.question("Your choice (1-4): ", (answer) => {
      const map = { '1': 'scam', '2': 'defensive', '3': 'legit', '4': null };
      const choice = map[answer];

      if (choice === null && answer === '4') {
        rl.close();
        resolve(null);
      } else if (choice) {
        rl.close();
        resolve(choice);
      } else {
        console.log("❌ Invalid choice");
        rl.close();
        resolve(null);
      }
    });
  });
}

async function collectFeedback(signals) {
  if (signals.length === 0) {
    console.log("No signals to provide feedback on.");
    return;
  }

  let collecting = true;
  while (collecting) {
    const choice = await askUserFeedback(signals);

    if (!choice) {
      collecting = false;
      break;
    }

    const signal = choice.signal;
    const correctCategory = await askCorrectionCategory(signal);

    if (!correctCategory) {
      continue;
    }

    // Save feedback WITH content source info for training data quality tracking
    const text = signal.analyzedText || `${signal.title} ${signal.snippet || ''}`;
    feedback.addFeedback(text, correctCategory, signal.contentSource);

    console.log(`\n✅ Feedback saved!`);
    console.log(`   Text: "${text.slice(0, 60)}..."`);
    console.log(`   Corrected to: ${correctCategory}`);
    console.log(`   Content source: ${signal.contentSource}\n`);

    // Ask if they want to continue
    const rl = createReadlineInterface();
    const answer = await new Promise(resolve => {
      rl.question("Continue providing feedback? (yes/no): ", resolve);
      rl.close();
    });

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      collecting = false;
    }
  }

  // Show feedback stats
  const stats = feedback.getStats();
  console.log("\n" + "─".repeat(70));
  console.log("📊 Feedback Statistics:");
  console.log(`   Scam examples: ${stats.scam}`);
  console.log(`   Defensive examples: ${stats.defensive}`);
  console.log(`   Legit examples: ${stats.legit}`);
  console.log(`   Total feedback: ${stats.total}`);
  console.log("─".repeat(70));
  console.log("\n💡 Tip: When you have 20+ feedback examples, retrain:");
  console.log("   cd sentiment-model");
  console.log("   node merge_feedback.js  (to add feedback to training data)");
  console.log("   node train.js           (to retrain the model)");
  console.log("   node test.js            (to test improved accuracy)\n");
}

// ─── MAIN ANALYSIS FUNCTION ────────────────────────────

async function analyze(input, enableFeedback = true) {
  if (!input || input.trim().length === 0) {
    console.error("❌ Please provide a company name or domain");
    return null;
  }

  const entity = extractEntity(input);

  if (!entity || entity.length < 2) {
    console.error("❌ Could not extract valid entity from input");
    return null;
  }

  console.log(`\n🔍 Analyzing: "${entity}"`);

  const queries = [
    `${entity} scam`,
    `${entity} fraud`,
    `${entity} fake`,
    `${entity} internship review`,
    `${entity} is it legit`,
  ];

  let allResults = [];

  for (const q of queries) {
    const results = await searchGoogle(q);
    allResults.push(...results);
  }

  if (allResults.length === 0) {
    console.warn("⚠️  No search results found");
    return {
      entity,
      risk_score: null,
      label: "NOT SURE",
      confidence: "LOW",
      reason: "No search results available",
      signals: [],
    };
  }

  // ═══════════════════════════════════════════════════════
  // NEW: HYBRID CONTENT FETCHING
  // This runs BEFORE sentiment analysis and scoring.
  // It validates URLs, fetches actual page content,
  // and tags each result with a status badge.
  // ═══════════════════════════════════════════════════════
  let enrichedResults;
  let fetchStats;

  try {
    const fetchResult = await fetchAllContent(allResults, entity);
    enrichedResults = fetchResult.enriched;
    fetchStats = fetchResult.stats;
  } catch (err) {
    // Graceful degradation: if content fetching completely fails,
    // fall back to the original snippet-only behavior
    console.warn(`\n⚠️  Content fetching failed: ${err.message}`);
    console.warn("    Falling back to snippet-only mode...\n");
    enrichedResults = allResults.map(r => ({
      ...r,
      fetchedText: r.snippet || r.title || "",
      contentSource: r.snippet ? "snippet" : "title",
      badge: BADGES.SNIPPET_ONLY,
      badgeIcon: BADGE_ICONS.SNIPPET_ONLY,
      badgeWeight: BADGE_WEIGHTS.SNIPPET_ONLY,
      linkStatus: "NOT_CHECKED",
      qualityNote: "Content fetching unavailable — using SerpAPI data",
    }));
    fetchStats = { full: 0, snippet: enrichedResults.length, unverifiable: 0 };
  }

  // Filter with sentiment analysis (now using enriched/fetched text)
  console.log("\n🧠 Filtering with sentiment analysis...");
  const { filtered, skipped } = filterWithSentiment(enrichedResults, entity);

  console.log(`  ✓ Kept: ${filtered.length} signals`);
  console.log(`  ✗ Skipped (defensive): ${skipped.length} results`);

  // Analyze with badge-weighted scoring
  const { scamScore, legitScore, signals } = analyzeResults(filtered, entity);
  const verdict = computeVerdict(scamScore, legitScore, signals.length);

  const result = {
    entity,
    risk_score: verdict.score,
    label: verdict.label,
    confidence: verdict.confidence,
    reason: verdict.reason,
    signals: signals.slice(0, 5), // Top 5 signals
    skippedDefensive: skipped.length,
    fetchStats,  // Content fetch statistics
  };

  // Format and display result
  formatResult(result);

  // Ask for feedback (only if signals exist and enabled)
  if (enableFeedback && signals.length > 0) {
    try {
      await collectFeedback(signals);
    } catch (err) {
      console.log("Feedback collection skipped.");
    }
  }

  return result;
}

// ─── CLI INTERFACE ──────────────────────────────────────

async function main() {
  const input = process.argv[2];

  if (!input) {
    console.log("Usage: node scamChecker.js <company-name-or-domain> [--no-feedback]");
    console.log("Example: node scamChecker.js codesoft");
    console.log("\nFlags:");
    console.log("  --no-feedback     Skip feedback collection\n");
    process.exit(1);
  }

  try {
    // Check if feedback is disabled
    const noFeedback = process.argv.includes('--no-feedback');

    const result = await analyze(input, !noFeedback);

    if (result) {
      console.log("✅ Analysis complete!");
    }
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for use as module
module.exports = { analyze, extractEntity, analyzeResults };