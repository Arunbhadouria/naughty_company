const sentimentAnalyzer = require("../../sentiment-model/sentimentAnalyzer");

class SentimentService {
  /**
   * Loads the model (delegates to analyzer singleton)
   */
  load() {
    sentimentAnalyzer.load();
  }

  /**
   * Filters results using sentiment classification
   */
  filterWithSentiment(results) {
    const filtered = [];
    const skipped = [];

    for (const r of results) {
      const text = r.fetchedText || `${r.title} ${r.snippet}`;
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

      filtered.push({
        ...r,
        sentiment: sentiment.category,
        sentiment_confidence: sentiment.confidence
      });
    }

    return { filtered, skipped };
  }

  /**
   * Direct classification
   */
  analyze(text) {
    return sentimentAnalyzer.analyze(text);
  }
}

module.exports = new SentimentService();
