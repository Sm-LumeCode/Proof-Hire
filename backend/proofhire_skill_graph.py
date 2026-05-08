from __future__ import annotations

import json
import math
import logging
from dataclasses import dataclass, field, asdict
from typing import Any, List, Dict, Set

import networkx as nx
from semantic_engine import SemanticSimilarityEngine

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# 1.  STATIC ONTOLOGY
# ─────────────────────────────────────────────────────────────────────────────

ONTOLOGY_EDGES = [
    ("Programming", "Python", "DOMAIN", 1.0),
    ("Programming", "Java", "DOMAIN", 1.0),
    ("Programming", "JavaScript", "DOMAIN", 1.0),
    ("Programming", "TypeScript", "DOMAIN", 1.0),
    ("JavaScript", "D3.js", "DEPENDENCY", 0.95),
    ("D3.js", "SVG", "STACK", 0.9),
    ("D3.js", "Canvas", "STACK", 0.8),
    ("D3.js", "Data Visualization", "DOMAIN", 1.0),
    ("JavaScript", "React", "DEPENDENCY", 0.95),
    ("React", "D3.js", "INTEGRATION", 0.7),
    ("JavaScript", "Vue", "DEPENDENCY", 0.95),
    ("JavaScript", "Node.js", "DEPENDENCY", 0.95),
    ("TypeScript", "React", "DEPENDENCY", 0.95),
    ("React", "Next.js", "DEPENDENCY", 0.95),
    ("Frontend", "HTML", "CORE", 1.0),
    ("Frontend", "CSS", "CORE", 1.0),
    ("Frontend", "JavaScript", "CORE", 1.0),
    ("Frontend", "UI/UX", "DOMAIN", 0.8),
    ("Backend", "Python", "STACK", 0.7),
    ("Backend", "SQL", "DOMAIN", 1.0),
    ("SQL", "PostgreSQL", "DEPENDENCY", 0.9),
    ("DevOps", "Docker", "DOMAIN", 1.0),
    ("Docker", "Kubernetes", "DEPENDENCY", 0.9),
]

# ─────────────────────────────────────────────────────────────────────────────
# 2.  GRAPH ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class SkillGraphEngine:
    def __init__(self) -> None:
        self.G: nx.DiGraph = nx.DiGraph()
        self.semantic_engine = SemanticSimilarityEngine()
        self._build_ontology()
        self.job_skills = set()
        self.candidate_skills = set()
        self.job_title = "Target Role"
        self.github_data = {}
        self.resume_cgpa = None

    def _build_ontology(self) -> None:
        for (src, tgt, etype, w) in ONTOLOGY_EDGES:
            self.G.add_edge(src, tgt, edge_type=etype, weight=w)
        
        # Annotate depth
        roots = [n for n, d in self.G.in_degree() if d == 0]
        for root in roots:
            for node in nx.descendants(self.G, root) | {root}:
                try:
                    d = nx.shortest_path_length(self.G, root, node)
                    cur = self.G.nodes[node].get("depth", 99)
                    self.G.nodes[node]["depth"] = min(cur, d)
                except: pass

    def ingest(self, job_skills: List[str], candidate_skills: List[str], job_title: str = "Target Role", github_data: dict = None, resume_cgpa: Any = None) -> None:
        self.job_skills = {s.strip().lower() for s in job_skills}
        self.candidate_skills = {s.strip().lower() for s in candidate_skills}
        self.job_title = job_title
        self.github_data = github_data or {}
        self.resume_cgpa = resume_cgpa
        gh_top = {s.strip().lower() for s in self.github_data.get("top_skills", [])}
        
        # Add Job Role root
        if self.job_title not in self.G:
            self.G.add_node(self.job_title, status="JOB_ROLE", label=self.job_title)

        # Merge all skills into graph
        all_skills = self.job_skills | self.candidate_skills
        for s_name in all_skills:
            if s_name not in self.G:
                self.G.add_node(s_name, label=s_name.capitalize())
            
            # Determine status
            status = "UNKNOWN"
            best_sim = 0.0
            best_match = None
            if s_name in self.job_skills and s_name in self.candidate_skills:
                status = "MATCHED"
                best_sim = 1.0
                best_match = s_name
            elif s_name in self.job_skills:
                # Check for semantic matches if no direct match
                for c_s in self.candidate_skills:
                    sim = self.semantic_engine.compare(s_name, c_s)
                    if sim > best_sim:
                        best_sim = sim
                        best_match = c_s
                
                if best_sim >= 0.85: status = "MATCHED"
                elif best_sim >= 0.5: status = "PARTIAL"
                else: status = "MISSING"
            else:
                status = "EXTRA"
            
            similarity_reason = "no match found"
            if s_name in self.job_skills:
                if best_sim == 1.0 and best_match == s_name:
                    similarity_reason = "exact match"
                elif best_sim > 0:
                    similarity_reason = f"semantically similar (score: {best_sim:.2f})"

            self.G.nodes[s_name].update({
                "status": status,
                "best_similarity": round(best_sim, 4),
                "matched_with": best_match,
                "similarity_reason": similarity_reason,
                "is_verified": s_name in gh_top
            })
            
            # Only required skills are attached to the central job-role node.
            if s_name in self.job_skills:
                self.G.add_edge(self.job_title, s_name, edge_type="CORE_REQUIREMENT", weight=1.0)

    def compute_scores(self) -> Dict[str, Any]:
        # Graph Metrics
        try:
            pagerank = nx.pagerank(self.G, weight="weight")
            centrality = nx.betweenness_centrality(self.G.to_undirected(), normalized=True)
        except:
            pagerank = {n: 1.0 for n in self.G}
            centrality = {n: 1.0 for n in self.G}

        # Calculate Node-Level Scores
        for node in self.G.nodes:
            if self.G.nodes[node].get("status") == "JOB_ROLE": continue
            
            status = self.G.nodes[node].get("status", "UNKNOWN")
            impact = (pagerank.get(node, 0) * 10) + (centrality.get(node, 0) * 5)
            
            # GitHub Evidence Influence
            gh_score = 0.0
            if status == "MATCHED" or status == "PARTIAL":
                # Check if this skill appears in GitHub data
                gh_top = [s.lower() for s in self.github_data.get("top_skills", [])]
                if node in gh_top:
                    gh_score = self.github_data.get("evidence_score", 0.5) * 100
            
            self.G.nodes[node].update({
                "impact_score": round(min(impact, 1.0), 4),
                "github_evidence": round(gh_score, 1),
                "skill_match": 100 if status == "MATCHED" else 50 if status == "PARTIAL" else 0
            })

        # Skill component
        sem_scores = []
        for j_s in self.job_skills:
            best = max([self.semantic_engine.compare(j_s, c_s) for c_s in self.candidate_skills] + [0])
            sem_scores.append(best)
        semantic_comp = sum(sem_scores) / max(len(sem_scores), 1)
        
        matched_count = sum(1 for n, d in self.G.nodes(data=True) if d.get("status") == "MATCHED")
        coverage_comp = matched_count / max(len(self.job_skills), 1)
        skills_comp = (0.6 * semantic_comp) + (0.4 * coverage_comp)
        
        # GitHub component
        github_comp = self.github_data.get("evidence_score", 0.0)

        # CGPA component
        cgpa_comp = 0.0
        try:
            cgpa_val = float(str(self.resume_cgpa).strip())
            cgpa_comp = min(max((cgpa_val / 10.0) if cgpa_val > 4 else (cgpa_val / 4.0), 0.0), 1.0)
        except Exception:
            cgpa_comp = 0.0

        # Requested weighting: 0.1 CGPA + 0.4 skills + 0.5 GitHub
        final_score = (0.1 * cgpa_comp) + (0.4 * skills_comp) + (0.5 * github_comp)
        final_score = round(min(final_score, 1.0), 4)
        
        return {
            "fit_score": final_score,
            "components": {
                "cgpa": round(cgpa_comp, 2),
                "skills": round(skills_comp, 2),
                "semantic": round(semantic_comp, 2),
                "coverage": round(coverage_comp, 2),
                "github": round(github_comp, 2)
            }
        }

    def to_json(self) -> dict:
        scores = self.compute_scores()
        
        relevant_nodes = set(self.job_skills) | set(self.candidate_skills) | {self.job_title}

        nodes_out = []
        for n in self.G.nodes:
            if n not in relevant_nodes:
                continue
            d = self.G.nodes[n]
            nodes_out.append({
                "id": n,
                "label": d.get("label", n),
                "status": d.get("status", "UNKNOWN"),
                "impact_score": d.get("impact_score", 0),
                "skill_match": d.get("skill_match", 0),
                "github_evidence": d.get("github_evidence", 0),
                "is_verified": d.get("is_verified", False),
                "matched_with": d.get("matched_with"),
                "best_similarity": d.get("best_similarity", 0),
                "similarity_reason": d.get("similarity_reason", "no match found"),
                "downstream_count": len(list(self.G.successors(n)))
            })

        edges_out = []
        for u, v, d in self.G.edges(data=True):
            if u not in relevant_nodes or v not in relevant_nodes:
                continue
            edges_out.append({
                "source": u,
                "target": v,
                "edge_type": d.get("edge_type", "UNKNOWN"),
                "weight": d.get("weight", 1.0),
                "is_gap_path": self.G.nodes[v].get("status") == "MISSING"
            })

        return {
            "graph": {"nodes": nodes_out, "edges": edges_out},
            "explainability": {
                "fit_score": scores["fit_score"],
                "narrative": self._generate_narrative(scores),
                "critical_gaps": [n for n in self.G if self.G.nodes[n].get("status") == "MISSING"][:5]
            },
            "gap_analysis": self._generate_gap_analysis()
        }

    def _generate_gap_analysis(self) -> dict:
        gaps = []
        missing_nodes = [n for n, d in self.G.nodes(data=True) if d.get("status") == "MISSING"]
        
        # Sort by impact
        missing_nodes.sort(key=lambda x: self.G.nodes[x].get("impact_score", 0), reverse=True)
        
        for node in missing_nodes:
            # Find learning path from ontology roots
            path = []
            try:
                # Find all nodes that can reach this missing skill in the ontology
                # We want the "upstream" chain
                ancestors = nx.ancestors(self.G, node)
                # Filter ancestors to find a logical starting point (e.g. Programming, DevOps)
                roots = [a for a in ancestors if self.G.in_degree(a) == 0]
                if roots:
                    start_node = roots[0]
                    path_nodes = nx.shortest_path(self.G, start_node, node)
                    path = [n.capitalize() for n in path_nodes]
                else:
                    path = [node.capitalize()]
            except:
                path = [node.capitalize()]

            # Find related skills the candidate ALREADY has that might help
            related_matched = []
            for c_s in self.candidate_skills:
                if self.G.has_node(c_s) and self.G.has_node(node):
                    sim = self.semantic_engine.compare(c_s, node)
                    if sim > 0.4:
                        related_matched.append(c_s.capitalize())

            impact = self.G.nodes[node].get("impact_score", 0.1)
            gaps.append({
                "skill": node.capitalize(),
                "gap_priority": round(impact * 1.5, 2), # Heuristic
                "impact_score": impact,
                "learnability": 0.7, # Default
                "learning_path": path,
                "transferable_knowledge": related_matched[:3],
                "description": f"Mastering {node.capitalize()} will bridge a critical gap in your {self.job_title} application."
            })

        # Sort gaps by priority
        gaps.sort(key=lambda x: x["gap_priority"], reverse=True)
        return {"gaps": gaps[:8]} 

    def _generate_narrative(self, scores: dict) -> str:
        s = scores["fit_score"]
        if s > 0.8: res = "Strong match with excellent technical evidence."
        elif s > 0.5: res = "Moderate fit with some transferable skills identified."
        else: res = "Weak alignment with significant gaps in core requirements."
        
        comp = scores["components"]
        details = f"CGPA contributes {comp['cgpa']*100:.0f}%, skills contribute {comp['skills']*100:.0f}%, and GitHub evidence contributes {comp['github']*100:.0f}%."
        return f"{res} {details}"

    @classmethod
    def run(cls, job_skills: List[str], candidate_skills: List[str], job_title: str = "Target Role", github_data: dict = None, resume_cgpa: Any = None) -> dict:
        engine = cls()
        engine.ingest(job_skills, candidate_skills, job_title, github_data, resume_cgpa)
        return engine.to_json()
