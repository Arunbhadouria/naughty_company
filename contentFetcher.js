// ============================================
// CONTENT FETCHER - HYBRID FETCHING SYSTEM
// ============================================
// This module sits between SerpAPI results and the
// Naive Bayes classifier. It tries to fetch the ACTUAL
// page content from each URL so the classifier has
// richer text to work with, instead of relying solely
// on SerpAPI's short snippet previews.
//
// THE PIPELINE (per URL):
//   1. HEAD request → is the link alive?
//   2. GET request  → download the raw HTML
//   3. Cheerio      → strip junk, extract article text
//   4. Quality check → is the text actually useful?
//   5. Badge        → tag the result so we know what we got
//
// If anything fails at any step, it falls back to the
// next layer automatically. Nothing crashes.
// ============================================

const axios = require("axios");
const cheerio = require("cheerio");

// ─── STATUS BADGES ─────────────────────────────────────
// Every result gets exactly one of these badges.
// They tell the user AND the scoring system how much
// to trust the analyzed text.

const BADGES = {
  FULL_CONTENT: "FULL_CONTENT",   // We fetched and parsed the actual page
  SNIPPET_ONLY: "SNIPPET_ONLY",   // We used SerpAPI's preview snippet
  UNVERIFIABLE: "UNVERIFIABLE",   // Dead link, timeout, or no usable text
};

// Badge display icons for terminal output
const BADGE_ICONS = {
  FULL_CONTENT: "✅",
  SNIPPET_ONLY: "⚠️",
  UNVERIFIABLE: "❌",
};

// ─── WEIGHT MULTIPLIERS ────────────────────────────────
// These scale the risk score contribution of each result.
// A snippet-only result is worth 60% of a fully verified one.
// An unverifiable result still counts but at only 30%.

const BADGE_WEIGHTS = {
  FULL_CONTENT: 1.0,
  SNIPPET_ONLY: 0.6,
  UNVERIFIABLE: 0.3,
};

// ─── CONFIG ────────────────────────────────────────────

const HEAD_TIMEOUT = 3000;    // 3s max for HEAD check
const FETCH_TIMEOUT = 5000;   // 5s max for full page GET
const MAX_WORDS = 1000;       // Cap extracted text length
const MIN_TEXT_LENGTH = 200;  // Minimum chars for "meaningful" content

// CSS selectors for elements we want to REMOVE from the page.
// These are navbars, footers, ads, cookie banners, sidebars, etc.
// Cheerio lets us use jQuery-style selectors to strip them.
const JUNK_SELECTORS = [
  "script",           // JavaScript code
  "style",            // CSS stylesheets
  "nav",              // Navigation bars
  "footer",           // Page footers
  "header",           // Page headers (often just nav)
  "aside",            // Sidebars
  "iframe",           // Embedded frames (ads, videos)
  "noscript",         // Fallback content for no-JS browsers
  ".cookie",          // Cookie consent banners
  ".cookies",
  ".cookie-banner",
  ".cookie-consent",
  "#cookie",
  "#cookie-banner",
  ".gdpr",            // GDPR notices
  ".popup",           // Popups
  ".modal",           // Modal dialogs
  ".overlay",         // Overlay screens
  ".ad",              // Advertisements
  ".ads",
  ".advert",
  ".advertisement",
  ".sidebar",         // Sidebars
  ".menu",            // Menus
  ".breadcrumb",      // Breadcrumb navigation
  ".social-share",    // Social sharing buttons
  ".share",
  ".related",         // "Related articles" sections
  ".comments",        // Comment sections
  "#comments",
  ".newsletter",      // Newsletter signup forms
  ".subscribe",
  ".cta",             // Call-to-action banners
];

// Words that indicate boilerplate content rather than actual articles.
// If the extracted text is mostly these, we reject it.
const BOILERPLATE_PHRASES = [
  "cookie policy",
  "privacy policy",
  "terms of service",
  "terms and conditions",
  "accept cookies",
  "we use cookies",
  "subscribe to our newsletter",
  "sign up for our",
  "all rights reserved",
  "powered by wordpress",
  "skip to content",
  "toggle navigation",
  "enable javascript",
];


// ─── STEP 1: LINK VALIDATION ──────────────────────────
// Send a HEAD request to check if the URL is alive.
// HEAD is fast because it only fetches headers, not the body.
//
// Returns an object with:
//   status: the HTTP status code (200, 404, 403, etc.)
//   alive: boolean - can we proceed to fetch?
//   reason: human-readable explanation if blocked

async function validateLink(url) {
  try {
    const response = await axios.head(url, {
      timeout: HEAD_TIMEOUT,
      // Follow redirects (some sites redirect HTTP → HTTPS)
      maxRedirects: 3,
      // Don't throw on non-2xx status codes
      validateStatus: () => true,
      // Pretend to be a real browser so sites don't block us
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const status = response.status;

    // 2xx → success, link is alive
    if (status >= 200 && status < 300) {
      return { status, alive: true, reason: "OK" };
    }

    // 401/403 → exists but paywalled or auth-required
    if (status === 401 || status === 403) {
      return { status, alive: false, reason: "PAYWALLED" };
    }

    // 404 → page doesn't exist
    if (status === 404) {
      return { status, alive: false, reason: "DEAD_LINK" };
    }

    // Any other non-2xx → treat as inaccessible
    return { status, alive: false, reason: `HTTP_${status}` };

  } catch (err) {
    // Network error or timeout
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      return { status: 0, alive: false, reason: "TIMEOUT" };
    }
    return { status: 0, alive: false, reason: "NETWORK_ERROR" };
  }
}


// ─── STEP 2 LAYER 1: RAW HTML FETCH ───────────────────
// Simple GET request to download the full HTML page.
// Returns the raw HTML string or null if it fails.

async function fetchRawHTML(url) {
  try {
    const response = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      maxRedirects: 3,
      // Only accept HTML responses (not PDFs, images, etc.)
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      // Cap response size at 2MB to avoid downloading huge pages
      maxContentLength: 2 * 1024 * 1024,
    });

    // Check that we actually got HTML back
    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    return response.data;

  } catch (err) {
    return null;
  }
}


// ─── STEP 2 LAYER 2: CHEERIO CONTENT EXTRACTION ───────
// Parse the raw HTML and extract just the article body text.
// Cheerio is a server-side jQuery — it parses HTML into a DOM
// tree that we can query with CSS selectors.
//
// Strategy:
// 1. Load the HTML into Cheerio
// 2. Remove all junk elements (nav, footer, ads, scripts, etc.)
// 3. Try to find the main content area (<article>, <main>, etc.)
// 4. If no content area found, fall back to the entire <body>
// 5. Extract plain text from whatever we found
// 6. Clean up whitespace and cap at MAX_WORDS

function extractContent(html) {
  try {
    // Load HTML into Cheerio's DOM parser
    const $ = cheerio.load(html);

    // Remove all junk elements in one pass
    // This is like doing document.querySelectorAll(...).forEach(el => el.remove())
    JUNK_SELECTORS.forEach(selector => {
      $(selector).remove();
    });

    // Try to find the main content area.
    // Websites typically wrap their article in one of these containers.
    // We try them in order of specificity.
    let contentText = "";

    const contentSelectors = [
      "article",                       // Semantic HTML5 article tag
      "[role='main']",                 // ARIA main content role
      "main",                          // Semantic main tag
      ".post-content",                 // Common blog class
      ".article-content",
      ".entry-content",                // WordPress default
      ".content",                      // Generic content wrapper
      "#content",
      ".post-body",                    // Blogger default
      ".story-body",                   // News sites
    ];

    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        contentText = element.text();
        break;
      }
    }

    // Fallback: if no content area found, use entire body
    if (!contentText || contentText.trim().length < 50) {
      contentText = $("body").text();
    }

    // Clean up the extracted text:
    // 1. Collapse multiple whitespace into single spaces
    // 2. Remove leading/trailing whitespace
    // 3. Cap at MAX_WORDS words
    contentText = contentText
      .replace(/\s+/g, " ")       // Collapse whitespace
      .replace(/\n+/g, " ")       // Remove newlines
      .trim();

    // Cap at MAX_WORDS
    const words = contentText.split(/\s+/);
    if (words.length > MAX_WORDS) {
      contentText = words.slice(0, MAX_WORDS).join(" ") + "...";
    }

    return contentText || null;

  } catch (err) {
    return null;
  }
}


// ─── STEP 3: TEXT QUALITY CHECK ────────────────────────
// After extracting text, we need to verify it's actually
// useful content and not just boilerplate junk.
//
// Three checks:
// 1. Length check: must be > 200 characters
// 2. Boilerplate check: not mostly cookie/privacy text
// 3. Relevance check: mentions the company we're researching

function checkTextQuality(text, entity) {
  // Check 1: Length — is there enough text to analyze?
  if (!text || text.length < MIN_TEXT_LENGTH) {
    return { pass: false, reason: "TOO_SHORT" };
  }

  // Check 2: Boilerplate — is this just cookie policies etc?
  const lowerText = text.toLowerCase();
  let boilerplateHits = 0;

  for (const phrase of BOILERPLATE_PHRASES) {
    if (lowerText.includes(phrase)) {
      boilerplateHits++;
    }
  }

  // If more than 3 boilerplate phrases found, it's probably junk.
  // Real articles might mention "privacy policy" once in a footer
  // we missed, but not 4+ times.
  if (boilerplateHits >= 3) {
    return { pass: false, reason: "BOILERPLATE" };
  }

  // Check 3: Relevance — does the text mention the entity?
  // We use the base name (e.g., "codesoft" from "codesoft.com")
  const entityBase = entity.split(".")[0].toLowerCase();
  const entityRegex = new RegExp(`\\b${entityBase}\\b`, "i");

  if (!entityRegex.test(text)) {
    return { pass: false, reason: "NOT_RELEVANT" };
  }

  return { pass: true, reason: "OK" };
}


// ─── STEP 2-4 COMBINED: FETCH SINGLE RESULT ───────────
// This is the main per-URL pipeline. It runs all the steps
// for ONE search result and returns an enriched version
// with the fetched content and a status badge.
//
// The layered fallback works like this:
//
//   Layer 1: Fetch full HTML → extract with Cheerio
//            ↓ (if that fails)
//   Layer 2: Use SerpAPI snippet
//            ↓ (if snippet is empty)
//   Layer 3: Use title only (flagged low confidence)
//            ↓ (if even title is empty)
//   Layer 4: Mark as UNVERIFIABLE

async function fetchSingleResult(result, entity) {
  const url = result.link;
  const snippet = result.snippet || "";
  const title = result.title || "";

  // Default: assume we'll end up with nothing
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

  // ── STEP 1: Validate the link ────────────────────
  const validation = await validateLink(url);
  enriched.linkStatus = validation.reason;

  if (!validation.alive) {
    // Link is dead/paywalled/timed out.
    // Fall through to Layer 3/4 (snippet or title).
    enriched.qualityNote = `Link ${validation.reason} (HTTP ${validation.status})`;

    // Even though the link is dead, we can still use the snippet
    if (snippet.length > 0) {
      enriched.fetchedText = snippet;
      enriched.contentSource = "snippet";
      enriched.badge = BADGES.SNIPPET_ONLY;
      enriched.badgeIcon = BADGE_ICONS.SNIPPET_ONLY;
      enriched.badgeWeight = BADGE_WEIGHTS.SNIPPET_ONLY;
      enriched.qualityNote += " — used SerpAPI snippet as fallback";
    } else if (title.length > 0) {
      // Layer 4: title only
      enriched.fetchedText = title;
      enriched.contentSource = "title";
      enriched.badge = BADGES.UNVERIFIABLE;
      enriched.badgeIcon = BADGE_ICONS.UNVERIFIABLE;
      enriched.badgeWeight = BADGE_WEIGHTS.UNVERIFIABLE;
      enriched.qualityNote += " — title only, low confidence";
    }

    return enriched;
  }

  // ── STEP 2 LAYER 1: Fetch raw HTML ───────────────
  const html = await fetchRawHTML(url);

  if (html) {
    // ── STEP 2 LAYER 2: Extract with Cheerio ───────
    const extractedText = extractContent(html);

    if (extractedText) {
      // ── STEP 3: Quality check ────────────────────
      const quality = checkTextQuality(extractedText, entity);

      if (quality.pass) {
        // SUCCESS! We have full, quality-checked content.
        enriched.fetchedText = extractedText;
        enriched.contentSource = "full_page";
        enriched.badge = BADGES.FULL_CONTENT;
        enriched.badgeIcon = BADGE_ICONS.FULL_CONTENT;
        enriched.badgeWeight = BADGE_WEIGHTS.FULL_CONTENT;
        enriched.qualityNote = "Full page content extracted and verified";
        return enriched;
      } else {
        // Text was extracted but didn't pass quality check
        enriched.qualityNote = `Extracted text failed quality: ${quality.reason}`;
      }
    } else {
      // Cheerio couldn't extract anything useful
      enriched.qualityNote = "HTML fetched but content extraction failed";
    }
  } else {
    // GET request failed (JS-rendered page, timeout, etc.)
    enriched.qualityNote = "Page fetch failed (may be JS-rendered)";
  }

  // ── STEP 2 LAYER 3: Fall back to snippet ─────────
  if (snippet.length > 0) {
    enriched.fetchedText = snippet;
    enriched.contentSource = "snippet";
    enriched.badge = BADGES.SNIPPET_ONLY;
    enriched.badgeIcon = BADGE_ICONS.SNIPPET_ONLY;
    enriched.badgeWeight = BADGE_WEIGHTS.SNIPPET_ONLY;
    enriched.qualityNote += " — fell back to SerpAPI snippet";
    return enriched;
  }

  // ── STEP 2 LAYER 4: Fall back to title ───────────
  if (title.length > 0) {
    enriched.fetchedText = title;
    enriched.contentSource = "title";
    enriched.badge = BADGES.UNVERIFIABLE;
    enriched.badgeIcon = BADGE_ICONS.UNVERIFIABLE;
    enriched.badgeWeight = BADGE_WEIGHTS.UNVERIFIABLE;
    enriched.qualityNote += " — title only, low confidence";
    return enriched;
  }

  // Nothing at all — truly unverifiable
  return enriched;
}


// ─── MAIN: FETCH ALL RESULTS IN PARALLEL ───────────────
// Takes the array of SerpAPI results and enriches ALL of
// them in parallel using Promise.allSettled.
//
// Promise.allSettled (not Promise.all) is used here because
// we NEVER want one failed URL to crash the whole batch.
// allSettled always resolves — it just marks failed promises
// as "rejected" instead of throwing.

async function fetchAllContent(results, entity) {
  console.log(`\n🌐 Fetching content from ${results.length} URLs (parallel)...`);

  // Create a promise for each result
  const promises = results.map(result => fetchSingleResult(result, entity));

  // Run all fetches in parallel, with a hard 5-second timeout per URL
  // Promise.allSettled ensures no single failure crashes the batch
  const settled = await Promise.allSettled(
    promises.map(p =>
      Promise.race([
        p,
        // If a promise takes longer than FETCH_TIMEOUT, reject it
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("GLOBAL_TIMEOUT")), FETCH_TIMEOUT + 1000)
        ),
      ])
    )
  );

  // Process results: extract fulfilled values, handle rejections
  const enriched = [];
  const stats = { full: 0, snippet: 0, unverifiable: 0 };

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];

    if (outcome.status === "fulfilled") {
      const result = outcome.value;
      enriched.push(result);

      // Count stats
      if (result.badge === BADGES.FULL_CONTENT) stats.full++;
      else if (result.badge === BADGES.SNIPPET_ONLY) stats.snippet++;
      else stats.unverifiable++;
    } else {
      // Promise was rejected (timeout or unexpected error)
      // Gracefully degrade: use the original result with UNVERIFIABLE badge
      const original = results[i];
      enriched.push({
        ...original,
        fetchedText: original.snippet || original.title || "",
        contentSource: original.snippet ? "snippet" : "title",
        badge: BADGES.UNVERIFIABLE,
        badgeIcon: BADGE_ICONS.UNVERIFIABLE,
        badgeWeight: BADGE_WEIGHTS.UNVERIFIABLE,
        linkStatus: "TIMEOUT",
        qualityNote: "Global timeout — fell back to original data",
      });
      stats.unverifiable++;
    }
  }

  // Print summary
  console.log(`\n  📊 Content Fetch Summary:`);
  console.log(`     ${BADGE_ICONS.FULL_CONTENT} Full content:  ${stats.full}`);
  console.log(`     ${BADGE_ICONS.SNIPPET_ONLY} Snippet only:  ${stats.snippet}`);
  console.log(`     ${BADGE_ICONS.UNVERIFIABLE} Unverifiable:  ${stats.unverifiable}`);

  return { enriched, stats };
}


// ─── EXPORTS ───────────────────────────────────────────

module.exports = {
  fetchAllContent,
  fetchSingleResult,
  validateLink,
  checkTextQuality,
  BADGES,
  BADGE_ICONS,
  BADGE_WEIGHTS,
};
