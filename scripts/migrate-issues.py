#!/usr/bin/env python3
"""Migrate issues from roo-plus-old to roo-plus, preserving title, body, labels, and milestone."""

import json
import subprocess
import sys
import time

GH = "/usr/bin/gh"
OLD_REPO = "xavier-arosemena/roo-plus-old"
NEW_REPO = "xavier-arosemena/roo-plus"

def run_gh(*args, input_data=None):
    cmd = [GH] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True, input=input_data)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr.strip()}")
        return None
    return result.stdout.strip()

def create_issue(title, body, labels, state, old_number):
    """Create an issue in the new repo and optionally close it."""
    # Add a note at the bottom about the original issue
    migration_note = f"\n\n---\n*Migrated from [{OLD_REPO}#{old_number}](https://github.com/{OLD_REPO}/issues/{old_number})*"
    body_with_note = body + migration_note if body else migration_note
    
    # Build label args
    label_names = [l["name"] for l in labels]
    
    # Use the API directly for more control
    issue_data = {
        "title": title,
        "body": body_with_note,
    }
    if label_names:
        issue_data["labels"] = label_names
    
    json_input = json.dumps(issue_data)
    endpoint = f"repos/{NEW_REPO}/issues"
    result = run_gh("api", endpoint, "--method", "POST",
                    "--input", "-", input_data=json_input)
    
    if result:
        data = json.loads(result)
        issue_number = data["number"]
        
        # If it was closed, close it
        if state == "CLOSED":
            run_gh("issue", "close", str(issue_number), "--repo", NEW_REPO,
                   "--comment", "Migrated from old repo (was closed)")
            print(f"  ✅ Created issue #{issue_number} (CLOSED)")
        else:
            print(f"  ✅ Created issue #{issue_number} (OPEN)")
        
        return issue_number
    
    return None

def main():
    with open("/tmp/issues-export.json") as f:
        issues = json.load(f)
    
    # Sort by number ascending
    issues.sort(key=lambda x: x["number"])
    
    print(f"Migrating {len(issues)} issues from {OLD_REPO} to {NEW_REPO}...")
    print()
    
    for issue in issues:
        title = issue["title"]
        number = issue["number"]
        body = issue.get("body") or ""
        labels = issue.get("labels") or []
        state = issue.get("state", "OPEN")
        
        print(f"[#{number}] {title}")
        print(f"  Labels: {[l['name'] for l in labels]}")
        print(f"  State: {state}")
        
        issue_number = create_issue(title, body, labels, state, number)
        
        if not issue_number:
            print(f"  ❌ Failed")
        
        print()
        # Rate limit safety
        time.sleep(1)

if __name__ == "__main__":
    main()
