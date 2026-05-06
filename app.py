import streamlit as st
import json
import requests
import os
import urllib.parse
import pdfplumber
from github_scraper import GitHubScraper

# REPLACE THESE WITH YOUR ACTUAL API KEYS
GROQ_API_KEY = "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"
GITHUB_TOKEN = ""

st.set_page_config(page_title="Proof-Hire Portal", layout="wide")

# Custom CSS for Premium Look
st.markdown("""
<style>
    body { background-color: #0a0c10; color: #e2e8f0; }
    .stApp { background-color: #0a0c10; }
    h1, h2, h3 { color: #f59e0b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .stButton>button { background-color: #f59e0b; color: #0a0c10; border-radius: 5px; border: none; font-weight: bold; }
    .stButton>button:hover { background-color: #fbbf24; }
    .stTextInput>div>div>input, .stTextArea>div>div>textarea { background-color: #10141a; color: #e2e8f0; border: 1px solid #1e2530; }
    .job-card { background: #10141a; border: 1px solid #1e2530; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .status-badge { padding: 5px 10px; border-radius: 5px; font-weight: bold; font-size: 0.8rem; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-hired { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
</style>
""", unsafe_allow_html=True)

# State Management
if 'current_view' not in st.session_state:
    st.session_state.current_view = "Landing Page"
if 'jobs' not in st.session_state:
    st.session_state.jobs = [] # list of dicts: id, title, required_skills
if 'applications' not in st.session_state:
    st.session_state.applications = [] # list of dicts: job_id, name, email, github, resume_text, parsed_resume, github_data, status
if 'current_user' not in st.session_state:
    st.session_state.current_user = None

def parse_resume_groq(text, api_key):
    system_prompt = '''You are a resume parser. Extract information and return ONLY valid JSON with no markdown, no code blocks, no extra text.

Return exactly this structure:
{
  "name": "Full name or null",
  "cgpa": "GPA/CGPA value as string or null",
  "cgpa_scale": "Scale like 4.0 or 10.0 or null",
  "skills": ["skill1", "skill2"],
  "urls": [{"label": "LinkedIn|GitHub|Portfolio|Other", "url": "https://..."}],
  "achievements": ["item1", "item2"]
}

achievements must include both achievements AND certifications combined.
If a field is not found, use null or an empty array.'''

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Parse this resume:\n\n" + text}
        ],
        "temperature": 0,
        "max_tokens": 1500
    }
    
    response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
    if response.status_code == 200:
        data = response.json()
        raw = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None
    return None

def extract_text_from_pdf(pdf_file):
    text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def embed_hey_html(candidate_skills, required_skills):
    with open("hey.html", "r") as f:
        html_content = f.read()
    
    # We replace the default values in the HTML so it renders with the correct data
    html_content = html_content.replace('value="Flask, PostgreSQL, React, Docker"', f'value="{", ".join(candidate_skills)}"')
    html_content = html_content.replace('value="Python, SQL, JavaScript, Kubernetes, Django"', f'value="{", ".join(required_skills)}"')
    if GROQ_API_KEY:
        html_content = html_content.replace('placeholder="gsk_..."', f'value="{GROQ_API_KEY}"')
        
    st.components.v1.html(html_content, height=800, scrolling=True)


# Sidebar Navigation
st.sidebar.title("Proof-Hire")
if st.session_state.current_view != "Landing Page":
    if st.sidebar.button("🏠 Home / Switch Portal", use_container_width=True):
        st.session_state.current_view = "Landing Page"
        st.rerun()

# Landing Page
if st.session_state.current_view == "Landing Page":
    st.markdown("<h1 style='text-align: center; font-size: 3rem; margin-top: 50px;'>Welcome to Proof-Hire</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #94a3b8; font-size: 1.2rem;'>Select your portal to continue</p>", unsafe_allow_html=True)
    
    st.write("<br><br>", unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns([1, 4, 4, 1])
    with col2:
        st.markdown("""
        <div class="job-card" style="text-align: center; padding: 40px; height: 100%;">
            <h2 style="font-size: 2rem;">👨‍💼 Recruiter</h2>
            <p style="color: #94a3b8; margin-bottom: 30px;">Create jobs and evaluate candidates with AI insights.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Enter Recruiter Portal", use_container_width=True, key="btn_rec"):
            st.session_state.current_view = "Recruiter Portal"
            st.rerun()
            
    with col3:
        st.markdown("""
        <div class="job-card" style="text-align: center; padding: 40px; height: 100%;">
            <h2 style="font-size: 2rem;">🧑‍💻 Candidate</h2>
            <p style="color: #94a3b8; margin-bottom: 30px;">Apply for jobs and track your application status.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Enter Candidate Portal", use_container_width=True, key="btn_cand"):
            st.session_state.current_view = "Candidate Portal"
            st.rerun()

elif st.session_state.current_view == "Recruiter Portal":
    st.title("👨‍💼 Recruiter Portal")
    
    tab1, tab2 = st.tabs(["Create Job Posting", "View Applicants"])
    
    with tab1:
        st.subheader("Create a New Job")
        with st.form("job_form"):
            title = st.text_input("Job Title")
            req_skills = st.text_area("Required Skills (comma separated)")
            submit = st.form_submit_button("Post Job")
            if submit:
                if title and req_skills:
                    st.session_state.jobs.append({
                        "id": len(st.session_state.jobs) + 1,
                        "title": title,
                        "required_skills": [s.strip() for s in req_skills.split(",") if s.strip()]
                    })
                    st.success("Job posted successfully!")
                else:
                    st.error("Please fill all fields.")
                    
        st.subheader("Active Job Postings")
        for job in st.session_state.jobs:
            st.markdown(f"""
            <div class="job-card">
                <h3>{job['title']}</h3>
                <p><b>Required Skills:</b> {", ".join(job['required_skills'])}</p>
            </div>
            """, unsafe_allow_html=True)
            
    with tab2:
        st.subheader("Applicants")
        if not st.session_state.jobs:
            st.info("No jobs posted yet.")
        else:
            if st.session_state.applications:
                for idx, app in enumerate(st.session_state.applications):
                    job = next((j for j in st.session_state.jobs if j['id'] == app['job_id']), None)
                    if not job: continue
                    with st.expander(f"{app['name']} applied for {job['title']} - Status: {app['status']}"):
                        st.write(f"**Email:** {app['email']}")
                        st.write(f"**GitHub:** {app['github']}")
                        
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.write("### Resume Extracted Skills")
                            if app['parsed_resume'] and app['parsed_resume'].get('skills'):
                                for s in app['parsed_resume']['skills']:
                                    st.write(f"- {s}")
                            else:
                                st.write("No skills found.")
                        with col2:
                            st.write("### GitHub Top Skills")
                            if app['github_data'] and app['github_data'].get('top_skills'):
                                for s in app['github_data']['top_skills']:
                                    st.write(f"- {s}")
                            else:
                                st.write("No data.")
                        with col3:
                            st.write("### Skill Match Analysis")
                            cand_skills = set(app['parsed_resume'].get('skills', []) if app['parsed_resume'] else [])
                            if app['github_data'] and app['github_data'].get('top_skills'):
                                cand_skills.update(app['github_data']['top_skills'])
                            req_skills = set(job['required_skills'])
                            
                            cand_skills_lower = {s.lower().strip() for s in cand_skills}
                            req_skills_lower = {s.lower().strip() for s in req_skills}
                            
                            matched_lower = req_skills_lower.intersection(cand_skills_lower)
                            missing_lower = req_skills_lower - cand_skills_lower
                            
                            matched = [s for s in req_skills if s.lower().strip() in matched_lower]
                            missing = [s for s in req_skills if s.lower().strip() in missing_lower]
                            
                            st.success(f"Matched: {', '.join(matched) if matched else 'None'}")
                            st.error(f"Missing: {', '.join(missing) if missing else 'None'}")
                            
                        st.write("### Profile Links")
                        if app['parsed_resume'] and app['parsed_resume'].get('urls'):
                            url_cols = st.columns(len(app['parsed_resume']['urls']))
                            for i, u in enumerate(app['parsed_resume']['urls']):
                                with url_cols[i]:
                                    st.link_button(f"🔗 {u.get('label', 'Link')}", u.get('url', '#'), use_container_width=True)
                        else:
                            st.write("No URLs found in resume.")
                            
                        st.write("### GitHub Summary")
                        if app['github_data'] and 'error' not in app['github_data']:
                            st.write(f"Total Contributions: {app['github_data'].get('contributions', {}).get('total_count', 0)}")
                            st.write(f"Public Repos: {app['github_data'].get('public_repos', 0)}")
                            st.write(f"Total Stars: {app['github_data'].get('total_stars', 0)}")
                        elif app['github_data'] and 'error' in app['github_data']:
                            st.error(f"GitHub Error: {app['github_data']['error']}")
                            
                        st.write("### Knowledge Graph")
                        all_cand_skills = list(cand_skills)
                        embed_hey_html(all_cand_skills, job['required_skills'])
                        
                        if app['status'] == 'Pending':
                            colA, colB = st.columns(2)
                            with colA:
                                if st.button("Hire", key=f"hire_{idx}"):
                                    st.session_state.applications[idx]['status'] = 'Hired'
                                    st.rerun()
                            with colB:
                                if st.button("Reject", key=f"rej_{idx}"):
                                    st.session_state.applications[idx]['status'] = 'Rejected'
                                    st.rerun()

elif st.session_state.current_view == "Candidate Portal":
    st.title("🧑‍💻 Candidate Portal")
    
    if st.session_state.current_user is None:
        st.subheader("Login to Apply")
        with st.form("login_form"):
            name = st.text_input("Full Name")
            email = st.text_input("Email Address")
            github = st.text_input("GitHub Username")
            login = st.form_submit_button("Login")
            if login:
                if name and email and github:
                    st.session_state.current_user = {"name": name, "email": email, "github": github}
                    st.rerun()
                else:
                    st.error("Please fill all fields to login.")
    else:
        st.subheader(f"Welcome, {st.session_state.current_user['name']}!")
        if st.button("Logout"):
            st.session_state.current_user = None
            st.rerun()
            
        user_apps = [app for app in st.session_state.applications if app['email'] == st.session_state.current_user['email']]
        
        tab1, tab2 = st.tabs(["Available Jobs", "My Applications"])
        
        with tab1:
            if not st.session_state.jobs:
                st.info("No jobs available right now.")
            else:
                for job in st.session_state.jobs:
                    # Check if already applied
                    has_applied = any(a['job_id'] == job['id'] for a in user_apps)
                    
                    st.markdown(f"""
                    <div class="job-card">
                        <h3>{job['title']}</h3>
                        <p><b>Required Skills:</b> {", ".join(job['required_skills'])}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    if has_applied:
                        st.info("You have already applied for this job.")
                    else:
                        with st.expander(f"Apply for {job['title']}"):
                            pdf_file = st.file_uploader("Upload Resume (PDF)", type=["pdf"], key=f"resume_{job['id']}")
                            if st.button("Submit Application", key=f"submit_{job['id']}"):
                                if not GROQ_API_KEY:
                                    st.error("Please insert your GROQ_API_KEY at the top of app.py to process the resume.")
                                elif pdf_file:
                                    with st.spinner("Parsing resume..."):
                                        text = extract_text_from_pdf(pdf_file)
                                        parsed = parse_resume_groq(text, GROQ_API_KEY)
                                        
                                    with st.spinner("Scraping GitHub..."):
                                        scraper = GitHubScraper(token=GITHUB_TOKEN if GITHUB_TOKEN else None)
                                        gh_data = scraper.scrape_profile(st.session_state.current_user['github'])
                                        
                                    st.session_state.applications.append({
                                        "job_id": job['id'],
                                        "name": st.session_state.current_user['name'],
                                        "email": st.session_state.current_user['email'],
                                        "github": st.session_state.current_user['github'],
                                        "resume_text": text,
                                        "parsed_resume": parsed,
                                        "github_data": gh_data,
                                        "status": "Pending"
                                    })
                                    st.success("Application submitted successfully!")
                                    st.rerun()
                                else:
                                    st.error("Please upload a resume.")
                                    
        with tab2:
            if not user_apps:
                st.info("You haven't applied to any jobs yet.")
            else:
                for app in user_apps:
                    job = next((j for j in st.session_state.jobs if j['id'] == app['job_id']), None)
                    if not job: continue
                    status_class = f"status-{app['status'].lower()}"
                    st.markdown(f"""
                    <div class="job-card">
                        <h3>{job['title']}</h3>
                        <p>Status: <span class="status-badge {status_class}">{app['status']}</span></p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    with st.expander("View Knowledge Graph"):
                        cand_skills = set(app['parsed_resume'].get('skills', []) if app['parsed_resume'] else [])
                        if app['github_data']:
                            cand_skills.update(app['github_data'].get('top_skills', []))
                        embed_hey_html(list(cand_skills), job['required_skills'])
