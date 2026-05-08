export async function fetchGitHubData(username) {
  // In a real scenario, this would call a local FastAPI/Streamlit endpoint
  // For now, we simulate a small delay and return mock data if no backend is available
  
  try {
    const response = await fetch(`http://127.0.0.1:8001/api/github/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("Local backend not available, using mock data for demo.");
  }
  
  // Mock data for demo purposes
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        username: username,
        name: "Demo Candidate",
        bio: "Senior Software Engineer specializing in React and Python.",
        public_repos: 12,
        followers: 45,
        total_stars: 128,
        contributions: { total_commits: 450, total_prs: 12, total_issues: 5 },
        top_skills: ["JavaScript", "React", "Python", "Docker", "Node.js"],
        graph: {
          nodes: [
            { id: "Python", label: "Python", status: "MATCHED", depth: 1, impact_score: 0.57, learnability: 0.85 },
            { id: "Flask", label: "Flask", status: "MISSING", depth: 2, impact_score: 0.15, learnability: 0.8 },
            { id: "REST API", label: "REST API", status: "MISSING", depth: 3, impact_score: 0.17, learnability: 0.75 },
            { id: "Docker", label: "Docker", status: "MISSING", depth: 1, impact_score: 0.26, learnability: 0.65 },
            { id: "Backend Developer", label: "Backend Developer", status: "JOB_ROLE", depth: 3, impact_score: 0.18, learnability: 0.5 }
          ],
          edges: [
            { source: "Python", target: "Flask", edge_type: "DEPENDENCY", is_gap_path: true },
            { source: "Flask", target: "REST API", edge_type: "STACK", is_gap_path: true },
            { source: "Backend Developer", target: "Docker", edge_type: "CORE_REQUIREMENT", is_gap_path: true },
            { source: "Backend Developer", target: "Python", edge_type: "CORE_REQUIREMENT", is_gap_path: false }
          ]
        },
        projects: [
          {
            name: "ProofHire-Demo",
            description: "A platform for verifying skills through GitHub evidence.",
            url: "https://github.com/demo/proofhire",
            stars: 15,
            forks: 3,
            languages: { "JavaScript": 8500, "CSS": 2000 },
            topics: ["react", "brutalism", "verification"],
            is_collaboration: false,
            personal_contribution: { commit_count: 42, top_prs: [] }
          }
        ]
      });
    }, 1500);
  });
}
