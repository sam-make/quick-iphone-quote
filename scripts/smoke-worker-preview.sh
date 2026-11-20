#!/usr/bin/env bash
set -euo pipefail

# La configuration fictive doit être chargée pendant vite build,
# car le plugin Cloudflare la copie dans le résultat utilisé par vite preview.
if [[ ! -f .dev.vars ]]; then
  echo "Le fichier de configuration fictive n'a pas été préparé avant le build."
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
  python3 - "$home" <<'PY'
from html.parser import HTMLParser
import sys

class MetaReader(HTMLParser):
    def __init__(self):
        super().__init__()
        self.names = []
    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            self.names.append(dict(attrs).get("name", ""))

body = open(sys.argv[1], encoding="utf-8").read()
parser = MetaReader()
parser.feed(body)
print("Diagnostic sans valeurs : HTML:", len(body), "caractères")
print("Balise Supabase URL présente:", "trade-in-supabase-url" in parser.names)
print("URL fictive de test présente:", "staging.example.invalid" in body)
print("Titre Trade-In Pro présent:", "Trade-In Pro" in body)
PY
  exit 1
fi

login_status="$(curl --silent --max-time 5 --output "$login" --write-out "%{http_code}" http://127.0.0.1:4173/connexion || true)"
if [[ "$login_status" != "200" ]] || ! grep -q 'Trade-In Pro' "$login"; then
  echo "La page de connexion ne s'affiche pas en rendu serveur (HTTP $login_status)."
  exit 1
fi

echo "Rendu serveur OK sur / et /connexion ; configuration publique transmise au navigateur."
