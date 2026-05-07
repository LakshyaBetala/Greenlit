import os
import time
import json
import uuid
from datetime import datetime

def generate_and_apply_fix(repo_name: str, vulnerabilities: list) -> str:
    """
    Takes a repository name and a list of vulnerabilities.
    Uses Gemini to generate the full replacement code, and GitHub API to push it and open a PR.
    Returns the URL of the generated Pull Request.
    """
    # Normalize: accept full URL or owner/repo
    if repo_name.startswith("https://github.com/"):
        repo_name = repo_name[len("https://github.com/"):].strip("/").removesuffix(".git")
    repo_name = repo_name.strip("/").removesuffix(".git")

    gemini_key = os.getenv("GEMINI_API_KEY")
    github_token = os.getenv("GITHUB_TOKEN")

    if not github_token:
        print("WARN: Missing GITHUB_TOKEN. Cannot push PR. Returning mock PR URL.")
        time.sleep(2)
        return f"https://github.com/{repo_name}/pull/mock-no-token"

    if not gemini_key:
        print("WARN: Missing GEMINI_API_KEY. Cannot generate fix. Returning mock PR URL.")
        return f"https://github.com/{repo_name}/pull/mock-no-token"

    print(f"Generating fixes for {repo_name} using Gemini...")
    
    # --- 1. Fetch File Contents ---
    try:
        from github import Github, Auth, InputGitTreeElement
    except ImportError:
        print("WARN: PyGithub not installed. Run `pip install PyGithub`. Returning mock PR URL.")
        return f"https://github.com/{repo_name}/pull/mock-missing-lib"

    auth = Auth.Token(github_token)
    gh = Github(auth=auth)
    
    try:
        repo = gh.get_repo(repo_name)
    except Exception as e:
        print(f"ERROR: Could not access repo {repo_name}: {e}")
        return f"https://github.com/{repo_name}/pull/error-repo-access"

    # Gather affected files to provide context to the LLM
    affected_files = set([v.get('file') for v in vulnerabilities if v.get('file')])
    file_contents = {}
    for file_path in affected_files:
        try:
            content = repo.get_contents(file_path).decoded_content.decode('utf-8')
            file_contents[file_path] = content
        except Exception as e:
            print(f"WARN: Could not fetch {file_path}: {e}")
            pass

    # --- 2. Ask Gemini for Replacement Code ---
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=gemini_key)

    vuln_context = "\n".join([f"- {v.get('title')} in {v.get('file')}: {v.get('description')}" for v in vulnerabilities])
    
    files_context = "\n\n".join([f"=== FILE: {path} ===\n{content}" for path, content in file_contents.items()])

    prompt = f"""You are an AI Auto-Fix Engine. I have the following vulnerabilities in my repository {repo_name}:
{vuln_context}

Here are the current contents of the affected files:
{files_context}

Fix the vulnerabilities. Return a JSON object where the keys are the file paths, and the values are the COMPLETE, FULL replacement code for those files.
Do not use diffs. Just return the new file content.
Ensure your fix addresses the vulnerabilities but doesn't break other functionality.
IMPORTANT: Return ONLY valid JSON."""

    # Model fallback chain
    model_candidates = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.5-pro',
    ]

    response = None
    last_err = None
    used_model = None

    for model_name in model_candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            used_model = model_name
            print(f"INFO: Auto-fix generated using {model_name}")
            break
        except Exception as e:
            last_err = e
            print(f"WARN: Gemini auto-fix call to {model_name} failed: {e}")
            continue

    if response is None:
        print(f"ERROR: All Gemini models failed for auto-fix (last error: {last_err})")
        return f"https://github.com/{repo_name}/pull/error-all-models-failed"

    try:
        fixed_files = json.loads(response.text)
    except json.JSONDecodeError:
        print("ERROR: Failed to parse Gemini response as JSON.")
        return f"https://github.com/{repo_name}/pull/error-json-parse"

    if not fixed_files:
        print("WARN: Gemini returned empty fixes.")
        return f"https://github.com/{repo_name}/pull/error-no-fixes"

    # --- 3. Create GitHub Branch & PR ---
    try:
        # Get default branch
        default_branch = repo.default_branch
        ref = repo.get_git_ref(f"heads/{default_branch}")
        base_commit = repo.get_commit(ref.object.sha)
        base_tree = repo.get_git_tree(ref.object.sha)
        
        # Create new branch
        branch_name = f"greenlit/autofix-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=ref.object.sha)
        
        # Create Tree
        tree_elements = []
        for path, new_content in fixed_files.items():
            blob = repo.create_git_blob(new_content, "utf-8")
            element = InputGitTreeElement(path=path, mode="100644", type="blob", sha=blob.sha)
            tree_elements.append(element)
            
        new_tree = repo.create_git_tree(tree_elements, base_tree)
        
        # Create Commit
        commit_message = f"🛡️ Greenlit Auto-Fix: Address {len(vulnerabilities)} security issues\n\nGenerated by Gemini ({used_model})."
        new_commit = repo.create_git_commit(commit_message, new_tree, [base_commit.commit])
        
        # Update Branch Ref
        repo.get_git_ref(f"heads/{branch_name}").edit(new_commit.sha)
        
        # Create PR
        pr_title = "🛡️ Greenlit Security Auto-Fix"
        pr_body = "This PR was automatically generated by **Greenlit** to fix the following security vulnerabilities:\n\n"
        for v in vulnerabilities:
            pr_body += f"- **{v.get('title')}** in `{v.get('file')}`: {v.get('description')}\n"
        pr_body += "\n---\n*Please review the changes carefully before merging. Generated by Gemini.*"
        
        pr = repo.create_pull(
            title=pr_title,
            body=pr_body,
            head=branch_name,
            base=default_branch
        )
        
        print(f"SUCCESS: Auto-Fix PR created! {pr.html_url}")
        return pr.html_url

    except Exception as e:
        print(f"ERROR: GitHub PR creation failed: {e}")
        return f"https://github.com/{repo_name}/pull/error-github-api"
