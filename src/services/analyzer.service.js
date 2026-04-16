const searchService = require("./search.service");
const { ContentService, BADGES, BADGE_ICONS } = require("./content.service");
const sentimentService = require("./sentiment.service");
const { extractEntity } = require("../utils/entityExtractor");
const { countSignals } = require("../utils/signalCounter");
const { BADGE_WEIGHTS, getSourceWeight } = require("../utils/sourceWeights");

class AnalyzerService {
  /**
   * Main analysis pipeline
   */
  async analyze(input) {
    const entity = extractEntity(input);
    if (!entity || entity.length < 2) {
      throw new Error("Could not extract valid entity from input");
    }

    // 1. Search
    const allResults = await searchService.performSearch(entity);
    if (allResults.length === 0) {
      return this.createEmptyResult(entity);
    }

    // 2. Hybrid Content Fetching
    const { enriched, stats } = await ContentService.fetchAllContent(allResults, entity);

    // 3. Sentiment Filtering
    const { filtered, skipped } = sentimentService.filterWithSentiment(enriched);

    // 4. Scoring & Verdict
    const { scamScore, legitScore, signals } = this.scoreResults(filtered, entity);
    const verdict = this.computeVerdict(scamScore, legitScore, signals.length);

    return {
      entity,
      risk_score: verdict.score,
      label: verdict.label,
      confidence: verdict.confidence,
      reason: verdict.reason,
      signals: signals.slice(0, 5), // Top 5 signals
      skippedDefensive: skipped.length,
      fetchStats: stats,
    };
  }

  /**
   * Scores individual results with weights
   */
  scoreResults(results, entity) {
    const entityBase = entity.split(".")[0];
    const entityRegex = new RegExp(`\\b${entityBase}\\b`, "i");

    let scamScore = 0;
    let legitScore = 0;
    let signals = [];

    for (const r of results) {
      const text = r.fetchedText || `${r.title} ${r.snippet}`;

      // Relevance check (secondary)
      if (!entityRegex.test(text)) continue;

      // Filter unreliable social platforms from contributing to numerical score
      if (r.link.includes("youtube.com") || r.link.includes("facebook.com")) continue;

      const { scam, legit } = countSignals(text);
      if (scam === 0 && legit === 0) continue;

      const sourceWeight = getSourceWeight(r.link);
      const badgeWeight = r.badgeWeight || 0.6; // Default to snippet weight
      const combinedWeight = sourceWeight * badgeWeight;

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
        badge: r.badge,
        badgeIcon: r.badgeIcon,
        contentSource: r.contentSource,
        analyzedText: (text || "").slice(0, 150) + "...",
        qualityNote: r.qualityNote || "",
      });
    }

    // Deduplicate
    const seen = new Set();
    const deduped = signals.filter(s => {
      const key = s.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { scamScore, legitScore, signals: deduped };
  }

  /**
   * Final verdict based on weighted scores
   */
  computeVerdict(scamScore, legitScore, signalCount) {
    const total = scamScore + legitScore;
    if (total === 0) return { label: "NOT SURE", score: null, confidence: "LOW", reason: "Insufficient data" };

    const percent = Math.round((scamScore / total) * 100);
    let label = "LOW RISK";
    if (percent > 70) label = "HIGH RISK";
    else if (percent > 40) label = "MEDIUM RISK";

    let confidence = "LOW";
    let reason = "";

    if (signalCount >= 5) { confidence = "HIGH"; reason = "Multiple credible sources"; }
    else if (signalCount >= 3) { confidence = "MEDIUM"; reason = "Several sources agree"; }
    else if (signalCount >= 1) { confidence = "LOW"; reason = "Limited information"; }

    // High confidence on consensus
    if (legitScore === 0 && scamScore > 0 && signalCount >= 2) { confidence = "HIGH"; reason = "All sources indicate scam"; }
    if (scamScore === 0 && legitScore > 0 && signalCount >= 2) { confidence = "HIGH"; reason = "All sources indicate legitimate"; }

    return { label, score: percent, confidence, reason };
  }

  createEmptyResult(entity) {
    return {
      entity,
      risk_score: null,
      label: "NOT SURE",
      confidence: "LOW",
      reason: "No search results found",
      signals: [],
      fetchStats: { full: 0, snippet: 0, unverifiable: 0 }
    };
  }
}

module.exports = new AnalyzerService();
