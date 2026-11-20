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
