#!/usr/bin/env bash
# Sync notes from Obsidian, commit content/ changes, and push to trigger GitHub Pages deploy.
set -euo pipefail

cd "$(dirname "$0")/.."

python3 sync.py

git add content/

if git diff --cached --quiet; then
  echo "No content changes to publish."
  exit 0
fi

mapfile -t changed < <(git diff --cached --name-only -- content/ | sed 's|^content/||')
total=${#changed[@]}

if (( total <= 5 )); then
  list=$(IFS=, ; echo "${changed[*]}")
  msg="publish: ${list// , /, }"
else
  head_list=$(IFS=, ; echo "${changed[*]:0:5}")
  msg="publish: ${head_list// , /, } (+$((total - 5)) more)"
fi

git commit -m "$msg"
git push

remote_url=$(git remote get-url origin)
repo=$(echo "$remote_url" | sed -E 's|.*github\.com[:/](.+)\.git$|\1|; s|.*github\.com[:/](.+)$|\1|')
echo
echo "✓ Pushed. Build status:"
echo "  https://github.com/${repo}/actions"
