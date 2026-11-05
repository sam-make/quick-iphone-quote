# Vérification de l’espace propriétaire

## Livré, non publié
- `/admin` : indicateurs, listes paginées, recherche, filtres, détails, coordonnées boutique, accès et rôles boutique, archivage réversible, journal.
- Catalogue commun et prix/règles boutique consultables séparément, sans modification des prix existants.
- Attribution du rôle global au compte Auth confirmé `haddaouisamy86@gmail.com`, distinct des rôles boutique ; revalidation Auth et rôle pour chaque fonction globale.
- Aucun mot de passe créé ou exposé. Aucun changement Stripe, aucune suppression de données.

## Fichiers
- `src/routes/_authenticated/admin.tsx`, navigation `AppShell.tsx`.
- `src/lib/super-admin.functions.ts`, `super-admin.server.ts`, `super-admin.server.test.ts`.
- `src/lib/access.ts` ; fonctions workspace, team et repairs utilisent ce contrôle de suspension.
- `vitest.config.ts` inclut tous les tests du projet.
- Migrations additives `0009` à `0013` : rôle global, suspensions/archivage, journal et mutation atomique, politiques restrictives, protection du propriétaire et du dernier administrateur, retrait de l’exécution publique des déclencheurs et références bloquées pour les accès suspendus.

## Tests réalisés
- 52 tests automatiques réussis, lint des nouveaux modules réussi, compilation automatique réussie.
- Navigateur propriétaire connecté : `/admin`, huit rubriques, modification du téléphone d’une boutique test puis restauration, journal lu via l’écran.
- iPhone 390 × 844 et ordinateur 1280 × 1800 : écran visible, aucune largeur de page excessive.
- Compte boutique ordinaire : `/admin` refusé, lien absent, fonction globale directe refusée.
- RPC global, écriture du rôle global et modification directe de l’état d’accès refusés au compte ordinaire.
- Suspension temporaire puis réactivation de la boutique du compte ordinaire : session déjà ouverte privée de lectures RLS et fonction métier refusée. État initial restauré.
- Déclassement du dernier administrateur actif et suspension du propriétaire refusés.
- Appels RPC et fonction globale sans connexion refusés.
- Identité du rôle et présence de 18 politiques restrictives contrôlées en base.

## Limites
- Aucun déploiement : le nouvel écran et les nouveaux contrôles serveur ne sont pas présents sur l’ancienne version publiée avant publication ; les changements de base sont appliqués au backend partagé.
- Impression physique, boîte mail et nouveau parcours d’inscription non retestés dans cette intervention.
- Les événements de test sont conservés dans le journal ; aucune donnée existante n’a été supprimée.
- Les informations légales restent en attente de l’éditeur, hors de cette intervention.