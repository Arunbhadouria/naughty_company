const axios = require("axios");

// Configuration from environment
const SERP_API_URL = "https://serpapi.com/search.json";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_DELAY = 1000;   // 1 second

class SearchService {
  constructor() {
    this.cache = new Map();
    this.lastApiCall = 0;
  }

  /**
   * Simple internal caching mechanism
   */
  getCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.time > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  setCache(key, data) {
    this.cache.set(key, { data, time: Date.now() });
  }

  /**
   * Enforces a delay between API calls to respect SerpAPI usage
   */
  async rateLimit() {
    const elapsed = Date.now() - this.lastApiCall;
    if (elapsed < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - elapsed));
    }
    this.lastApiCall = Date.now();
  }

  /**
   * Performs multiple Google searches for a given entity
   */
  async performSearch(entity) {
    const queries = [
      `${entity} scam`,
      `${entity} fraud`,
      `${entity} fake`,
      `${entity} internship review`,
      `${entity} is it legit`,
    ];

    let allResults = [];
    for (const q of queries) {
      const results = await this.searchGoogle(q);
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Single Google search via SerpAPI
   */
  async searchGoogle(query) {
    const cacheKey = `search:${query}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      await this.rateLimit();

      const res = await axios.get(SERP_API_URL, {
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

      this.setCache(cacheKey, results);
      return results;
    } catch (err) {
      console.error(`  ❌ Search failed for "${query}":`, err.message);
      return [];
    }
  }
}

// Export singleton
module.exports = new SearchService();
