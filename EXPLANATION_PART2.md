# Part 2: The Hybrid Fetcher
## Deep Dive: Content Extraction & Credibility

A sentiment model is only as credible as the text it reads. If we only analyze Google snippets, we miss 90% of the context. 

---

### The 4-Layer Fallback System

We built a "layered sensor" that tries to get the best possible data for every search result:

1. **Layer 1: Semantic Extraction (Cheerio)**
   - We download the raw HTML using Axios. 
   - We use **Cheerio** (server-side jQuery) to strip "noise" (navbars, ads, footer, popups) and target semantic tags like `<article>` or `<main>`.
2. **Layer 2: Logic-Based Fallback**
   - If no `<article>` is found, we fall back to the `<body>` but still strip junk scripts and styles.
3. **Layer 3: Snippet Fallback**
   - If the site is paywalled (HTTP 403) or JS-rendered (React/Angular shells), we fall back to the **SerpAPI Snippet**.
4. **Layer 4: Title Fallback**
   - If everything else is empty, we use the Title as a last resort, marking it as **Low Confidence**.

### 🔍 Link Validation (The HEAD Request)

Before we download a 2MB page, we send a **HEAD request**. 
- It's 100x faster than a full GET request.
- It tells us immediately if a link is **Dead (404)** or **Paywalled (403)**. 
- This prevents our system from hanging on slow, dead servers.

### 🛡️ Quality Enforcement

Even if we get text, we don't always trust it. Each result passes through:
- **Length Check**: Must be > 200 characters.
- **Boilerplate Check**: Rejects pages that are mostly "Cookie Policy" or "Sign up for newsletter" text.
- **Relevance Check**: Regex check to ensure the company name actually appears in the extracted text.

**Next in Part 3:** How we turned this logic into a scalable **REST API** with **Docker.**
