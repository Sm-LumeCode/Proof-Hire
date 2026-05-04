import os
import sys
import requests
import time
import json
from collections import Counter
from typing import Dict, Any, List

class GitHubScraper:
    def __init__(self, token: str = None):
        """
        Initializes the scraper. If a token is provided, it increases the rate limit 
        from 60 requests/hr to 5,000 requests/hr.
        """
        self.token = token or os.environ.get("GITHUB_TOKEN")
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"

    def get_repo_languages(self, owner: str, repo_name: str) -> Dict[str, int]:
        """Fetches the full language breakdown for a repository."""
        url = f"https://api.github.com/repos/{owner}/{repo_name}/languages"
        response = requests.get(url, headers=self.headers)
        return response.json() if response.status_code == 200 else {}

    def get_search_count(self, query: str) -> int:
        """Helper to get total count from GitHub Search API."""
        url = f"https://api.github.com/search/issues?q={query}"
        # For PRs and Issues, we use the issues endpoint with type filters
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json().get("total_count", 0)
        return 0

    def scrape_profile(self, username: str) -> Dict[str, Any]:
        """
        Scrapes a GitHub user's profile with detailed project and contribution data.
        """
        print(f"Scraping detailed GitHub data for: {username}")
        
        # 1. Fetch User Data
        user_url = f"https://api.github.com/users/{username}"
        user_response = requests.get(user_url, headers=self.headers)
        
        if user_response.status_code == 404:
            return {"error": "User not found"}
        elif user_response.status_code == 403:
            return {"error": "API rate limit exceeded."}
            
        user_data = user_response.json()
        
        # 2. Fetch Repositories
        repos_url = f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated"
        repos_response = requests.get(repos_url, headers=self.headers)
        repos_data = repos_response.json() if repos_response.status_code == 200 else []

        # 3. Enhanced Contributions (Commits, PRs, Issues)
        # Total Commits
        commits_url = f"https://api.github.com/search/commits?q=author:{username}"
        search_headers = self.headers.copy()
        search_headers["Accept"] = "application/vnd.github.cloak-preview+json"
        commits_response = requests.get(commits_url, headers=search_headers)
        total_commits = commits_response.json().get("total_count", 0) if commits_response.status_code == 200 else 0

        # Total PRs and Issues
        total_prs = self.get_search_count(f"author:{username}+type:pr")
        total_issues = self.get_search_count(f"author:{username}+type:issue")

        # Process projects
        total_stars = 0
        skills_counter = Counter()
        projects = []

        # We process all repos for stats, but only fetch detailed languages for top 10
        sorted_repos = sorted([r for r in repos_data if not r.get("fork")], 
                             key=lambda x: x.get("stargazers_count", 0), reverse=True)

        for i, repo in enumerate(sorted_repos):
            repo_name = repo.get("name")
            owner = repo.get("owner", {}).get("login")
            repo_stars = repo.get("stargazers_count", 0)
            total_stars += repo_stars
            
            # Topics
            topics = repo.get("topics", [])
            for topic in topics:
                skills_counter[topic] += 1
                
            # Deployed URL
            deployment_url = repo.get("homepage")
            
            # Languages (Detailed for top 10, Primary for others)
            languages = {}
            if i < 10:
                print(f"  Fetching languages for: {repo_name}...")
                languages = self.get_repo_languages(owner, repo_name)
                for lang in languages:
                    skills_counter[lang] += 2 # Weight language slightly higher than topics
            else:
                primary_lang = repo.get("language")
                if primary_lang:
                    languages = {primary_lang: 100}
                    skills_counter[primary_lang] += 2

            if i < 10: # Only store detailed data for top 10 projects
                projects.append({
                    "name": repo_name,
                    "description": repo.get("description"),
                    "url": repo.get("html_url"),
                    "deployment_url": deployment_url,
                    "stars": repo_stars,
                    "forks": repo.get("forks_count", 0),
                    "languages": languages,
                    "topics": topics,
                    "is_collaboration": owner != username
                })

        return {
            "username": username,
            "profile_url": user_data.get("html_url"),
            "name": user_data.get("name"),
            "bio": user_data.get("bio"),
            "public_repos": user_data.get("public_repos"),
            "followers": user_data.get("followers"),
            "total_stars": total_stars,
            "contributions": {
                "total_commits": total_commits,
                "total_prs": total_prs,
                "total_issues": total_issues,
                "total_count": total_commits + total_prs + total_issues
            },
            "top_skills": [skill for skill, count in skills_counter.most_common(15)],
            "projects": projects
        }

if __name__ == "__main__":
    scraper = GitHubScraper()
    
    if len(sys.argv) > 1:
        test_username = sys.argv[1]
    else:
        test_username = input("Enter a GitHub username to scrape: ").strip()
        
    if not test_username:
        print("No username provided. Exiting.")
        sys.exit(1)
    
    start_time = time.time()
    result = scraper.scrape_profile(test_username)
    end_time = time.time()
    
    with open("github_test_output.json", "w") as f:
        json.dump(result, f, indent=2)
        
    print(f"\nDone! Scraped {len(result.get('projects', []))} projects.")
    print(f"Total Contributions: {result.get('contributions', {}).get('total_count', 0)}")
    print(f"Top Skills: {', '.join(result.get('top_skills', []))}")
    print(f"Execution Time: {end_time - start_time:.2f} seconds")
    print("Output saved to github_test_output.json")

