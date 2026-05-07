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

GROQ_API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("VITE_GROQ_API_KEY") or ""
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

def parse_resume_with_groq(text: str) -> dict:
    if not GROQ_API_KEY: return {}

    system_prompt = """You are an advanced talent intelligence parser. 
Extract:
- name, email, phone, location
- skills (normalized, e.g. JS -> JavaScript, ML -> Machine Learning)
- confidence_score (0.0 - 1.0 for extraction quality)
- github_username (from URLs or handles)
- projects (with technologies used)
- achievements & certifications

Return ONLY valid JSON:
{
  "name": "...",
  "skills": ["..."],
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
            return json.loads(resp.json()["choices"][0]["message"]["content"])
    except Exception as e:
        logger.error(f"Groq parsing error: {e}")
    return {}

@app.get("/")
async def root():
    return {"status": "ok", "message": "ProofHire API is running on port 8001"}

@app.post("/api/apply")
@app.post("/api/apply/")
async def apply(
    file: UploadFile = File(...),
    jobId: int = Form(...),
    jobTitle: str = Form(...),
    requiredSkills: str = Form(...)
):
    try:
        pdf_content = await file.read()
        text = extract_text_from_pdf(pdf_content)
        parsed_resume = parse_resume_with_groq(text)
        
        # Scrape GitHub
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
        
        # Analyze with SkillGraphEngine
        analysis = SkillGraphEngine.run(
            job_skills=job_skills,
            candidate_skills=candidate_skills,
            job_title=jobTitle,
            github_data=github_data
        )
        
        return {
            "resumeData": parsed_resume,
            "githubData": {
                **(github_data or {}),
                "graph": analysis["graph"],
                "explainability": analysis["explainability"],
                "gap_analysis": analysis["gap_analysis"]
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
