#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/update-cloudflare-github-secrets.sh [--repo owner/name] [--account-secret SECRET_NAME] [--token-secret SECRET_NAME]

Defaults:
  --repo            inferred from git remote origin
  --account-secret  CLOUDFLARE_ACCOUNT_ID
  --token-secret    CLOUDFLARE_API_TOKEN

Source tokens:
  tokens show CLOUDFLARE_ACCOUNT_ID --value-only
  tokens show CLOUDFLARE_WRANGLER_API_TOKEN --value-only

Examples:
  scripts/update-cloudflare-github-secrets.sh
  scripts/update-cloudflare-github-secrets.sh --repo jmbish04/core-template-gas
EOF
}

repo=""
account_secret_name="CLOUDFLARE_ACCOUNT_ID"
token_secret_name="CLOUDFLARE_API_TOKEN"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo="${2:-}"
      shift 2
      ;;
    --account-secret)
      account_secret_name="${2:-}"
      shift 2
      ;;
    --token-secret)
      token_secret_name="${2:-}"
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

if ! command -v tokens >/dev/null 2>&1; then
  echo "tokens CLI is required but not installed." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required but not installed." >&2
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

account_id="$(tokens show CLOUDFLARE_ACCOUNT_ID --value-only)"
api_token="$(tokens show CLOUDFLARE_WRANGLER_API_TOKEN --value-only)"

if [[ -z "$account_id" ]]; then
  echo "tokens returned an empty CLOUDFLARE_ACCOUNT_ID value." >&2
  exit 1
fi

if [[ -z "$api_token" ]]; then
  echo "tokens returned an empty CLOUDFLARE_WRANGLER_API_TOKEN value." >&2
  exit 1
fi

echo "Updating GitHub secret '$account_secret_name' in '$repo' from tokens..."
printf '%s' "$account_id" | gh secret set "$account_secret_name" --repo "$repo" --body -

echo "Updating GitHub secret '$token_secret_name' in '$repo' from tokens..."
printf '%s' "$api_token" | gh secret set "$token_secret_name" --repo "$repo" --body -

echo "Cloudflare GitHub secrets updated successfully."
