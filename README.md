# 🚀 Proof-Hire: AI-Driven Talent Intelligence & Roadmap Odyssey

**Proof-Hire** is a high-fidelity recruitment intelligence platform that bridges the gap between resume claims and real-world technical evidence. It automates the verification of candidate skills by cross-referencing resumes with live GitHub data and generates a personalized "Winding Road" mastery path to bridge technical gaps.

---

## 📺 Demo Video
[**Watch the Proof-Hire Demo on Google Drive**](https://drive.google.com/file/d/1lEcKgB3VABLlPd_JFdLSNXlnARfaLc5A/view?usp=sharing)

---

## 📖 Problem Statement
Traditional hiring relies on static, unverifiable resumes that fail to prove actual competency, leading to expensive hiring mismatches and manual screening delays. Proof-Hire solves this by providing **Evidence-Backed Match Scoring** and **AI-Driven Skill Roadmaps**, enabling recruiters to find and verify technical talent in seconds.

---

## ✨ Key Features

### 1. **AI "Winding Road" Odyssey**
- A full-screen, interactive SVG roadmap that visualizes the candidate's journey to mastery.
- **Granular Milestones**: Each skill gap is broken into: *Basics → Advanced → Integration → Crown (Mastery)*.
- **Hover Timelines**: Interactive tooltips showing weekly progress targets.

### 2. **GitHub Intelligence Engine**
- **Deep Scraper**: Analyzes commit history, stars, project frequency, and language distribution.
- **Evidence Mapping**: Links claimed resume skills to actual code authored by the candidate.

### 3. **Unified Skill Matching**
- **Fit Accuracy (AI)**: A synchronized scoring system (powered by Groq) that provides a decimal-precise match percentage (e.g., 71.6%).
- **Interactive Skill Graph**: A concentric, evidence-backed network graph visualizing the candidate's proficiency.

### 4. **High-Performance Parallelism**
- Backend refactored with `ThreadPoolExecutor` to perform GitHub scraping and AI roadmap generation concurrently.
- Reduces processing time from **20 seconds to ~3 seconds**.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, CSS (Glassmorphism), SVG Animations |
| **Backend** | FastAPI (Python), ThreadPoolExecutor |
| **AI/LLM** | Groq (Llama-3.3-70b-versatile) |
| **Integrations** | GitHub Search API |

---

## 🚀 Setup & Installation

### **1. Prerequisites**
- Python 3.9+
- Node.js 16+
- A valid **Groq API Key**
- A **GitHub Personal Access Token** (optional, for higher rate limits)

### **2. Backend Setup**
```bash
# Navigate to backend directory
cd backend

# Create a .env file
echo "GROQ_API_KEY=your_key_here" > .env
echo "GITHUB_TOKEN=your_token_here" >> .env

# Install dependencies
pip install fastapi uvicorn groq python-dotenv requests sentence-transformers

# Run the server
python -m uvicorn main:app --reload --port 8001
```

### **3. Frontend Setup**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

---

## 🖥️ Usage Procedure

1.  **Recruiter View**: Create a job post with required skills (e.g., Python, PostgreSQL, Docker).
2.  **Candidate View**: 
    *   Upload a Resume (PDF).
    *   Provide a GitHub Username.
    *   Wait for the **Intelligence Audit** (approx. 3 seconds).
3.  **Review Intelligence**:
    *   Open the application to see the **Fit Accuracy**.
    *   Analyze the **Evidence Graph** to verify repositories.
    *   Explore the **Technical Odyssey** (Winding Road) to see the candidate's learning path.

---

## 🔒 Security
- **No API Leakage**: Credentials are stored exclusively in the backend `.env` and are never exposed to the client-side.
- **Sanitized Outputs**: AI results are parsed and validated into structured JSON before being served.

---

## 🤝 Contributors
Developed with ❤️ by **Antigravity AI** & **Surabhi M**.
