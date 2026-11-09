#!/usr/bin/env python3
"""One-time publisher (requires local Git, GitHub CLI 'gh', and gh auth login).

Creates a brand-new public repo and attempts to enable GitHub Pages in Actions
mode. Stops if a repo with the same name already exists to avoid overwrites.
"""
from __future__ import annotations

import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = "iAlirezaaa/tehran-digital-twin"


def run(*args: str, required: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if required and result.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} failed:\n{result.stderr.strip()}")
    return result


def main() -> int:
    for command in ("git", "gh"):
        if not shutil.which(command):
            print(f"Install {command} first. GitHub CLI: https://cli.github.com/", file=sys.stderr)
            return 1
    try:
        run("gh", "auth", "status")
        if run("gh", "repo", "view", REPO, "--json", "name", required=False).returncode == 0:
            print(f"Repository {REPO} already exists; inspect it rather than overwriting.", file=sys.stderr)
            return 2
        if run("git", "rev-parse", "--is-inside-work-tree", required=False).returncode != 0:
            run("git", "init")
        run("git", "add", ".")
        if run("git", "diff", "--cached", "--quiet", required=False).returncode != 0:
            run("git", "commit", "-m", "feat: initial Tehran citywide streaming 3D atlas")
        run("git", "branch", "-M", "main")
        run("gh", "repo", "create", REPO, "--public", "--source", ".", "--remote", "origin", "--push")
        page = run("gh", "api", "--method", "POST", f"repos/{REPO}/pages", "-f", "build_type=workflow", required=False)
        if page.returncode != 0:
            print("Pages API did not confirm activation. Go to Settings > Pages > Source: GitHub Actions.")
            print(page.stderr.strip())
        else:
            print("GitHub Pages API configuration requested.")
        trigger = run("gh", "workflow", "run", "pages.yml", "--repo", REPO, required=False)
        if trigger.returncode != 0:
            print("Workflow dispatch not confirmed; check the Actions tab.")
            print(trigger.stderr.strip())
        print(f"Repository: https://github.com/{REPO}")
        print("Expected site AFTER successful Actions deployment: https://ialirezaaa.github.io/tehran-digital-twin/")
        return 0
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
