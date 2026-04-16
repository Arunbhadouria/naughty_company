# Part 1: The Intelligent Core
## Deep Dive: Machine Learning & Sentiment Analysis

The heart of the Naughty Company Scam Checker is a custom-built **Naive Bayes Classifier**. While many tools rely on simple keyword matching, we use probability to distinguish between genuine scam accusations and defensive/neutral text.

---

### Why Naive Bayes?

Accusations often use words like "scam" or "fraud," but so do legitimate job postings (e.g., "how to avoid a fraud"). Naive Bayes allows us to look at the **entire context** of a sentence. It calculates the probability that a text belongs to a category (Scam, Legit, or Defensive) based on the words it contains.

### 🛡️ Solving Numerical Stability (Log-Space Math)

In standard probability math, you multiply small numbers (0.001 * 0.002...). For a 1000-word article, this result becomes so small that computer hardware rounds it to zero (**Floating-Point Underflow**).

We solved this by switching to **Log-Space Math**.
- Instead of multiplying probabilities: $P(A) \times P(B)$
- We sum their logarithms: $\log(P(A)) + \log(P(B))$

This ensures our classification is 100% stable regardless of if we are analyzing a 2-word snippet or a 2000-word investigative report.

### 🔄 Human-in-the-Loop Feedback

The engine isn't a "black box." We've implemented a **Feedback System** that allows devs to correct the model.
1. System makes a prediction.
2. User provides a correction.
3. Correction is saved with metadata (content source, timestamp).
4. `merge_feedback.js` merges these into the core training data for retraining.

**Next in Part 2:** How we give the model high-quality data to analyze using the **Hybrid Content Fetcher.**
