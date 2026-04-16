# Part 3: Scaling & Deployment
## Deep Dive: API Architecture & Dockerization

In Day 3, we evolved the project from a localized terminal script into a **Ready-to-Deploy Backend**.

---

### From Monolith to Service-Oriented

We refactored the entire codebase into a clean `src/` structure:
- **Services**: Pure logic (Search, Content Fetching, Sentiment). They don't know about Express or the Terminal.
- **Controllers**: Handle Request/Response logic.
- **Routes**: Define the REST API surface (`/api/v1/analyze`).
- **Middleware**: Global safety (Error handling, Rate limiting, Security headers).

This separation means we can plug the same "Search Engine" into a **React Dashboard**, a **Discord Bot**, or keep using it via the **CLI**.

### 🔒 Operational Security

For an API that performs parallel scraping, security is critical:
- **Helmet**: Sets 15+ HTTP headers to secure the API against common vulnerabilities.
- **CORS**: Explicitly configured for local React development (`http://localhost:5173`).
- **Express-Rate-Limit**: Buffers incoming requests (10 req/min) to prevent accidental exhaustion of the SerpAPI quota.

### 🐳 Docker & DevOps

We containerized the app to ensure it runs identically anywhere.
- **Base**: `node:18-alpine` (Minimal size, secure execution).
- **Security**: Runs as a non-root `node` user.
- **Efficiency**: Multi-stage build concept used to keep the final production image small.

### 🛣️ The Roadmap

With the backend architecture finalized and Dockerized, our "Skeleton" is complete. The project is now 100% ready for:
1. **Frontend Integration**: A React dashboard for visual analysis.
2. **Cloud Deployment**: Deploying the Docker image to AWS, Google Cloud, or DigitalOcean.
3. **Database Integration**: Persisting analysis reports for history tracking.

---

### How to Run
- **Terminal**: `npm run cli -- "zorvyn"`
- **Web API**: `npm run dev` (Connects on Port 3000)
- **Docker**: `docker-compose up --build`
