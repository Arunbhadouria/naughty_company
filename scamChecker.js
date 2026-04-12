// scamChecker_improved.js
// Enhanced scam detection tool with better weighting, confidence scoring, and error handling

require("dotenv").config();
const axios = require("axios");

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
    // Create a signature based on normalized title
    const sig_key = sig.title.toLowerCase().slice(0, 50);
    if (!seen.has(sig_key)) {
      seen.add(sig_key);
      deduped.push(sig);
    }
  }

  return deduped;
}

// ─── ANALYSIS ─────────────────────────────────────────

function analyzeResults(results, entity) {
  const entityBase = entity.split(".")[0];
  const entityRegex = new RegExp(`\\b${entityBase}\\b`, "i");

  let scamScore = 0;
  let legitScore = 0;
  let signals = [];

  for (const r of results) {
    const text = `${r.title} ${r.snippet}`;

    // Strict entity filter: must mention the entity
    if (!entityRegex.test(text)) continue;

    // Skip unreliable sources
    if (r.link.includes("youtube.com")) continue;
    if (r.link.includes("facebook.com")) continue;

    const { scam, legit } = countSignals(text);

    // Skip results with no signals
    if (scam === 0 && legit === 0) continue;

    // Get source weight
    const weight = getSourceWeight(r.link);

    // Normalize scoring (ratio of scam signals)
    const ratio = scam / (scam + legit);

    scamScore += ratio * weight;
    legitScore += (1 - ratio) * weight;

    signals.push({
      title: r.title,
      link: r.link,
      scam,
      legit,
      weight,
      source: new URL(r.link).hostname,
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

// ─── FORMATTING ─────────────────────────────────────────

function formatResult(result) {
  console.log("\n" + "═".repeat(70));
  console.log("📊 SCAM DETECTION RESULT");
  console.log("═".repeat(70));
  
  console.log(`\n🎯 Entity: ${result.entity}`);
  console.log(`📈 Risk Score: ${result.risk_score}%`);
  console.log(`🚨 Label: ${result.label}`);
  console.log(`📊 Confidence: ${result.confidence}`);
  console.log(`💡 Reason: ${result.reason}`);

  if (result.signals.length > 0) {
    console.log(`\n📋 Evidence (${result.signals.length} signals):`);
    console.log("─".repeat(70));
    
    result.signals.forEach((sig, i) => {
      console.log(`\n${i + 1}. ${sig.title.slice(0, 60)}...`);
      console.log(`   Source: ${sig.source}`);
      console.log(`   Weight: ${sig.weight} | Scam signals: ${sig.scam} | Legit signals: ${sig.legit}`);
      console.log(`   Link: ${sig.link.slice(0, 70)}...`);
    });
  } else {
    console.log("\n⚠️  No relevant signals found");
  }

  console.log("\n" + "═".repeat(70) + "\n");
}

// ─── MAIN ANALYSIS FUNCTION ────────────────────────────

async function analyze(input) {
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

  const { scamScore, legitScore, signals } = analyzeResults(allResults, entity);
  const verdict = computeVerdict(scamScore, legitScore, signals.length);

  return {
    entity,
    risk_score: verdict.score,
    label: verdict.label,
    confidence: verdict.confidence,
    reason: verdict.reason,
    signals: signals.slice(0, 5), // Top 5 signals
  };
}

// ─── CLI INTERFACE ──────────────────────────────────────

async function main() {
  const input = process.argv[2];

  if (!input) {
    console.log("Usage: node scamChecker_improved.js <company-name-or-domain>");
    console.log("Example: node scamChecker_improved.js codesoft");
    process.exit(1);
  }

  try {
    const result = await analyze(input);
    if (result) {
      formatResult(result);
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