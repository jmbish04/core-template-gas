#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/update-clasp-github-secret.sh [--repo owner/name] [--secret SECRET_NAME] [--file PATH]

Defaults:
  --repo    inferred from git remote origin
  --secret  CLASP_CREDENTIALS_JSON
  --file    ~/.clasprc.json, falling back to ~/.config/clasp/.clasprc.json

Examples:
  scripts/update-clasp-github-secret.sh
  scripts/update-clasp-github-secret.sh --repo jmbish04/core-template-gas
  scripts/update-clasp-github-secret.sh --secret CLASP_CREDENTIALS_JSON --file ~/.clasprc.json
EOF
}

repo=""
secret_name="CLASP_CREDENTIALS_JSON"
credential_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo="${2:-}"
      shift 2
      ;;
    --secret)
      secret_name="${2:-}"
      shift 2
      ;;
    --file)
      credential_file="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$credential_file" ]]; then
  if [[ -f "$HOME/.clasprc.json" ]]; then
    credential_file="$HOME/.clasprc.json"
  elif [[ -f "$HOME/.config/clasp/.clasprc.json" ]]; then
    credential_file="$HOME/.config/clasp/.clasprc.json"
  else
    echo "Unable to locate a clasp credentials file. Checked:" >&2
    echo "  - $HOME/.clasprc.json" >&2
    echo "  - $HOME/.config/clasp/.clasprc.json" >&2
    exit 1
  fi
fi

if [[ ! -f "$credential_file" ]]; then
  echo "Credential file not found: $credential_file" >&2
  exit 1
fi

if [[ -z "$repo" ]]; then
  origin_url="$(git remote get-url origin)"
  case "$origin_url" in
    git@github.com:*)
      repo="${origin_url#git@github.com:}"
      repo="${repo%.git}"
      ;;
    https://github.com/*)
      repo="${origin_url#https://github.com/}"
      repo="${repo%.git}"
      ;;
    *)
      echo "Could not infer GitHub repo from origin URL: $origin_url" >&2
      echo "Pass --repo owner/name explicitly." >&2
      exit 1
      ;;
  esac
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required but not installed." >&2
  exit 1
fi

echo "Updating GitHub secret '$secret_name' in '$repo' from '$credential_file'..."
gh secret set "$secret_name" --repo "$repo" < "$credential_file"
echo "Secret '$secret_name' updated successfully."
