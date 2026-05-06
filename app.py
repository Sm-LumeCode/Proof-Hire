import html
import json
import os
import re
from collections import defaultdict

import pdfplumber
import requests
import streamlit as st

from github_scraper import GitHubScraper

# REPLACE THESE WITH YOUR ACTUAL API KEYS OR SET ENV VARS
GROQ_API_KEY = os.environ.get(
    "GROQ_API_KEY",
    "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",
)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

st.set_page_config(page_title="Proof-Hire Portal", layout="wide")

st.markdown(
    """
<style>
    :root {
        --bg: #07111f;
        --panel: #0c1728;
        --panel-2: #0f1d31;
        --card: rgba(12, 23, 40, 0.9);
        --border: rgba(148, 163, 184, 0.14);
        --text: #e6edf7;
        --muted: #8ca0ba;
        --accent: #2dd4bf;
        --accent-2: #f59e0b;
        --success: #22c55e;
        --danger: #ef4444;
        --shadow: 0 24px 50px rgba(2, 8, 23, 0.28);
    }
    html, body, [data-testid="stAppViewContainer"], .stApp {
        background:
            radial-gradient(circle at top left, rgba(45, 212, 191, 0.15), transparent 28%),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 24%),
            linear-gradient(180deg, #07111f 0%, #091524 100%);
        color: var(--text);
    }
    [data-testid="stHeader"] { background: transparent; }
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, rgba(9, 19, 33, 0.95), rgba(7, 17, 31, 0.98));
        border-right: 1px solid var(--border);
    }
    section[data-testid="stSidebar"] * { color: var(--text) !important; }
    .block-container { padding-top: 2rem; padding-bottom: 2rem; }
    h1, h2, h3 {
        color: var(--text);
        letter-spacing: -0.02em;
    }
    .hero-card, .panel-card, .metric-card, .project-card, .skill-chip-row, .status-banner {
        border: 1px solid var(--border);
        background: var(--card);
        box-shadow: var(--shadow);
        border-radius: 22px;
    }
    .hero-card {
        padding: 34px;
        background:
            linear-gradient(135deg, rgba(45, 212, 191, 0.12), rgba(15, 29, 49, 0.88)),
            linear-gradient(180deg, rgba(15, 29, 49, 0.92), rgba(12, 23, 40, 0.94));
    }
    .hero-kicker {
        color: var(--accent);
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-weight: 700;
        margin-bottom: 12px;
    }
    .hero-title {
        font-size: 2.8rem;
        line-height: 1.04;
        font-weight: 700;
        max-width: 12ch;
        margin-bottom: 16px;
    }
    .hero-copy {
        color: var(--muted);
        font-size: 1rem;
        max-width: 60ch;
        line-height: 1.7;
    }
    .metric-card {
        padding: 18px 20px;
        min-height: 110px;
        background: linear-gradient(180deg, rgba(15, 29, 49, 0.92), rgba(8, 17, 31, 0.94));
    }
    .metric-label {
        color: var(--muted);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-weight: 700;
    }
    .metric-value {
        font-size: 1.9rem;
        font-weight: 700;
        margin-top: 8px;
        color: var(--text);
    }
    .metric-sub {
        color: var(--muted);
        font-size: 0.85rem;
        margin-top: 10px;
    }
    .portal-option {
        padding: 30px;
        min-height: 280px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background:
            linear-gradient(180deg, rgba(15, 29, 49, 0.95), rgba(8, 17, 31, 0.98)),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 30%);
    }
    .portal-icon {
        width: 56px;
        height: 56px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        background: rgba(45, 212, 191, 0.12);
        border: 1px solid rgba(45, 212, 191, 0.25);
        font-size: 1.5rem;
        margin-bottom: 22px;
    }
    .portal-title {
        font-size: 1.65rem;
        font-weight: 700;
        margin-bottom: 10px;
    }
    .portal-copy {
        color: var(--muted);
        line-height: 1.65;
        margin-bottom: 12px;
    }
    .panel-card {
        padding: 24px;
        margin-bottom: 18px;
        background: linear-gradient(180deg, rgba(15, 29, 49, 0.94), rgba(10, 21, 35, 0.96));
    }
    .section-kicker {
        color: var(--accent-2);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.72rem;
        font-weight: 700;
        margin-bottom: 8px;
    }
    .section-title {
        font-size: 1.4rem;
        font-weight: 700;
        margin-bottom: 8px;
    }
    .section-copy {
        color: var(--muted);
        line-height: 1.65;
        font-size: 0.94rem;
    }
    .skill-chip-row {
        padding: 16px 18px;
        background: rgba(8, 17, 31, 0.55);
        margin-top: 12px;
    }
    .skill-chip {
        display: inline-block;
        padding: 7px 12px;
        margin: 4px 6px 0 0;
        border-radius: 999px;
        background: rgba(45, 212, 191, 0.12);
        border: 1px solid rgba(45, 212, 191, 0.18);
        color: #dffdf8;
        font-size: 0.82rem;
    }
    .project-card {
        padding: 18px;
        margin-bottom: 12px;
        background: linear-gradient(180deg, rgba(13, 26, 43, 0.92), rgba(9, 19, 33, 0.96));
    }
    .project-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 6px;
    }
    .project-copy {
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.6;
    }
    .mini-pill {
        display: inline-block;
        margin: 8px 8px 0 0;
        padding: 6px 10px;
        font-size: 0.74rem;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.08);
        border: 1px solid rgba(148, 163, 184, 0.12);
        color: #d9e5f4;
    }
    .status-banner {
        padding: 16px 18px;
        margin-bottom: 14px;
        background: rgba(8, 17, 31, 0.72);
    }
    .status-badge {
        display: inline-block;
        padding: 7px 12px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
    }
    .status-pending { background: rgba(245, 158, 11, 0.14); color: #fbbf24; }
    .status-hired { background: rgba(34, 197, 94, 0.14); color: #4ade80; }
    .status-rejected { background: rgba(239, 68, 68, 0.14); color: #fca5a5; }
    div[data-testid="stForm"], div[data-testid="stExpander"] {
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(12, 23, 40, 0.72);
    }
    div[data-testid="stExpander"] { overflow: hidden; }
    .stTabs [data-baseweb="tab-list"] {
        gap: 10px;
        margin-bottom: 1rem;
    }
    .stTabs [data-baseweb="tab"] {
        background: rgba(15, 29, 49, 0.7);
        border: 1px solid var(--border);
        border-radius: 999px;
        color: var(--text);
        padding: 8px 16px;
    }
    .stTabs [aria-selected="true"] {
        background: rgba(45, 212, 191, 0.14) !important;
        border-color: rgba(45, 212, 191, 0.28) !important;
        color: #dffdf8 !important;
    }
    .stButton > button, .stDownloadButton > button {
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(45, 212, 191, 0.2);
        background: linear-gradient(135deg, #2dd4bf, #0ea5a4);
        color: #04111b;
        font-weight: 700;
        min-height: 2.8rem;
    }
    .stButton > button:hover, .stDownloadButton > button:hover {
        border-color: rgba(45, 212, 191, 0.3);
        color: #04111b;
    }
    .stTextInput input, .stTextArea textarea, .stFileUploader section {
        border-radius: 14px !important;
    }
    .stTextInput input, .stTextArea textarea {
        background: rgba(7, 17, 31, 0.92) !important;
        color: var(--text) !important;
        border: 1px solid rgba(148, 163, 184, 0.16) !important;
    }
    .stMarkdown a {
        color: var(--accent);
        text-decoration: none;
    }
    .stAlert {
        border-radius: 16px;
    }
</style>
""",
    unsafe_allow_html=True,
)


if "current_view" not in st.session_state:
    st.session_state.current_view = "Landing Page"
if "jobs" not in st.session_state:
    st.session_state.jobs = []
if "applications" not in st.session_state:
    st.session_state.applications = []
if "current_user" not in st.session_state:
    st.session_state.current_user = None


def parse_resume_groq(text, api_key):
    system_prompt = """You are a resume parser. Extract information and return ONLY valid JSON with no markdown, no code blocks, no extra text.

Return exactly this structure:
{
  "name": "Full name or null",
  "cgpa": "GPA/CGPA value as string or null",
  "cgpa_scale": "Scale like 4.0 or 10.0 or null",
  "skills": ["skill1", "skill2"],
  "urls": [{"label": "LinkedIn|GitHub|Portfolio|Other", "url": "https://..."}],
  "achievements": ["item1", "item2"],
  "projects": ["project or experience item 1", "project or experience item 2"]
}

achievements must include both achievements AND certifications combined.
projects should include the candidate's most relevant resume projects if found.
If a field is not found, use null or an empty array."""

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Parse this resume:\n\n" + text},
        ],
        "temperature": 0,
        "max_tokens": 1800,
    }

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=120,
    )
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


def normalize_skill(skill):
    return re.sub(r"[^a-z0-9.#+\s]", "", (skill or "").lower()).strip()


def extract_github_username(parsed_resume, resume_text):
    url_candidates = []
    if parsed_resume and parsed_resume.get("urls"):
        url_candidates.extend([item.get("url", "") for item in parsed_resume["urls"] if item.get("url")])

    url_candidates.extend(re.findall(r"https?://(?:www\.)?github\.com/[A-Za-z0-9-]+(?:/[A-Za-z0-9_.-]+)?", resume_text))
    url_candidates.extend(re.findall(r"github\.com/[A-Za-z0-9-]+(?:/[A-Za-z0-9_.-]+)?", resume_text, re.IGNORECASE))

    for url in url_candidates:
        match = re.search(r"github\.com/([A-Za-z0-9-]+)", url, re.IGNORECASE)
        if match:
            return match.group(1)

    handle_match = re.search(r"(?:github|git hub)[:\s]+@?([A-Za-z0-9-]{1,39})", resume_text, re.IGNORECASE)
    if handle_match:
        return handle_match.group(1)

    return None


def render_skill_chips(skills, empty_message="No skills found."):
    if not skills:
        st.caption(empty_message)
        return
    chips = "".join(
        f"<span class='skill-chip'>{html.escape(skill)}</span>"
        for skill in skills
    )
    st.markdown(f"<div class='skill-chip-row'>{chips}</div>", unsafe_allow_html=True)


def build_github_skill_evidence(github_data):
    evidence_map = defaultdict(list)
    if not github_data or "error" in github_data:
        return {}

    for project in github_data.get("projects", []):
        repo_entry = {
            "name": project.get("name"),
            "full_name": project.get("full_name"),
            "url": project.get("url"),
            "stars": project.get("stars", 0),
        }

        for language in (project.get("languages") or {}).keys():
            evidence = dict(repo_entry)
            evidence["match_type"] = "Language"
            evidence["language"] = language
            evidence_map[normalize_skill(language)].append(evidence)

        for topic in project.get("topics") or []:
            evidence = dict(repo_entry)
            evidence["match_type"] = "Topic"
            evidence_map[normalize_skill(topic)].append(evidence)

    deduped = {}
    for key, values in evidence_map.items():
        seen = set()
        cleaned = []
        for value in values:
            repo_key = (value.get("full_name"), value.get("match_type"), value.get("language"))
            if repo_key in seen:
                continue
            seen.add(repo_key)
            cleaned.append(value)
        deduped[key] = cleaned
    return deduped


def embed_hey_html(candidate_skills, required_skills, github_data=None):
    with open("hey.html", "r", encoding="utf-8") as file:
        html_content = file.read()

    graph_context = {
        "candidateSkills": candidate_skills,
        "requiredSkills": required_skills,
        "apiKey": GROQ_API_KEY or "",
        "evidenceMap": build_github_skill_evidence(github_data),
    }
    html_content = html_content.replace("__GRAPH_CONTEXT__", json.dumps(graph_context))
    st.components.v1.html(html_content, height=760, scrolling=False)


def render_metric_card(label, value, subtext):
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">{html.escape(label)}</div>
            <div class="metric-value">{html.escape(str(value))}</div>
            <div class="metric-sub">{html.escape(subtext)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_job_card(job, applied=False):
    skill_html = "".join(
        f"<span class='mini-pill'>{html.escape(skill)}</span>"
        for skill in job["required_skills"]
    )
    footer = "Already applied" if applied else "Open role"
    st.markdown(
        f"""
        <div class="panel-card">
            <div class="section-kicker">Hiring Need</div>
            <div class="section-title">{html.escape(job['title'])}</div>
            <div class="section-copy">Review the role requirements and candidate fit evidence in one place.</div>
            <div style="margin-top:12px;">{skill_html}</div>
            <div style="margin-top:16px;color:var(--muted);font-size:0.82rem;">{footer}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_projects(projects, section_title="Projects & Repositories"):
    st.markdown(
        f"<div class='section-title' style='margin-top:4px;margin-bottom:14px;'>{html.escape(section_title)}</div>",
        unsafe_allow_html=True,
    )
    if not projects:
        st.caption("No GitHub repositories were found for this candidate yet.")
        return

    for project in projects[:6]:
        topics = project.get("topics") or []
        languages = list((project.get("languages") or {}).keys())[:4]
        pills = []
        if project.get("is_collaboration"):
            pills.append("Collaboration")
        if project.get("stars") is not None:
            pills.append(f"{project.get('stars', 0)} stars")
        if project.get("forks") is not None:
            pills.append(f"{project.get('forks', 0)} forks")
        if project.get("personal_contribution", {}).get("commit_count"):
            pills.append(f"{project['personal_contribution']['commit_count']} commits")

        pill_html = "".join(f"<span class='mini-pill'>{html.escape(item)}</span>" for item in pills)
        tech_html = "".join(
            f"<span class='mini-pill'>{html.escape(item)}</span>"
            for item in (languages + topics[:4])
        )
        description = project.get("description") or "No description provided for this repository."
        repo_url = project.get("url")
        deployment_url = project.get("deployment_url")
        links = []
        if repo_url:
            links.append(f"<a href='{html.escape(repo_url)}' target='_blank'>Repository</a>")
        if deployment_url:
            links.append(f"<a href='{html.escape(deployment_url)}' target='_blank'>Live Demo</a>")
        links_html = " · ".join(links) if links else "No public links available"

        st.markdown(
            f"""
            <div class="project-card">
                <div class="project-title">{html.escape(project.get('full_name') or project.get('name') or 'Repository')}</div>
                <div class="project-copy">{html.escape(description)}</div>
                <div style="margin-top:10px;">{pill_html}</div>
                <div style="margin-top:10px;">{tech_html}</div>
                <div style="margin-top:12px;font-size:0.84rem;">{links_html}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def get_combined_candidate_skills(app):
    candidate_skills = set(app.get("parsed_resume", {}).get("skills", []) if app.get("parsed_resume") else [])
    if app.get("github_data") and app["github_data"].get("top_skills"):
        candidate_skills.update(app["github_data"]["top_skills"])
    return sorted(candidate_skills, key=str.lower)


def render_application_overview(app, job):
    parsed_resume = app.get("parsed_resume") or {}
    github_data = app.get("github_data") or {}
    combined_skills = get_combined_candidate_skills(app)

    st.markdown(
        f"""
        <div class="status-banner">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
                <div>
                    <div class="section-kicker">Candidate Snapshot</div>
                    <div class="section-title" style="margin-bottom:0;">{html.escape(app['name'])}</div>
                    <div class="section-copy">{html.escape(app['email'])}</div>
                </div>
                <div>
                    <span class="status-badge status-{app['status'].lower()}">{html.escape(app['status'])}</span>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        render_metric_card("Resume Skills", len(parsed_resume.get("skills") or []), "Skills parsed from resume")
    with col2:
        render_metric_card("GitHub Skills", len(github_data.get("top_skills") or []), "Top languages and topics found")
    with col3:
        render_metric_card("Repos Analyzed", len(github_data.get("projects") or []), "Projects used as public evidence")

    st.markdown("<div class='panel-card'>", unsafe_allow_html=True)
    st.markdown("<div class='section-kicker'>Role Fit</div>", unsafe_allow_html=True)
    st.markdown("<div class='section-title'>Matched vs missing requirements</div>", unsafe_allow_html=True)

    req_skills = job["required_skills"]
    req_skills_lower = {normalize_skill(skill) for skill in req_skills}
    cand_skills_lower = {normalize_skill(skill) for skill in combined_skills}
    matched = [skill for skill in req_skills if normalize_skill(skill) in cand_skills_lower]
    missing = [skill for skill in req_skills if normalize_skill(skill) not in cand_skills_lower]

    mcol, xcol = st.columns(2)
    with mcol:
        st.success("Matched: " + (", ".join(matched) if matched else "None"))
    with xcol:
        st.error("Missing: " + (", ".join(missing) if missing else "None"))

    st.markdown("</div>", unsafe_allow_html=True)

    detail_col1, detail_col2 = st.columns([1, 1])
    with detail_col1:
        st.markdown("<div class='section-title' style='margin-bottom:10px;'>Resume extracted skills</div>", unsafe_allow_html=True)
        render_skill_chips(parsed_resume.get("skills") or [], "No resume skills found.")
        if parsed_resume.get("projects"):
            st.markdown("<div class='section-title' style='margin:18px 0 10px;'>Resume projects</div>", unsafe_allow_html=True)
            for project in parsed_resume["projects"][:5]:
                st.markdown(
                    f"<div class='project-card'><div class='project-copy'>{html.escape(project)}</div></div>",
                    unsafe_allow_html=True,
                )
    with detail_col2:
        st.markdown("<div class='section-title' style='margin-bottom:10px;'>GitHub top skills</div>", unsafe_allow_html=True)
        render_skill_chips(github_data.get("top_skills") or [], "No GitHub skill evidence found.")
        if app.get("github_username"):
            st.markdown(
                f"<div class='panel-card' style='margin-top:14px;'><div class='section-kicker'>GitHub Profile</div><div class='section-copy'>Username: <strong>{html.escape(app['github_username'])}</strong></div></div>",
                unsafe_allow_html=True,
            )

    st.markdown("<div class='section-title' style='margin-top:22px;margin-bottom:10px;'>Profile links</div>", unsafe_allow_html=True)
    urls = parsed_resume.get("urls") or []
    if urls:
        link_cols = st.columns(min(len(urls), 4))
        for index, url_item in enumerate(urls[:4]):
            with link_cols[index]:
                st.link_button(
                    url_item.get("label", "Link"),
                    url_item.get("url", "#"),
                    use_container_width=True,
                )
    else:
        st.caption("No profile links were found in the resume.")

    st.markdown("<div class='panel-card'>", unsafe_allow_html=True)
    st.markdown("<div class='section-kicker'>GitHub Summary</div>", unsafe_allow_html=True)
    if github_data and "error" not in github_data:
        g1, g2, g3, g4 = st.columns(4)
        with g1:
            render_metric_card("Contributions", github_data.get("contributions", {}).get("total_count", 0), "Commits, PRs, and issues")
        with g2:
            render_metric_card("Public Repos", github_data.get("public_repos", 0), "Visible repositories")
        with g3:
            render_metric_card("Followers", github_data.get("followers", 0), "Public profile reach")
        with g4:
            render_metric_card("Total Stars", github_data.get("total_stars", 0), "Stars across owned repos")
    elif github_data and "error" in github_data:
        st.error(f"GitHub Error: {github_data['error']}")
    else:
        st.info("No GitHub profile could be verified from the resume.")
    st.markdown("</div>", unsafe_allow_html=True)

    render_projects(github_data.get("projects") or [])

    st.markdown("<div class='section-title' style='margin-top:18px;margin-bottom:10px;'>Knowledge graph</div>", unsafe_allow_html=True)
    embed_hey_html(combined_skills, job["required_skills"], github_data)


st.sidebar.title("Proof-Hire")
st.sidebar.caption("Professional screening workspace")
if st.session_state.current_view != "Landing Page":
    if st.sidebar.button("Home / Switch Portal", use_container_width=True):
        st.session_state.current_view = "Landing Page"
        st.rerun()


if st.session_state.current_view == "Landing Page":
    st.markdown(
        """
        <div class="hero-card">
            <div class="hero-kicker">Proof-Hire Platform</div>
            <div class="hero-title">Evaluate talent with proof, not guesswork.</div>
            <div class="hero-copy">
                A polished hiring portal for recruiters and candidates. Recruiters get resume insights,
                GitHub evidence, project visibility, and a skill graph that explains why a candidate fits.
                Candidates get a cleaner application flow with GitHub detected directly from the resume.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    spacer1, stat1, stat2, stat3 = st.columns([0.1, 1, 1, 1])
    with stat1:
        render_metric_card("Open Roles", len(st.session_state.jobs), "Roles currently listed")
    with stat2:
        render_metric_card("Applications", len(st.session_state.applications), "Candidate submissions tracked")
    with stat3:
        render_metric_card("Evidence Ready", sum(1 for app in st.session_state.applications if app.get("github_data")), "Applications with GitHub analysis")

    st.write("")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(
            """
            <div class="portal-option panel-card">
                <div>
                    <div class="portal-icon">👔</div>
                    <div class="portal-title">Recruiter Workspace</div>
                    <div class="portal-copy">
                        Create roles, review candidate fit, inspect public GitHub repositories,
                        and make hire or reject decisions from a single workspace.
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button("Open Recruiter Portal", use_container_width=True, key="btn_rec"):
            st.session_state.current_view = "Recruiter Portal"
            st.rerun()
    with col2:
        st.markdown(
            """
            <div class="portal-option panel-card">
                <div>
                    <div class="portal-icon">💼</div>
                    <div class="portal-title">Candidate Workspace</div>
                    <div class="portal-copy">
                        Apply with just your resume, let the system detect your GitHub automatically,
                        and track application status in a more polished dashboard.
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button("Open Candidate Portal", use_container_width=True, key="btn_cand"):
            st.session_state.current_view = "Candidate Portal"
            st.rerun()

elif st.session_state.current_view == "Recruiter Portal":
    st.markdown(
        """
        <div class="hero-card" style="padding:28px;">
            <div class="hero-kicker">Recruiter Portal</div>
            <div class="section-title" style="font-size:2rem;margin-bottom:8px;">Hiring dashboard with visual proof of fit</div>
            <div class="section-copy">Post roles, inspect resume skills, GitHub repositories, and evidence-backed skill matches before making a decision.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    m1, m2, m3 = st.columns(3)
    with m1:
        render_metric_card("Roles", len(st.session_state.jobs), "Active job postings")
    with m2:
        render_metric_card("Applicants", len(st.session_state.applications), "Total candidates in pipeline")
    with m3:
        hired_count = sum(1 for app in st.session_state.applications if app["status"] == "Hired")
        render_metric_card("Hired", hired_count, "Candidates marked hired")

    tab1, tab2 = st.tabs(["Create Job Posting", "Review Applicants"])

    with tab1:
        st.markdown(
            """
            <div class="panel-card">
                <div class="section-kicker">New Role</div>
                <div class="section-title">Create a clear, skills-first job posting</div>
                <div class="section-copy">Use concise skill requirements so the fit graph can compare candidate evidence more accurately.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        with st.form("job_form"):
            title = st.text_input("Job Title")
            req_skills = st.text_area("Required Skills (comma separated)", placeholder="Python, FastAPI, SQL, Docker")
            submit = st.form_submit_button("Post Job")
            if submit:
                if title and req_skills:
                    st.session_state.jobs.append(
                        {
                            "id": len(st.session_state.jobs) + 1,
                            "title": title,
                            "required_skills": [skill.strip() for skill in req_skills.split(",") if skill.strip()],
                        }
                    )
                    st.success("Job posted successfully.")
                else:
                    st.error("Please fill in both the title and required skills.")

        st.markdown("<div class='section-title' style='margin-top:18px;margin-bottom:10px;'>Active Job Postings</div>", unsafe_allow_html=True)
        if not st.session_state.jobs:
            st.info("No jobs posted yet.")
        else:
            for job in st.session_state.jobs:
                render_job_card(job)

    with tab2:
        st.markdown(
            """
            <div class="panel-card">
                <div class="section-kicker">Applicant Review</div>
                <div class="section-title">Compare resume claims with GitHub-backed proof</div>
                <div class="section-copy">Each application now includes repositories, skill evidence, and a graph that can show public GitHub proof on hover.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if not st.session_state.jobs:
            st.info("Post at least one job to start reviewing applicants.")
        elif not st.session_state.applications:
            st.info("No applications yet.")
        else:
            for idx, app in enumerate(st.session_state.applications):
                job = next((item for item in st.session_state.jobs if item["id"] == app["job_id"]), None)
                if not job:
                    continue
                title = f"{app['name']} • {job['title']} • {app['status']}"
                with st.expander(title, expanded=False):
                    render_application_overview(app, job)
                    if app["status"] == "Pending":
                        action_col1, action_col2 = st.columns(2)
                        with action_col1:
                            if st.button("Mark as Hired", key=f"hire_{idx}"):
                                st.session_state.applications[idx]["status"] = "Hired"
                                st.rerun()
                        with action_col2:
                            if st.button("Reject Candidate", key=f"reject_{idx}"):
                                st.session_state.applications[idx]["status"] = "Rejected"
                                st.rerun()

elif st.session_state.current_view == "Candidate Portal":
    st.markdown(
        """
        <div class="hero-card" style="padding:28px;">
            <div class="hero-kicker">Candidate Portal</div>
            <div class="section-title" style="font-size:2rem;margin-bottom:8px;">Apply using your resume and let the platform do the extraction</div>
            <div class="section-copy">No separate GitHub username field needed. Upload your resume, and we will try to detect your GitHub profile from the resume links or text.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.session_state.current_user is None:
        st.markdown(
            """
            <div class="panel-card">
                <div class="section-kicker">Candidate Login</div>
                <div class="section-title">Start with basic contact details</div>
                <div class="section-copy">Your GitHub profile will be extracted later during application processing from the uploaded resume.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        with st.form("login_form"):
            name = st.text_input("Full Name")
            email = st.text_input("Email Address")
            login = st.form_submit_button("Continue")
            if login:
                if name and email:
                    st.session_state.current_user = {"name": name, "email": email}
                    st.rerun()
                else:
                    st.error("Please fill in your name and email.")
    else:
        st.markdown(
            f"""
            <div class="status-banner">
                <div class="section-kicker">Signed In</div>
                <div class="section-title" style="margin-bottom:6px;">Welcome, {html.escape(st.session_state.current_user['name'])}</div>
                <div class="section-copy">{html.escape(st.session_state.current_user['email'])}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button("Logout"):
            st.session_state.current_user = None
            st.rerun()

        user_apps = [
            app
            for app in st.session_state.applications
            if app["email"] == st.session_state.current_user["email"]
        ]

        t1, t2 = st.tabs(["Available Jobs", "My Applications"])

        with t1:
            if not st.session_state.jobs:
                st.info("No jobs available right now.")
            else:
                for job in st.session_state.jobs:
                    has_applied = any(app["job_id"] == job["id"] for app in user_apps)
                    render_job_card(job, applied=has_applied)
                    if has_applied:
                        st.info("You have already applied for this job.")
                    else:
                        with st.expander(f"Apply for {job['title']}"):
                            pdf_file = st.file_uploader(
                                "Upload Resume (PDF)",
                                type=["pdf"],
                                key=f"resume_{job['id']}",
                            )
                            if st.button("Submit Application", key=f"submit_{job['id']}"):
                                if not GROQ_API_KEY:
                                    st.error("Please configure `GROQ_API_KEY` to process resumes.")
                                elif not pdf_file:
                                    st.error("Please upload a resume.")
                                else:
                                    with st.spinner("Extracting resume content..."):
                                        resume_text = extract_text_from_pdf(pdf_file)
                                        parsed_resume = parse_resume_groq(resume_text, GROQ_API_KEY)
                                        github_username = extract_github_username(parsed_resume, resume_text)

                                    github_data = None
                                    if github_username:
                                        with st.spinner(f"Fetching GitHub evidence for @{github_username}..."):
                                            scraper = GitHubScraper(token=GITHUB_TOKEN if GITHUB_TOKEN else None)
                                            github_data = scraper.scrape_profile(github_username)
                                    else:
                                        st.warning("No GitHub username was detected in the resume. The application was submitted without GitHub evidence.")

                                    st.session_state.applications.append(
                                        {
                                            "job_id": job["id"],
                                            "name": st.session_state.current_user["name"],
                                            "email": st.session_state.current_user["email"],
                                            "github": github_username or "Not found in resume",
                                            "github_username": github_username,
                                            "resume_text": resume_text,
                                            "parsed_resume": parsed_resume,
                                            "github_data": github_data,
                                            "status": "Pending",
                                        }
                                    )
                                    st.success("Application submitted successfully.")
                                    st.rerun()

        with t2:
            if not user_apps:
                st.info("You haven't applied to any jobs yet.")
            else:
                for app in user_apps:
                    job = next((item for item in st.session_state.jobs if item["id"] == app["job_id"]), None)
                    if not job:
                        continue
                    st.markdown(
                        f"""
                        <div class="status-banner">
                            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
                                <div>
                                    <div class="section-kicker">Application</div>
                                    <div class="section-title" style="margin-bottom:4px;">{html.escape(job['title'])}</div>
                                    <div class="section-copy">GitHub: {html.escape(app.get('github_username') or 'Not detected from resume')}</div>
                                </div>
                                <div><span class="status-badge status-{app['status'].lower()}">{html.escape(app['status'])}</span></div>
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                    with st.expander("View application details"):
                        render_application_overview(app, job)
