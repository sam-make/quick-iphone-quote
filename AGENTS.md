# Trade-In Pro — instructions obligatoires des agents

## Périmètre
- Architecture cible : code GitHub, application TanStack Start exécutée dans Cloudflare Workers, données et comptes dans Supabase.
- Lovable est exclu des développements futurs.
- Priorité : sécurité des boutiques, rapidité, simplicité, coûts gratuits pendant les tests.
- Avant toute tâche, consulter `NOTES.md` pour connaître les travaux et blocages en cours. Le mettre à jour à la fin.

## Règles strictes
1. Ne jamais toucher à la production (application, comptes, base, ressources Cloudflare) sans accord préalable explicite.
2. Ne jamais écrire sur `main`. Utiliser `migration-cloudflare` et proposer les changements par pull request non fusionnée.
3. Aucun service payant sans accord écrit.
4. Aucun secret, mot de passe, token ou clé privée dans Git, les journaux, les captures ou les messages. Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` au navigateur.
5. Toujours demander confirmation avant toute action irréversible, notamment suppression de données et migrations destructrices.
6. Ne pas modifier ni supprimer le code de paiement sans nouvelle instruction explicite ; le signaler seulement.
7. Ne pas modifier l'identité du propriétaire codée dans `is_super_admin` et `guard_global_owner_role` sans accord explicite.

## Cinq agents de relecture obligatoires
Une tâche ne peut être déclarée « terminée » qu'après les cinq vérifications. Indiquer PASSÉ / ÉCHEC / NON VÉRIFIÉ avec preuves et blocages.

### 1. Sécurité
- Aucune clé secrète dans le code source ou dans les fichiers suivis par Git.
- La clé `service_role` reste exclusivement sur le serveur, jamais dans un fichier `VITE_*` ou dans le navigateur.
- Vérifier l'isolation entre boutiques pour chaque lecture, écriture et fonction à privilèges.
- Préserver RLS (règles qui limitent les lignes accessibles) et les droits minimaux de chaque compte.

### 2. Qualité
- Installer les dépendances, vérifier la compilation et les types TypeScript.
- Vérifier le lint (règles de style et de qualité) et ne casser aucun test existant.
- Garder un style cohérent et expliquer clairement tout échec technique.

### 3. Tests
- Maintenir des tests automatiques sur les prix de reprise, déductions et cas bloquants.
- Tester les totaux des réparations et factures.
- Tester la numérotation unique et concurrente des références REP et FA, y compris ses garanties SQL.

### 4. Base de données
- Tout changement de structure ou de logique SQL passe par une migration datée et relue.
- Ne jamais appliquer une migration à la production sans autorisation.
- Prévoir un export régulier et vérifié des données Supabase, car le plan gratuit ne garantit pas de sauvegarde automatique.
- Conserver l'isolation des boutiques, les règles RLS, les fonctions et les déclencheurs existants.

### 5. Réparateur
- Tester les pages sur téléphone.
- Utiliser du français clair et des erreurs qui indiquent comment résoudre le problème.
- Permettre une estimation en quelques secondes dans un parcours court.
- Réduire les clics nécessaires pour créer un client, une réparation ou une facture.

## Rapport avant validation
Résumer les fichiers changés, les cinq relectures, les tests réellement exécutés et leurs erreurs. Ne jamais déclarer « zéro bug » sans preuves.

## Coordination réelle avec les sous-agents Codex

Les cinq relectures ci-dessus restent obligatoires. Les rôles spécialisés exécutables sont définis dans `.codex/agents/` :
`security_auditor`, `data_migration`, `auth_specialist`, `qa_engineer`, `repairer_ux`, `release_engineer`.

- Pour une préparation de version, le coordinateur Codex doit déléguer en parallèle **les audits en lecture seule** à ces six rôles, attendre les rapports et consigner les décisions dans `docs/AGENTS_PRODUCTION.md` et `NOTES.md`.
- Une revue ne constitue pas un déploiement. Les sous-agents ne tournent pas en arrière-plan sans session Codex active, contrairement aux vérifications GitHub Actions.
- Ne lancer ni déploiement public, ni fusion de la PR, ni modification de la base actuellement utilisée sur Lovable sans validations prévues au tableau GO/NO-GO et autorisation spécifique.
- Aucune donnée de client, sauvegarde, hash de mot de passe ou secret n'est admis dans les commits, issues et résultats d'automatisation.
- Si un agent propose un correctif, le coordinateur contrôle le diff, exécute les tests CI et vérifie l'absence de conflit avec les autres agents.

Le plan de fonctionnement et les critères de validation se trouvent dans `docs/AGENTS_PRODUCTION.md`.
