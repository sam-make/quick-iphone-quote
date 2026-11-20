#!/usr/bin/env python3
"""Validate project-scoped Codex roles and production gates without credentials."""
import json
from pathlib import Path
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "security_auditor", "data_migration", "auth_specialist",
    "qa_engineer", "repairer_ux", "release_engineer",
)
problems = []
def require(ok, label):
    if not ok:
        problems.append(label)

config = tomllib.loads((ROOT / ".codex/config.toml").read_text(encoding="utf-8"))
require(config.get("agents", {}).get("enabled") is True, "Codex multi-agent désactivé")
require(config.get("agents", {}).get("max_concurrent_threads_per_session", 0) >= 6, "Pas assez de sous-agents concurrents")

for role in REQUIRED:
    path = ROOT / ".codex" / "agents" / f"{role}.toml"
    if not path.exists():
        problems.append(f"Rôle absent : {role}")
        continue
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    require(data.get("name") == role, f"Nom incohérent : {role}")
    require(bool(data.get("description")), f"Description absente : {role}")
    require(len(data.get("developer_instructions", "")) >= 300, f"Instructions insuffisantes : {role}")
    require("model" not in data, f"Modèle imposé sans garantie d'accès : {role}")
    require(not any(k in data for k in ("sandbox_mode", "approval_policy", "mcp_servers")), f"Permissions interdites dans : {role}")

policy = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
require("migration-cloudflare" in policy, "Branche de travail non documentée")
require("sans accord préalable explicite" in policy, "Interdiction de déployer non documentée")

workflow = (ROOT / ".github/workflows/deployer-production.yml").read_text(encoding="utf-8")
for token in ("workflow_dispatch:", "BASCULE_VALIDEE", "github.ref_name == 'main'",
              "environment: production", "SUPABASE_SERVICE_ROLE_KEY",
              "xuvaihwygkcwriqfnkbg.supabase.co"):
    require(token in workflow, f"Garde de production absent : {token}")

wrangler = json.loads((ROOT / "wrangler.jsonc").read_text(encoding="utf-8"))
require(wrangler.get("name") == "trade-in-pro", "Worker cible inattendu")
require("secrets" in wrangler and set(wrangler["secrets"].get("required", [])) == {
    "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY",
}, "Secrets Worker obligatoires non déclarés")
require("wrangler deploy --secrets-file" in workflow,
        "Déploiement atomique code + secrets absent")
require("wrangler secret put" not in workflow,
        "Déploiement différé des secrets interdit")

if problems:
    for message in problems:
        print(f"::error::{message}", file=sys.stderr)
    sys.exit(1)
print(f"Contrat agents OK : {len(REQUIRED)} rôles, permissions héritées, déploiement contrôlé.")
