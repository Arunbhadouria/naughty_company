const axios = require("axios");
const cheerio = require("cheerio");
const { BADGE_WEIGHTS } = require("../utils/sourceWeights");

// Status Badges
const BADGES = {
  FULL_CONTENT: "FULL_CONTENT",
  SNIPPET_ONLY: "SNIPPET_ONLY",
  UNVERIFIABLE: "UNVERIFIABLE",
};

const BADGE_ICONS = {
  FULL_CONTENT: "✅",
  SNIPPET_ONLY: "⚠️",
  UNVERIFIABLE: "❌",
};

// Configuration
const HEAD_TIMEOUT = 3000;
const FETCH_TIMEOUT = 5000;
const MAX_WORDS = 1000;
const MIN_TEXT_LENGTH = 200;

const JUNK_SELECTORS = [
  "script", "style", "nav", "footer", "header", "aside", "iframe", "noscript",
  ".cookie", ".cookies", ".cookie-banner", ".cookie-consent", "#cookie", "#cookie-banner",
  ".gdpr", ".popup", ".modal", ".overlay", ".ad", ".ads", ".advert", ".advertisement",
  ".sidebar", ".menu", ".breadcrumb", ".social-share", ".share", ".related", ".comments",
  "#comments", ".newsletter", ".subscribe", ".cta",
];

const BOILERPLATE_PHRASES = [
  "cookie policy", "privacy policy", "terms of service", "terms and conditions",
  "accept cookies", "we use cookies", "subscribe to our newsletter", "sign up for our",
  "all rights reserved", "powered by wordpress", "skip to content", "toggle navigation",
  "enable javascript",
];

class ContentService {
  /**
   * Validates if a link is alive using a HEAD request
   */
  async validateLink(url) {
    try {
      const response = await axios.head(url, {
        timeout: HEAD_TIMEOUT,
        maxRedirects: 3,
        validateStatus: () => true,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const status = response.status;
      if (status >= 200 && status < 300) return { status, alive: true, reason: "OK" };
      if (status === 401 || status === 403) return { status, alive: false, reason: "PAYWALLED" };
      if (status === 404) return { status, alive: false, reason: "DEAD_LINK" };
      return { status, alive: false, reason: `HTTP_${status}` };
    } catch (err) {
      return { status: 0, alive: false, reason: "ERROR" };
    }
  }

  /**
   * Fetches raw HTML content
   */
  async fetchRawHTML(url) {
    try {
      const response = await axios.get(url, {
        timeout: FETCH_TIMEOUT,
        maxRedirects: 3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        maxContentLength: 2 * 1024 * 1024,
      });

      const contentType = response.headers["content-type"] || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) return null;
      return response.data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Extracts meaningful content from HTML using Cheerio
   */
  extractContent(html) {
    try {
      const $ = cheerio.load(html);
      JUNK_SELECTORS.forEach(s => $(s).remove());

      let contentText = "";
      const selectors = ["article", "[role='main']", "main", ".post-content", ".article-content", ".entry-content", ".content", "#content"];

      for (const s of selectors) {
        const el = $(s);
        if (el.length > 0) {
          contentText = el.text();
          break;
        }
      }

      if (!contentText || contentText.trim().length < 50) contentText = $("body").text();

      contentText = contentText.replace(/\s+/g, " ").trim();
      const words = contentText.split(/\s+/);
      if (words.length > MAX_WORDS) contentText = words.slice(0, MAX_WORDS).join(" ") + "...";

      return contentText || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Verifies text quality
   */
  checkTextQuality(text, entity) {
    if (!text || text.length < MIN_TEXT_LENGTH) return { pass: false, reason: "TOO_SHORT" };
    
    const lower = text.toLowerCase();
    let hits = 0;
    BOILERPLATE_PHRASES.forEach(p => { if (lower.includes(p)) hits++; });
    if (hits >= 3) return { pass: false, reason: "BOILERPLATE" };

    const entityBase = entity.split(".")[0].toLowerCase();
    const regex = new RegExp(`\\b${entityBase}\\b`, "i");
    if (!regex.test(text)) return { pass: false, reason: "NOT_RELEVANT" };

    return { pass: true, reason: "OK" };
  }

  /**
   * Enriches a single search result
   */
  async fetchSingleResult(result, entity) {
    const url = result.link;
    let enriched = {
      ...result,
      fetchedText: "",
      contentSource: "none",
      badge: BADGES.UNVERIFIABLE,
      badgeIcon: BADGE_ICONS.UNVERIFIABLE,
      badgeWeight: BADGE_WEIGHTS.UNVERIFIABLE,
      linkStatus: "unknown",
      qualityNote: "",
    };

    const validation = await this.validateLink(url);
    enriched.linkStatus = validation.reason;

    if (!validation.alive) {
      enriched.qualityNote = `Link ${validation.reason}`;
      if (result.snippet) {
        enriched.fetchedText = result.snippet;
        enriched.contentSource = "snippet";
        enriched.badge = BADGES.SNIPPET_ONLY;
        enriched.badgeIcon = BADGE_ICONS.SNIPPET_ONLY;
        enriched.badgeWeight = BADGE_WEIGHTS.SNIPPET_ONLY;
      }
      return enriched;
    }

    const html = await this.fetchRawHTML(url);
    if (html) {
      const text = this.extractContent(html);
      if (text) {
        const quality = this.checkTextQuality(text, entity);
        if (quality.pass) {
          enriched.fetchedText = text;
          enriched.contentSource = "full_page";
          enriched.badge = BADGES.FULL_CONTENT;
          enriched.badgeIcon = BADGE_ICONS.FULL_CONTENT;
          enriched.badgeWeight = BADGE_WEIGHTS.FULL_CONTENT;
          return enriched;
        }
      }
    }

    // Fallback to snippet
    if (result.snippet) {
      enriched.fetchedText = result.snippet;
      enriched.contentSource = "snippet";
      enriched.badge = BADGES.SNIPPET_ONLY;
      enriched.badgeIcon = BADGE_ICONS.SNIPPET_ONLY;
      enriched.badgeWeight = BADGE_WEIGHTS.SNIPPET_ONLY;
    }
    return enriched;
  }

  /**
   * Parallel fetch for all results
   */
  async fetchAllContent(results, entity) {
    const promises = results.map(r => this.fetchSingleResult(r, entity));
    const settled = await Promise.allSettled(
      promises.map(p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej("TIMEOUT"), FETCH_TIMEOUT + 1000))]))
    );

    const enriched = [];
    const stats = { full: 0, snippet: 0, unverifiable: 0 };

    settled.forEach((outcome, i) => {
      if (outcome.status === "fulfilled") {
        const res = outcome.value;
        enriched.push(res);
        if (res.badge === BADGES.FULL_CONTENT) stats.full++;
        else if (res.badge === BADGES.SNIPPET_ONLY) stats.snippet++;
        else stats.unverifiable++;
      } else {
        const orig = results[i];
        enriched.push({
          ...orig,
          fetchedText: orig.snippet || orig.title || "",
          badge: BADGES.UNVERIFIABLE,
          badgeWeight: BADGE_WEIGHTS.UNVERIFIABLE,
          contentSource: "snippet"
        });
        stats.unverifiable++;
      }
    });

    return { enriched, stats };
  }
}

module.exports = {
  ContentService: new ContentService(),
  BADGES,
  BADGE_ICONS
};
