from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from github_scraper import GitHubScraper
from proofhire_skill_graph import SkillGraphEngine
from semantic_engine import SemanticSimilarityEngine
import os
import json
import requests
import pdfplumber
import re
import io
import logging
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("x") or os.environ.get("VITE_GROQ_API_KEY") or ""
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# Singletons
semantic_engine = SemanticSimilarityEngine()

def extract_text_from_pdf(pdf_content: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text: text += page_text + "\n"
    except Exception as e:
        logger.error(f"PDF Extraction Error: {e}")
    return text

def parse_resume_fallback(text: str) -> dict:
    """Basic regex fallback so recruiter always gets structured output."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    phone_match = re.search(r"(\+?\d[\d\-\s()]{8,}\d)", text)

    name = None
    for ln in lines[:8]:
        if not any(x in ln.lower() for x in ["resume", "curriculum", "vitae", "@", "http", "linkedin", "github"]):
            if 2 <= len(ln.split()) <= 5 and len(ln) <= 60:
                name = ln
                break

    cgpa = None
    cgpa_scale = None
    cgpa_match = re.search(r"(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:\/|out of)?\s*(\d+(?:\.\d+)?)?", text, re.I)
    if cgpa_match:
        cgpa = cgpa_match.group(1)
        cgpa_scale = cgpa_match.group(2) if cgpa_match.group(2) else None

    urls = []
    seen = set()
    for m in re.findall(r"(https?://[^\s)>\]]+)", text):
        clean = m.rstrip(".,;")
        if clean in seen:
            continue
        seen.add(clean)
        label = "Other"
        low = clean.lower()
        if "linkedin.com" in low:
            label = "LinkedIn"
        elif "github.com" in low:
            label = "GitHub"
        elif any(k in low for k in ["portfolio", "vercel.app", "netlify.app", ".dev"]):
            label = "Portfolio"
        urls.append({"label": label, "url": clean})

    github_username = None
    for u in urls:
        if "github.com/" in u["url"].lower():
            parts = u["url"].split("github.com/")[-1].split("/")
            if parts and parts[0]:
                github_username = parts[0]
                break

    common_skills = [
        "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI",
        "Django", "Flask", "SQL", "PostgreSQL", "MongoDB", "Docker", "Kubernetes",
        "AWS", "Git", "Machine Learning", "Data Structures", "C++", "HTML", "CSS"
    ]
    lower_text = text.lower()
    skills = [s for s in common_skills if s.lower().replace(".", "") in lower_text.replace(".", "")]

    return {
        "name": name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(1).strip() if phone_match else None,
        "cgpa": cgpa,
        "cgpa_scale": cgpa_scale,
        "skills": skills,
        "urls": urls,
        "confidence_score": 0.4,
        "github_username": github_username,
        "projects": [],
        "achievements": [],
        "certifications": []
    }

def parse_resume_with_groq(text: str) -> dict:
    if not GROQ_API_KEY:
        return parse_resume_fallback(text)

    system_prompt = """You are an advanced talent intelligence parser.
Extract:
- name, email, phone, location
- cgpa (as string), cgpa_scale (as string)
- skills (normalized, e.g. JS -> JavaScript, ML -> Machine Learning)
- confidence_score (0.0 - 1.0 for extraction quality)
- github_username (from URLs or handles)
- projects (with technologies used)
- urls as [{label, url}] from LinkedIn/GitHub/portfolio/other links
- achievements & certifications

Return ONLY valid JSON:
{
  "name": "...",
  "cgpa": "8.9",
  "cgpa_scale": "10.0",
  "skills": ["..."],
  "urls": [{"label": "GitHub", "url": "https://github.com/username"}],
  "confidence_score": 0.95,
  "github_username": "...",
  "projects": [{"title": "...", "tech": ["..."]}],
  "achievements": ["..."]
}
"""
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": text}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    
    try:
        resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=20)
        if resp.status_code == 200:
            parsed = json.loads(resp.json()["choices"][0]["message"]["content"])
            parsed.setdefault("skills", [])
            parsed.setdefault("projects", [])
            parsed.setdefault("achievements", [])
            parsed.setdefault("urls", [])
            return parsed
        logger.error(f"Groq parsing failed: status={resp.status_code}, body={resp.text[:200]}")
    except Exception as e:
        logger.error(f"Groq parsing error: {e}")
    return parse_resume_fallback(text)

def rank_projects(projects: List[dict], job_skills: List[str]) -> List[dict]:
    if not projects or not job_skills:
        return projects
    
    for project in projects:
        # Combine name, description, and topics for comparison
        content = f"{project.get('name', '')} {project.get('description', '')} {' '.join(project.get('inferred_skills', []))}"
        
        # Calculate max similarity across all job skills
        max_sim = 0
        for skill in job_skills:
            sim = semantic_engine.compare(content, skill)
            if sim > max_sim: max_sim = sim
        
        project["relevance_score"] = max_sim

    # Sort by relevance, then stars
    return sorted(projects, key=lambda x: (x.get("relevance_score", 0), x.get("stars", 0)), reverse=True)

@app.get("/")
async def root():
    return {"status": "ok", "message": "ProofHire API is running on port 8001"}

@app.post("/api/apply")
@app.post("/api/apply/")
async def apply(
    file: UploadFile = File(...),
    jobId: int = Form(...),
    jobTitle: str = Form(...),
    requiredSkills: str = Form(...),
    githubUrl: Optional[str] = Form(None)
):
    try:
        pdf_content = await file.read()
        text = extract_text_from_pdf(pdf_content)
        parsed_resume = parse_resume_with_groq(text)
        
        # Determine GitHub Username
        github_username = None
        if githubUrl:
            # Extract from URL
            match = re.search(r"github\.com/([A-Za-z0-9-]+)", githubUrl, re.IGNORECASE)
            if match: github_username = match.group(1)
            else: github_username = githubUrl.strip().split('/')[-1] # Fallback for just username or other formats
        
        if not github_username:
            github_username = parsed_resume.get("github_username")
            
        scraper = GitHubScraper(token=GITHUB_TOKEN)
        if not github_username and parsed_resume.get("name"):
            github_username = scraper.search_user_by_name(parsed_resume["name"])
        
        github_data = scraper.scrape_profile(github_username) if github_username else {}
        
        # Combine Skills
        try:
            job_skills = json.loads(requiredSkills)
        except:
            job_skills = [s.strip() for s in requiredSkills.split(",") if s.strip()]
            
        candidate_skills = list(set(parsed_resume.get("skills", [])) | set(github_data.get("top_skills", [])))
        
        # Rank Projects based on job skills
        if github_data and "projects" in github_data:
            github_data["projects"] = rank_projects(github_data["projects"], job_skills)
        
        # Analyze with SkillGraphEngine
        analysis = SkillGraphEngine.run(
            job_skills=job_skills,
            candidate_skills=candidate_skills,
            job_title=jobTitle,
            github_data=github_data,
            resume_cgpa=parsed_resume.get("cgpa")
        )
        
        return {
            "resumeData": {
                **parsed_resume,
                "achievements": parsed_resume.get("achievements", []),
                "certifications": parsed_resume.get("certifications", [])
            },
            "githubData": {
                **(github_data or {}),
                "graph": analysis["graph"],
                "explainability": analysis["explainability"],
                "gap_analysis": analysis["gap_analysis"],
                "language_repos_map": github_data.get("language_repos_map", {}),
                "projects": github_data.get("projects", [])
            },
            "success": True
        }
    except Exception as e:
        logger.error(f"Processing error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "detail": str(e)})

@app.get("/api/similarity")
async def get_similarity(skillA: str, skillB: str):
    score = semantic_engine.compare(skillA, skillB)
    return {
        "skillA": skillA,
        "skillB": skillB,
        "score": score,
        "similarity": "High" if score >= 0.7 else "Medium" if score >= 0.4 else "Low"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
