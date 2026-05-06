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

    def get_contributed_repos(self, username: str) -> List[Dict[str, Any]]:
        """
        Finds repositories where the user has contributed via PRs or Commits.
        Also checks organizations the user belongs to.
        """
        print(f"  Searching for all contributions for: {username}...")
        contributed_repos = {}
        
        # 1. Search PRs
        pr_url = f"https://api.github.com/search/issues?q=author:{username}+type:pr&per_page=50"
        pr_resp = requests.get(pr_url, headers=self.headers)
        if pr_resp.status_code == 200:
            for item in pr_resp.json().get("items", []):
                repo_url = item.get("repository_url")
                if repo_url:
                    parts = repo_url.split("/")
                    repo_full_name = f"{parts[-2]}/{parts[-1]}"
                    if parts[-2].lower() != username.lower():
                        contributed_repos[repo_full_name] = repo_url

        # 2. Search Commits (Very accurate for code contributions)
        commit_headers = self.headers.copy()
        commit_headers["Accept"] = "application/vnd.github.cloak-preview+json"
        commit_url = f"https://api.github.com/search/commits?q=author:{username}&sort=author-date&per_page=50"
        commit_resp = requests.get(commit_url, headers=commit_headers)
        if commit_resp.status_code == 200:
            for item in commit_resp.json().get("items", []):
                repo = item.get("repository", {})
                repo_full_name = repo.get("full_name")
                owner = repo.get("owner", {}).get("login")
                if repo_full_name and owner and owner.lower() != username.lower():
                    contributed_repos[repo_full_name] = repo.get("url")

        # 3. Check Organizations
        orgs_url = f"https://api.github.com/users/{username}/orgs"
        orgs_resp = requests.get(orgs_url, headers=self.headers)
        if orgs_resp.status_code == 200:
            for org in orgs_resp.json():
                org_name = org.get("login")
                # Fetch org repos where user might be contributing
                org_repos_url = f"https://api.github.com/orgs/{org_name}/repos?per_page=50&sort=updated"
                org_repos_resp = requests.get(org_repos_url, headers=self.headers)
                if org_repos_resp.status_code == 200:
                    for repo in org_repos_resp.json():
                        # We'll check if the user has activity here later or just include top ones
                        repo_full_name = repo.get("full_name")
                        contributed_repos[repo_full_name] = repo.get("url")

        # Fetch detailed repo data for discovered repos
        external_repos_data = []
        # Sort and limit discovered repos (could be many)
        for full_name, url in list(contributed_repos.items())[:15]: 
            resp = requests.get(url, headers=self.headers)
            if resp.status_code == 200:
                external_repos_data.append(resp.json())
        
        return external_repos_data

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
        
        # 2. Fetch Repositories (Owned)
        repos_url = f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated"
        repos_response = requests.get(repos_url, headers=self.headers)
        owned_repos = repos_response.json() if repos_response.status_code == 200 else []

        # 3. Fetch Contributed Repositories (External)
        contributed_repos = self.get_contributed_repos(username)
        
        # Merge repos (prioritize owned, then contributed)
        # Filter out forks from owned repos
        all_repos_data = [r for r in owned_repos if not r.get("fork")]
        # Add contributed repos if they aren't already there
        existing_urls = {r.get("html_url") for r in all_repos_data}
        for r in contributed_repos:
            if r.get("html_url") not in existing_urls:
                all_repos_data.append(r)

        # 4. Enhanced Contributions (Commits, PRs, Issues)
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

        # Sort combined repos by stars
        sorted_repos = sorted(all_repos_data, key=lambda x: x.get("stargazers_count", 0), reverse=True)

        for i, repo in enumerate(sorted_repos):
            repo_name = repo.get("name")
            owner_data = repo.get("owner", {})
            owner = owner_data.get("login")
            repo_stars = repo.get("stargazers_count", 0)
            
            # Stars from owned repos only (to keep it profile-focused)
            if owner == username:
                total_stars += repo_stars
            
            # Topics
            topics = repo.get("topics", [])
            for topic in topics:
                skills_counter[topic] += 1
                
            # Deployed URL
            deployment_url = repo.get("homepage")
            
            # Languages (Detailed for top 10, Primary for others)
            languages = {}
            if i < 15: # Process slightly more projects for detail
                print(f"  Fetching languages for: {owner}/{repo_name}...")
                languages = self.get_repo_languages(owner, repo_name)
                for lang in languages:
                    skills_counter[lang] += 2 # Weight language slightly higher than topics
            else:
                primary_lang = repo.get("language")
                if primary_lang:
                    languages = {primary_lang: 100}
                    skills_counter[primary_lang] += 2

            # --- NEW: Personal Contribution Details ---
            user_commits = 0
            user_prs = []
            
            if i < 15: # Only fetch deep stats for top 15 to save rate limit
                print(f"  Analyzing your work in: {owner}/{repo_name}...")
                # Fetch user's commits in this repo
                commit_count_url = f"https://api.github.com/search/commits?q=author:{username}+repo:{owner}/{repo_name}"
                commit_headers = self.headers.copy()
                commit_headers["Accept"] = "application/vnd.github.cloak-preview+json"
                commit_resp = requests.get(commit_count_url, headers=commit_headers)
                if commit_resp.status_code == 200:
                    user_commits = commit_resp.json().get("total_count", 0)
                
                # Fetch user's PRs in this repo
                pr_list_url = f"https://api.github.com/search/issues?q=author:{username}+type:pr+repo:{owner}/{repo_name}&per_page=3"
                pr_resp = requests.get(pr_list_url, headers=self.headers)
                if pr_resp.status_code == 200:
                    pr_items = pr_resp.json().get("items", [])
                    user_prs = [item.get("title") for item in pr_items]

            if i < 20: # Store more projects in the final list
                projects.append({
                    "name": repo_name,
                    "full_name": repo.get("full_name"),
                    "description": repo.get("description"),
                    "url": repo.get("html_url"),
                    "deployment_url": deployment_url,
                    "stars": repo_stars,
                    "forks": repo.get("forks_count", 0),
                    "languages": languages,
                    "topics": topics,
                    "is_collaboration": owner.lower() != username.lower(),
                    "personal_contribution": {
                        "commit_count": user_commits,
                        "top_prs": user_prs
                    }
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

