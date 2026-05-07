from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from github_scraper import GitHubScraper
from proofhire_skill_graph import SkillGraphEngine
import os
import json
import requests
import pdfplumber
import re
import io
import logging
from typing import List, Optional
from dotenv import load_dotenv

# Load .env file
load_dotenv()

app = FastAPI()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration - Priority: Env Var > .env file
GROQ_API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("VITE_GROQ_API_KEY") or ""
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

logger.info(f"GROQ_API_KEY configured: {bool(GROQ_API_KEY)}")

def extract_text_from_pdf(pdf_content: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        logger.info(f"Extracted {len(text)} characters from PDF")
    except Exception as e:
        logger.error(f"PDF Extraction Error: {e}")
    return text

def parse_resume_with_groq(text: str) -> dict:
    if not GROQ_API_KEY:
        logger.error("No GROQ_API_KEY found")
        return {}

    system_prompt = """You are a highly accurate resume parser. Your goal is to extract EXACT skills and information. 
DO NOT hallucinate or simplify. If a candidate says 'Next.js', do not just say 'React'. 
Extract information and return ONLY valid JSON with no markdown, no code blocks, no extra text.

Return exactly this structure:
{
  "name": "Full name or null",
  "email": "email address or null",
  "phone": "phone number or null",
  "location": "location or null",
  "cgpa": "GPA/CGPA value as string or null",
  "cgpa_scale": "Scale like 4.0 or 10.0 or null",
  "skills": ["skill1", "skill2"],
  "urls": [{"label": "LinkedIn|GitHub|Portfolio|Other", "url": "https://..."}],
  "achievements": ["item1", "item2"],
  "projects": ["detailed project title and description", "another project"],
  "github_username": "username or null"
}

Detect github_username from any GitHub URL found in the resume. 
If no explicit GitHub URL is found, check if a handle is mentioned.
achievements must include both achievements AND certifications combined.
projects should include the candidate's most relevant resume projects with their context.
Return ONLY valid JSON.
"""

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
    }
    
    # User requested model
    requested_model = "openai/gpt-oss-120b"
    # Known working Groq fallback
    fallback_model = "llama-3.3-70b-versatile"
    
    models_to_try = [requested_model, fallback_model]
    
    for model in models_to_try:
        logger.info(f"Attempting parse with model: {model}")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Parse this resume text genuinely:\n\n{text}"},
            ],
            "temperature": 0.1,
            "max_tokens": 2000,
        }

        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30,
            )
            if response.status_code == 200:
                data = response.json()
                raw = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                cleaned = raw.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                logger.info(f"Successfully parsed resume with {model}")
                return parsed
            else:
                logger.warning(f"Model {model} failed with status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error with model {model}: {e}")
            
    return {}

@app.post("/api/apply")
async def apply(
    file: UploadFile = File(...),
    jobId: int = Form(...),
    jobTitle: str = Form(...),
    requiredSkills: str = Form(...)
):
    try:
        # 1. Extract text from PDF
        pdf_content = await file.read()
        text = extract_text_from_pdf(pdf_content)
        
        # 2. Extract info with LLM
        parsed_resume = parse_resume_with_groq(text)
        if not parsed_resume:
            logger.warning("Resume parsing returned empty result")
            parsed_resume = {"name": "Candidate", "skills": [], "github_username": None}
        
        # 3. Handle GitHub Scrape
        github_username = parsed_resume.get("github_username")
        candidate_name = parsed_resume.get("name")
        github_data = None
        
        scraper = GitHubScraper(token=GITHUB_TOKEN)
        
        if not github_username and candidate_name:
            logger.info(f"Username not found, searching GitHub for name: {candidate_name}")
            github_username = scraper.search_user_by_name(candidate_name)
            
        if github_username:
            logger.info(f"Scraping GitHub for: {github_username}")
            github_data = scraper.scrape_profile(github_username)
        else:
            logger.warning("No GitHub username found or resolved.")

        # 4. Skill Graph Analysis
        try:
            job_skills_list = json.loads(requiredSkills)
        except:
            job_skills_list = [s.strip() for s in requiredSkills.split(",") if s.strip()]

        resume_skills = parsed_resume.get("skills", [])
        github_skills = github_data.get("top_skills", []) if github_data else []
        
        # Combine skills for analysis
        candidate_skills = list(set(resume_skills) | set(github_skills))
        
        logger.info(f"Analyzing skills: Job({len(job_skills_list)}) vs Candidate({len(candidate_skills)})")
        
        # Run graph engine with GitHub evidence
        graph_result = SkillGraphEngine.run(
            job_skills=job_skills_list,
            candidate_skills=candidate_skills,
            job_title=jobTitle,
            github_data=github_data
        )
        
        # Structure final return
        return {
            "resumeData": parsed_resume,
            "githubData": {
                **(github_data or {}),
                "graph": graph_result.get("graph"),
                "explainability": graph_result.get("explainability"),
                "gap_analysis": graph_result.get("gap_analysis")
            },
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Application Processing Error: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e), "success": False})

@app.post("/api/github/{username}")
async def get_github_data_only(username: str, jobSkills: str = Form(...)):
    try:
        scraper = GitHubScraper(token=GITHUB_TOKEN)
        github_profile = scraper.scrape_profile(username)
        
        if "error" in github_profile:
            raise HTTPException(status_code=404, detail=github_profile["error"])
            
        try:
            job_skills_list = json.loads(jobSkills)
        except:
            job_skills_list = [s.strip() for s in jobSkills.split(",") if s.strip()]
            
        analysis_result = SkillGraphEngine.run(
            job_skills_list, 
            github_profile["top_skills"],
            github_data=github_profile
        )
        
        return {
            **github_profile,
            "graph": analysis_result["graph"],
            "explainability": analysis_result["explainability"],
            "gap_analysis": analysis_result["gap_analysis"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/similarity")
async def get_similarity(skillA: str, skillB: str):
    """
    Checks semantic similarity between two skills using the graph engine.
    Fulfills requirement 3: Python/Flask high, Java/Flask low.
    """
    try:
        engine = SkillGraphEngine()
        # Ingest both to build the graph
        engine.ingest([skillA], [skillB])
        
        # Check for direct or indirect paths in the full ontology
        score = 0.0
        reason = "No connection found"
        
        # 1. Direct path u -> v (Prerequisite/Implication)
        if nx.has_path(engine.G, skillA, skillB) or nx.has_path(engine.G, skillB, skillA):
            dist = nx.shortest_path_length(engine.G.to_undirected(), skillA, skillB)
            score = max(0.0, 1.0 - (dist * 0.15))
            reason = f"Direct technical relationship found (distance {dist})"
            
        # 2. Shared parents (Siblings like Flask/Django)
        if score == 0:
            parentsA = set(engine.G.predecessors(skillA))
            parentsB = set(engine.G.predecessors(skillB))
            if parentsA & parentsB:
                score = 0.7
                reason = f"Shared domain/category: {list(parentsA & parentsB)[0]}"
                
        # 3. Fallback to token overlap
        if score == 0:
            s1 = set(skillA.lower().split())
            s2 = set(skillB.lower().split())
            overlap = s1 & s2
            if overlap:
                score = len(overlap) / max(len(s1), len(s2))
                reason = "Partial keyword overlap"

        return {
            "skillA": skillA,
            "skillB": skillB,
            "score": round(score, 2),
            "similarity": "High" if score >= 0.7 else "Medium" if score >= 0.4 else "Low",
            "explanation": reason
        }
    except Exception as e:
        logger.error(f"Similarity Check Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
