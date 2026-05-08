import os
import sys
import requests
import time
import json
from collections import Counter
from typing import Dict, Any, List, Optional

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
        self.cache = {}

    def _get(self, url: str) -> Optional[requests.Response]:
        if url in self.cache:
            return self.cache[url]
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                self.cache[url] = response
                return response
            return None
        except Exception:
            return None

    def get_repo_languages(self, owner: str, repo_name: str) -> Dict[str, int]:
        """Fetches the full language breakdown for a repository."""
        url = f"https://api.github.com/repos/{owner}/{repo_name}/languages"
        resp = self._get(url)
        return resp.json() if resp else {}

    def analyze_repo_manifests(self, owner: str, repo_name: str) -> List[str]:
        """
        Infers skills from package.json, requirements.txt, etc.
        """
        inferred = []
        # Check package.json for JS/TS frameworks
        pkg_url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/package.json"
        resp = self._get(pkg_url)
        if resp:
            try:
                content = json.loads(requests.get(resp.json()['download_url'], timeout=10).text)
                deps = {**content.get('dependencies', {}), **content.get('devDependencies', {})}
                for tech in ['react', 'vue', 'next', 'express', 'nest', 'angular', 'tailwind', 'typescript']:
                    if any(tech in d.lower() for d in deps):
                        inferred.append(tech.capitalize())
            except: pass

        # Check requirements.txt for Python frameworks
        req_url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/requirements.txt"
        resp = self._get(req_url)
        if resp:
            try:
                text = requests.get(resp.json()['download_url'], timeout=10).text.lower()
                for tech in ['flask', 'django', 'fastapi', 'pandas', 'numpy', 'torch', 'tensorflow', 'scikit']:
                    if tech in text:
                        inferred.append(tech.capitalize())
            except: pass
            
        return list(set(inferred))

    def search_user_by_name(self, name: str) -> Optional[str]:
        """Tries to find a GitHub username given a full name."""
        if not name: return None
        url = f"https://api.github.com/search/users?q={name}+in:name"
        resp = self._get(url)
        if resp:
            items = resp.json().get("items", [])
            if items: return items[0].get("login")
        return None

    def get_search_count(self, query: str) -> int:
        """Helper to get total count from GitHub Search API."""
        url = f"https://api.github.com/search/issues?q={query}"
        resp = self._get(url)
        return resp.json().get("total_count", 0) if resp else 0

    def get_contributed_repos(self, username: str) -> List[Dict[str, Any]]:
        contributed_repos = {}
        
        # 1. Search PRs
        pr_url = f"https://api.github.com/search/issues?q=author:{username}+type:pr&per_page=50"
        pr_resp = self._get(pr_url)
        if pr_resp:
            for item in pr_resp.json().get("items", []):
                repo_url = item.get("repository_url")
                if repo_url:
                    parts = repo_url.split("/")
                    repo_full_name = f"{parts[-2]}/{parts[-1]}"
                    if parts[-2].lower() != username.lower():
                        contributed_repos[repo_full_name] = repo_url

        # 2. Search Commits
        commit_headers = self.headers.copy()
        commit_headers["Accept"] = "application/vnd.github.cloak-preview+json"
        commit_url = f"https://api.github.com/search/commits?q=author:{username}&sort=author-date&per_page=50"
        commit_resp = requests.get(commit_url, headers=commit_headers, timeout=15) # Search commits is hard to cache effectively
        if commit_resp.status_code == 200:
            for item in commit_resp.json().get("items", []):
                repo = item.get("repository", {})
                repo_full_name = repo.get("full_name")
                owner = repo.get("owner", {}).get("login")
                if repo_full_name and owner and owner.lower() != username.lower():
                    contributed_repos[repo_full_name] = repo.get("url")

        external_repos_data = []
        for full_name, url in list(contributed_repos.items())[:5]: 
            resp = self._get(url)
            if resp: external_repos_data.append(resp.json())
        
        return external_repos_data

    def get_user_commits_count(self, username: str, owner: str, repo_name: str) -> int:
        """Fetches the actual commit count for a user in a specific repo."""
        commit_headers = self.headers.copy()
        commit_headers["Accept"] = "application/vnd.github.cloak-preview+json"
        url = f"https://api.github.com/search/commits?q=author:{username}+repo:{owner}/{repo_name}"
        try:
            resp = requests.get(url, headers=commit_headers, timeout=10)
            if resp.status_code == 200:
                return resp.json().get("total_count", 0)
        except:
            pass
        return 0

    def scrape_profile(self, username: str) -> Dict[str, Any]:
        """
        Scrapes a GitHub user's profile with detailed project and contribution data.
        """
        # 1. Fetch User Data
        user_url = f"https://api.github.com/users/{username}"
        user_resp = self._get(user_url)
        if not user_resp: return {"error": "User not found or limit exceeded"}
        user_data = user_resp.json()
        
        # 2. Fetch Repositories
        repos_url = f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated"
        repos_resp = self._get(repos_url)
        owned_repos = repos_resp.json() if repos_resp else []

        # 3. Contributed Repos
        contributed_repos = self.get_contributed_repos(username)
        all_repos_data = [r for r in owned_repos if not r.get("fork")]
        existing_urls = {r.get("html_url") for r in all_repos_data}
        for r in contributed_repos:
            if r.get("html_url") not in existing_urls:
                all_repos_data.append(r)

        # 4. Global Stats
        total_prs = self.get_search_count(f"author:{username}+type:pr")
        total_issues = self.get_search_count(f"author:{username}+type:issue")
        total_commits = self.get_search_count(f"author:{username}") # Search all commits
        
        # Correctly sum stars for ALL owned repos
        total_stars_sum = sum(repo.get("stargazers_count", 0) for repo in owned_repos)

        # Prioritize Repos: Stars > Updated At > Activity
        sorted_repos = sorted(all_repos_data, key=lambda x: (x.get("stargazers_count", 0), x.get("updated_at", "")), reverse=True)

        skills_counter = Counter()
        language_repos_map = {}  # Maps language -> [repos]

        def process_repo_data(repo_info, index):
            repo_name = repo_info.get("name")
            owner = repo_info.get("owner", {}).get("login")
            repo_stars = repo_info.get("stargazers_count", 0)
            
            # Extract Basic Skills
            inferred_skills = self.analyze_repo_manifests(owner, repo_name) if index < 5 else []
            primary_lang = repo_info.get("language")
            
            repo_languages = []
            if index < 5:
                lang_map = self.get_repo_languages(owner, repo_name)
                repo_languages = [lang for lang, _ in sorted(lang_map.items(), key=lambda x: x[1], reverse=True)[:4]]
            
            if not repo_languages and primary_lang:
                repo_languages = [primary_lang]
            if not repo_languages and inferred_skills:
                repo_languages = inferred_skills[:3]
            
            # Collaboration details
            collaborations = {"pull_requests": 0, "issues": 0, "discussion_count": 0}
            personal_contribution = {"commit_count": 0}
            
            if index < 8:
                personal_contribution["commit_count"] = self.get_user_commits_count(username, owner, repo_name)
                
                # Fetch PRs/Issues
                pr_url = f"https://api.github.com/search/issues?q=author:{username}+repo:{owner}/{repo_name}+type:pr"
                issue_url = f"https://api.github.com/search/issues?q=author:{username}+repo:{owner}/{repo_name}+type:issue"
                
                pr_resp = self._get(pr_url)
                if pr_resp: collaborations["pull_requests"] = pr_resp.json().get("total_count", 0)
                
                issue_resp = self._get(issue_url)
                if issue_resp: collaborations["issues"] = issue_resp.json().get("total_count", 0)

            quality = 0.1
            if repo_stars > 10: quality += 0.2
            if repo_info.get("homepage"): quality += 0.2
            if repo_info.get("has_wiki"): quality += 0.1
            if len(repo_info.get("topics", [])) > 3: quality += 0.2
            if (collaborations["pull_requests"] + collaborations["issues"] + personal_contribution["commit_count"]) > 5: quality += 0.2
            
            return {
                "repo": {
                    "name": repo_name,
                    "full_name": repo_info.get("full_name"),
                    "description": repo_info.get("description"),
                    "url": repo_info.get("html_url"),
                    "deployment_url": repo_info.get("homepage"),
                    "primary_language": primary_lang,
                    "languages": repo_languages,
                    "stars": repo_stars,
                    "quality_score": min(quality, 1.0),
                    "inferred_skills": inferred_skills,
                    "collaborations": collaborations,
                    "personal_contribution": personal_contribution
                },
                "skills": repo_info.get("topics", []),
                "primary_lang": primary_lang,
                "inferred_skills": inferred_skills,
                "repo_languages": repo_languages
            }

        # Use ThreadPoolExecutor for high-speed concurrent processing
        projects = []
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(process_repo_data, r, i) for i, r in enumerate(sorted_repos[:12])]
            for future in concurrent.futures.as_completed(futures):
                try:
                    res = future.result()
                    p = res["repo"]
                    projects.append(p)
                    
                    # Update global skills and maps
                    for topic in res["skills"]: skills_counter[topic] += 2
                    if res["primary_lang"]: skills_counter[res["primary_lang"]] += 2
                    for s in res["inferred_skills"]: skills_counter[s] += 1
                    
                    for lang in res["repo_languages"]:
                        if lang not in language_repos_map: language_repos_map[lang] = []
                        if p["name"] not in language_repos_map[lang]: language_repos_map[lang].append(p["name"])
                except Exception as e:
                    logger.error(f"Error processing repo: {e}")

        # Calculate Overall Evidence Score
        evidence_score = min((total_stars_sum * 0.05) + (total_prs * 0.1) + (total_commits * 0.01) + (len(projects) * 0.05), 1.0)

        return {
            "username": username,
            "name": user_data.get("name"),
            "public_repos": user_data.get("public_repos"),
            "total_stars": total_stars_sum,
            "evidence_score": round(evidence_score, 2),
            "contributions": {
                "total_prs": total_prs, 
                "total_issues": total_issues,
                "total_commits": total_commits,
                "total_count": total_prs + total_issues + total_commits
            },
            "top_skills": [s for s, _ in skills_counter.most_common(12)],
            "language_repos_map": language_repos_map,
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

