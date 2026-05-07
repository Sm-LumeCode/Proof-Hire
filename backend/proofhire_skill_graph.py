"""
ProofHire: Knowledge Graph & Skill Intelligence Layer
=====================================================
Production-grade implementation using a hybrid static-ontology + dynamic
inference model.  NetworkX is used for graph construction and all graph
algorithms (centrality, shortest-path, ancestor traversal).

Pipeline
--------
1. Load static ontology  → defines domain hierarchy + tech-stack edges
2. Ingest candidate & job skill lists
3. Classify nodes        → MATCHED / MISSING / EXTRA
4. Enrich edges          → DEPENDENCY / DOMAIN / STACK / INFERRED
5. Score nodes           → impact, criticality, learnability
6. Gap intelligence      → affected downstream nodes, priority ranking
7. Explainability        → fit score, narrative, learning path
8. Serialise to JSON     → frontend-ready payload
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field, asdict
from typing import Any

import networkx as nx

# ─────────────────────────────────────────────────────────────────────────────
# 1.  STATIC ONTOLOGY  (hybrid approach – static backbone, dynamic edges later)
# ─────────────────────────────────────────────────────────────────────────────

# Each tuple: (parent, child, edge_type, weight)
# edge_type: DEPENDENCY | DOMAIN | STACK | SIBLING
ONTOLOGY_EDGES: list[tuple[str, str, str, float]] = [
    # ── Python ecosystem ──────────────────────────────────────────────────
    ("Programming",      "Python",       "DOMAIN",      1.0),
    ("Programming",      "Java",         "DOMAIN",      1.0),
    ("Programming",      "C++",          "DOMAIN",      1.0),
    ("Programming",      "Go",           "DOMAIN",      1.0),
    ("Python",          "Flask",        "DEPENDENCY",  0.95),
    ("Python",          "Django",       "DEPENDENCY",  0.95),
    ("Python",          "FastAPI",      "DEPENDENCY",  0.95),
    ("Python",          "Pandas",       "DEPENDENCY",  0.85),
    ("Python",          "PyTorch",      "DEPENDENCY",  0.85),
    ("Java",            "Spring",       "DEPENDENCY",  0.95),
    ("Java",            "Hibernate",    "DEPENDENCY",  0.85),
    ("JavaScript",      "React",        "DEPENDENCY",  0.95),
    ("JavaScript",      "Vue",          "DEPENDENCY",  0.95),
    ("JavaScript",      "Node.js",      "DEPENDENCY",  0.95),
    ("TypeScript",      "React",        "DEPENDENCY",  0.95),
    ("React",           "Next.js",      "DEPENDENCY",  0.95),
    ("Node.js",         "Express",      "DEPENDENCY",  0.95),
    ("Backend",         "Python",       "STACK",       0.7),
    ("Backend",         "Java",         "STACK",       0.7),
    ("Backend",         "Node.js",      "STACK",       0.7),
    ("Flask",           "Django",       "SIBLING",     0.6),
    ("React",           "Vue",          "SIBLING",     0.6),
    ("PostgreSQL",      "MySQL",        "SIBLING",     0.6),
    ("Backend",         "SQL",          "DOMAIN",      1.0),
    ("SQL",             "PostgreSQL",   "DEPENDENCY",  0.9),
    ("SQL",             "MySQL",        "DEPENDENCY",  0.9),
    ("Backend",         "NoSQL",        "DOMAIN",      1.0),
    ("NoSQL",           "MongoDB",      "DEPENDENCY",  0.9),
    ("NoSQL",           "Redis",        "DEPENDENCY",  0.8),
    ("DevOps",          "Docker",       "DOMAIN",      1.0),
    ("Docker",          "Kubernetes",   "DEPENDENCY",  0.9),
    ("DevOps",          "AWS",          "DOMAIN",      0.9),
    ("AWS",             "Lambda",       "DEPENDENCY",  0.8),
    ("AWS",             "S3",           "DEPENDENCY",  0.8),
    ("Cloud",           "Docker",       "STACK",       0.7),
    ("Flask",           "REST API",     "STACK",       0.9),
    ("Spring",          "REST API",     "STACK",       0.9),
    ("FastAPI",         "REST API",     "STACK",       0.95),
    ("REST API",        "OpenAPI",      "DEPENDENCY",  0.80),
    ("REST API",        "JWT",          "STACK",       0.75),
    ("Data Analysis",   "Pandas",       "STACK",       0.9),
    ("Machine Learning","PyTorch",      "STACK",       0.9),
    ("Machine Learning","TensorFlow",   "STACK",       0.9),
]

# Learnability score  [0, 1]  – 1 = easy to pick up
LEARNABILITY: dict[str, float] = {
    "Git":         0.90, "GitHub":      0.85, "SQL":         0.80,
    "Python":      0.85, "HTML":        0.95, "CSS":         0.85,
    "REST API":    0.75, "Docker":      0.65, "Flask":       0.80,
    "Django":      0.70, "FastAPI":     0.75, "NumPy":       0.80,
    "Pandas":      0.78, "Scikit-Learn":0.72, "Machine Learning":0.55,
    "Deep Learning":0.45,"PyTorch":     0.55, "TensorFlow":  0.55,
    "NLP":         0.45, "Kubernetes":  0.40, "AWS":         0.55,
    "PostgreSQL":  0.70, "MongoDB":     0.72, "Redis":       0.68,
    "React":       0.65, "TypeScript":  0.70, "Next.js":     0.60,
    "CI/CD":       0.60, "GitHub Actions":0.65,"OpenAPI":    0.70,
    "JWT":         0.72, "Docker Compose":0.70,
}

# Domain importance weights (used when computing node criticality)
DOMAIN_WEIGHTS: dict[str, float] = {
    "Programming": 1.0, "Backend": 0.95, "DevOps": 0.85,
    "Frontend": 0.80,  "Data": 0.90,    "Engineering": 0.90,
    "Machine Learning": 0.90,
}

# ─────────────────────────────────────────────────────────────────────────────
# 2.  DATA CLASSES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SkillNode:
    id: str
    label: str
    status: str              # MATCHED | MISSING | EXTRA | DOMAIN | UNKNOWN
    domain: str = "General"
    depth: int = 0           # depth from root in ontology
    learnability: float = 0.5
    centrality: float = 0.0  # betweenness centrality in full graph
    impact_score: float = 0.0
    gap_priority: float = 0.0
    downstream_count: int = 0
    skill_match: float = 0.0      # New: 0-100 skill match score
    github_evidence: float = 0.0  # New: 0-100 github evidence score
    github_metrics: dict[str, Any] = field(default_factory=lambda: {
        "total_repos": 0,
        "total_stars": 0,
        "deployed_apps": False
    })
    matched_alternatives: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SkillEdge:
    source: str
    target: str
    edge_type: str           # DEPENDENCY | DOMAIN | STACK | SIBLING | INFERRED
    weight: float = 1.0
    is_gap_path: bool = False  # True if this edge connects to a gap node


# ─────────────────────────────────────────────────────────────────────────────
# 3.  GRAPH ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class SkillGraphEngine:
    """
    Core engine.  Builds, enriches, scores, and serialises the skill graph.

    Design choices
    ──────────────
    •  Directed graph (DiGraph): edges model dependency direction.
    •  Hybrid ontology:
        – Static backbone loaded from ONTOLOGY_EDGES for known skill relations.
        – Dynamic inference adds INFERRED edges between semantically similar
          skills when no static edge exists (via simple token overlap; in
          production replace with embedding cosine similarity).
    •  Scoring uses PageRank + betweenness centrality for structural importance,
       combined with a domain-weighted gap penalty and learnability discount.
    """

    def __init__(self) -> None:
        self.G: nx.DiGraph = nx.DiGraph()
        self._build_ontology()

    # ── 3a. Ontology Loading ─────────────────────────────────────────────

    def _build_ontology(self) -> None:
        for (src, tgt, etype, w) in ONTOLOGY_EDGES:
            self.G.add_edge(src, tgt,
                            edge_type=etype,
                            weight=w,
                            is_gap_path=False)
        # Annotate depth (BFS from root-like nodes with in-degree 0)
        roots = [n for n, d in self.G.in_degree() if d == 0]
        for root in roots:
            for node in nx.descendants(self.G, root) | {root}:
                try:
                    d = nx.shortest_path_length(self.G, root, node)
                except nx.NetworkXNoPath:
                    d = 99
                cur = self.G.nodes[node].get("depth", 99)
                self.G.nodes[node]["depth"] = min(cur, d)

    # ── 3b. Skill Ingestion & Classification ─────────────────────────────

    def ingest(self, job_skills: list[str], candidate_skills: list[str], job_title: str = "Target Role", github_data: dict = None) -> None:
        """
        Classify every skill mentioned in job or candidate lists.
        Handles variations and semantic similarity.
        """
        self.github_raw = github_data or {}
        job_set = {s.strip().lower() for s in job_skills}
        cand_set = {s.strip().lower() for s in candidate_skills}
        
        # Skill normalization
        norm_map = {
            "py": "python", "python3": "python", "js": "javascript", "ts": "typescript",
            "golang": "go", "postgres": "postgresql", "reactjs": "react", "nextjs": "next.js",
            "nodejs": "node.js", "springboot": "spring boot", "mongodb": "mongo"
        }
        
        def normalize(s):
            s = s.lower().strip()
            return norm_map.get(s, s)

        job_norm = {normalize(s) for s in job_set}
        cand_norm = {normalize(s) for s in cand_set}
        all_skills_raw = set(job_skills) | set(candidate_skills)

        # Add central Job Role node
        job_role = job_title 
        if job_role not in self.G.nodes:
            self.G.add_node(job_role, status="JOB_ROLE", label=job_role)
        
        # Project mapping from GitHub
        project_skills = {}
        if github_data and "projects" in github_data:
            for p in github_data["projects"]:
                langs = p.get("languages", {})
                for l in langs:
                    l_norm = normalize(l)
                    if l_norm not in project_skills: project_skills[l_norm] = []
                    project_skills[l_norm].append(p["name"])

        for skill_raw in all_skills_raw:
            skill = skill_raw.strip()
            skill_low = skill.lower()
            skill_n = normalize(skill_low)
            
            if skill not in self.G.nodes:
                self.G.add_node(skill, label=skill)
                self._infer_edges(skill)

            is_matched = False
            is_partial = False
            
            if skill_low in job_set and skill_low in cand_set:
                is_matched = True
            elif skill_n in job_norm and skill_n in cand_norm:
                is_matched = True
            
            if skill_low in job_set and not is_matched:
                for c_skill in candidate_skills:
                    c_n = normalize(c_skill.lower())
                    try:
                        if nx.has_path(self.G, skill_n, c_n) or nx.has_path(self.G, c_n, skill_n):
                            is_matched = True
                            break
                    except: pass

            status = "MATCHED" if is_matched else "MISSING" if skill_low in job_set else "EXTRA"
            self.G.nodes[skill]["status"] = status
            
            # Attach actual GitHub evidence to matching nodes
            if is_matched and skill_n in project_skills:
                self.G.nodes[skill]["github_metrics"] = {
                    "total_repos": len(project_skills[skill_n]),
                    "projects": project_skills[skill_n],
                    "total_commits": github_data.get("contributions", {}).get("total_commits", 0)
                }

            if skill_low in job_set:
                self.G.add_edge(job_role, skill, edge_type="CORE_REQUIREMENT", weight=1.0)

        self.job_skills = job_set
        self.candidate_skills = cand_set
        self.job_title = job_title

    def compute_scores(self) -> None:
        """
        Compute per-node scores with more granularity to avoid binary fit_score.
        """
        ug = self.G.to_undirected()
        centrality = nx.betweenness_centrality(ug, normalized=True, weight="weight")
        try:
            pr = nx.pagerank(self.G, weight="weight", alpha=0.85)
        except:
            pr = {n: 1/len(self.G) for n in self.G.nodes}

        for node in self.G.nodes:
            data = self.G.nodes[node]
            if data.get("status") == "JOB_ROLE":
                continue
                
            rank = pr.get(node, 0.0)
            c = centrality.get(node, 0.0)
            
            # Base impact starts at 0.1 to avoid 0% issues
            impact = round(0.15 + 0.35 * rank + 0.5 * c, 4)
            
            is_matched = data.get("status") == "MATCHED"
            
            # Skill match is now a combination of extraction and evidence
            gh_m = data.get("github_metrics", {})
            repo_count = gh_m.get("total_repos", 0)
            
            skill_match = 0.0
            if is_matched:
                skill_match = 70.0 + (min(repo_count, 5) * 6) # Up to 100
            elif data.get("status") == "MISSING":
                skill_match = 10.0 + (c * 50)
            
            github_evidence = min(repo_count * 20, 100) if is_matched else 0.0

            data.update({
                "impact_score":     impact,
                "skill_match":      round(skill_match, 1),
                "github_evidence":  github_evidence,
                "github_metrics":   gh_m or {"total_repos": 0, "total_stars": 0}
            })

    def explain(self) -> dict[str, Any]:
        """
        Improved fit_score: not just binary. Partial matches and domain relevance contribute.
        """
        matched = [n for n, d in self.G.nodes(data=True) if d.get("status") == "MATCHED"]
        
        # We calculate fit based on the 'impact_score' of matched nodes vs total required impact
        job_req_nodes = [n for n in self.G.nodes if n.lower() in self.job_skills]
        
        total_potential = sum(self.G.nodes[n].get("impact_score", 0.5) for n in job_req_nodes)
        actual_score = sum(self.G.nodes[n].get("impact_score", 0.5) for n in matched if n.lower() in self.job_skills)
        
        # Add 5% for 'EXTRA' skills that are highly relevant
        extra_relevant = [n for n, d in self.G.nodes(data=True) if d.get("status") == "EXTRA" and d.get("impact_score", 0) > 0.3]
        actual_score += len(extra_relevant) * 0.05
        
        fit_score = min(actual_score / max(total_potential, 1e-6), 1.0)
        fit_score = round(fit_score, 4)

        if self.job_title in self.G.nodes:
            self.G.nodes[self.job_title]["fit_score"] = fit_score

        return {
            "fit_score": fit_score,
            "fit_grade": self._grade(fit_score),
            "narrative": self._narrative(fit_score, matched, [], [], []),
        }

        # Mark gap paths
        for (u, v, edata) in self.G.edges(data=True):
            u_missing = self.G.nodes[u].get("status") == "MISSING"
            v_missing = self.G.nodes[v].get("status") == "MISSING"
            edata["is_gap_path"] = bool(u_missing or v_missing)

    # ── 3d. Gap Intelligence ─────────────────────────────────────────────

    def gap_analysis(self) -> dict[str, Any]:
        """
        For each MISSING skill:
        1. Identify all downstream job skills affected (missing cascades)
        2. Identify the skills the candidate already has that are prerequisites
        3. Compute bridging path from candidate skills to missing skill
        4. Rank by gap_priority
        """
        missing = [
            n for n, d in self.G.nodes(data=True)
            if d.get("status") == "MISSING"
        ]
        gaps = []

        for skill in missing:
            data = self.G.nodes[skill]

            # Prerequisites the candidate already has (ancestors ∩ candidate)
            try:
                ancestors = nx.ancestors(self.G, skill)
            except Exception:
                ancestors = set()
            prereqs_met = list(ancestors & self.candidate_skills)
            prereqs_missing = list(ancestors & self.job_skills - self.candidate_skills - {skill})

            # Downstream job skills blocked by this gap
            try:
                desc = nx.descendants(self.G, skill)
            except Exception:
                desc = set()
            blocked = list(desc & self.job_skills - self.candidate_skills)

            # Learning path: shortest path from any candidate skill to this skill
            learning_path: list[str] = []
            ug = self.G.to_undirected()
            for cand_skill in sorted(prereqs_met):
                try:
                    path = nx.shortest_path(ug, cand_skill, skill, weight=lambda u, v, d: 1 - d.get("weight", 0.5))
                    if not learning_path or len(path) < len(learning_path):
                        learning_path = path
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    continue

            gaps.append({
                "skill":            skill,
                "gap_priority":     data.get("gap_priority", 0.0),
                "impact_score":     data.get("impact_score", 0.0),
                "learnability":     data.get("learnability", 0.5),
                "prereqs_met":      prereqs_met,
                "prereqs_missing":  prereqs_missing,
                "downstream_blocked": blocked,
                "learning_path":    learning_path,
            })

        gaps.sort(key=lambda x: x["gap_priority"], reverse=True)
        return {"gaps": gaps, "total_missing": len(missing)}

    # ── 3e. Explainability ───────────────────────────────────────────────

    def explain(self) -> dict[str, Any]:
        """
        Produce structured natural-language-ready explanation payload.
        """
        matched = [n for n, d in self.G.nodes(data=True) if d.get("status") == "MATCHED"]
        missing = [n for n, d in self.G.nodes(data=True) if d.get("status") == "MISSING"]
        extra   = [n for n, d in self.G.nodes(data=True) if d.get("status") == "EXTRA"]

        # Fit score: weighted by impact of matched vs total required
        total_impact = sum(
            self.G.nodes[n].get("impact_score", 0)
            for n in self.job_skills if n in self.G.nodes
        )
        matched_impact = sum(
            self.G.nodes[n].get("impact_score", 0)
            for n in matched if n in self.job_skills
        )
        fit_score = round(matched_impact / max(total_impact, 1e-6), 4)

        # Update Job Role node with the overall fit score
        if self.job_title in self.G.nodes:
            self.G.nodes[self.job_title]["fit_score"] = fit_score

        # Top contributing matched skills
        top_matched = sorted(
            [{"skill": n, "impact": self.G.nodes[n].get("impact_score", 0)} for n in matched],
            key=lambda x: x["impact"], reverse=True
        )[:5]

        # Critical missing (top 3 by gap_priority)
        top_missing = sorted(
            [{"skill": n, "gap_priority": self.G.nodes[n].get("gap_priority", 0)} for n in missing],
            key=lambda x: x["gap_priority"], reverse=True
        )[:3]

        # Transferable skills (EXTRA that are adjacent to MISSING in graph)
        transferable = []
        for extra_skill in extra:
            neighbors = set(self.G.successors(extra_skill)) | set(self.G.predecessors(extra_skill))
            adjacent_missing = neighbors & set(missing)
            if adjacent_missing:
                transferable.append({
                    "skill": extra_skill,
                    "bridges_to": list(adjacent_missing)
                })

        return {
            "fit_score":        fit_score,
            "fit_grade":        self._grade(fit_score),
            "matched_count":    len(matched),
            "missing_count":    len(missing),
            "extra_count":      len(extra),
            "top_matched_skills": top_matched,
            "critical_gaps":    top_missing,
            "transferable_skills": transferable,
            "narrative": self._narrative(fit_score, matched, missing, extra, transferable),
        }

    def _grade(self, score: float) -> str:
        if score >= 0.85: return "STRONG FIT"
        if score >= 0.65: return "GOOD FIT"
        if score >= 0.45: return "PARTIAL FIT"
        return "WEAK FIT"

    def _narrative(self, fit: float, matched, missing, extra, transferable) -> str:
        lines = [
            f"Candidate achieves a {round(fit*100, 1)}% weighted skill fit against the job requirements.",
            f"They directly match {len(matched)} of {len(self.job_skills)} required skills.",
        ]
        if missing:
            lines.append(f"Key gaps include: {', '.join(missing[:3])}.")
        if transferable:
            skills = [t['skill'] for t in transferable[:2]]
            lines.append(f"Candidate's experience in {', '.join(skills)} provides a foundation to bridge these gaps.")
        if extra:
            lines.append(f"Additional skills ({', '.join(list(extra)[:3])}) may indicate broader engineering versatility.")
        return " ".join(lines)

    # ── 3f. Serialisation ────────────────────────────────────────────────

    def to_json(self) -> dict[str, Any]:
        """
        Serialise the subgraph (relevant nodes only) to a frontend-ready
        JSON payload.  Filters out pure DOMAIN nodes with no job/candidate
        relevance to keep the graph manageable.
        """
        relevant = set(self.job_skills) | set(self.candidate_skills)
        # Also include 1-hop neighbours of relevant nodes for context
        for skill in list(relevant):
            if skill in self.G:
                relevant |= set(self.G.successors(skill))
                relevant |= set(self.G.predecessors(skill))

        nodes_out = []
        for n in relevant:
            if n not in self.G:
                continue
            d = self.G.nodes[n]
            nodes_out.append({
                "id":               n,
                "label":            n,
                "status":           d.get("status", "UNKNOWN"),
                "label":            d.get("label", n),
                "fit_score_val":    d.get("fit_score", 0.0),
                "domain":           d.get("domain", "General"),
                "depth":            d.get("depth", 3),
                "learnability":     d.get("learnability", 0.5),
                "centrality":       d.get("centrality", 0.0),
                "impact_score":     d.get("impact_score", 0.0),
                "gap_priority":     d.get("gap_priority", 0.0),
                "downstream_count": d.get("downstream_count", 0),
                "pagerank":         d.get("pagerank", 0.0),
                "skill_match":      d.get("skill_match", 0.0),
                "github_evidence":  d.get("github_evidence", 0.0),
                "github_metrics":   d.get("github_metrics", {}),
            })

        edges_out = []
        for (u, v, edata) in self.G.edges(data=True):
            if u in relevant and v in relevant:
                edges_out.append({
                    "source":       u,
                    "target":       v,
                    "edge_type":    edata.get("edge_type", "UNKNOWN"),
                    "weight":       edata.get("weight", 1.0),
                    "is_gap_path":  edata.get("is_gap_path", False),
                })

        gap_data   = self.gap_analysis()
        explain    = self.explain()

        return {
            "graph": {
                "nodes": nodes_out,
                "edges": edges_out,
            },
            "gap_analysis": gap_data,
            "explainability": explain,
            "metadata": {
                "job_skills":       list(self.job_skills),
                "candidate_skills": list(self.candidate_skills),
                "total_graph_nodes": self.G.number_of_nodes(),
                "total_graph_edges": self.G.number_of_edges(),
                "subgraph_nodes":   len(nodes_out),
                "subgraph_edges":   len(edges_out),
            }
        }

    # ── 3g. Full Pipeline ────────────────────────────────────────────────

    @classmethod
    def run(cls,
            job_skills: list[str],
            candidate_skills: list[str],
            job_title: str = "Target Role",
            github_data: dict = None) -> dict[str, Any]:
        engine = cls()
        engine.ingest(job_skills, candidate_skills, job_title=job_title, github_data=github_data)
        engine.compute_scores()
        return engine.to_json()


# ─────────────────────────────────────────────────────────────────────────────
# 4.  SAMPLE WALKTHROUGH
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    JOB_SKILLS       = ["Python", "Flask", "REST API", "Docker"]
    CANDIDATE_SKILLS = ["Python", "Django", "SQL", "Git"]

    result = SkillGraphEngine.run(JOB_SKILLS, CANDIDATE_SKILLS)

    print("=" * 60)
    print("PROOFHIRE · SKILL GRAPH OUTPUT")
    print("=" * 60)

    meta = result["metadata"]
    print(f"\nGraph:  {meta['subgraph_nodes']} nodes  |  {meta['subgraph_edges']} edges")
    print(f"   Full ontology: {meta['total_graph_nodes']} nodes, {meta['total_graph_edges']} edges")

    expl = result["explainability"]
    print(f"\nFit Score : {expl['fit_score']*100:.1f}%  ->  {expl['fit_grade']}")
    print(f"   Matched  : {expl['matched_count']}")
    print(f"   Missing  : {expl['missing_count']}")
    print(f"   Extra    : {expl['extra_count']}")
    print(f"\nNarrative:\n   {expl['narrative']}")

    print(f"\nCritical Gaps (ranked by impact):")
    for g in expl["critical_gaps"]:
        print(f"   * {g['skill']}  [gap_priority={g['gap_priority']:.4f}]")

    print(f"\nTransferable Skills:")
    for t in expl["transferable_skills"]:
        print(f"   * {t['skill']}  ->  bridges to {t['bridges_to']}")

    print(f"\nGap Analysis (learning priorities):")
    for gap in result["gap_analysis"]["gaps"]:
        print(f"\n  > {gap['skill']}")
        print(f"    Priority     : {gap['gap_priority']:.4f}")
        print(f"    Learnability : {gap['learnability']}")
        print(f"    Prereqs met  : {gap['prereqs_met']}")
        print(f"    Downstream v : {gap['downstream_blocked']}")
        if gap["learning_path"]:
            print(f"    Learn path   : {' -> '.join(gap['learning_path'])}")

    print(f"\nTop Matched Skills (by impact):")
    for m in expl["top_matched_skills"]:
        print(f"   * {m['skill']}  [impact={m['impact']:.4f}]")

    # Write full JSON
    with open("proofhire_output.json", "w") as f:
        json.dump(result, f, indent=2)
    print("\nFull JSON written to proofhire_output.json")
