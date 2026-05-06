from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from github_scraper import GitHubScraper
from proofhire_skill_graph import SkillGraphEngine
import os
import json
import requests
import pdfplumber
import re
import io
from typing import List, Optional

app = FastAPI()

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration - Move API Key to Backend
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

def extract_text_from_pdf(pdf_content: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def parse_resume_with_groq(text: str) -> dict:
    system_prompt = """You are a resume parser. Extract information and return ONLY valid JSON with no markdown, no code blocks, no extra text.

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
  "projects": ["project or experience item 1", "project or experience item 2"],
  "github_username": "username or null"
}

Detect github_username from any GitHub URL found in the resume. 
If no explicit GitHub URL is found, check if a handle is mentioned (e.g. 'github: user123').
achievements must include both achievements AND certifications combined.
projects should include the candidate's most relevant resume projects if found.
Return ONLY valid JSON.
"""

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Parse this resume text:\n\n{text}"},
        ],
        "temperature": 0,
        "max_tokens": 1800,
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
            return json.loads(cleaned)
    except Exception as e:
        print(f"GROQ Parsing Error: {e}")
    return {}

@app.post("/api/apply")
async def apply_with_resume(
    file: UploadFile = File(...),
    jobId: str = Form(...),
    jobTitle: str = Form(...),
    requiredSkills: str = Form(...) # JSON string or comma separated
):
    try:
        # 1. Read and Extract PDF
        pdf_content = await file.read()
        resume_text = extract_text_from_pdf(pdf_content)
        
        # 2. Parse with GROQ (API Key is safe on backend)
        parsed_resume = parse_resume_with_groq(resume_text)
        
        # 3. Handle GitHub Scrape
        github_username = parsed_resume.get("github_username")
        github_data = None
        
        if github_username:
            scraper = GitHubScraper(token=GITHUB_TOKEN)
            github_data = scraper.scrape_profile(github_username)
        
        # 4. Prepare Job Skills for Analysis
        try:
            job_skills_list = json.loads(requiredSkills)
        except:
            job_skills_list = [s.strip() for s in requiredSkills.split(",") if s.strip()]
            
        candidate_skills = parsed_resume.get("skills", [])
        if github_data and github_data.get("top_skills"):
            candidate_skills = list(set(candidate_skills + github_data["top_skills"]))
            
        # 5. Run Skill Graph Analysis
        # The engine already handles MATCHED, MISSING, and EXTRA classification
        analysis_result = SkillGraphEngine.run(job_skills_list, candidate_skills)
        
        # 6. Final Combined Result
        return {
            "success": True,
            "resumeData": parsed_resume,
            "githubData": {
                **(github_data or {}),
                "graph": analysis_result["graph"],
                "explainability": analysis_result["explainability"],
                "gap_analysis": analysis_result["gap_analysis"]
            }
        }
        
    except Exception as e:
        print(f"Application Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
            
        analysis_result = SkillGraphEngine.run(job_skills_list, github_profile["top_skills"])
        
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
    Directly check similarity between two skills using the graph engine.
    Fulfills requirement 3: Python/Flask high, Java/Flask low.
    """
    try:
        # We run the engine with just these two skills to see if they link
        # This is a bit of a hack, but it works with the current architecture
        result = SkillGraphEngine.run([skillB], [skillA])
        nodes = result["graph"]["nodes"]
        
        # Check if skillB is matched with skillA
        skill_b_node = next((n for n in nodes if n["id"].lower() == skillB.lower()), None)
        
        score = 0.0
        reason = "No connection found"
        
        if skill_b_node:
            if skill_b_node["status"] == "MATCHED":
                score = 0.95
                reason = "Strong technical relationship / implication"
            elif skill_b_node.get("partial_match"):
                score = 0.6
                reason = "Indirect or partial relationship"
        
        # Fallback to simple token overlap if no graph path
        if score == 0:
            s1 = set(skillA.lower().split())
            s2 = set(skillB.lower().split())
            if s1 & s2:
                score = len(s1 & s2) / max(len(s1), len(s2))
                reason = "Partial token match"

        return {
            "skillA": skillA,
            "skillB": skillB,
            "score": score,
            "reason": reason
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
