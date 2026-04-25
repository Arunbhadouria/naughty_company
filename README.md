# 🕵️‍♂️ Naughty Company: Whiskered Intelligence

![Naughty Company Banner](https://img.shields.io/badge/Status-Complete-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-MERN-green?style=for-the-badge)

**Naughty Company** is a premium, "Cyber-Noir" themed scam detection engine. It combines advanced OSINT (Open Source Intelligence) gathering with machine learning to verify the legitimacy of companies and digital entities.

---

## 🚀 Overview

The application functions as a digital private investigator. Users can input a company name or domain, and the engine will:
1.  **Scour the Web**: Perform deep searches using SerpApi.
2.  **Hybrid Fetching**: Crawl full-page content and fall back to snippets where necessary.
3.  **Sentiment Filtering**: Filter out defensive or self-promotional content using a custom Naive Bayes classifier.
4.  **Weighted Scoring**: Calculate a "Risk Score" based on source authority and signal density.
5.  **Persistence**: Archive investigations for registered "Agents."

---

## ✨ Features

### 🧠 The Intelligence Core
-   **Weighted Verdicts**: Not all sources are equal. Official government records weigh more than social media posts.
-   **Relevance Enforcement**: Validates that fetched text actually pertains to the target entity.
-   **Anti-Boilerplate**: Smart filtering to ignore cookie policies and privacy terms during analysis.

### 🎨 The "Obsidian Protocol" UI
-   **Cyber-Noir Aesthetic**: A deep-dark theme with teal accents and scanline overlays.
-   **Framer Motion Animations**: Interactive Risk Cards that "power on" when results appear.
-   **Glassmorphism**: Modern UI elements with blurred backdrops and subtle glows.

### 🔐 Security & Auth
-   **Dual-Layer Auth**: Support for standard Email/Password and one-click **Google OAuth**.
-   **Freemium Model**: Integrated middleware allows one free "guest" scan, encouraging user registration.
-   **JWT Protected**: Secure session management using JSON Web Tokens.

---

## 🛠 Tech Stack

**Frontend:**
-   React (Vite)
-   Framer Motion (Animations)
-   Lucide-React (Icons)
-   Vanilla CSS (Obsidian Protocol)

**Backend:**
-   Node.js & Express
-   MongoDB & Mongoose
-   Passport.js (Auth)
-   Cheerio (Web Scraping)
-   Axios (HTTP)

**DevOps:**
-   Docker & Docker Compose
-   SerpApi (Search Engine)

---

## 🚦 Getting Started

### 1. Prerequisites
-   Node.js (v18+)
-   MongoDB (Atlas or Local)
-   SerpApi Key

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_uri

# Search
SERPAPI_KEY=your_serpapi_key

# Auth
JWT_SECRET=your_secret
SESSION_SECRET=your_session_secret

# OAuth
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

### 3. Installation & Run
```bash
# Install dependencies
npm install
cd frontend && npm install
cd ..

# Run Backend (Port 3000)
npm run dev

# Run Frontend (Port 5173)
cd frontend
npm run dev
```

### 4. Docker (Optional)
```bash
docker-compose up --build
```

---

## 📖 Documentation
For a deep dive into the architecture, see the technical series:
-   [Part 1: The Intelligent Core](EXPLANATION_PART1.md)
-   [Part 2: The Hybrid Fetcher](EXPLANATION_PART2.md)
-   [Part 3: API & Dockerization](EXPLANATION_PART3.md)
-   [Part 6: Building the "Cyber-Noir" UI](EXPLANATION_PART6.md)

---

**Developed by Arun Bhadouriya**
