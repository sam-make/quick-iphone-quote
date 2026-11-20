#!/usr/bin/env bash
set -euo pipefail

# Run from GitHub's internet-connected runner after Cloudflare Preview is deployed.
# Read-only HTTP checks: no credentials, no account logins, no production writes.
base="https://migration-cloudflare-trade-in-pro.samysamsung695.workers.dev"
project="https://xuvaihwygkcwriqfnkbg.supabase.co"
old_project="gsaazisxtvjhekkwhulz"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

for path in / /connexion /mot-de-passe-oublie /reset-password; do
  case "$path" in
    /) label="home";;
    /connexion) label="login";;
    /mot-de-passe-oublie) label="forgot";;
    /reset-password) label="reset";;
  esac
  code="$(curl --fail-with-body --retry 4 --retry-all-errors --retry-delay 2 \
    --connect-timeout 10 --max-time 25 --silent --show-error \
    --output "$tmp/$label.html" --write-out '%{http_code}' "$base$path")"
  if [[ "$code" != "200" ]]; then
    echo "::error::$path: HTTP $code"
    exit 1
  fi
  if ! grep -q 'Trade-In Pro' "$tmp/$label.html"; then
    echo "::error::$path: page ne contient pas le titre Trade-In Pro"
    exit 1
  fi
  if grep -q "$old_project" "$tmp/$label.html"; then
    echo "::error::$path: ancienne base staging détectée dans le HTML"
    exit 1
  fi
  if grep -q 'SUPABASE_SERVICE_ROLE_KEY\|sb_secret_' "$tmp/$label.html"; then
    echo "::error::$path: marqueur de clé serveur détecté"
    exit 1
  fi
  if ! grep -Fq "$project" "$tmp/$label.html"; then
    echo "::error::$path: URL du nouveau Supabase absente du rendu serveur"
    exit 1
  fi
  echo "$path: HTTP 200, base de production attendue, aucun secret visible."
done

# Gotrue health may require a key and return 401, which still proves reachability.
health_code="$(curl --silent --show-error --connect-timeout 10 --max-time 25 \
  --output "$tmp/auth-health" --write-out '%{http_code}' "$project/auth/v1/health")"
case "$health_code" in
  200|401|403)
    echo "Supabase Auth accessible par HTTPS (HTTP $health_code)."
    ;;
  *)
    echo "::error::Supabase Auth inaccessible (HTTP $health_code)"
    exit 1
    ;;
esac

echo "Contrôle HTTP externe réussi. La connexion d'un utilisateur réel reste NON TESTÉE."
