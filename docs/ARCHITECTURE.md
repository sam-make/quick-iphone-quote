# Architecture cible de Trade-In Pro

## Source : GitHub
Le dépôt `sam-make/quick-iphone-quote` contient le code. Chaque travail est proposé sur la branche `migration-cloudflare` dans une pull request, sans écriture directe sur `main`.

## Exécution : Cloudflare Workers
Trade-In Pro utilise TanStack Start avec Vite et un rendu côté serveur : le serveur doit exécuter le code sur un Worker Cloudflare, et non être déployé comme un simple site statique. La compilation Vite indépendante fonctionne en CI. Il reste à valider le rendu serveur et la connexion réels en environnement de test avant tout déploiement de production.

## Comptes et données : Supabase
Supabase gère les connexions par e-mail/mot de passe, les boutiques, clients, devis, réparations et factures. Les règles RLS isolent les données des boutiques. La clé `SUPABASE_SERVICE_ROLE_KEY` doit rester strictement côté serveur. Utiliser uniquement le projet de test `trade-in-pro-staging` (gsaazisxtvjhekkwhulz) pour les essais, sans altérer la production.

## Lovable est exclu
Il ne doit plus être utilisé pour coder, héberger ou authentifier. Des dépendances techniques historiques subsistent tant qu'elles n'ont pas été remplacées et validées. Ne pas confondre « cible sans Lovable » et « migration déjà réalisée ».

## Sécurité et exploitation
- Aucun secret dans Git : suivre uniquement `.env.example` avec des valeurs vides.
- Aucun nouveau service payant sans accord écrit.
- Conserver inchangés le code de paiement et les SQL de protection du propriétaire jusqu'à autorisation spécifique.
- Prévoir un export périodique des données de test et vérifier sa restauration.
- Valider les cinq agents définis dans `AGENTS.md` avant toute déclaration de fin de tâche.

## Configuration publique du navigateur
Le Worker possède `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` comme variables de serveur. Le rendu serveur les transmet au navigateur par deux balises HTML `meta` publiques. Ce mécanisme évite de dépendre de variables `VITE_*` lors de la compilation. Les variables `VITE_*` restent possibles en développement local. La clé `SUPABASE_SERVICE_ROLE_KEY` reste strictement côté serveur et n'est jamais transmise à la page.
