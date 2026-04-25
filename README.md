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

## 🌐 Deployment & Cross-Domain Authentication

This application is designed for a distributed deployment:
- **Frontend**: Vercel (`.vercel.app`)
- **Backend**: Render (`.onrender.com`)

### 🔐 Cross-Domain Authentication (Token Fallback)
Due to modern browser restrictions on third-party cookies, the application implements a dual-layer authentication strategy:
1.  **Standard Cookies**: Uses `SameSite=None` and `Secure` attributes.
2.  **JWT Fallback**: If cookies are blocked, the backend passes a token via URL query parameters on the first redirect. The frontend automatically captures this token, saves it to `localStorage`, and includes it in the `Authorization` header for all subsequent API calls.

### ⚡ Keep-Alive Mechanism
Render's free tier spins down after 15 minutes of inactivity. To mitigate this:
- **Frontend Pre-warm**: The frontend pings the `/health` endpoint immediately on load to trigger the wake-up process.
- **Pinger Script**: A standalone `scripts/keep-alive.js` is provided to keep the server awake 24/7 (can be used with UptimeRobot).

---

## 🛠 Tech Stack

**Frontend:**
- **React 19** (Vite 6)
- **Framer Motion** (State-aware animations)
- **Axios** (With interceptors for global auth)
- **Lucide-React** (Premium iconography)

**Backend:**
- **Node.js & Express**
- **MongoDB Atlas**
- **Passport.js** (Google OAuth 2.0 & Local Strategy)
- **Naive Bayes Classifier** (Sentiment-based search filtering)
- **Cheerio** (High-performance web scraping)

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Atlas or Local)
- SerpApi Key (for OSINT gathering)

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

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
GOOGLE_CALLBACK_URL=https://your-app.vercel.app/api/v1/auth/google/callback
```

> [!IMPORTANT]
> Always use your **Frontend URL** (Vercel) as the `GOOGLE_CALLBACK_URL`. Vercel's proxy will handle the communication with the backend, ensuring a seamless session.

### 3. Installation & Run
```bash
# Install dependencies
npm install
cd frontend && npm install
cd ..

# Run Backend (Port 3000)
npm start

# Run Frontend (Port 5173)
cd frontend
npm run dev
```

---

## 📖 Documentation
For a deep dive into the architecture, see the technical series:
- [Part 1: The Intelligent Core](EXPLANATION_PART1.md)
- [Part 2: The Hybrid Fetcher](EXPLANATION_PART2.md)
- [Part 3: API & Dockerization](EXPLANATION_PART3.md)
- [Part 6: Building the "Cyber-Noir" UI](EXPLANATION_PART6.md)

---

**Developed by Arun Bhadouriya**
