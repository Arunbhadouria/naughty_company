# Scam Detection Engine Documentation

Welcome to the technical documentation series for the Naughty Company Scam Checker. 

This project evolved on **Day 3** into a professional service-oriented backend with ML-powered verification. Rather than one long document, we've broken the architecture down into three connected deep dives:

## 📚 Technical Series

### [Part 1: The Intelligent Core](EXPLANATION_PART1.md)
*How the "Brain" works.* A deep dive into the **Naive Bayes Classifier**, Log-Space math for numerical stability, and our human-in-the-loop feedback system.

### [Part 2: The Hybrid Fetcher](EXPLANATION_PART2.md)
*How the "Eyes" work.* A deep dive into the **Hybrid Scraping Engine**, link validation (HEAD requests), 4-layer fallback strategy, and automated content quality enforcement.

### [Part 3: Scaling & Deployment](EXPLANATION_PART3.md)
*How the "Skeleton" works.* A deep dive into the **API Architecture**, refactoring into services, security middleware (CORS/Rate Limiting), and **Dockerization**.

---

## 🚀 Quick Start (Day 3 Architecture)

### 1. Web API (Port 3000)
Used for the future React frontend.
```bash
npm run dev
```

### 2. Terminal CLI
For high-speed developer testing.
```bash
npm run cli -- "companyname"
```

### 3. Docker Deployment
For production-grade isolated execution.
```bash
docker-compose up --build
```

---

## 📢 Social Milestone
Check out the **[LinkedIn/X Post](SOCIAL_POST.md)** draft for a summary of our Day 3 progress.
