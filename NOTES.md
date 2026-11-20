# NOTES — Trade-In Pro
Date : 2026-11-20
Branche de travail : `migration-cloudflare`; ne jamais écrire directement sur `main`.

## Architecture
GitHub pour le code, Cloudflare Workers pour TanStack Start SSR, Supabase pour les données et comptes. Lovable exclu de la cible. Production interdite sans accord.

## Réalisé pour la PR fondations
- Vérification d'accès GitHub : branche créée, fichier `TEST_ACCES.md` créé puis supprimé.
- `AGENTS.md` remplacé par cinq agents et des règles strictes.
- `.env`, `.env.development`, `.env.production` retirés du suivi de la branche ; `.gitignore` renforcé, `.env.example` sans valeurs ajouté.
- Connexion Google / bibliothèque `@lovable.dev/cloud-auth-js` supprimées ; connexion e-mail/mot de passe conservée.
- Vérifications GitHub Actions sur PR : installation, types, lint, tests, build, secrets.
- Architecture cible documentée.

## Sécurité des anciennes variables
Aucune variable `SUPABASE_SERVICE_ROLE_KEY` relevée dans les trois fichiers d'environnement examinés. Une variable de jeton client de paiement `VITE_PAYMENTS_CLIENT_TOKEN` y était renseignée ; ne pas afficher sa valeur. Des clés Supabase publiques y étaient renseignées. Ces fichiers existent dans l'historique Git antérieur : les retirer de la dernière version ne purge pas l'historique. Vérifier le caractère secret des valeurs et décider d'une rotation si nécessaire, sans action irréversible automatique.

## Blocages et vérifications
- Les dépendances restantes `@lovable.dev/vite-tanstack-config` et `@lovable.dev/ai-gateway`, et le verrou `bun.lock`, ne sont pas modifiés dans cette mission ; la suppression complète de Lovable reste à faire.
- Le code de paiement et les fonctions SQL du propriétaire restent intacts.
- **Installation, tests, types, lint et build NON EXÉCUTÉS** : l'environnement local ne possède pas Bun (commande introuvable) et n'a pas d'accès réseau pour cloner le dépôt. Tentative `git ls-remote https://github.com/sam-make/quick-iphone-quote.git HEAD` : `fatal: unable to access ... Could not resolve host: github.com`. Aucune erreur de compilation n'est donc démontrée ; résultat inconnu. GitHub Actions devra effectuer ces vérifications à l'ouverture de la PR.
- Vérifier que GitHub Actions s'exécute avec succès avant fusion. **Configurer aussi la protection de la branche main (contrôles obligatoires)** ; la présence d'un workflow seule ne bloque pas automatiquement la fusion. Le scan de secrets peut signaler l'historique Git contenant les anciens `.env`.
- Aucun accès ni modification à la production ou à Supabase.

## Suites proposées (nécessitent accord pour nouvelles modifications)
1. Réparer la compilation Cloudflare Workers autonome sans bibliothèque Lovable.
2. Réviser le verrou Bun pour retirer les entrées devenues inutiles.
3. Valider sécurité RLS, estimations, numérotation REP/FA et mobile avec des tests automatisés.

## Mission suivante : sortie technique de Lovable (2026-11-20)
- `bun.lock` : 140 URL d'archives du cache privé remplacées par `registry.npmjs.org` ; références directes `@lovable.dev/*` supprimées du verrou. **Attention** : verrou ajusté par transformation du fichier existant, pas régénéré localement avec Bun ; la résolution de `@cloudflare/vite-plugin` et `wrangler` est faite dans GitHub Actions pendant `bun install`. Faire ultérieurement une régénération canonique, committer le résultat puis activer une installation figée.
- `package.json` : retrait de `@lovable.dev/vite-tanstack-config`, `@lovable.dev/ai-gateway`, Nitro ; ajout de `@cloudflare/vite-plugin` et `wrangler`. Aucune logique Stripe modifiée.
- `vite.config.ts` : configuration officielle Cloudflare Vite + TanStack Start + React + Tailwind CSS + alias TypeScript ; option d'entrée serveur `server` conservée pour `src/server.ts`. `wrangler.jsonc` définit un Worker serveur, sans déploiement automatique.
- `bunfig.toml` : garde de sécurité de publication 24 h préservée ; exceptions privées Lovable supprimées.
- `drizzle.config.ts` : `DATABASE_URL` à la place de `LOVABLE_DB_MIGRATION_URL`. Ne pas exécuter de migration sans autorisation.
- `src/lib/lovable-error-reporting.ts` supprimé : erreurs de racine journalisées par `console.error`. Code d'attribution TikTok basé sur `__lovableEvents` retiré de l'accueil ; mesure TikTok absente jusqu'à une solution indépendante.
- `src/integrations/supabase/previewAuthStorage.ts` supprimé : stockage standard Supabase dans le navigateur, sans relais Lovable. Les sessions éventuellement propres aux domaines d'aperçu ne se transfèrent pas automatiquement entre domaines.
- Code restant spécifiquement lié à Lovable dans les archives `.lovable/`, `README.md` et certains textes générés. Aucun de ces historiques n'est nécessaire à l'exécution mais la suppression complète doit être vérifiée.

### Fonctionnalités cachées de l'ancien Vite
1. **Devtools TanStack** (outils de diagnostic en développement) : pas réinstallés pour l'instant. Ce n'est pas nécessaire à la production ; vérifier le besoin et la compatibilité avant d'ajouter un paquet.
2. **Alias `@/` et chemins TypeScript** : repris par `vite-tsconfig-paths`.
3. **Cible Cloudflare** : reprise par `@cloudflare/vite-plugin`, remplaçant le déploiement Nitro. Attention : aucune compilation Worker réussie prouvée à ce stade.
4. **React/TanStack dedupe** : reprise par `resolve.dedupe`.
5. **Injection `VITE_*`** : effectuée par Vite en construction ; ne jamais y mettre `service_role`.
6. **Capture d'erreurs Lovable** : retirée à la demande, remplacée par les journaux locaux.
7. **Détection sandbox / host / strictPort** : spécifique à l'ancien environnement Lovable, non reconduite ; vérifier si une configuration spéciale de développement est souhaitée.

### GitHub Actions : résultats déjà observés
- Contrôle des secrets : PASSÉ sur les exécutions inspectées.
- Vérification des types : un ancien échec `src/routes/index.tsx(95,19)` et `(96,14)` provenait de `__lovableEvents` ; référence supprimée dans le nouveau commit.
- Lint : 1 839 problèmes (1 830 erreurs, 9 avertissements) sur un commit après suppression de `__lovableEvents`, très majoritairement erreurs de formatage `prettier/prettier` dans des fichiers existants. Le CI reste rouge. Ne pas masquer le problème en désactivant les règles.
- Workflow ajusté pour lancer les tests et le build même après un échec de lint, afin de découvrir d'autres blocages. Vérifier les résultats de la dernière exécution.
- Le conteneur local n'a ni Bun ni accès GitHub ; seuls les jobs GitHub Actions constituent une exécution technique à distance.

### Résultat vérifié après correction (run GitHub Actions 44705696149, commit 4280402)
- Installation Bun : **SUCCÈS**.
- Vérification TypeScript : **SUCCÈS**.
- Tests automatisés : **SUCCÈS** (étape GitHub Actions ; nombre de tests à confirmer si nécessaire).
- Build Vite / Cloudflare : **SUCCÈS** (compilation seulement, aucun déploiement ni test runtime de Worker).
- Scan de secrets : **SUCCÈS**.
- Lint : **ÉCHEC** (1 839 problèmes relevés dans un run antérieur ; le nombre exact du run 44705696149 doit être confirmé à ses journaux). La PR n'est **PAS verte**.
- Décision : ne pas désactiver les contrôles ni reformater massivement des fichiers hors du périmètre sans autorisation.
- `main` protégée d'après le propriétaire ; PR n°1 toujours en brouillon, non fusionnée.

## Session lint du 20 novembre 2026 — résultats vérifiés
- État initial (run 44705891478) : **1 839 problèmes**, dont 1 830 erreurs `prettier/prettier`, 8 avertissements `react-refresh/only-export-components`, 1 avertissement `react-hooks/exhaustive-deps`.
- Groupe 1 : `bunx eslint . --fix` a automatiquement corrigé **1 830 problèmes de formatage**. Modifications enregistrées sur `migration-cloudflare` par GitHub Actions (commit 183c2e5). Le job automatique temporaire a été supprimé du workflow ensuite.
- Groupe 2 : dépendances primitives du `useEffect` dans l'administration. Avertissement React Hooks corrigé sans ignorer la règle.
- Groupe 3 : suppression de quatre exports internes inutilisés par d'autres modules : `badgeVariants`, `useFormField`, `navigationMenuTriggerStyle`, `useSidebar`.
- Groupe 4 : extraction de `buttonVariants` et `toggleVariants` dans des fichiers autonomes, avec mise à jour des imports consommateurs.
- Groupe 5 : extraction de `ownerAnalyticsOptions` dans `src/lib/owner-analytics.options.ts` pour préserver la mise en cache des statistiques sans export non-composant.
- Groupe 6 : séparation de `AuthProvider`, `AuthContext` et du hook `useAuth` pour conserver le comportement de connexion et supprimer le dernier avertissement.
- Corrections secondaires de formatage des imports et de la fin des fichiers après extraction.
- **Total corrigé : 1 839 / 1 839 ; restant : 0 erreur et 0 avertissement.** Aucune règle désactivée et aucun commentaire d'ignorance ajouté.
- **Vérification GitHub Actions 44715156157 sur commit 117ae1d : SUCCESS** : installation, TypeScript, lint (aucune erreur ni avertissement), 10 fichiers de tests, build Vite/Cloudflare, scan de secrets.
- Aucune action sur `main`, la production, les paiements ou Supabase. Pull request 1 toujours non fusionnée. Le succès du build ne remplace pas un test fonctionnel en ligne.
