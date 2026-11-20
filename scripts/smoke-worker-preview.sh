#!/usr/bin/env bash
set -euo pipefail

# Ces valeurs sont fictives. Aucun compte ni base de données ne sont contactés.
if [[ -e .dev.vars ]]; then
  echo "Le fichier .dev.vars existe déjà : arrêt pour éviter tout écrasement."
  exit 1
fi

log="$(mktemp)"
home="$(mktemp)"
login="$(mktemp)"
cleanup() {
  if [[ -n "${pid:-}" ]]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -f .dev.vars "$log" "$home" "$login"
}
trap cleanup EXIT

cat > .dev.vars <<'EOF'
SUPABASE_URL="https://staging.example.invalid"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_preview_dummy"
EOF

bun run preview --host 127.0.0.1 --port 4173 >"$log" 2>&1 &
pid=$!

status=""
for _ in $(seq 1 40); do
  status="$(curl --silent --max-time 2 --output "$home" --write-out "%{http_code}" http://127.0.0.1:4173/ || true)"
  if [[ "$status" == "200" ]]; then
    break
  fi
  sleep 1
done

if [[ "$status" != "200" ]]; then
  echo "Échec du rendu serveur sur / (HTTP $status)."
  tail -n 35 "$log"
  exit 1
fi

if ! grep -q 'name="trade-in-supabase-url"' "$home" || ! grep -q "https://staging.example.invalid" "$home"; then
  echo "La réponse HTML n'inclut pas la configuration publique Supabase du Worker."
  exit 1
fi

login_status="$(curl --silent --max-time 5 --output "$login" --write-out "%{http_code}" http://127.0.0.1:4173/connexion || true)"
if [[ "$login_status" != "200" ]] || ! grep -q 'Trade-In Pro' "$login"; then
  echo "La page de connexion ne s'affiche pas en rendu serveur (HTTP $login_status)."
  exit 1
fi

echo "Rendu serveur OK sur / et /connexion ; configuration publique transmise au navigateur."
