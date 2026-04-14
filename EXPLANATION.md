# Hybrid Content Fetching System — How It Works

This document explains every part of the content fetching system 
so you understand not just WHAT the code does, but WHY each 
decision was made. Read this alongside `contentFetcher.js`.

---

## The Problem We're Solving

Before this system, the scam checker relied **entirely** on SerpAPI snippets — 
those tiny 1-2 sentence previews Google shows under each search result.

**Why that's bad:**
1. Snippets are **tiny** (50-200 characters). The classifier has barely any 
   text to work with.
2. Google picks the snippet automatically — it might not show the most 
   relevant part of the page.
3. Users click links from our report to verify claims, but many URLs are 
   **dead** (404), **paywalled** (403), or **JS-rendered** (blank page with 
   a simple fetch). This destroys credibility.

**The fix:** Actually go fetch the page content ourselves, and if that fails, 
gracefully fall back to the snippet.

---

## Architecture: The 4-Layer Fallback

```
    ┌─────────────────────────────────────┐
    │   Layer 1: Full HTML Fetch (Axios)  │ ← Try this first
    │   GET the actual page, download it  │
    └────────────┬───────────────────────-┘
                 │ fails?
    ┌────────────▼───────────────────────-┐
    │   Layer 2: Cheerio Content Extract  │ ← Parse what we got
    │   Strip nav/footer/ads, get article │
    └────────────┬───────────────────────-┘
                 │ fails quality check?
    ┌────────────▼───────────────────────-┐
    │   Layer 3: SerpAPI Snippet          │ ← Google's preview
    │   Use the snippet from search API   │
    └────────────┬───────────────────────-┘
                 │ snippet empty?
    ┌────────────▼───────────────────────-┐
    │   Layer 4: Title Only              │ ← Last resort
    │   Just the page title, low conf.    │
    └─────────────────────────────────────┘
```

The system **never crashes**. If Layer 1 fails, it tries Layer 2. 
If that fails, Layer 3. If even the title is empty, it marks the 
result as UNVERIFIABLE and moves on.

---

## Step-by-Step Walkthrough

### Step 1: Link Validation (HEAD Request)

```javascript
async function validateLink(url) {
  const response = await axios.head(url, { timeout: 3000 });
  // ...
}
```

**What:** Before downloading a full page (which could be megabytes), 
we send a HEAD request. HEAD is like GET but returns ONLY the 
headers, not the body. It's cheap and fast.

**Why HEAD first?**
- A 404 page might be 50KB of "Page Not Found" HTML. Why download 
  that when a HEAD request tells us in ~200 bytes?
- A 403 paywalled site will never give us content. HEAD catches 
  this in milliseconds instead of waiting 5 seconds for a full GET 
  to fail.
- Timeout is 3 seconds. If a server doesn't respond to HEAD in 3s, 
  it's probably not going to respond well to GET either.

**What the status codes mean:**
| Code | Meaning | Our Action |
|------|---------|------------|
| 200  | Page exists and is accessible | Proceed to fetch |
| 301/302 | Redirect | Axios follows it automatically |
| 401  | Authentication required | Mark as paywalled, skip |
| 403  | Forbidden / paywalled | Mark as paywalled, skip |
| 404  | Page doesn't exist | Mark as dead link, skip |
| Timeout | Server too slow | Skip |

**The User-Agent trick:**
```javascript
headers: {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```
Some servers block requests that don't look like they come from a 
browser. By setting a Chrome-like User-Agent, we avoid being rejected 
by bot-protection systems.

---

### Step 2 Layer 1: Raw HTML Fetch (Axios GET)

```javascript
async function fetchRawHTML(url) {
  const response = await axios.get(url, {
    timeout: 5000,
    maxContentLength: 2 * 1024 * 1024, // 2MB cap
  });
}
```

**What:** Standard HTTP GET request to download the full HTML page.

**Why the 2MB cap?** 
Some pages (forums with years of posts, long documentation pages) 
can be 10-50MB. We don't want to download all that — it would be 
slow and we'd only use the first 1000 words anyway.

**Why check Content-Type?**
```javascript
const contentType = response.headers["content-type"] || "";
if (!contentType.includes("text/html")) return null;
```
SerpAPI sometimes returns links to PDFs, images, or JSON APIs. 
These aren't HTML pages we can parse with Cheerio, so we skip them.

**What fails here:**
- **JS-rendered sites** (React, Angular, Vue SPAs). Axios downloads 
  the HTML, but the "HTML" is just `<div id="root"></div>` + a 
  giant JavaScript bundle. The actual content is rendered client-side, 
  which Axios can't execute.
- **Sites with aggressive bot protection** (Cloudflare, reCAPTCHA).
- **Timeout** (server is slow).

When this fails, we fall through to Layer 3 (snippet).

---

### Step 2 Layer 2: Cheerio Content Extraction

```javascript
function extractContent(html) {
  const $ = cheerio.load(html);
  JUNK_SELECTORS.forEach(selector => $(selector).remove());
  // ... find article content ...
}
```

**What is Cheerio?**
Cheerio is a **server-side jQuery**. It parses HTML into a DOM tree 
(like a browser does) but without actually rendering anything. 
You can then use CSS selectors to find and manipulate elements.

Think of it like this:
- Browser: parses HTML → builds DOM → renders pixels on screen
- Cheerio: parses HTML → builds DOM → lets you query it with code

**Why strip junk elements?**
Raw HTML pages contain a TON of stuff that isn't the actual article:
- Navigation bars
- Cookie consent banners  
- Footers with copyright info
- Sidebars with ads
- Script tags with JavaScript code
- Style tags with CSS

If we passed all of this to the classifier, the "article text" would 
be drowned in boilerplate. The classifier would learn that words like 
"cookie", "privacy", "subscribe" appear in scam-related searches, 
which is wrong.

**The content selector priority:**
```javascript
const contentSelectors = [
  "article",           // Best: semantic HTML5 article tag
  "[role='main']",     // ARIA accessibility role
  "main",              // Semantic main tag
  ".post-content",     // Common blog pattern
  ".entry-content",    // WordPress default
  // ...
];
```

We try the most specific selectors first. An `<article>` tag almost 
always contains JUST the article text. If the page doesn't use 
semantic HTML (many don't), we fall back to more generic selectors.

**The 1000-word cap:**
```javascript
const words = contentText.split(/\s+/);
if (words.length > MAX_WORDS) {
  contentText = words.slice(0, MAX_WORDS).join(" ");
}
```
Even after stripping junk, some pages have extremely long articles. 
We cap at 1000 words because:
1. The classifier only needs enough text to detect patterns
2. More text means more processing time
3. Later parts of articles often drift off-topic

---

### Step 3: Text Quality Check

```javascript
function checkTextQuality(text, entity) {
  // Check 1: Length > 200 characters
  // Check 2: Not mostly boilerplate phrases
  // Check 3: Mentions the company we're researching
}
```

**Why this matters:**
Even after Cheerio extraction, we can end up with:
- A 50-character text that says "Loading..." (JS-rendered site)
- A page of cookie policy text (our junk selector missed a variant)
- A completely unrelated page (Google returned a bad result)

The three checks catch these cases:

| Check | What it catches | Example |
|-------|----------------|---------|
| Length < 200 chars | JS-rendered shells, empty pages | `"Loading... Please enable JavaScript"` |
| Boilerplate phrases ≥ 3 | Cookie/privacy policy pages | `"We use cookies. Accept cookies. Cookie policy..."` |
| Entity not mentioned | Irrelevant pages | A page about "code" that never mentions "codesoft" |

If the text fails ANY check, we don't use it as FULL_CONTENT. 
Instead, we fall back to the SerpAPI snippet (Layer 3).

---

### Step 4: Status Badges

Every result gets exactly ONE badge:

| Badge | Icon | Meaning | Weight |
|-------|------|---------|--------|
| `FULL_CONTENT` | ✅ | We fetched and verified the actual page | 1.0× (100%) |
| `SNIPPET_ONLY` | ⚠️ | We used Google's preview text | 0.6× (60%) |
| `UNVERIFIABLE` | ❌ | Dead link, timeout, or no usable text | 0.3× (30%) |

**Why different weights?**
A result where we actually read the full LinkedIn post saying 
"This company is a SCAM" is much more trustworthy than a Google 
snippet that shows "...scam...codesoft...". The snippet might be 
taken out of context. The full page gives us the full picture.

The weights feed into the risk score calculation:
```
combinedWeight = sourceWeight × badgeWeight
```

So a Reddit result (source weight 4) with full content (badge 1.0) 
contributes `4 × 1.0 = 4.0` to the score.

The same Reddit result with only a snippet contributes 
`4 × 0.6 = 2.4` — 40% less influence.

---

### Step 5: Parallel Execution

```javascript
async function fetchAllContent(results, entity) {
  const promises = results.map(r => fetchSingleResult(r, entity));
  const settled = await Promise.allSettled(promises);
}
```

**Why `Promise.allSettled` instead of `Promise.all`?**

`Promise.all` fails fast — if ANY single promise rejects, the entire 
batch throws an error. So if we're fetching 49 URLs and URL #17 
times out, we'd lose ALL 49 results.

`Promise.allSettled` waits for ALL promises to complete (resolve OR 
reject). It returns an array where each element is either:
```javascript
{ status: "fulfilled", value: result }  // success
{ status: "rejected", reason: error }   // failure
```

This means one bad URL never affects the other 48.

**The timeout race:**
```javascript
Promise.race([
  fetchSingleResult(result, entity),  // actual work
  new Promise((_, reject) =>          // timeout bomb
    setTimeout(() => reject("TIMEOUT"), 6000)
  ),
]);
```

`Promise.race` returns whichever promise finishes first. So if the 
fetch takes longer than 6 seconds, the timeout promise "wins" and 
ends the race. The fetch promise might still resolve later in the 
background, but we don't wait for it.

---

## How It Integrates With scamChecker.js

### Before (V7)
```
SerpAPI search → sentiment filter → keyword analysis → verdict
                  (uses snippets)   (uses snippets)
```

### After (V8)
```
SerpAPI search → CONTENT FETCH → sentiment filter → keyword analysis → verdict
                  (new step!)     (uses full text)   (uses full text + 
                                                      badge weights)
```

The content fetcher runs **after** SerpAPI returns results but 
**before** the sentiment filter. This means:

1. The sentiment filter (Naive Bayes) now analyzes FULL page 
   content instead of tiny snippets — better classification accuracy
2. The keyword counter has more text to search through — might 
   find signal words that weren't in the snippet
3. The risk score accounts for content verification level — a 
   result we actually verified carries more weight

### Graceful Degradation
```javascript
try {
  const fetchResult = await fetchAllContent(allResults, entity);
} catch (err) {
  // If the ENTIRE fetching system fails, fall back to
  // snippet-only mode (old V7 behavior)
}
```

If contentFetcher.js crashes completely (network down, module error, 
anything), the scam checker falls back to the old behavior. The user 
still gets results — just less verified ones.

---

## Key Design Decisions

### Why not use Puppeteer/Playwright for JS-rendered sites?
Puppeteer launches an actual Chrome browser, which:
- Requires 200+ MB of Chromium to install
- Uses 100-500MB RAM per page
- Takes 3-10 seconds per page to render
- Would make the project much harder to deploy

For 49 URLs in parallel, that's potentially 10-25 GB of RAM.
Not practical for a CLI tool. Cheerio + snippet fallback is the 
right tradeoff.

### Why not fetch ALL pages (skip HEAD)?
HEAD first saves bandwidth and time. If 30% of URLs are dead 
(which is common for old search results), we save 30% of the 
full GET requests. HEAD is typically 10-50× faster than GET.

### Why 200 characters minimum?
After extensive testing, pages with less than 200 characters of 
extracted text are almost always:
- JS-rendered shells ("Loading...")
- Error pages ("404 Not Found")  
- Login walls ("Please sign in to continue")

200 chars is roughly 30-40 words — enough for at least one 
meaningful sentence.

### Why cap at 1000 words?
The Naive Bayes classifier doesn't benefit much from extra text 
beyond ~1000 words. The signal words (scam, fraud, legit, etc.) 
appear in the first few paragraphs. The rest is usually:
- User comments (noisy)
- Related articles (irrelevant)
- Structural text (menus, links)

---

## Files Changed

| File | Change |
|------|--------|
| `contentFetcher.js` | **NEW** — The entire hybrid fetching module |
| `scamChecker.js` | Updated to V8 — integrates content fetcher, badge-weighted scoring, enriched display |
| `sentiment-model/feedback.js` | Updated `addFeedback()` to track content source type |
| `sentiment-model/merge_feedback.js` | Updated to handle new feedback format (objects with metadata) |
| `package.json` | Added `cheerio` dependency |
