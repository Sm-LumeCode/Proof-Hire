import requests
import os

token = os.environ.get("GITHUB_TOKEN")
headers = {"Accept": "application/vnd.github.v3+json"}
if token:
    headers["Authorization"] = f"token {token}"

user = "luminz15"
url = f"https://api.github.com/users/{user}"
r = requests.get(url, headers=headers)
print(f"Status: {r.status_code}")
print(f"Body: {r.text}")
