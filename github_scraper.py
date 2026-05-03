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

    def scrape_profile(self, username: str) -> Dict[str, Any]:
        """
        Scrapes a GitHub user's profile, minimizing API requests.
        Uses at most 3 requests per user.
        """
        print(f"Scraping GitHub data for: {username}")
        
        # 1. Fetch User Data (1 Request)
        user_url = f"https://api.github.com/users/{username}"
        user_response = requests.get(user_url, headers=self.headers)
        
        if user_response.status_code == 404:
            return {"error": "User not found"}
        elif user_response.status_code == 403:
            return {"error": "API rate limit exceeded. Please provide a GITHUB_TOKEN."}
            
        user_data = user_response.json()
        
        # 2. Fetch Repositories (1 Request - gets up to 100 most recently updated repos)
        # This gives us projects, languages, topics, and stars!
        repos_url = f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated"
        repos_response = requests.get(repos_url, headers=self.headers)
        repos_data = repos_response.json() if repos_response.status_code == 200 else []

        # 3. Fetch Total Commits (1 Request using Search API)
        # Search API has a different limit (10/min unauthenticated, 30/min authenticated)
        commits_url = f"https://api.github.com/search/commits?q=author:{username}"
        search_headers = self.headers.copy()
        search_headers["Accept"] = "application/vnd.github.cloak-preview+json" # Required for commit search
        commits_response = requests.get(commits_url, headers=search_headers)
        
        total_commits = 0
        if commits_response.status_code == 200:
            total_commits = commits_response.json().get("total_count", 0)

        # Process the data
        total_stars = 0
        skills_counter = Counter()
        projects = []

        for repo in repos_data:
            if repo.get("fork"): # Skip forked repos to only evaluate original work
                continue
                
            repo_stars = repo.get("stargazers_count", 0)
            total_stars += repo_stars
            
            # Extract skills from language
            lang = repo.get("language")
            if lang:
                skills_counter[lang] += 1
                
            # Extract skills from topics
            topics = repo.get("topics", [])
            for topic in topics:
                skills_counter[topic] += 1
                
            # Save project details
            projects.append({
                "name": repo.get("name"),
                "description": repo.get("description"),
                "url": repo.get("html_url"),
                "stars": repo_stars,
                "language": lang,
                "topics": topics
            })

        # Sort projects by stars
        projects = sorted(projects, key=lambda x: x["stars"], reverse=True)

        return {
            "username": username,
            "profile_url": user_data.get("html_url"),
            "name": user_data.get("name"),
            "bio": user_data.get("bio"),
            "public_repos": user_data.get("public_repos"),
            "followers": user_data.get("followers"),
            "total_stars": total_stars,
            "total_commits": total_commits,
            "top_skills": [skill for skill, count in skills_counter.most_common(15)],
            "projects": projects[:10] # Return top 10 projects to keep payload reasonable
        }

if __name__ == "__main__":
    # Test the scraper
    scraper = GitHubScraper()
    
    # Allow passing username via terminal (e.g., python github_scraper.py your_username)
    # or prompt the user to type it in.
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
    
    # Save to a test file
    with open("github_test_output.json", "w") as f:
        json.dump(result, f, indent=2)
        
    print(f"Done! Scraped {len(result.get('projects', []))} projects, {result.get('total_commits', 0)} commits, and {result.get('total_stars', 0)} stars.")
    print(f"Top Skills: {', '.join(result.get('top_skills', []))}")
    print(f"Execution Time: {end_time - start_time:.2f} seconds")
    print("Output saved to github_test_output.json")
